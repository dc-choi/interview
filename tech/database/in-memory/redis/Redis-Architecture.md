---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Redis Architecture"]
---

# Redis architecture

## 고가용성 구성 개요

replication은 비동기로 사본을 두고, sentinel은 마스터 장애 때 복제본 승격과 재구성을 자동화하며, cluster는 여기에 샤딩을 더한다. 복제와 Sentinel의 동작, stale data, failover 때의 쓰기 유실과 클라이언트 전환은 [[Redis-Architecture-HA|복제와 Sentinel 고가용성]]으로 나눴다.

## cluster
최소 3개의 마스터가 필요하며 샤딩 기능을 제공함. 모든 노드가 서로를 감시하다가 마스터가 비정상일 경우 자동으로 페일 오버를 진행함. 일반적으로 하나의 마스터에 하나의 복제본을 두는게 일반적이다.

- HA로 레플리카만 구성하는 경우도 있고, 클러스터 + HA 조합도 가능
- 레디스 클라이언트가 요청 키를 해시 함수로 돌려 나온 값으로 노드를 찾아 저장
- 데이터 복제본은 클러스터 내 다른 노드에 저장

### 마스터 노드 장애 시
- 레플리카가 있으면 레플리카가 마스터로 승격
- 레플리카가 없으면 해당 노드를 복구하거나 새 노드를 추가해야 함 (그 전까지 해당 데이터 접근 불가)

## 스레드 모델
- Node.js 스레드 모델과 유사
- 대부분의 명령이 **싱글 스레드**로 동작
- 암호화, File I/O의 경우 별도 스레드에서 처리
- 반드시 명령어를 받은 순서대로 처리됨
- 레디스 명령어는 **원자성을 보장**

## 트랜잭션

CAS 방식과 유사.

1. **WATCH**로 데이터를 관측
2. **MULTI**로 트랜잭션 시작
3. COMMIT = **EXEC**, ROLLBACK = **DISCARD** (단 DISCARD는 EXEC 전의 큐를 버릴 뿐이고, 이미 실행된 명령을 되돌리는 롤백은 없다)

EXEC 실패 시 대응:
- 유저에게 재시도 에러 리턴 (구현 간편, UX 불편)
- 서버에서 제한 재시도 (최대 횟수나 deadline + backoff와 jitter). 예산을 소진하면 충돌 오류를 반환하고, 지속 충돌이면 경합 모델이나 원자 연산 사용을 재검토

## Pub/Sub

- 구독으로 특정 채널을 구독하고 발행으로 메시지를 보냄
- **메시지를 저장하지 않음** → 실패 시 재시도 불가, 못 받을 수도 있음
- 못 받을 수 있다고 전제하고 사용하는 것이 좋음
- 영속 + ACK 필요하면 [[Redis-Streams-PubSub|Streams]]로

## 이벤트 루프, I/O 모델

Redis는 **싱글 스레드 이벤트 루프 + epoll/kqueue 비동기 I/O**. 명령 자체는 한 번에 하나만 처리해 락이 필요 없음.

| 측면 | 동작 |
|------|------|
| 메인 루프 | 컴파일 시 하나 선택: evport(Solaris) → epoll(Linux) → kqueue(BSD, macOS) → select(폴백) |
| 파일 디스크립터 | 클라이언트당 1개, 다중화 |
| 명령 처리 | 받은 순서대로 직렬, 각 명령 원자성 |
| 백그라운드 | RDB/AOF rewrite는 fork된 자식, AOF flush는 별도 스레드 |
| Threaded I/O (6.0+) | 네트워크 read/write만 멀티스레드, 명령 실행은 여전히 싱글 |
| Valkey 8.0+ I/O 스레딩 | 소켓 읽기, 프로토콜 파싱, 응답 쓰기를 I/O 스레드가 비동기로 맡음. 기본 `io-threads 1`(꺼짐), 켜는 조건은 [[Redis-Valkey-Migration\|Redis에서 Valkey로]] |

이벤트 루프(`src/ae.c`)는 시스템이 지원하는 가장 빠른 것을 컴파일 타임에 하나 고른다. IOCP 백엔드는 없다 — IOCP는 libuv, Node.js 쪽 디멀티플렉서고 Redis는 공식 Windows 네이티브 빌드를 제공하지 않는다 (Windows에서는 WSL2나 서드파티 제품).

**왜 빠른가**:
1. 메모리 기반 (디스크 I/O 회피)
2. 싱글 스레드 명령 실행 → 공유 자료구조 락 경합과 그로 인한 컨텍스트 스위칭 비용이 크게 줄어듦 (백그라운드 스레드와 6.0+ Threaded I/O에는 내부 동기화가 있고, OS 스케줄링에 따른 스위치는 여전히 발생)
3. 효율적 자료구조 (skiplist, hashtable 등 [[Redis-Internal-Encoding|내부 인코딩]])
4. epoll/kqueue로 수만 연결을 한 스레드가
5. Pipeline과 집계 명령으로 왕복 횟수 절감

**매체 지연과 요청 지연은 다르다**: 강의가 ByteByteGo 자료로 소개한 Redis 약 100ns 대 SSD 기반 DB 약 100µs(약 1,000배)는 주기억장치와 SSD의 접근 지연 규모 비교다. ByteByteGo 원문 글은 RAM 접근이 랜덤 디스크 접근보다 최소 1,000배 빠르다고 적을 뿐 측정 환경을 밝히지 않는다. 애플리케이션이 보는 Redis 명령 지연은 이 수치와 같은 급이 아니다.

- 공식 지연 진단 문서는 Redis의 명령 처리 시간을 대개 1µs 미만으로, 1Gbit/s 네트워크의 전형적인 지연을 약 200µs, Unix domain socket을 30µs까지로 들며 네트워크와 하드웨어에 따라 다르다고 적는다. 여기에 스레드 스케줄링 같은 시스템 지연, RESP 직렬화와 클라이언트 라이브러리 비용이 더해져 요청 지연은 대개 왕복이 좌우한다
- 그래서 요청 단위 개선은 왕복을 줄이는 쪽에서 크게 나온다. 공식 권장 순서는 `MGET`, `MSET` 같은 집계 명령, 그다음 pipeline, 그다음 개별 왕복이다 (아래 Pipeline 절). [[Redis-Object-Mapping-Cost|객체 매핑 비용]]에 정리한 외부 벤치마크 예도 요청당 약 1~3ms였고, 왕복이 지배하는 시나리오에서는 명령 수 차이가 희석됐다
- 관계형 DB도 buffer pool에 올라온 page를 읽으면 디스크에 가지 않는다 ([[MySQL-Architecture|MySQL 저장 경로]]). Redis와 관계형 DB의 요청 지연 차이는 매체 수치 1,000배가 아니라 SQL 파싱, 실행 계획과 트랜잭션 격리 처리가 없는 짧은 명령 경로와 쓰기마다 디스크 동기화를 기다리지 않는 기본 영속성 설정에서 나온다. Redis는 AOF를 켜도 기본 `appendfsync everysec`이면 fsync를 별도 스레드가 맡고 `always`일 때만 응답 전에 fsync한다 ([[Persistence]]). InnoDB 기본값은 commit마다 redo를 flush한다 ([[MySQL-InnoDB-Redo-and-Crash-Recovery|InnoDB Redo]])
- 두 저장소를 수치로 비교하려면 같은 네트워크 조건에서 p50, p99와 처리량을 함께 재고, 인용 수치에는 원 출처와 측정 환경을 남긴다

## RESP — REdis Serialization Protocol

텍스트 기반 단순 프로토콜. 사람이 읽을 수 있고 파싱이 빠름.

```
*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n
└─ Array(3)
   ├─ Bulk String "SET"
   ├─ Bulk String "mykey"
   └─ Bulk String "myvalue"
```

| 타입 | 접두사 | 예 |
|------|--------|-----|
| Simple String | `+` | `+OK\r\n` |
| Error | `-` | `-ERR unknown command\r\n` |
| Integer | `:` | `:1000\r\n` |
| Bulk String | `$` | `$5\r\nhello\r\n` |
| Array | `*` | `*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n` |

RESP3(6.0+)는 Map, Set, Null, Double, Big Number, Push 등을 추가한, 대체로 RESP2의 상위집합인 프로토콜(공식 규격 표현도 mostly a superset — null 표현 등 일부 비대칭 존재). 연결은 RESP2로 시작하고 클라이언트가 `HELLO 3`으로 승격을 협상한다 (HELLO는 6.0.0부터). 6.0에서는 실험적 opt-in이었고, Redis 7부터는 RESP2와 RESP3 클라이언트 모두 코어 명령 전체를 호출할 수 있다 (명령별 응답 타입은 프로토콜 버전에 따라 다를 수 있음).

## Pipeline vs Transaction

**Pipeline**: 여러 명령을 한 번에 송신하고 응답을 모아 받음. **네트워크 RTT 절감**이 목적, 원자성은 보장 안 함.

```
SET key1 val1
SET key2 val2
GET key1
# 한 번의 라운드트립으로 3개 명령 처리
```

명령 수와 서버 사양이 같아도 왕복을 묶는지에 따라 처리량이 크게 달라진다. 공식 벤치마크 문서도 동기 명령을 하나씩 반복하면 서버가 아니라 네트워크나 IPC 지연과 클라이언트 지연을 재게 된다고 경고한다. `valkey-benchmark` 기본값은 요청 10만 건, 클라이언트 50개, `-P 1`(pipeline 없음)이며, 강의 실습(강사 노트북)의 SET 10만 건은 `-P 1`에서 약 초당 13만, `-P 10`에서 약 75만 요청이었다. `GET` 여러 번을 `MGET` 한 번으로 묶는 것도 같은 원리다. 대량 적재는 명령을 RESP 형식 파일로 만들어 `valkey-cli --pipe`로 밀어 넣는 것이 공식 권장 경로이고, 결과 요약의 `errors`와 `replies` 수로 누락을 확인한다.

**Transaction (MULTI/EXEC)**: 명령들을 큐에 쌓고 EXEC 시점에 일괄 실행. **원자성** 보장 (다른 클라이언트 명령 끼어들지 않음).

```
MULTI
SET key1 val1
SET key2 val2
EXEC
```

| 축 | Pipeline | Transaction |
|----|---------|-------------|
| 목적 | RTT 감소 | 원자성 |
| 다른 클라이언트 끼어들기 | 가능 | 불가 |
| 중간 실패 시 롤백 | — | **롤백 안 됨** (이미 실행된 명령 유지) |
| 결과 의존 분기 | 불가 (Lua로) | 불가 (Lua로) |

Redis Transaction은 RDBMS와 다름 — **EXEC 중 명령 실패해도 롤백 X**. [[Redis-Atomic-Operations|Lua 스크립트]]는 조건부 여러 명령을 다른 클라이언트와 인터리빙 없이 실행하는 수단이지만 RDBMS식 rollback을 추가하지 않는다. 오류 가능성이 있으면 입력과 key type을 먼저 검증하고, 부분 변경 뒤의 복구 또는 대사 경로를 설계한다.

WATCH + MULTI/EXEC = **낙관적 락(optimistic CAS)**. 위 트랜잭션 섹션 참조.

## 출처
- [우아한테크세미나 191121 우아한레디스 — 우아한테크](https://www.youtube.com/watch?v=mPB2CZiAkKM)
- [redis/src/ae.c — 이벤트 루프 백엔드 조건부 선택](https://github.com/redis/redis/blob/unstable/src/ae.c)
- [Redis serialization protocol (RESP) spec](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Redis Docs, HELLO 명령](https://redis.io/docs/latest/commands/hello/)
- [Redis Docs 아카이브, Install Redis on Windows](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-windows/) — 공식 네이티브 빌드 미제공, WSL2 안내
- [Redis Documentation, Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [You Don't Need Transaction Rollbacks in Redis — Redis](https://redis.io/blog/you-dont-need-transaction-rollbacks-in-redis/)
- [Valkey Documentation, Benchmarking tool](https://valkey.io/topics/benchmark/)
- [Valkey Documentation, Bulk loading](https://valkey.io/topics/mass-insertion/)
- [valkey.conf 9.1 THREADED I/O — valkey-io/valkey](https://github.com/valkey-io/valkey/blob/9.1/valkey.conf)
- [Redis Docs, Diagnosing latency issues](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Why is Redis so fast? — ByteByteGo, Alex Xu](https://blog.bytebytego.com/p/why-is-redis-so-fast)
- [인프런, Hong, 키 수명을 관리하는 TTL의 모든 것 그리고 객체 캐싱과 Multi 처리](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481442)
- [인프런, Hong, 캐시 무효화와 캐시 스탬피드 & 파이프라이닝과 운영관점의 팁](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481443)
- [인프런, 김빌, Redis 기본 설명](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273690)

## 관련 문서
- [[Redis-Architecture-HA|복제와 Sentinel 고가용성 (비동기 복제, quorum, failover 유실, 클라이언트 전환)]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding]]
- [[Persistence]]
- [[Redis-vs-Memcached|redis와 memcached의 차이점]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로]]
- [[Distributed-Lock|분산 락]]
