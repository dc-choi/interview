---
tags: [architecture, ddd, distributed, saga, transaction]
status: done
category: "Architecture - DDD·Hexagonal"
aliases: ["Saga Pattern", "사가 패턴", "분산 트랜잭션"]
---

# Saga 패턴 — 분산 트랜잭션을 단계 분해로 다루기

여러 Bounded Context(또는 마이크로서비스)에 걸친 비즈니스 프로세스를 **로컬 트랜잭션의 연속**으로 쪼개고, 각 단계 실패 시 **보상 트랜잭션(compensating transaction)**으로 되돌리는 패턴. 2PC 같은 분산 트랜잭션을 쓰지 않고 최종 일관성(eventual consistency)을 달성한다.

## 왜 필요한가

분산 환경에서 ACID 트랜잭션을 여러 서비스에 걸치면:
- 2PC는 코디네이터·참여자 모두 락을 잡아야 해 가용성 저하
- 한 서비스 장애가 전체를 묶음 (CAP의 가용성 손실)
- 서비스 자율성(데이터 소유권 분리) 원칙과 충돌

Saga는 강한 일관성을 포기하고 **단계별 로컬 트랜잭션 + 보상**으로 풀어 가용성과 자율성을 지킨다.

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

장점: 흐름이 한곳에 모여 **디버깅·관찰이 쉬움**. 복잡한 분기, 조건부 분기에 적합.
단점: Orchestrator가 SPOF. 중앙 의존성이 늘어 결합도 상승.

### Choreography (군무)

각 서비스가 이벤트를 발행·구독하며 **자율적으로** 다음 행동을 결정한다. 중앙 조정자 없음.

```
[Order] → OrderConfirmedEvent
            ↓
        [Payment] → PaymentProcessedEvent
            ↓
        [Inventory] → InventoryCommittedEvent
            ↓
        [Shipping] → ShippingStartedEvent
```

장점: 서비스 간 결합도 낮음, 새로운 단계 추가 시 기존 코드 수정 없이 이벤트 리스너만 추가.
단점: 전체 흐름이 코드로 드러나지 않음 — "이 주문이 지금 어디서 막혔는지" 추적이 어려움.

### 선택 기준

| 상황 | 권장 |
|---|---|
| 단계 수 ≤ 3, 단순 직렬 흐름 | Choreography |
| 복잡한 분기·조건·롤백 시나리오 | Orchestration |
| 새 단계 추가가 빈번한 서비스 생태계 | Choreography |
| 비즈니스 흐름이 한 화면(다이어그램)으로 표현되어야 함 | Orchestration |

## 보상 트랜잭션 원칙

각 단계는 **취소 가능한(reversible) 액션**이거나 **취소 불가능한 시점 이전에** 배치되어야 한다.

- **Compensatable**: 결제 인증, 재고 예약 (취소 가능)
- **Pivot**: 결제 확정 (이 이후로는 보상이 비즈니스적으로 어색해짐 — 환불 처리로 처리)
- **Retriable**: 알림 발송 (실패해도 재시도, 보상 불필요)

순서 설계 원칙: **Compensatable 단계를 먼저, Pivot은 가장 늦게**. 그래야 Pivot 이전 어디서 실패해도 깔끔하게 되돌릴 수 있다.

보상은 단순 "역연산"이 아닌 경우가 많다 — 결제 환불은 결제 취소가 아니라 **환불 거래를 추가**한다. 회계상 흔적이 남는 보상이 일반적.

## NestJS @nestjs/cqrs로 구현

`@Saga()` 데코레이터로 이벤트 스트림을 받아 후속 명령을 발행. Choreography에 가까운 형태지만, 한 Saga 클래스에 모아두면 Orchestration처럼 흐름이 한눈에 보인다.

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

**부분 실패의 무한 루프** — 보상이 또 실패하면? 재시도 상한(예: 3회) + DLQ + 수동 개입 알람을 둔다. "어쩔 수 없는 상태"를 받아들이는 인간 프로세스가 필요.

**Pivot 이후 실패** — 결제는 확정됐는데 배송이 안 됨. 이건 사용자에게 보상(쿠폰·환불)을 제공하는 비즈니스 결정. 시스템적 롤백이 아님.

**관찰성 부족** — Choreography에서는 "주문 12345가 지금 어느 단계인지" 알기 어렵다. **Saga 상태 테이블**(orderId, currentStep, status, retryCount)을 둬서 모든 진행을 기록. 디버깅·통계에 필수.

**이벤트 순서** — 같은 애그리게이트에 대한 이벤트는 순서대로 처리돼야 함. 파티션 키(예: `orderId`)로 같은 키 이벤트가 같은 컨슈머에 가도록 보장.

## Outbox와의 관계

Saga는 **이벤트로 단계를 잇는다** → 이벤트가 유실되면 흐름이 중단. Outbox 패턴이 이를 막는다: 도메인 트랜잭션과 같은 DB 트랜잭션에 이벤트를 저장 → 별도 Relay가 브로커로 발행 → At-Least-Once 보장.

Saga + Outbox + 멱등성 처리 = 분산 환경에서 **상태 누수 없는 비즈니스 프로세스**의 표준 조합.

## 면접 포인트

Q. Saga와 2PC의 차이?
- 2PC: 모든 참여자가 락 잡고 동시 커밋/롤백 → 강한 일관성, 낮은 가용성
- Saga: 각 단계가 즉시 커밋 + 실패 시 보상 → 최종 일관성, 높은 가용성·자율성
- 마이크로서비스 환경에서는 2PC가 거의 불가능하므로 Saga가 사실상 표준

Q. Orchestration vs Choreography 어떻게 선택?
- 흐름 복잡도가 높고 분기가 많으면 Orchestration (중앙에서 관찰·디버깅)
- 단순 직렬 + 새 단계 추가 빈번하면 Choreography (결합도 낮음)
- 두 방식을 한 시스템 안에서 혼용해도 됨 — 비즈니스 흐름 단위로 선택

Q. 보상 트랜잭션 설계 시 주의점?
- 모든 단계가 반드시 보상 가능해야 하는 건 아님 — Compensatable / Pivot / Retriable로 분류
- 보상은 역연산이 아니라 **추가 거래**인 경우가 많음 (환불, 취소 기록)
- 멱등성·재시도·DLQ 없이는 보상 자체가 또 다른 장애의 원인이 됨

## 관련 문서
- [[Domain-ORM-Mapper|도메인 ↔ ORM Mapper 패턴]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 적용]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장 (At-Least-Once 등)]]
