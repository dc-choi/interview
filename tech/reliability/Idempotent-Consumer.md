---
tags: [reliability, messaging, idempotency, consumer, exactly-once]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["Idempotent Consumer", "멱등 컨슈머", "멱등 소비 처리", "exactly-once 처리", "effectively-once"]
verified_at: 2026-09-04
---

# 멱등 컨슈머 (Idempotent Consumer)

대부분의 메시지 브로커(SQS, Kafka 등)는 **at-least-once** 전달이다. 같은 메시지가 한 번 이상 도착하는 게 정상이다. 그래서 **정확히 한 번 처리되는 보장은 브로커가 아니라 컨슈머가** 만든다. 같은 메시지를 두 번 받아도 결과가 한 번 처리한 것과 같아야 한다 — 이것이 멱등성이다.

## 중복은 왜 생기나

- **visibility timeout 만료**: 처리가 길어 타임아웃이 지나면 SQS가 같은 메시지를 다시 보낸다(아직 처리 중인데). [[SQS]]
- **프로듀서 재시도**: 응답을 못 받은 프로듀서가 같은 메시지를 다시 발행한다.
- **컨슈머 재시작/리밸런스**: 오프셋 커밋 전에 죽으면 Kafka가 그 구간을 다시 준다.
- **네트워크 ack 유실**: 처리는 됐는데 ack가 유실되어 재전달된다.

## exactly-once는 착시 — effectively-once를 노린다

진짜 "정확히 한 번 전달"은 분산 환경에서 사실상 불가능하다(두 장군 문제). 현실에서 달성하는 건 **effectively-once = at-least-once 전달 + 멱등 처리**다. Kafka의 EOS(트랜잭션)도 Kafka 내부 read-process-write에 한정되고, 외부 DB나 API 부수효과까지는 컨슈머가 멱등으로 막아야 한다.

## 멱등성 확보 전략

### 1. 자연 멱등 설계 (가장 좋음)

연산 자체가 멱등이면 중복 추적이 필요 없다. 같은 상태를 반복 대입하는 `SET status = 'PAID'`와 id 기준 `DELETE`는 상태 전이 조건, trigger와 외부 부수효과까지 같은 결과를 낼 때 자연 멱등이다. `UPSERT`도 `DO NOTHING` 또는 같은 payload와 상태를 재대입하는 제한된 update일 때만 그렇다. conflict update가 카운터 증가, `updated_at` 변경이나 다른 부수효과를 만들면 멱등이 아니다. `balance = balance + 100`(증분) 같은 비멱등 연산을 피한다.

### 2. 멱등 키 + 상태 저장소

프로듀서가 메시지에 고유 키(메시지 id 또는 **비즈니스 멱등 키**, 예: `orderId`)를 붙이고, 컨슈머는 그 키의 상태를 저장한다. 유니크 INSERT나 Redis `SET NX`는 **처리 완료의 증명**이 아니라 원자적인 claim일 뿐이다. 외부 부수효과보다 먼저 완료 marker를 확정하면, 그 직후 프로세스가 죽었을 때 다음 수신이 작업을 건너뛰어 유실된다.

같은 DB의 짧은 효과는 Inbox와 업무 쓰기를 하나의 짧은 트랜잭션으로 묶는다. 이 경우 crash 시 미커밋 claim도 함께 rollback되므로 durable `PROCESSING` lease나 heartbeat가 필요 없다.

```text
BEGIN
  UNIQUE idempotency_key로 inbox INSERT
  중복이면 저장된 COMPLETED 결과를 반환
  신규이면 같은 DB의 비즈니스 UPDATE와 inbox COMPLETED를 함께 기록
COMMIT 후 ACK
```

오래 걸리거나 외부 효과가 있는 작업은 claim을 별도 트랜잭션에서 `PROCESSING` lease로 커밋한 뒤 실행한다. 신선한 lease는 ACK하지 않고, 만료된 lease만 새 owner token으로 회수한다. 완료도 owner 조건으로 커밋하며 외부 호출은 provider 멱등 키와 대사로 보호한다. 두 방식을 한 트랜잭션인 것처럼 섞으면 안 된다.

```typescript
// Redis SET NX는 완료 marker가 아니라 짧은 lease로만 쓴다.
const acquired = await redis.set(`lease:${key}`, ownerToken, 'NX', 'EX', 60);
if (!acquired) throw new RetryableError(); // 다른 owner가 처리 중, ACK하지 않음
// 긴 작업은 owner token을 확인하며 lease를 연장한다.
```

외부 API 효과는 DB에 의도와 outbox를 함께 기록한 뒤, provider가 보장하는 안정적인 `Idempotency-Key`로 호출한다. 응답을 받기 전에 죽어 결과가 불명확하면 같은 키로 재시도하고 provider 또는 대사 기록으로 결과를 확정한다. 신선한 `PROCESSING`은 완료가 아니므로 ACK하지 않는 흐름은 [[At-Least-Once|At-Least-Once]]와 같다.

### 3. 상태 머신 가드 (조건부 전이)

"PENDING -> PAID"처럼 유효한 전이만 허용하면, 이미 PAID인 주문에 재처리가 와도 no-op이 된다. [[External-API-Integration-Patterns|상태 머신 패턴]]과 결합.

## 원자성이 핵심 — check-then-act 레이스

가장 흔한 버그는 **"확인 후 처리"를 따로 하는 것**이다. 같은 메시지가 동시에 두 번 전달되면(visibility 만료가 처리 중에 겹침) 둘 다 "안 봤다"를 통과해 이중 처리된다. 중복 체크는 반드시 **원자적**(`INSERT ... ON CONFLICT`, `SET NX`)이어야 한다. [[Race-Condition-Patterns]]

또 하나 — **부수효과와 완료 기록이 따로 놀면** 부분 실패가 난다. 부수효과는 됐는데 완료 기록 전에 죽으면 재처리되고, 완료 기록만 먼저 쓰면 실제 효과가 유실된다. 같은 DB의 효과는 Inbox 트랜잭션으로 묶고, 외부 API는 provider의 멱등 키와 대사로 보호한다.

### Inbox 패턴

메시지 id를 비즈니스 쓰기와 **같은 DB 트랜잭션**에서 inbox 테이블에 기록한다. 커밋되면 처리와 중복 기록이 원자적으로 함께 확정된다. 발행 쪽 Outbox와 짝.

### 외부 알림 발송과 클라이언트 `event_id`

외부 provider로 보내는 알림은 DB 상태 갱신과 한 트랜잭션으로 묶을 수 없다. 비즈니스 전이, `notification_event(event_id)`와 outbox insert를 함께 커밋하고, Relay가 그 `event_id`를 payload에 넣어 발송한다. Relay가 응답을 받기 전에 죽으면 실제로 provider가 수락했는지 알 수 없어 재시도와 중복 가능성 중 하나를 선택해야 한다.

수신 클라이언트도 표시한 `event_id`를 지속 저장소에 기록해 같은 이벤트의 반복 표시를 막는다. 보관 기간은 provider의 최대 지연, 재시도와 DLQ 재처리 윈도보다 길어야 한다. 앱 코드가 실행되지 않는 자동 표시 경로는 별도 제어가 필요하므로, client dedup을 end-to-end exactly-once 보장으로 부르면 안 된다. provider별 전달 단계와 등록 정보는 [[Notification-Broadcast-System|대규모 알림 시스템]]에서 다룬다.

## SQS 특이점

- 표준 큐 = at-least-once → 위 전략으로 멱등 직접 구현.
- **FIFO 큐의 content-based dedup은 5분 윈도**라 그 너머 재전달이나 비즈니스 단위 중복은 못 막는다. FIFO dedup ≠ 완전한 멱등성. [[SQS]]

## 사례 — 발주 자동화 컨슈머

주문 메시지가 중복 전달되면 **이중 발주**가 나간다. 멱등 키 = `orderId`로 inbox와 주문 상태를 같은 DB 트랜잭션에서 관리하고, 외부 발주 API에는 같은 `Idempotency-Key`를 재사용한다. 호출 결과가 불명확하면 같은 키로 재시도하거나 provider 기록과 대사한다. 처리 컨슈머 골격은 [[SQS-Consumer-Lambda-vs-ECS]].

## 흔한 함정

- check-then-act 비원자 구현 → 동시 중복에 뚫림
- `SET NX`나 유니크 INSERT를 완료 marker로 먼저 확정 → crash 뒤 작업 유실
- 멱등 키 TTL이 재전달 윈도보다 짧음 → 만료 후 재처리
- 전달만 멱등 처리하고 **부수효과(외부 호출)**는 멱등이 아님
- DLQ 재처리 시 멱등 키가 만료돼 중복

## 면접 체크포인트

- at-least-once에서 멱등성이 컨슈머 책임인 이유, exactly-once가 effectively-once인 이유
- 자연 멱등 설계 vs 멱등 키 dedup vs 상태 머신 가드
- check-then-act 레이스와 원자적 claim(`ON CONFLICT`, `SET NX`), 완료 상태와의 차이
- 부수효과와 멱등 기록의 원자성(Inbox), 외부 API `Idempotency-Key`
- SQS FIFO content-based dedup의 5분 한계

## 출처

- [Microsoft — Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection)
- [AWS — SQS FIFO exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [PostgreSQL 공식 문서, INSERT와 ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [microservices.io — Idempotent Consumer pattern](https://microservices.io/patterns/communication-style/idempotent-consumer.html)

## 관련 문서

- [[SQS|Amazon SQS (at-least-once, FIFO dedup)]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 골격]]
- [[MQ-Kafka-Consumer|Kafka 컨슈머]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴 (상태 머신, 대사, Saga)]]
- [[Race-Condition-Patterns|Race Condition 패턴]]
- [[Transactions|트랜잭션 (Outbox/Inbox)]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Notification-Broadcast-System|대규모 알림 시스템 (상태 전이 알림)]]
