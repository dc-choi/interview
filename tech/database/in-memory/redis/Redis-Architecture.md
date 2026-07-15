---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Redis Architecture"]
---

# Redis architecture

## replication
마스터와 복제본을 따로 두는 방식. 레디스의 복제 메커니즘은 비동기로 동작. 마스터가 복제본에 데이터가 잘 전달되었는지 확인하지 않음.

HA 기능이 없어서 마스터 장애 시 수동 변경 필요. 복제본에 직접 접속해서 복제를 끊고 애플리케이션 연결 설정도 변경해서 배포해야 함.

## sentinel
일반 노드들을 모니터링하는 센티넬 노드를 추가한 방식.

- 마스터가 죽으면 자동 페일오버 발생 → 복제본이 마스터로 승격
- 애플리케이션에서 연결 설정 변경 불필요 (센티넬이 변경된 마스터 정보로 매핑)
- 센티넬은 항상 **3대 이상 홀수**로 동작, **과반수 이상 동의** 시 페일오버 진행

## cluster
최소 3개의 마스터가 필요하며 샤딩 기능을 제공함. 모든 노드가 서로를 감시하다가 마스터가 비정상일 경우 자동으로 페일 오버를 진행함. 일반적으로 하나의 마스터에 하나의 복제본을 두는게 일반적이다.

- HA로 레플리카만 구성하는 경우도 있고, 클러스터 + HA 조합도 가능
- 레디스 클라이언트가 요청 키를 해시 함수로 돌려 나온 값으로 노드를 찾아 저장
- 데이터 복제본은 클러스터 내 다른 노드에 저장

### 마스터 노드 장애 시
- 레플리카가 있으면 레플리카가 마스터로 승격
- 레플리카가 없으면 해당 노드를 복구하거나 새 노드를 추가해야 함 (그 전까지 해당 데이터 접근 불가)

## 페일오버 시 클라이언트 전환

Sentinel, Cluster가 없거나 직접 HA를 구성하는 경우, 페일오버의 본질은 **클라이언트가 새 Primary를 바라보게 만드는 것**이다. 세 가지 방식이 있다.

| 방식 | 동작 | 트레이드오프 |
|---|---|---|
| 코디네이터 구독 | ZooKeeper, etcd, Consul에 현재 Primary 정보를 저장하고 애플리케이션이 구독해 변경을 감지 | 정확하고 빠름. 코디네이터 인프라와 클라이언트 연동 필요 |
| VIP 이동 | 장애 시 가상 IP를 새 Primary로 넘김 | 클라이언트 DNS 캐시 문제를 피함. 외부 서비스, 다양한 클라이언트 환경에 안정적. 네트워크 레벨 제어 필요 |
| DNS 변경 | DNS 레코드를 새 Primary로 갱신 | 관리 단순. 단 클라이언트나 런타임이 DNS를 오래 캐싱하면 전환이 늦어짐 (→ [[DNS]] TTL, 캐시 주의) |

Sentinel과 Cluster는 이 전환을 자동화한 것이다. Sentinel은 클라이언트가 Sentinel에 새 Primary를 질의하고, Cluster는 MOVED 리다이렉션으로 슬롯의 새 위치를 알린다. 직접 구성할 때는 위 셋 중 하나로 전환 경로를 명시적으로 설계해야 한다.

## 스레드 모델
- Node.js 스레드 모델과 유사
- 대부분의 명령이 **싱글 스레드**로 동작
- 암호화, File I/O의 경우 별도 스레드에서 처리
- 반드시 명령어를 받은 순서대로 처리됨
- 레디스 명령어는 **원자성을 보장**

## 레플리카와 Stale Data

레플리카는 **비동기식 복제**. 동기 방식은 너무 느림.

- 마스터 데이터가 특정 순간 레플리카와 다를 수 있음
- 마스터 장애 → 레플리카 승격 시 오래된 데이터일 수 있음 (Stale Data)
- 쓰기는 마스터, 읽기는 레플리카라면 Stale Data를 읽을 수 있음

### Stale Data 대응
- WAIT 명령어로 복제 완료 확인 가능. 하지만 느림
- 마스터에서 쓰기 후 변경된 값을 반환받았다면 그 값을 그대로 사용 (레플리카에서 다시 읽지 않음)
- 단순 읽기 요청은 오래된 데이터를 읽을 수 있음을 인정
- 무조건 최신 데이터가 필요하면 마스터에서 읽어야 함

## 트랜잭션

CAS 방식과 유사.

1. **WATCH**로 데이터를 관측
2. **MULTI**로 트랜잭션 시작
3. COMMIT = **EXEC**, ROLLBACK = **DISCARD**

EXEC 실패 시 대응:
- 유저에게 재시도 에러 리턴 (구현 간편, UX 불편)
- 서버에서 성공할 때까지 재시도 (타임아웃 구현 필요, 계속 실패하면 설계 문제)

## Pub/Sub

- 구독으로 특정 채널을 구독하고 발행으로 메시지를 보냄
- **메시지를 저장하지 않음** → 실패 시 재시도 불가, 못 받을 수도 있음
- 못 받을 수 있다고 전제하고 사용하는 것이 좋음
- 영속 + ACK 필요하면 [[Redis-Streams-PubSub|Streams]]로

## 이벤트 루프, I/O 모델

Redis는 **싱글 스레드 이벤트 루프 + epoll/kqueue 비동기 I/O**. 명령 자체는 한 번에 하나만 처리해 락이 필요 없음.

| 측면 | 동작 |
|------|------|
| 메인 루프 | epoll(Linux)/kqueue(macOS)/IOCP(Windows) |
| 파일 디스크립터 | 클라이언트당 1개, 다중화 |
| 명령 처리 | 받은 순서대로 직렬, 각 명령 원자성 |
| 백그라운드 | RDB/AOF rewrite는 fork된 자식, AOF flush는 별도 스레드 |
| Threaded I/O (6.0+) | 네트워크 read/write만 멀티스레드, 명령 실행은 여전히 싱글 |

**왜 빠른가**:
1. 메모리 기반 (디스크 I/O 회피)
2. 싱글 스레드 → 락, 컨텍스트 스위칭 오버헤드 0
3. 효율적 자료구조 (skiplist, hashtable 등 [[Redis-Internal-Encoding|내부 인코딩]])
4. epoll/kqueue로 수만 연결을 한 스레드가
5. Pipeline으로 RTT 제거

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

RESP3(7.0+)는 Map, Set, Big Number 등 추가 — 클라이언트가 협상으로 선택.

## Pipeline vs Transaction

**Pipeline**: 여러 명령을 한 번에 송신하고 응답을 모아 받음. **네트워크 RTT 절감**이 목적, 원자성은 보장 안 함.

```
SET key1 val1
SET key2 val2
GET key1
# 한 번의 라운드트립으로 3개 명령 처리
```

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

Redis Transaction은 RDBMS와 다름 — **EXEC 중 명령 실패해도 롤백 X**. 진짜 트랜잭션이 필요하면 [[Redis-Atomic-Operations|Lua 스크립트]] (스크립트 전체가 단일 명령처럼 원자 실행).

WATCH + MULTI/EXEC = **낙관적 락(optimistic CAS)**. 위 트랜잭션 섹션 참조.

## 출처
- [우아한테크 — Redis 운영, 자료구조, 분산 설계](https://www.youtube.com/watch?v=mPB2CZiAkKM)

## 관련 문서
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding]]
- [[Persistence]]
- [[Redis-vs-Memcached|redis와 memcached의 차이점]]
- [[Distributed-Lock|분산 락]]
- [[DNS|DNS (TTL, 캐시)]]
