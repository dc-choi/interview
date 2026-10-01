---
tags: [architecture, design-pattern, behavioral, mediator]
status: done
verified_at: 2026-09-27
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

장바구니, 가격 계산과 프로모션 객체가 서로를 모두 알 필요가 없다. 이 구조가 Mediator가 되려면 장바구니 같은 동료가 중재자를 참조하고 자기 상태 변화를 `itemAdded`로 알려야 한다. Controller가 호출한 NestJS Application Service가 하위 서비스의 호출 순서만 정한다면 요청이 한 방향으로만 흐르므로 Facade에 가깝고, 협력 객체가 보낸 상태 변화를 받아 다른 협력 객체를 조정할 때 Mediator 역할을 한다.

## 구조와 통신 방향

- Mediator: 동료와 통신할 인터페이스를 정의한다.
- ConcreteMediator: 동료들을 알고 유지하며, 동료를 조정해 협력 동작을 구현한다.
- Colleague: 자신의 Mediator를 알고, 다른 동료와 통신해야 할 때 대신 Mediator와 통신한다.

동료는 Mediator에 요청을 보내고 Mediator의 요청도 받으므로 통신은 양방향이다. 동료 사이의 다대다 상호작용이 Mediator와 동료 사이의 일대다 상호작용으로 바뀌고, 협력 규칙이 바뀌면 Mediator만 고치거나 하위 클래스로 만들면 되므로 동료 클래스는 그대로 재사용할 수 있다. 동료가 상태 변화를 알리는 방법으로는 동료를 Observer의 Subject로 두는 방식과, 동료가 자신을 인자로 넘기는 전용 통지 메서드를 두는 방식이 있다.

통지 메서드가 발신자 객체만 받으면 Mediator는 `sender === this.door` 같은 참조 비교로 발신자를 가려야 하고, 새 동료를 추가한 뒤 분기를 빠뜨려도 컴파일러가 알려주지 않는다. TypeScript에서는 통지 내용을 리터럴 union 필드를 가진 interface로 정의하고 `switch`의 `default`에서 그 값을 `never`에 대입하면, union에 새 동료를 추가했을 때 처리하지 않은 분기가 컴파일 오류가 된다.

```typescript
interface DeviceChanged {
  readonly device: 'door' | 'aircon' | 'boiler'
  readonly on: boolean // 문은 열림, 에어컨과 보일러는 가동
}

interface HomeMediator {
  notify(event: DeviceChanged): void
}

class Device {
  private on = false

  constructor(
    private readonly name: DeviceChanged['device'],
    private readonly mediator: HomeMediator,
  ) {}

  setOn(on: boolean): void {
    if (this.on === on) return // 상태가 그대로면 통지하지 않는다
    this.on = on
    this.mediator.notify({ device: this.name, on })
  }
}

class SmartHome implements HomeMediator {
  readonly door = new Device('door', this)
  readonly aircon = new Device('aircon', this)
  readonly boiler = new Device('boiler', this)

  /**
   * 문이 열리면 냉난방을 끄고, 냉난방이 켜지면 문을 닫는다.
   * @param event 상태가 바뀐 동료와 바뀐 뒤의 상태
   */
  notify({ device, on }: DeviceChanged): void {
    if (!on) return
    switch (device) {
      case 'door':
        this.aircon.setOn(false)
        this.boiler.setOn(false)
        return
      case 'aircon':
      case 'boiler':
        this.door.setOn(false)
        return
      default: {
        const unhandled: never = device
        throw new Error(`처리하지 않은 동료: ${String(unhandled)}`)
      }
    }
  }
}
```

- 연쇄 통지: Mediator의 제어로 동료 상태가 바뀌면 그 동료가 다시 Mediator에 통지한다. 상태가 그대로인 호출에서도 통지하면 문이 열리면 창을 열고 창이 열리면 문을 여는 것처럼 서로를 되부르는 규칙이 끝나지 않고, Node.js에서는 `RangeError: Maximum call stack size exceeded`로 중단된다. 동료는 상태가 실제로 바뀔 때만 통지하고, Mediator는 통지된 새 상태를 확인한 뒤 반응한다.
- 생성 중인 Mediator 전달: 필드 초기화 식에서 `new Device('door', this)`처럼 자신을 넘기면 동료는 초기화가 끝나지 않은 Mediator를 받는다. 필드는 선언 순서대로 하나씩 추가되므로 동료 생성자에서 곧바로 통지하면 Mediator가 아래에 선언된 필드를 `undefined`로 읽어 TypeError가 난다. TypeScript 7.0.2의 `--strict`도 이 경우를 오류로 잡지 않으므로 동료 생성자에서는 통지하지 않고, 초기 상태 동기화는 모든 동료를 만든 뒤 별도 메서드에서 한다.

## 장점과 위험

채팅방처럼 메시지 전달 대상을 직접 고르는 능동적인 중재자도 있고, 관제탑처럼 공유 자원의 사용 상태를 제공하는 수동적인 중재자도 있다. 후자는 허가 판단이 동료 쪽에 남아 협력 규칙이 바뀔 때 동료도 함께 수정할 수 있다. 우선순위나 예약 규칙이 생기면 `requestLanding()`처럼 의도를 받아 판단하는 책임을 중재자로 옮길지 검토한다.

사용 가능 여부 확인과 점유를 별도 호출로 나누면 그 사이의 동시 실행이나 `await` 때문에 두 요청이 같은 자원을 얻을 수 있다. 확인과 점유를 원자적인 한 연산으로 제공하고, 점유에 성공한 쪽이 실패 경로에서도 해제하도록 한다. 분산 자원이라면 중재자 객체 하나만으로 원자성이 보장되지 않는다.

- 객체 사이의 다대다 참조와 순환 의존을 줄인다.
- 협력 순서를 한곳에서 읽고 테스트할 수 있다.
- 모든 이벤트와 규칙을 한 중재자에 모으면 새 God Object가 된다.
- 도메인 불변식까지 중재자가 대신 판단하면 객체의 응집도가 낮아질 수 있다.

Mediator는 단순한 메시지 전달기가 아니라 동료 객체 사이의 상호작용을 조정한다. Facade가 외부 클라이언트에 서브시스템의 단순한 입구를 제공하고 서브시스템에 요청을 보내기만 한다면, Mediator는 내부 동료들의 통신 구조를 바꾼다.

## 출처

- 얄팍한 코딩사전, [Mediator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243900)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 14. Mediator](https://www.youtube.com/watch?v=ogvsg8MkDIU)
- [TypeScript Handbook, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [MDN, Public class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields), [InternalError: too much recursion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion)

## 관련 문서

- [[Facade패턴이란|Facade 패턴]]
- [[Observer패턴이란|Observer 패턴]]
- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 OOP]]
