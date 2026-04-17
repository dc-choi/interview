---
tags: [messaging, kafka, event-streaming]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka", "Message Queue: Kafka"]
---

# Kafka

오픈소스 분산 이벤트 스트리밍 도구. 내구성 및 효율적인 디스크 사용. 신뢰성을 보장한 메시지(키-값) 전달.

## 기본 구조

| 구성요소 | 역할 |
|----------|------|
| 프로듀서 | 메시지를 생산하는 서버 |
| 카프카 클러스터 | 프로듀서에서 생산되는 메시지를 보관 |
| 컨슈머 | 클러스터에 보관된 메시지를 polling |

- 카프카는 데이터를 한번에 합쳐서 보낼 수 있음 (배치)

## 토픽과 파티션

- 프로듀서는 여러 토픽으로 메시지를 보낼 수 있고, 컨슈머도 여러 토픽에서 메시지를 가져올 수 있음
- 하나의 토픽에는 여러 개의 **파티션**이 있을 수 있음
- 파티션 안에는 **offset**(메시지 일련번호)이 있음

### 파티션과 컨슈머 규칙
- 프로듀서는 서로 다른 파티션에 메시지를 발행 (지정 안 하면 라운드로빈)
- **파티션 하나에 컨슈머 하나**가 메시지를 처리
- 하나의 토픽을 처리할 수 있는 **컨슈머 그룹** 지정 가능
- 컨슈머가 죽으면 다른 파티션의 데이터를 받아올 수 있음 (리밸런싱)
- 파티션 하나에 컨슈머 두 개는 **불가능**
- 파티션 두 개에 컨슈머 하나는 **가능**

## 세그먼트

- 파티션에서 메시지를 디스크에 저장할 때 저장되는 파일 이름
- 영구 저장이 아니라 **삭제 정책**에 따라 삭제될 수 있음
- 세그먼트 데이터를 읽다가 실패하면 처음부터 다시 가져올 수 있음

## KRaft

- 주키퍼를 대체하는 합의 프로토콜
- 주키퍼가 빠졌기 때문에 배포와 운영이 더 쉬워짐
- 확장성이 **10배 이상** 향상

## 카프카가 빠른 이유

디스크 기반인데도 메모리급 처리량을 내는 이유는 **물리적 I/O 구조**에 있다.

### Sequential I/O + Append-Only Log
파티션은 끝에만 쓰는 append-only 로그. 디스크의 랜덤 seek이 없어 HDD에서도 **수백 MB/s** 처리량. 소비자는 자신의 offset으로 순차 읽기 → 캐시 지역성 양호.

### Zero-Copy (`sendfile`)
일반 파일 전송 과정은 `디스크 → 커널 버퍼 → 유저 버퍼 → 소켓 버퍼 → NIC`로 4번 복사·4번 컨텍스트 스위칭. Kafka는 Java NIO `transferTo()`가 내부적으로 Linux `sendfile` 시스템 콜을 써서 **유저 공간을 건너뛴다** → 1~2번 복사·2번 컨텍스트 스위칭.
- IBM 벤치마크 기준 약 **65% 처리량 개선**
- 압축된 메시지를 해제 없이 그대로 전송 가능

### Page Cache 활용
Kafka는 JVM 힙에 메시지를 캐시하지 않고 **OS Page Cache**에 맡긴다. 수 GB~수십 GB의 RAM을 활용하면서도 GC 부담이 없음. OS가 이미 잘 튜닝한 LRU·readahead를 그대로 활용.

### Batching + Compression
- 프로듀서는 `linger.ms` 동안 메시지를 모아 **배치 전송**
- 배치 단위로 gzip·lz4·snappy·zstd 압축
- 네트워크 대역폭과 디스크 쓰기량 동시에 감소

### 파티션 병렬화
토픽을 N개 파티션으로 쪼개면 N대의 컨슈머가 **독립적으로 병렬 처리** → 수평 확장이 선형에 가깝다.

## 실전 패턴 사례

대규모 운영에서 반복적으로 쓰이는 Kafka 활용 패턴.

### 키 기반 순서 보장 + 로드 분산

같은 엔티티(예: 주문 ID) 메시지는 **동일 키**로 발행 → 같은 파티션에 저장되어 **키 단위 순서 보장**. 서로 다른 키는 다른 파티션으로 분산되어 병렬 처리가 유지됨.

### Transactional Outbox + Debezium

DB 트랜잭션으로 Outbox 테이블에 이벤트를 기록하고, **Debezium MySQL Connector**가 binlog를 읽어 Kafka로 발행 (→ [[Transactional-Outbox]], [[CDC-Debezium]]).
- DB 변경과 이벤트 발행의 **원자성**을 CDC로 보장
- 부하가 높은 서비스는 Outbox 테이블을 **식별자 기준으로 샤딩**해 여러 Connector가 병렬 처리

### Event Bus (Spring Cloud RemoteApplicationEvent)

설정 변경·라우팅 규칙 같은 **모든 인스턴스가 동시에 알아야 하는 브로드캐스트**에 사용.
- 각 서버 인스턴스가 **유니크 Consumer Group ID** 사용 → 같은 토픽을 N대 서버가 독립 소비
- 낮은 처리량이 충분하므로 파티션 1개로 단순화

### Kafka Streams로 실시간 집계

원본 이벤트 스트림을 **상태 저장소(State Store)** 로 집계해 지표화. Grafana 대시보드로 시각화 → 이상 감지·운영 모니터링.

## Kafka가 필요한 시점
- 이벤트 리플레이가 필요 (장애 후 재처리, 새 소비자가 과거 이벤트 재생)
- 파티션 내 순서 보장이 필수

## Consumer 배치 처리: eachMessage vs eachBatch

`kafkajs` 기준, 컨슈머가 메시지를 소비하는 방식은 두 가지다.

### eachMessage (메시지 단위)
메시지 하나씩 콜백으로 넘겨받아 처리한다. 단순하지만 I/O·DB 호출이 메시지당 발생하므로 **대량 처리 시 처리량 부족과 메모리 누적** 위험이 있다.

```typescript
await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        await processOne(message);  // 메시지당 1회 처리
    },
});
```

### eachBatch (배치 단위)
한 번에 파티션에서 가져온 메시지 묶음(Batch) 단위로 처리한다. **벌크 INSERT, 집계, DB 트랜잭션 최적화에 유리**하다.

```typescript
await consumer.run({
    autoCommit: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        const holder = new BulkDataHolder();
        for (const message of batch.messages) {
            try {
                const parsed = JSON.parse(message.value?.toString() ?? '');
                holder.add(parsed);
            } catch (err) {
                // 단일 메시지 에러는 스킵하여 메시지 유실 방지
            }
        }
        await holder.flush();  // 배치 단위 벌크 처리
    },
});
```

### 선택 기준
| 상황 | 권장 |
|---|---|
| 메시지별 독립 처리 (알림, 이벤트 라우팅) | `eachMessage` |
| DB 벌크 INSERT, 집계, 대용량 파이프라인 | `eachBatch` |
| 전역 버퍼에 메시지 누적해서 주기적 flush | `eachBatch` + 지역 변수 홀더 |

**주의:** `eachBatch`에서 전역 변수에 누적하면 메모리 누수 발생. **배치 내부 지역 스코프**로 홀더를 두고 끝나면 즉시 GC되도록 해야 한다.
- 초당 수만 건 이상의 처리량
- 여러 소비자 그룹이 같은 이벤트를 독립적으로 소비
- 다른 시스템(SQS, Pub/Sub 등)과의 상세 비교는 [[Messaging-Patterns|메시징 패턴]] 참고

## 출처
- [frogred8 — 카프카는 왜 빠를까? (Zero-Copy·Sequential I/O)](https://frogred8.github.io/docs/034_why_is_kafka_fast/)
- [우아한형제들 — 우리팀은 카프카를 어떻게 사용하고 있을까](https://techblog.woowahan.com/17386/)

## 관련 문서
- [[Event-Driven-Architecture|Event-driven architecture]]
- [[Consumer-Group|Consumer Group]]
- [[DLQ|Dead Letter Queue]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium|CDC · Debezium]]
