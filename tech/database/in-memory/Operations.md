---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["운영 팁", "Operations"]
---

# 운영 팁

## 싱글 스레드 주의사항
Redis의 명령 실행은 주로 단일 스레드에서 직렬 처리된다. 네트워크 I/O 스레드와 persistence, lazy free, active defragmentation 같은 백그라운드 작업도 있지만, 오래 걸리는 명령은 명령 처리 루프를 막아 다른 요청을 지연시킬 수 있다.

- `keys` 대신 `scan` 사용
- hash나 sorted set의 한 키가 매우 커지면 단일 명령 지연, migration과 장애 복구 비용이 커질 수 있다. 고정 100만 개 기준 대신 실제 원소 크기와 명령 latency를 측정해 big key 기준을 정한다.
- 데이터가 많은 키 조회 시 `hgetall` 대신 `hscan` 사용. 10만 원소 리스트를 `LRANGE key 0 -1`로 한 번에 읽으면 서버가 응답을 직렬화하는 동안 다른 명령을 처리하지 못하고 네트워크 전송량도 급증한다. 리스트에는 길이 상한을 두고, 수십만 원소로 커질 해시나 셋은 키를 나눈다.
- 데이터가 많은 키 삭제 시 `del` 대신 `unlink` 사용 (백그라운드 삭제). Redis 8.x 기본값(`lazyfree-lazy-user-del no`)에서는 여전히 필요하다. Valkey 8.0+는 이 설정이 기본 `yes`라 `DEL`도 메모리 해제를 백그라운드로 넘기므로, 통념보다 버전과 `CONFIG GET lazyfree*` 결과로 판단한다.
- 운영 중 갑자기 느려졌다면 앞에서 서버를 붙잡은 느린 명령 하나부터 의심한다. 명령 하나가 도는 동안 뒤의 모든 요청이 기다리므로 평소 즉시 끝나는 `PING`도 그만큼 늦어진다. 지연은 `valkey-cli --latency`(PING 반복 측정)나 `--latency-history`로 본다. 장시간 Lua 스크립트와 함수는 `busy-reply-threshold`(기본 5초)를 넘기면 다른 클라이언트에 `BUSY` 오류를 돌려주지만 일반 느린 명령은 오류 없이 붙잡는다 ([[Redis-Atomic-Operations-Lua|Lua 스크립트]]).

## 느려졌을 때 진단 순서

1. `INFO memory`: `used_memory_human`(할당한 데이터 메모리)과 `used_memory_rss_human`(OS가 본 점유)을 비교한다. `mem_fragmentation_ratio`가 높아도 차이 바이트(`mem_fragmentation_bytes`)가 수 MB면 문제가 아니고, 할당량이 RSS보다 크면(비율 1 미만) OS가 메모리 일부를 swap으로 내렸다는 신호다. `INFO stats`의 `evicted_keys`도 함께 본다.
2. `valkey-cli --bigkeys`(원소 수 기준)와 `--memkeys`(메모리 기준)로 비대한 키를 찾는다. SCAN 기반이라 운영에서도 쓸 수 있고 `-i`로 명령 사이 간격을 둬 부하를 줄인다. `--hotkeys`는 LFU 정책일 때만 동작한다 ([[Hot-Key|Hot key 대응]]).
3. `SLOWLOG GET`으로 `slowlog-log-slower-than`(마이크로초, 기본 10000)을 넘은 명령과 보낸 클라이언트를 찾는다. 항목은 ID, 시각, 실행 시간(μs), 인자, 클라이언트 주소, 클라이언트 이름이고 실행 시간에는 I/O가 빠진다. 임계값을 미리 정해 둬야 사후에 추적할 수 있다.
4. Valkey 8.1+는 `COMMANDLOG GET <count> slow|large-request|large-reply`가 느린 명령과 기본 1MB를 넘는 큰 요청, 큰 응답을 따로 기록하고, `slowlog-*` 설정은 `commandlog-*`로 대체되어 deprecated다. 큰 응답 기록은 I/O 스레드를 쓸 때 추적 비용이 있다.

## MAXMEMORY-POLICY
- 데이터의 유효기간이 있으면 TTL을 설정하고, 메모리 압력에서 어떤 키를 내보낼지는 eviction policy로 별도 설계한다. `allkeys-*` 정책은 TTL 없는 키도 내보낼 수 있어 모든 캐시 키에 TTL이 기술적으로 필수인 것은 아니다.
- 기본 `noeviction`은 `maxmemory`에 도달하면 새 데이터가 필요한 쓰기 명령에 오류를 반환하므로 캐시 용도에서는 의도한 정책인지 확인한다.
- `allkeys-lru`는 TTL 여부와 무관하게 모든 키 중 근사 LRU 후보를 삭제한다. TTL 있는 키만 지우려면 `volatile-*` 계열 정책을 사용한다.

## STOP-WRITES-ON-BGSAVE-ERROR

기본값 `yes`는 RDB 저장 실패를 감지하면 쓰기를 중단해, 운영자가 persistence 장애를 놓친 채 데이터 변경을 계속 받는 상황을 막는 안전장치다. 단순히 모니터링이 있다는 이유로 끄지 않는다. 캐시처럼 영속성이 불필요하거나 별도 복구, 알림 체계가 있고 가용성을 더 우선하는 워크로드에서만 데이터 내구성 트레이드오프를 검토한 뒤 변경한다.

## MaxMemory 값 설정

RDB 저장과 AOF rewrite는 `fork()` 후 Copy-on-Write 메모리를 추가로 사용할 수 있다. 그렇다고 `maxmemory`를 항상 물리 메모리의 절반으로 고정하지는 않는다. 실제 쓰기율과 fork 시 COW 피크, 복제 버퍼, 클라이언트 버퍼, allocator 단편화, OS 여유분을 함께 측정해 headroom을 정한다. `INFO memory`의 피크와 persistence 시 RSS 증가를 부하 테스트로 확인한다.

## Memory 관리

논리적으로 할당한 `used_memory`와 운영체제가 관찰하는 `used_memory_rss`를 함께 본다. 두 값의 차이와 `mem_fragmentation_ratio`, peak memory, fork COW를 같이 봐야 데이터 증가와 allocator, OS 단편화를 구분할 수 있다. 삭제가 많은 워크로드에서 RSS가 충분히 줄지 않을 수 있으며, 원인을 확인한 뒤 `activedefrag` 사용과 allocator purge, 재시작 같은 대안을 검토한다.

## 대규모 운영 전략

수백~수천 인스턴스 규모 Redis 운영에서 반복 관찰되는 패턴.

### HA 구성 선택

| 구성 | 특징 |
|---|---|
| **1 Primary + N Replica** | 읽기 분산과 복구 선택지가 늘지만 복제 비용과 운영 복잡도 증가 |
| **1 Primary + 1 Replica** | 최소한의 자동 failover 후보를 두는 구성. 장애 도메인과 복구 목표를 별도 검토 |
| **단독 Primary** | 장애 시 서비스 중단. 캐시 전용 한정 |

Primary 장애 시 자동 승격 이후 새 replica 보충과 재동기화 부하를 자동화한다. 예비 용량 방식은 RTO, 클라우드 증설 시간과 비용에 맞춰 사전 할당 또는 즉시 프로비저닝 중 선택한다.

### 클라우드 오토 힐링

- 인스턴스 점검, 이상 감지 시 **새 서버 발급 → 추가 → 기존 서버 반납** 을 자동화
- 물리 서버는 교체 리드 타임이 길어 야간 당직 부담. 클라우드는 빠른 교체로 당직 부담 급감
- 복제 지연, RDB/AOF snapshot 시간을 고려해 순차 교체

### 저사용 리소스 최적화 (Low Usage Project)

대규모 Redis 운영에서 과다 프로비저닝은 반복 점검할 비용 요인 중 하나다. 체계화된 절감 프로세스:

1. **저사용 판단 기준 수립** — 명령어 발행률, 시스템 사용량의 임계치
2. **대상 식별과 추적** — 지속 저사용인지, 특정 시즌만인지
3. **조치 선택**:
   - **스케일 인**: 클러스터 샤드 수 감소
   - **스케일 다운**: 서버 스펙 축소
   - **반납/해지**: 사용 안 하는 인스턴스
4. **HA 유지하며 작업** — 서비스 중단 없이

### 사용자 중심 대시보드

운영자가 "왜 내 인스턴스가 저사용으로 찍혔지?"를 한 번에 보도록:

- **왜 필요한가** — 저사용 판단 근거(지표)
- **무엇을 해야 하는가** — 반납/축소 요청 링크
- **어떻게 해야 하는가** — 설정 가이드, 체크리스트

효과: 운영팀이 일일이 설득하지 않아도 **사용팀이 자발적으로** 최적화 참여.

### 모니터링 지표 권장 목록

- **처리량**: `commandstats`, 초당 명령어
- **메모리**: `used_memory`, `used_memory_rss`, `mem_fragmentation_ratio`, peak memory, fork COW
- **연결**: `connected_clients`, 거부된 연결
- **복제**: `master_link_status`, `master_last_io_seconds_ago`
- **persistence**: `rdb_last_bgsave_status`, `aof_last_bgrewrite_status`, `aof_last_write_status`
- **슬로우 쿼리**: `slowlog`
- **키 만료율, hit rate**

## 관련 문서
- [[Redis-Architecture|Redis architecture]]
- [[Redis-Architecture-HA|복제와 Sentinel 고가용성]]
- [[Persistence]]
- [[Capacity-Planning|캐퍼시티 플래닝]] — IOPS, UsedMemory 기반 가용량 판단과 클러스터 분리 사례

## 출처

- [Redis latency optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Redis INFO command](https://redis.io/docs/latest/commands/info/)
- [Valkey INFO command](https://valkey.io/commands/info/)
- [Valkey CLI (valkey-cli)](https://valkey.io/topics/cli/)
- [Valkey SLOWLOG GET command](https://valkey.io/commands/slowlog-get/)
- [Valkey COMMANDLOG GET command](https://valkey.io/commands/commandlog-get/)
- [Valkey Programmability (busy-reply-threshold)](https://valkey.io/topics/programmability/)
- [valkey.conf 9.1 LAZY FREEING, COMMAND LOG — valkey-io/valkey](https://github.com/valkey-io/valkey/blob/9.1/valkey.conf)
- [redis.conf 8.4 — redis/redis](https://github.com/redis/redis/blob/8.4/redis.conf)
- [인프런, Hong, MockUp -> Redis만 알면 되는거 아닌가요?](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=489690)
- [인프런, Hong, 간단한 Valkey 설치부터 단일 스레드의 특징 직접 손으로 확인하기](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481440)
- [인프런, Hong, Valkey가 이상해요!! 디버깅을 위한 Big Key 및 Hot Key 기반의 추적 진단 패턴](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481458)
