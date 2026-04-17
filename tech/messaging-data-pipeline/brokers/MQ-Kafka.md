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

## 관련 문서
- [[Event-Driven-Architecture|Event-driven architecture]]
- [[Consumer-Group|Consumer Group]]
- [[DLQ|Dead Letter Queue]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
