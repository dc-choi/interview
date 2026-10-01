---
tags: [database, redis, valkey, cache, migration, elasticache]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Valkey", "Redis Valkey Migration", "Redis 라이선스", "Redis to Valkey"]
---

# Redis에서 Valkey로 — 포크 배경과 마이그레이션

Valkey는 Redis 라이선스 변경(2024, BSD → SSPL/RSALv2 이중 라이선스)에 대응해 갈라져 나온 **Redis 호환 오픈소스 인메모리 데이터베이스**다. Linux Foundation 산하에서 개발되며, Redis 7.2를 기준으로 포크되어 그 이전 워크로드와 자연 호환된다. 관리형으로는 AWS ElastiCache가 Valkey 엔진을 지원한다.

## 포크 배경 — 라이선스 변경

- 2024-03-20 Redis사는 Redis 7.4부터 BSD 3-Clause 대신 RSALv2와 SSPLv1 이중 라이선스를 적용한다고 발표했다. 소급 적용은 없어 7.2.x 이하는 BSD 3-Clause로 남았고, 7.4 이상을 경쟁 관리형 서비스로 제공하려면 Redis사와 별도 계약이 필요해졌다
- 8일 뒤인 2024-03-28 Linux Foundation이 당시 최신 BSD 릴리스인 Redis 7.2.4에서 개발을 이어 가는 Valkey를 발표했다. 라이선스는 BSD 3-Clause를 유지했고, 발표 시점의 지원사는 AWS, Google Cloud, Oracle, Ericsson, Snap이다
- Redis 8(2025-05-01 발표)부터는 기존 두 라이선스에 OSI 승인 AGPLv3 선택지가 추가됐다. 이 변화는 Valkey가 Redis OSS 7.2.4에서 갈라졌다는 계보와 호환 기준을 바꾸지 않는다
- Valkey는 **Redis OSS 7.2 기준으로 명령어, 프로토콜(RESP), 데이터 구조가 호환**되므로 7.2 이하 워크로드는 클라이언트 코드 변경 없이 전환할 수 있다. 다만 포크 이후 Redis 8.x에서 추가된 신기능(예: 새 자료구조, 명령)은 Valkey와 별개로 진화하므로, 그런 기능에 의존하는 코드라면 호환 여부를 개별 확인해야 한다
- Redis Community Edition 7.4 이상이 만든 RDB/AOF 파일은 Valkey와 호환되지 않으므로 물리 파일 복사 방식으로 옮기지 않는다. 버전별로 프로토콜, 명령, 영속 파일 호환성을 나눠 검증한다

## 설치된 엔진부터 확인한다

- 실행 파일 이름만으로 엔진을 판단하지 않는다. 2026-09-30 Ubuntu 패키지 저장소 기준 24.04는 redis-server 7.0.15와 valkey-server 7.2.12를 함께 제공하고, valkey-redis-compat 패키지는 Redis 이름의 호환 심볼릭 링크를 설치한다. 25.10과 26.04도 redis-server 8.0 계열을 계속 제공하므로 배포판 기본값이 Valkey로 바뀌었다고 일반화하지 않는다
- Homebrew의 valkey와 redis formula는 둘 다 `redis-*` 실행 파일을 설치해 서로 충돌로 선언돼 있어 함께 설치할 수 없다
- `INFO server`의 `valkey_version`이 실제 Valkey 버전이고 `redis_version`은 호환 대상 Redis OSS 버전이다. Valkey 9.1.2도 `redis_version:7.2.4`를 보고하므로 이 값으로 기능 지원 여부를 판단하지 않는다

## Valkey 버전별 변화

| 버전 (GA) | 주요 변화 |
|---|---|
| 8.0 (2024-09-15) | 비동기 I/O 스레딩, dual channel 복제로 full sync 개선, lazyfree 계열 설정 기본 `yes`, `CLUSTER SLOTS` deprecated 해제 |
| 8.1 (2025-03-31) | 새 해시테이블로 TTL 없는 키-값 쌍당 약 20바이트, TTL이 있으면 최대 30바이트 절감. `SET ... IFEQ`, 느린 명령과 큰 요청, 큰 응답을 기록하는 `COMMANDLOG`, 여러 primary 동시 장애 때 순위대로 선출해 투표 충돌 방지 |
| 9.0 (2025-10-21) | 원자적 슬롯 마이그레이션, 해시 필드 TTL(`HEXPIRE` 계열), cluster 모드 번호 DB(`cluster-databases`), `DELIFEQ`, Pipeline Memory Prefetch 최대 40%, 주기당 새 cluster link 연결 수 제한으로 재연결 폭증 완화 |
| 9.1 (2026-05-19) | I/O 스레드 통신 재설계로 최대 17%, 128바이트 미만 문자열 메모리 최대 20%, Sorted Set 메모리 최대 10% 절감. `MSETEX`, `HGETDEL`, `CLUSTERSCAN` 추가 |

성능 수치는 프로젝트가 공개한 특정 조건의 측정값이다. 8.0 발표 벤치마크는 c7g.16xlarge, I/O 스레드 8개, 클라이언트 650개, 512바이트 값의 SET에서 7.2 대비 초당 36만에서 119만 요청(약 230% 증가), 평균 지연 69.8% 감소를 보고했고 prefetch 효과를 함께 포함한다. 9.0의 초당 10억 요청은 2,000노드 cluster, 9.1의 단일 서버 초당 210만 요청은 512바이트 payload, I/O 스레드 9개, pipeline 깊이 10 조건이다.

Redis의 단일 스레드 명령 처리 모델(→ [[Redis-Architecture]])은 유지하되, **네트워크 I/O를 멀티스레드로 분리**해 병목을 완화하는 방향.

## I/O 스레딩을 켤 때

- `io-threads`는 기본 1(메인 스레드만)이다. 설정 파일 안내는 코어가 3개 이상이고 한 코어를 남길 수 있을 때, 인스턴스가 CPU를 많이 써서 실제 성능 문제가 있을 때만 켜라는 것이다(4코어는 2~3개, 8코어는 6개)
- I/O 스레드는 소켓 읽기, 프로토콜 파싱, 응답 쓰기를 나눠 맡고 명령 실행은 메인 스레드에 남는다. 켜도 명령 단위 원자성과 느린 명령 하나가 뒤 요청을 막는 성질은 그대로다
- Redis 시절의 `io-threads-do-reads`는 Valkey 설정에서 deprecated이고 효과가 없다. 8.0부터 I/O 스레드가 읽기와 파싱까지 맡는다
- 메인 스레드가 소켓 read, write syscall과 파싱으로 CPU를 소진하는 상황이 아니거나 남는 코어가 없으면 효과가 없거나 오히려 느려진다. 서버와 `valkey-benchmark`를 한 노트북에서 돌리면 서버 I/O 스레드, 메인 스레드, 벤치마크 스레드가 같은 코어를 나눠 써 이득이 사라지거나 역전된다. 강의 실습(강사 노트북 측정)에서는 `io-threads` 6이 1보다 GET 처리량을 낮췄고, 같은 장비에서 pipeline 16과 클라이언트 100 조합이 GET 약 초당 100만 요청에 도달했다. 강의는 127.0.0.1 loopback에 NIC 병목이 없다는 점도 원인으로 들지만, loopback에서도 syscall과 파싱은 CPU를 쓰므로 NIC 유무로 효과를 판단하지 않는다
- 측정할 때는 벤치마크 클라이언트도 `--threads`로 늘려 클라이언트 병목을 먼저 없애고, 명령 종류, pipeline 깊이, 연결 수와 payload를 자기 워크로드에 맞춘다. 명령마다 왕복을 기다리는 것이 병목이면 스레드보다 [[Redis-Architecture#Pipeline vs Transaction|pipeline]]이 먼저다

## Redis 상식 중 Valkey에서 달라진 것

| 통념 | Valkey 기준 |
|---|---|
| 큰 키는 `DEL` 대신 `UNLINK` | 8.0부터 `lazyfree-lazy-user-del` 등 lazyfree 설정이 기본 `yes`라 `DEL`도 메모리 해제를 백그라운드로 넘긴다. Redis 8.x 기본값은 `no`이므로 Redis에서는 `UNLINK`를 명시한다. `CONFIG GET lazyfree*`로 확인 |
| 읽기 병렬화에 `io-threads-do-reads` 필요 | deprecated, 효과 없음 |
| `CLUSTER SLOTS`는 deprecated | Valkey 8.0에서 deprecated 해제. Redis 문서는 7.0부터 deprecated로 둔다 |
| Lua는 `redis.call` | 첫 GA인 7.2.5부터 `server.call`이 기본 API이고 `redis`는 호환 별칭으로 유지된다 |
| 해시 필드별 TTL 불가 | Redis 7.4+, Valkey 9.0+에서 `HEXPIRE` 계열로 가능 |
| cluster는 DB 0만 | Valkey 9.0+는 `cluster-databases`로 번호 DB 지원 |

## 지원 정책

- 각 minor 버전은 첫 릴리스부터 3년간 버그와 보안 패치를 받고, 각 major의 마지막 minor는 5년간 확장 보안 지원을 받는다
- 2026-09-30 기준 최신 안정 버전은 9.1.2(2026-08-31)이고 9.2.0-rc1(2026-09-16)이 나와 있다. major 업그레이드는 명령 동작과 기본 설정값을 바꿀 수 있으므로 릴리스 노트를 읽고 replica부터 올린다

## 비용 — ElastiCache

- 2026-09-30 AWS 가격 페이지 기준 ElastiCache for Valkey는 다른 지원 엔진 대비 node-based 20%, Serverless 33% 낮은 가격을 제시하고, Serverless 최소 측정 저장량도 Valkey 100MB, Redis OSS와 Memcached 1GB로 다르다. 리전과 사용 형태별 실제 비용은 최신 가격표로 다시 계산한다
- 메모리 효율 개선과 결합하면 노드 다운사이징 기회까지 생겨 절감폭이 커진다

## 인플레이스 업그레이드와 클라이언트 요건

ElastiCache 인플레이스 업그레이드는 새 노드를 붙여 데이터를 복제한 뒤 Failover하는 방식. 엔드포인트는 유지되지만 **짧은 연결 끊김이 발생**할 수 있어 클라이언트의 재연결 능력이 필수다.

### 클라이언트 체크리스트

- **공통**: 연결/읽기 타임아웃 설정, 자동 재연결 + 지수 백오프 재시도, 연결 풀의 stale connection 처리
- **클러스터 모드 추가**: MOVED/ASK 리다이렉트 처리, 해시태그로 동일 슬롯 제약 충족, 다중키 명령(MGET, MSET, Lua)이 같은 슬롯 준수 (슬롯 원리는 [[Redis-Cluster-Sharding]])

### Node.js 클라이언트 선택

- 서버가 RESP와 7.2 명령을 호환하므로 기존 ioredis, node-redis도 대부분 접속 주소만 바꿔 동작한다. 포크 이후 추가된 `DELIFEQ`, `MSETEX` 같은 명령은 클라이언트에 전용 메서드와 타입이 없을 수 있어 범용 명령 호출(ioredis `call`, node-redis `sendCommand`)로 보낸다
- Valkey 조직이 관리하는 Node 클라이언트로 `iovalkey`와 `@valkey/valkey-glide`가 있다. `iovalkey`(2026-07-27 0.4.0)는 ioredis의 friendly fork라 API가 거의 같고, ESM에서는 `import { Valkey } from "iovalkey"`를 쓴다(default import는 다음 major에서 deprecated 예정). `@valkey/valkey-glide`(2026-09-24 2.5.3)는 공식 GLIDE 클라이언트다. npm의 `valkey` 패키지는 이 둘과 무관한 제3자 패키지이므로 이름만 보고 고르지 않는다
- TypeScript에서 `module`과 `moduleResolution`을 `NodeNext`로 두고 `"type": "module"`로 쓰면 CommonJS 패키지의 default import는 `module.exports` 전체의 타입이 된다. 그래서 `esModuleInterop`을 켜도 ioredis와 iovalkey를 default import해 `new`를 붙이면 TS2351(`This expression is not constructable`)이 나므로 named import를 쓴다. 같은 설정에서 상대 경로 import는 `./cache.js`처럼 확장자를 붙여야 하고 생략하면 TS2835다. TypeScript 5.9.3, ioredis 5.11.1, iovalkey 0.4.0에서 재현했다 ([[option|TypeScript 컴파일러 옵션]])
- 클라이언트는 앱 시작 때 한 번 만들어 재사용하고 요청마다 연결을 새로 열지 않는다. NestJS에서는 기본(싱글톤) scope provider로 주입한다 ([[NestJS-Caching-Integration|NestJS 캐시 통합]])

## 마이그레이션 원칙

- **리스크는 엔진보다 클라이언트와 운영 절차에 있다** — 체크리스트로 관리 가능
- **호환성 경계가 명확** — Valkey는 Redis OSS 7.2 기준이라 7.2 이하(6.x 포함) 워크로드와 자연 호환. Redis 8.x 신기능 의존 코드는 별도 확인
- **엔진 선택의 실제 변수는 코드가 아니다** — 명령과 프로토콜이 호환돼 코드 변경 비용은 작다. 라이선스, 관리형 가격, 필요한 기능이 Redis 7.4 이후나 Valkey 8.0 이후에만 있는지가 판단을 바꾼다
- **단계적 롤아웃** — 영향도 낮은 캐시부터 검증 후 확대
- **엔진 업그레이드와 노드 스펙 조정을 분리** — 문제 발생 시 원인 파악이 쉬움

## 성과 관측 지표

전환 효과는 CloudWatch 메트릭으로 확인한다. 대표 사례의 변화 방향:

- CPU 사용률 감소 (약 50%)
- FreeableMemory 증가, 메모리 사용률 개선 (약 10%)
- GET 지연시간 대폭 감소 (약 60%), SET 지연시간 감소 (약 20%)

## 면접 체크포인트

- Valkey가 왜 생겼는가 — Redis 라이선스 변경(BSD → SSPL/RSALv2)과 커뮤니티 포크
- Redis와의 호환성 경계 (Redis OSS 7.2.4 기준 포크, 7.2 이하 명령어/프로토콜 호환, Redis 8.x 신기능은 별도)
- Valkey I/O 멀티스레딩이 Redis 단일 스레드 모델과 어떻게 공존하는가 (명령 실행은 단일, I/O만 병렬)
- I/O 스레드를 늘렸는데 빨라지지 않는 조건 (메인 스레드 CPU에 여유가 있음, 벤치마크와 같은 장비의 코어 경합, 왕복 대기가 병목인 워크로드)
- Valkey에서 `DEL`과 `UNLINK`의 차이가 줄어든 이유와 Redis 기본값과의 차이
- 인플레이스 업그레이드에서 무중단이 아닌 이유와 클라이언트 재연결 요건
- 클러스터 모드 마이그레이션에서 슬롯, 해시태그, 다중키 명령 제약
- 엔진 업그레이드와 노드 스펙 조정을 분리해야 하는 이유

## 출처

- [Valkey 공식 문서, Migration from Redis to Valkey](https://valkey.io/topics/migration/)
- [Valkey 공식 문서, Releases and versioning schema](https://valkey.io/topics/releases/)
- [Valkey 공식 문서, INFO](https://valkey.io/commands/info/)
- [Valkey 공식 문서, Lua API reference](https://valkey.io/topics/lua-api/)
- [Redis 공식 문서, Redis licensing overview](https://redis.io/legal/licenses/)
- [Redis Adopts Dual Source-Available Licensing — Redis](https://redis.io/blog/redis-adopts-dual-source-available-licensing/)
- [Redis is now available under the AGPLv3 open source license — Redis](https://redis.io/blog/agplv3/)
- [Linux Foundation Launches Open Source Valkey Community — Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-launches-open-source-valkey-community)
- [Valkey, Introducing Valkey 9](https://valkey.io/blog/introducing-valkey-9/)
- [Unlock 1 Million RPS: Experience Triple the Speed with Valkey — Valkey Blog](https://valkey.io/blog/unlock-one-million-rps/)
- [Valkey 8.1: Continuing to Deliver Enhanced Performance and Reliability — Valkey Blog](https://valkey.io/blog/valkey-8-1-0-ga/)
- [Valkey 9.1 delivers improvements in security, performance, and more — Valkey Blog](https://valkey.io/blog/valkey-9-1-delivers-improvements-in-security-performance-and-more/)
- [Valkey releases와 release notes — valkey-io/valkey](https://github.com/valkey-io/valkey/releases)
- [valkey.conf 9.1 — valkey-io/valkey](https://github.com/valkey-io/valkey/blob/9.1/valkey.conf)
- [redis.conf 8.4 — redis/redis](https://github.com/redis/redis/blob/8.4/redis.conf)
- [Ubuntu Packages, valkey 패키지 검색](https://packages.ubuntu.com/search?keywords=valkey&searchon=names&suite=all&section=all)
- [Ubuntu Packages, redis-server 패키지 검색](https://packages.ubuntu.com/search?keywords=redis-server&searchon=names&suite=all&section=all)
- [Homebrew Formulae, valkey](https://formulae.brew.sh/formula/valkey)
- [iovalkey README — valkey-io/iovalkey](https://github.com/valkey-io/iovalkey)
- [npm, @valkey/valkey-glide](https://www.npmjs.com/package/@valkey/valkey-glide)
- [npm, valkey](https://www.npmjs.com/package/valkey)
- [TypeScript 공식 문서, Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Amazon ElastiCache pricing — AWS](https://aws.amazon.com/elasticache/pricing/)
- [Redis 6.x에서 Valkey 9.0으로 — 아임웹 기술블로그](https://tech.imweb.me/posts/redis-oss-valkey-upgrade/)
- [인프런, Hong, 강의 소개와 Valkey는 어떻게 탄생하게 되었을까?](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481439)
- [인프런, Hong, MockUp -> Redis만 알면 되는거 아닌가요?](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=489690)
- [인프런, Hong, 간단한 Valkey 설치부터 단일 스레드의 특징 직접 손으로 확인하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481440)
- [인프런, Hong, 샘플 프로젝트 셋업과 간단한 캐시 구현하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481454)
- [인프런, Hong, 100만++ TPS 돌파를 위한 IO 스레딩 그리고 현실적인 그 한계 확인하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481465)
- [인프런, Hong, Valkey는 어떤 버전의 흐름으로 발전해왔는가. Redis에서 마이그레이션 할 떄의 주의사항](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481466)

## 관련 문서

- [[Redis-Architecture|Redis Architecture (Event Loop, RESP, 단일 스레드)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (Hash Slot)]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
- [[Operations|Redis 운영 팁]]
- [[NestJS-Caching-Integration|NestJS 캐시 통합]]
