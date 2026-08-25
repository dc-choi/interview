---
tags: [database, redis, streams, pubsub, consumer-group, message-queue]
status: done
verified_at: 2026-08-25
category: "Data & Storage - Cache & KV"
aliases: ["Redis Streams", "Pub/Sub", "Redis Consumer Group", "XADD"]
---

# Redis Streams, Pub/Sub

Redis의 두 가지 메시징 도구. **Pub/Sub은 fire-and-forget 방송**, **Streams는 보존된 entry와 Consumer Group**. Streams의 내구성 경계는 RDB/AOF, 복제, 보존 정책에 따라 달라진다.

## Pub/Sub vs Streams 한눈에

| 축 | Pub/Sub | Streams |
|----|---------|---------|
| 영속성 | ✗ (메모리 휘발) | 설정한 RDB/AOF와 복제 정책에 따라 보존 |
| 메시지 보존 | 즉시 송신, 즉시 폐기 | 명시 삭제 또는 MAXLEN까지 |
| 오프라인 구독자 | 메시지 유실 | 재접속 후 따라잡기 가능 |
| ACK | ✗ | ✅ XACK |
| Consumer Group | ✗ | ✅ |
| 키 기반 분산 | 없음 (모든 구독자 수신) | 다른 stream 사용 또는 Cluster |

**규칙**: 통보, 이벤트 전파(놓쳐도 OK) → Pub/Sub. ACK와 재처리가 필요한 작업 → Streams. 놓치면 안 되는 흐름은 Streams만 고르지 말고 AOF fsync, 복제, 보존, producer outbox와 consumer 멱등성까지 함께 설계한다.

## Pub/Sub

```
PUBLISH news.tech "new article"
SUBSCRIBE news.tech
PSUBSCRIBE news.*           # 패턴 매칭
```

### 동작
- 메시지는 모든 활성 구독자에 즉시 송신, 즉시 폐기.
- 구독자가 연결 끊어진 사이 발행된 메시지는 **유실**.
- `PSUBSCRIBE`로 와일드카드 (`*`, `?`, `[]`) 지원.

### Cluster 환경 함정

3+ 노드 Cluster에서 일반 Pub/Sub은 **모든 노드에 브로드캐스트** — 트래픽 폭증. 7.0+의 **Sharded Pub/Sub** 사용:

```
SPUBLISH channel msg
SSUBSCRIBE channel
```

키처럼 채널이 슬롯에 묶임 → 해당 슬롯 노드만 통신.

### 적합 시나리오
- 캐시 무효화 통보 (개별 노드가 무효화 이벤트 듣고 로컬 캐시 비움)
- 실시간 알림 (놓쳐도 큰 영향 없는 UI 푸시)
- 다중 인스턴스 간 가벼운 신호

## Streams — 영속 로그

```
XADD orders * order_id 1001 amount 50.00
# 응답: 1733564000000-0 (timestamp-sequence)
```

각 메시지는 **단조 증가하는 ID** (밀리초 timestamp + sequence). 추가 전용 로그 — 변경 불가.

| 명령 | 용도 |
|------|------|
| `XADD stream * k1 v1 k2 v2` | 메시지 추가 |
| `XLEN stream` | 길이 |
| `XRANGE stream - +` | ID 범위 조회 |
| `XREAD COUNT 10 BLOCK 0 STREAMS stream $` | 새 메시지 대기 (블로킹) |
| `XTRIM stream MAXLEN ~ 10000` | 오래된 메시지 정리 |

### MAXLEN 정리 — 무한 증가 방지

```
XADD stream MAXLEN ~ 10000 * field value
# ~ (approximate)는 효율 — 정확한 MAXLEN 10000 보다 빠름
```

명시 trim 또는 `XADD ... MAXLEN`으로 자동 정리. 없으면 메모리 무한 증가.

## Consumer Group — Kafka 의미론

여러 컨슈머가 **그룹으로 메시지 분배** (각 메시지를 그룹 내 한 컨슈머만 처리).

```
XGROUP CREATE orders order-processor $        # 그룹 생성, $ = 현재 시점부터
XREADGROUP GROUP order-processor consumer1 COUNT 10 BLOCK 0 STREAMS orders >
                                              # > = 아직 안 받은 메시지만
```

### 핵심 개념

| 개념 | 의미 |
|------|------|
| Group | 한 stream에 대한 컨슈머 모음 |
| Consumer | 그룹 내 식별자 (예: `consumer1`, `consumer2`) |
| `>` | "아직 처리 안 한" 메시지 |
| ID 명시 | 자기가 받았지만 ack 안 한 메시지 재읽기 |
| PEL (Pending Entries List) | 그룹별로 받았지만 ack 안 한 메시지 추적 |

### 처리 후 ACK

```
XACK orders order-processor 1733564000000-0
```

ACK 안 하면 PEL에 남음 → 컨슈머 죽으면 다른 컨슈머가 인계 가능.

### 실패 컨슈머 인계 — XCLAIM / XAUTOCLAIM

```
XPENDING orders order-processor IDLE 60000 - + 100
# 60초 이상 처리 못 한 메시지 (죽은 컨슈머 의심)

XCLAIM orders order-processor consumer2 60000 1733564000000-0
# 60초 idle인 메시지를 consumer2가 인계
```

XCLAIM, XAUTOCLAIM으로 죽은 컨슈머 메시지 재배분. **at-least-once** 의미론은 보존된 stream entry에만 적용되므로, producer 변경과 `XADD` 사이 또는 consumer 효과와 `XACK` 사이의 경계는 별도로 멱등하게 설계한다.

## Streams vs Kafka

| 축 | Redis Streams | Kafka |
|----|--------------|-------|
| 처리량 | 명령 조합, payload, persistence와 배포 구조로 부하 테스트 | 파티션 수, payload, 복제와 클러스터 구성으로 부하 테스트 |
| 영속성 | RDB/AOF, 복제, 보존 정책이 손실 경계를 결정 | 디스크 로그 + 복제 |
| 보존 | MAXLEN으로 메모리 한계 | 보존 정책(시간, 크기, 무한) |
| 파티셔닝 | 다른 stream으로 수동 | 토픽 파티션 자동 |
| 운영 부담 | 기존 Redis를 재사용하면 낮출 수 있으나 persistence와 failover 운영 필요 | 브로커와 KRaft controller 운영 필요 |
| 통신 모델 | 단일 stream + 그룹 | 토픽 + 컨슈머 그룹 |
| 적합 | 재처리 가능한 작업 큐, 보존과 복구 경계를 명시한 소규모 이벤트 로그 | 대규모 이벤트 백본 |

**규칙**: 이미 Redis를 운영하고 측정된 처리량, 보존, 복구 목표를 만족하면 Streams를 검토한다. 장기 보존, 재처리, 파티셔닝과 다중 팀 데이터 계약이 핵심이면 Kafka 같은 전용 로그 브로커를 검토한다.

## 적합 시나리오

| 패턴 | 도구 |
|------|------|
| 캐시 무효화 통보 (놓쳐도 OK) | Pub/Sub |
| 실시간 채팅 메시지 (놓쳐도 OK) | Pub/Sub + 별도 영속화 |
| 작업 큐 (각 작업은 한 워커만) | Streams + Consumer Group + 멱등 소비 |
| 이벤트 소싱 후보 | Streams의 보존, 복제, 복구 목표와 source of truth를 먼저 결정 |
| 활동 피드 | Streams (`XREVRANGE`로 최신순 조회) |
| 메트릭 수집 + 일괄 처리 | Streams + MAXLEN 정리 |

## 흔한 실수

- **Pub/Sub로 작업 큐** → 컨슈머 죽으면 메시지 영구 유실. Streams로.
- **Streams MAXLEN 안 두고 운영** → 메모리 무한 증가. `~` 근사 사용으로 비용 절감하면서 trim.
- **XADD ID를 명시 지정** → 자동 시간 ID 사용 권장 (`*`). 명시는 마이그레이션 같은 특수 케이스만.
- **XACK 누락** → PEL 누적, 같은 메시지 재처리 폭증.
- **컨슈머 멱등성 X** → at-least-once니까 중복 가능. ID 기반 멱등 키 또는 외부 dedupe.
- **RDB/AOF만 켜면 무유실이라고 가정** → RDB snapshot, AOF fsync, failover와 producer/consumer 경계마다 손실 가능성을 검토.
- **Cluster에서 일반 Pub/Sub** → 모든 노드에 브로드캐스트, 비용 큼. Sharded Pub/Sub로.
- **Streams를 Kafka 대체로 무리** → 처리량, 다중 팀 거버넌스에서 한계. 도메인에 맞춰.

## 면접 체크포인트

- Pub/Sub vs Streams의 의미론 차이 — fire-and-forget vs 영속 + ACK
- Pub/Sub 메시지 유실 시나리오와 대안
- Cluster의 Pub/Sub 트래픽 폭증과 Sharded Pub/Sub
- Streams의 ID 형식 — timestamp-sequence
- MAXLEN으로 무한 증가 방지, `~` 근사 의의
- Consumer Group의 PEL과 XCLAIM/XAUTOCLAIM 인계
- at-least-once 의미론 → 멱등 처리 필수
- Streams vs Kafka 선택 기준 — 운영 부담 vs 처리량 한계

## 출처

- [Redis, Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis, Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

## 관련 문서

- [[Redis-Architecture|Redis architecture]]
- [[Redis-Atomic-Operations|Redis 원자 연산 (Lua, MULTI/EXEC, WATCH)]]
- [[Redis-Cluster-Sharding|Cluster, Sharding (Sharded Pub/Sub)]]
- [[Redis-Memory-Eviction|메모리 정책 (Streams MAXLEN과 maxmemory)]]
- [[NestJS-Microservices|NestJS Microservices (Redis Transport)]]
