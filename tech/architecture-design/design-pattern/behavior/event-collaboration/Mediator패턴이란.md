---
tags: [architecture, design-pattern, behavioral, mediator]
status: done
category: "Architecture & Design"
aliases: ["Mediator Pattern", "중재자 패턴"]
---

# Mediator 패턴이란?

Mediator는 여러 객체가 서로 직접 참조하는 대신 중재자에게 의도를 전달하게 해 상호작용 규칙을 한곳에서 조율하는 행동 패턴이다.

## 예시

```typescript
interface CheckoutMediator {
  itemAdded(item: CartItem): Promise<void>
}

class DefaultCheckoutMediator implements CheckoutMediator {
  constructor(
    private readonly pricing: PricingService,
    private readonly promotions: PromotionService,
  ) {}

  async itemAdded(item: CartItem): Promise<void> {
    await this.pricing.recalculate(item)
    await this.promotions.refreshEligibility(item)
  }
}
```

장바구니, 가격 계산과 프로모션 객체가 서로를 모두 알 필요가 없다. 상호작용 순서가 한 사용 사례의 책임이라면 NestJS Application Service가 Mediator 역할을 자연스럽게 수행할 수 있다.

## 장점과 위험

- 객체 사이의 다대다 참조와 순환 의존을 줄인다.
- 협력 순서를 한곳에서 읽고 테스트할 수 있다.
- 모든 이벤트와 규칙을 한 중재자에 모으면 새 God Object가 된다.
- 도메인 불변식까지 중재자가 대신 판단하면 객체의 응집도가 낮아질 수 있다.

Mediator는 단순한 메시지 전달기가 아니라 동료 객체 사이의 상호작용을 조정한다. Facade가 외부 클라이언트에 서브시스템의 단순한 입구를 제공한다면, Mediator는 내부 동료들의 통신 구조를 바꾼다.

## 출처

- 얄팍한 코딩사전, [Mediator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243900)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Facade패턴이란|Facade 패턴]]
- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 OOP]]
