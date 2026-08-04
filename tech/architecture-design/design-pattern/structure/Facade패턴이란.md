---
tags: [architecture, design-pattern, structural, facade]
status: done
category: "Architecture & Design"
aliases: ["Facade Pattern", "퍼사드 패턴"]
---

# Facade 패턴이란?

Facade는 복잡한 서브시스템 앞에 사용 목적에 맞춘 단순한 진입점을 두는 구조 패턴이다. 내부 객체를 감추는 것 자체보다 클라이언트가 알아야 할 협력 순서와 의존성 수를 줄이는 데 목적이 있다.

## 구조와 예시

- Client: 단순화된 작업을 요청한다.
- Facade: 작업 순서를 조율하고 서브시스템에 위임한다.
- Subsystem: 실제 기능을 수행하며 Facade를 알 필요가 없다.

```typescript
@Injectable()
class CheckoutFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly orders: OrderService,
  ) {}

  async checkout(command: CheckoutCommand): Promise<OrderId> {
    await this.inventory.reserve(command.items)
    const payment = await this.payments.charge(command.payment)
    return this.orders.place(command, payment)
  }
}
```

Controller는 재고, 결제, 주문의 호출 순서를 직접 알지 않는다. 다만 트랜잭션 경계, 실패 보상과 멱등성은 Facade라는 이름이 자동으로 해결하지 않으므로 별도로 설계해야 한다.

## 다른 패턴과 구분

- Adapter는 기존 인터페이스를 클라이언트가 원하는 계약으로 변환한다.
- Facade는 여러 협력자를 사용하기 쉬운 고수준 작업으로 묶는다.
- Mediator는 동료 객체들이 서로 직접 통신하지 않게 상호작용 규칙을 중앙화한다.

Facade가 모든 사용 사례와 도메인 규칙을 흡수하면 God Object가 된다. 특정 클라이언트가 반복해서 수행하는 안정된 조율만 제공하고, 필요한 고급 기능에는 서브시스템 직접 접근을 허용할 수 있다.

## 출처

- 얄팍한 코딩사전, [Facade 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=236115)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Adapter패턴이란|Adapter 패턴]]
- [[Mediator패턴이란|Mediator 패턴]]
- [[Hexagonal-In-Practice|헥사고날 아키텍처 실전]]
