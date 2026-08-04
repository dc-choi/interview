---
tags: [architecture, ddd, distributed, saga, transaction]
status: done
verified_at: 2026-08-04
category: "Architecture - DDD, Hexagonal"
aliases: ["Saga Pattern", "사가 패턴", "분산 트랜잭션"]
---

# Saga 패턴 — 분산 트랜잭션을 단계 분해로 다루기

여러 Bounded Context(또는 마이크로서비스)에 걸친 비즈니스 프로세스를 **로컬 트랜잭션의 연속**으로 쪼개고, 각 단계 실패 시 **보상 트랜잭션(compensating transaction)**으로 수렴시키는 패턴이다. 모든 참여자를 하나의 prepare/commit으로 묶는 대신, 업무가 정의한 중간 상태와 복구 절차를 드러낸다.

## 왜 필요한가

분산 환경에서 ACID 트랜잭션을 여러 서비스에 걸치면:
- prepared participant가 최종 결정까지 락과 복구 상태를 유지할 수 있음
- 한 participant의 지연이나 장애가 전체 완료 시간을 늘림
- 이질적인 저장소와 외부 서비스는 같은 원자적 commit 프로토콜을 지원하지 않을 수 있음

Saga는 단일 원자적 commit 대신 **단계별 로컬 트랜잭션 + 보상**을 선택한다. 그래서 중간 상태의 가시성, 동시 요청 격리, 보상 실패 복구를 애플리케이션이 책임져야 한다. 다른 전략과의 선택 기준은 [[Distributed-Transaction-Strategies|분산 트랜잭션 전략]]에서 비교한다.

## 두 가지 조정 방식

### Orchestration (지휘자)

**중앙 Orchestrator**가 각 단계 명령을 발행하고 결과를 받아 다음 단계를 결정한다.

```
[Order Saga Orchestrator]
   → 결제 요청 → [Payment]
   ← 결제 성공
   → 재고 확정 → [Inventory]
   ← 재고 부족 (실패)
   → 결제 환불 (보상) → [Payment]
   → 주문 취소 (보상) → [Order]
```

장점: 흐름과 상태가 한곳에 모여 **디버깅, 관찰이 쉬움**. 복잡한 분기와 timeout 정책에 적합.
단점: 중앙 조정 로직의 변경 부담과 장애 영향 범위가 커질 수 있다. 다만 durable state와 다중 인스턴스로 구성하면 Orchestrator가 곧 단일 장애점이라는 뜻은 아니다.

### Choreography (군무)

각 서비스가 이벤트를 발행, 구독하며 **자율적으로** 다음 행동을 결정한다. 중앙 조정자 없음.

```
[Order] → OrderConfirmedEvent
            ↓
        [Payment] → PaymentProcessedEvent
            ↓
        [Inventory] → InventoryCommittedEvent
            ↓
        [Shipping] → ShippingStartedEvent
```

장점: 참여자가 이벤트 계약에 반응하므로 중앙 흐름 제어에 대한 결합이 작다.
단점: 전체 흐름이 한 코드 경로로 드러나지 않아 추적이 어렵다. 새 단계를 추가해도 이벤트 계약, 순서, 보상 관계가 바뀌면 기존 참여자의 검토가 필요하다.

### 선택 기준

| 상황 | 권장 |
|---|---|
| 참여자가 적고 반응이 독립적인 단순 흐름 | Choreography |
| 복잡한 분기, 조건, 롤백 시나리오 | Orchestration |
| 중앙 상태와 timeout, 재시도 정책이 필요함 | Orchestration |
| 이벤트 계약을 중심으로 느슨하게 확장해야 함 | Choreography |

## 보상 트랜잭션 원칙

각 단계는 **취소 가능한(reversible) 액션**이거나 **취소 불가능한 시점 이전에** 배치되어야 한다.

- **Compensatable**: 결제 인증, 재고 예약 (취소 가능)
- **Pivot**: 결제 확정 (이 이후로는 보상이 비즈니스적으로 어색해짐 — 환불 처리로 처리)
- **Retriable**: 알림 발송 (실패해도 재시도, 보상 불필요)

순서 설계 원칙: **Compensatable 단계를 먼저, Pivot은 가장 늦게**. 그래야 Pivot 이전 어디서 실패해도 깔끔하게 되돌릴 수 있다.

보상은 단순 "역연산"이 아닌 경우가 많다 — 결제 환불은 결제 취소가 아니라 **환불 거래를 추가**한다. 회계상 흔적이 남는 보상이 일반적.

## NestJS @nestjs/cqrs로 구현

`@Saga()` 데코레이터로 이벤트 스트림을 받아 후속 명령을 발행할 수 있다. 한 Saga 클래스에 이벤트와 명령 매핑을 모을 수 있지만, 이 기능 자체가 durable coordinator, 메시지 전달 보장, 재시작 후 복구를 제공하는 것은 아니다.

```typescript
@Injectable()
export class OrderFulfillmentSaga {
  @Saga()
  orderConfirmed = (events$) => events$.pipe(
    ofType(OrderConfirmedEvent),
    map(e => new ProcessPaymentCommand(e.orderId, e.totalAmount)),
  );

  @Saga()
  paymentFailed = (events$) => events$.pipe(
    ofType(PaymentFailedEvent),
    mergeMap(e => [
      new ReleaseInventoryCommand(e.orderId),    // 보상
      new CancelOrderCommand(e.orderId, '결제 실패'), // 보상
    ]),
  );
}
```

이벤트→명령 매핑이 RxJS 파이프라인으로 표현되어 분기와 보상이 한곳에 모인다.

## 함정과 대응

**멱등성 부재** — 메시지 브로커는 At-Least-Once를 보장하기 쉬워 같은 이벤트가 두 번 도착할 수 있다. 각 핸들러는 **eventId 기반 중복 제거**(처리된 이벤트 ID를 저장)나 **자연 멱등 연산**으로 설계.

**부분 실패의 무한 루프** — 보상이 또 실패하면 오류 종류와 업무 기한에 맞춘 제한 재시도, backoff와 jitter, DLQ 또는 운영자 대기열을 둔다. terminal failure를 누가 판정하고 처리할지 정한다.

**Pivot 이후 실패** — 결제는 확정됐는데 배송이 안 됨. 이건 사용자에게 보상(쿠폰, 환불)을 제공하는 비즈니스 결정. 시스템적 롤백이 아님.

**관찰성 부족** — Choreography에서는 주문이 어느 단계인지 알기 어렵다. **Saga 상태 테이블**에 `businessKey`, `currentStep`, `status`, `attempts`, `nextAttemptAt`, `lastError`를 기록한다.

**이벤트 순서** — Kafka key로 같은 aggregate의 이벤트를 같은 partition에 배치할 수 있고, Kafka는 그 partition 안의 기록 순서를 보장한다. 이는 전역 순서나 consumer의 exactly-once 업무 처리를 뜻하지 않으므로 handler의 멱등성과 상태 전이 검증이 필요하다.

**보상 복구 유실** — 메모리에서만 보상 목록을 관리하면 coordinator 종료와 함께 복구 단서도 사라진다. 실패한 보상은 durable registry에 목표 동작, 상태, 재시도 시각, 마지막 오류를 저장하고 worker가 이어서 처리한다. 자동 판단이 안전하지 않은 항목만 운영자에게 올린다.

## Outbox와의 관계

Saga는 **이벤트로 단계를 잇는다** → 이벤트가 유실되면 흐름이 중단. Outbox 패턴이 이를 막는다: 도메인 트랜잭션과 같은 DB 트랜잭션에 이벤트를 저장 → 별도 Relay가 브로커로 발행 → At-Least-Once 보장.

Saga + Outbox + 멱등성 처리는 단계 유실과 중복 위험을 줄이는 조합이다. 전체를 원자적 rollback으로 바꾸지는 않으므로 보상 불가 상태와 수동 복구 계약은 여전히 필요하다.

## 면접 포인트

Q. Saga와 2PC의 차이?
- 2PC: coordinator가 참여자의 prepare/commit을 조정하며 실패 시 block될 수 있음. 참여 시스템 지원과 긴 결합이 필요
- Saga: 각 단계가 즉시 커밋 + 실패 시 보상 → 최종 일관성, 높은 가용성, 자율성
- 2PC가 불가능한 것은 아니지만 독립 서비스와 이질 저장소에는 제약이 커서, 장기 business process에는 Saga를 자주 검토

Q. Orchestration vs Choreography 어떻게 선택?
- 흐름 복잡도가 높고 분기가 많으면 Orchestration (중앙에서 관찰, 디버깅)
- 단순 직렬 + 새 단계 추가 빈번하면 Choreography (결합도 낮음)
- 두 방식을 한 시스템 안에서 혼용해도 됨 — 비즈니스 흐름 단위로 선택

Q. 보상 트랜잭션 설계 시 주의점?
- 모든 단계가 반드시 보상 가능해야 하는 건 아님 — Compensatable / Pivot / Retriable로 분류
- 보상은 역연산이 아니라 **추가 거래**인 경우가 많음 (환불, 취소 기록)
- 멱등성, 재시도, DLQ 없이는 보상 자체가 또 다른 장애의 원인이 됨

## 출처

- [Chris Richardson, Saga pattern](https://microservices.io/patterns/data/saga.html)
- [AWS Prescriptive Guidance, Saga patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html)
- [Dowon Lee 강사, 분산 트랜잭션 처리 방법](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289778)
- [Dowon Lee 강사, Saga 패턴](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289779)
- [Dowon Lee 강사, 보상 트랜잭션 작동 흐름](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290749)
- [최상용 강사, Saga Orchestration](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337601)
- [최상용 강사, 보상 작업 기록과 재시도](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337628)
- [최상용 강사, Saga Choreography](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=325831)

## 관련 문서
- [[Domain-ORM-Mapper|도메인 ↔ ORM Mapper 패턴]]
- [[Distributed-Transaction-Strategies|분산 트랜잭션 전략]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 적용]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장 (At-Least-Once 등)]]
