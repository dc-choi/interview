---
tags: [reliability, messaging, idempotency, consumer, exactly-once]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["Idempotent Consumer", "멱등 컨슈머", "멱등성", "exactly-once 처리", "effectively-once"]
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

연산 자체가 멱등이면 중복 추적이 필요 없다. `SET status = 'PAID'`(절대값 대입), `UPSERT`, id 기준 `DELETE`처럼 **여러 번 실행해도 같은 결과**가 되게 설계한다. `balance = balance + 100`(증분) 같은 비멱등 연산을 피한다.

### 2. 멱등 키 + 중복 제거 저장소

프로듀서가 메시지에 고유 키(메시지 id 또는 **비즈니스 멱등 키**, 예: `orderId`)를 붙이고, 컨슈머는 처리한 키를 저장소에 기록해 이미 본 키면 건너뛴다.

```sql
-- DB 유니크 제약으로: 중복이면 INSERT가 실패 → 건너뜀 (원자적)
INSERT INTO processed_messages (idempotency_key, processed_at)
VALUES ('order-9921', NOW())
ON CONFLICT (idempotency_key) DO NOTHING;
-- affected rows = 0 이면 이미 처리됨 → skip
```

```typescript
// Redis: SET NX 로 check-and-set을 원자적으로 (TTL은 재전달 윈도보다 길게)
const first = await redis.set(`idem:${key}`, '1', 'NX', 'EX', 86400);
if (!first) return; // 이미 처리됨
```

### 3. 상태 머신 가드 (조건부 전이)

"PENDING -> PAID"처럼 유효한 전이만 허용하면, 이미 PAID인 주문에 재처리가 와도 no-op이 된다. [[External-API-Integration-Patterns|상태 머신 패턴]]과 결합.

## 원자성이 핵심 — check-then-act 레이스

가장 흔한 버그는 **"확인 후 처리"를 따로 하는 것**이다. 같은 메시지가 동시에 두 번 전달되면(visibility 만료가 처리 중에 겹침) 둘 다 "안 봤다"를 통과해 이중 처리된다. 중복 체크는 반드시 **원자적**(`INSERT ... ON CONFLICT`, `SET NX`)이어야 한다. [[Race-Condition-Patterns]]

또 하나 — **부수효과와 멱등 기록이 따로 놀면** 부분 실패가 난다. 부수효과는 됐는데 기록 전에 죽으면 재처리되고, 기록만 되고 부수효과가 실패하면 유실된다. 둘을 한 트랜잭션에 묶거나(Inbox 패턴), 부수효과 자체를 멱등 키로 보호한다(외부 API는 `Idempotency-Key` 헤더, 예: 결제 PG).

### Inbox 패턴

메시지 id를 비즈니스 쓰기와 **같은 DB 트랜잭션**에서 inbox 테이블에 기록한다. 커밋되면 처리와 중복 기록이 원자적으로 함께 확정된다. 발행 쪽 Outbox와 짝.

## SQS 특이점

- 표준 큐 = at-least-once → 위 전략으로 멱등 직접 구현.
- **FIFO 큐의 content-based dedup은 5분 윈도**라 그 너머 재전달이나 비즈니스 단위 중복은 못 막는다. FIFO dedup ≠ 완전한 멱등성. [[SQS]]

## 사례 — 발주 자동화 컨슈머

주문 메시지가 중복 전달되면 **이중 발주**가 나간다. 멱등 키 = `orderId`로 `orders_processed`에 유니크 제약을 걸고, 발주 호출 직전 원자적 INSERT가 성공할 때만 진행한다. 외부 발주 API에도 `Idempotency-Key`를 실어 양쪽에서 막는다. 처리 컨슈머 골격은 [[SQS-Consumer-Lambda-vs-ECS]].

## 흔한 함정

- check-then-act 비원자 구현 → 동시 중복에 뚫림
- 멱등 키 TTL이 재전달 윈도보다 짧음 → 만료 후 재처리
- 전달만 멱등 처리하고 **부수효과(외부 호출)**는 멱등이 아님
- DLQ 재처리 시 멱등 키가 만료돼 중복

## 면접 체크포인트

- at-least-once에서 멱등성이 컨슈머 책임인 이유, exactly-once가 effectively-once인 이유
- 자연 멱등 설계 vs 멱등 키 dedup vs 상태 머신 가드
- check-then-act 레이스와 원자적 dedup(`ON CONFLICT`, `SET NX`)
- 부수효과와 멱등 기록의 원자성(Inbox), 외부 API `Idempotency-Key`
- SQS FIFO content-based dedup의 5분 한계

## 출처

- [Microsoft — Idempotent Consumer / message deduplication](https://learn.microsoft.com/azure/architecture/reference-architectures/containers/aks-mqtt)
- [microservices.io — Idempotent Consumer pattern](https://microservices.io/patterns/communication-style/idempotent-consumer.html)

## 관련 문서

- [[SQS|Amazon SQS (at-least-once, FIFO dedup)]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 골격]]
- [[MQ-Kafka-Consumer|Kafka 컨슈머]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴 (상태 머신, 대사, Saga)]]
- [[Race-Condition-Patterns|Race Condition 패턴]]
- [[Transactions|트랜잭션 (Outbox/Inbox)]]
