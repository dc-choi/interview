---
tags: [architecture, design-pattern, structural, bridge]
status: done
category: "Architecture & Design"
aliases: ["Bridge Pattern", "브리지 패턴"]
---

# Bridge 패턴이란?

Bridge는 하나의 개념에 독립적으로 변하는 두 축이 있을 때 추상화 계층과 구현 계층을 분리하고 합성으로 연결하는 구조 패턴이다. 두 축의 모든 조합을 상속 계층으로 만들 때 생기는 클래스 폭발을 피한다.

## 예시

알림 종류와 전송 채널이 각각 늘어난다고 가정한다.

```typescript
interface MessageChannel {
  send(message: string): Promise<void>
}

abstract class Notification {
  constructor(protected readonly channel: MessageChannel) {}
  abstract notify(target: string): Promise<void>
}

class OrderNotification extends Notification {
  async notify(orderId: string): Promise<void> {
    await this.channel.send(`Order ${orderId} is ready`)
  }
}
```

`OrderNotification`, `SecurityNotification`은 추상화 축이고 이메일, SMS, 푸시 구현은 구현 축이다. 두 계층은 각자의 이유로 확장할 수 있으며 NestJS 구성 루트가 조합을 선택한다.

## 구성 요소

- Abstraction: 클라이언트가 쓰는 인터페이스를 정의하고 Implementor 참조를 유지한다. 예시의 `Notification`이다.
- RefinedAbstraction: Abstraction의 인터페이스를 확장한다. 예시의 `OrderNotification`이다.
- Implementor: 구현 클래스의 인터페이스를 정의한다. Abstraction의 인터페이스와 맞출 필요가 없고, 보통 기본 연산만 제공하며 Abstraction이 이를 조합해 상위 연산을 만든다. 예시의 `MessageChannel`이다.
- ConcreteImplementor: Implementor를 구현한다. 이메일, SMS, 푸시 채널이 여기에 해당한다.

Abstraction 쪽을 기능의 클래스 계층, Implementor 쪽을 구현의 클래스 계층이라고도 부른다. 기능 계층은 `OrderNotification`, `SecurityNotification`처럼 클라이언트가 쓰는 연산을 구체화하거나 넓히는 Abstraction 하위 클래스가 늘며 넓어지고, 구현 계층은 이메일, SMS, 푸시처럼 Implementor가 선언한 기본 연산을 구현하는 클래스가 늘며 넓어진다.

클라이언트 요청은 Abstraction에서 Implementor 방향으로 전달된다. Implementor 메서드가 Abstraction 객체를 인자로 받아 getter로 값을 꺼내게 만들면 구현 계층이 추상화 계층의 타입에 묶인다. 그러면 새 필드를 가진 RefinedAbstraction을 지원할 때마다 Implementor 인터페이스와 모든 ConcreteImplementor를 함께 고쳐야 하므로 두 축이 독립적으로 변한다는 전제가 깨진다. 예시의 `send(message: string)`처럼 Implementor는 Abstraction을 모른 채 값만 받는 기본 연산으로 설계한다.

## Adapter와 구분

- Bridge는 설계 단계에서 독립적인 변화 축을 의도적으로 분리한다.
- Adapter는 이미 존재하는 호환되지 않는 계약을 사후에 연결하는 경우가 많다.

단순히 인터페이스 하나를 주입했다고 Bridge가 되는 것은 아니다. 실제로 두 축이 독립적으로 변하고 조합 수가 늘어나는지 먼저 확인한다. 축이 하나뿐이라면 일반적인 Strategy나 의존성 역전으로 충분할 수 있다.

## 비용

- 계층과 조립 코드가 늘어난다.
- 어떤 조합을 지원하는지 구성 코드나 테스트에서 명확히 보여줘야 한다.
- 두 축 사이의 제약이 많다면 완전히 독립적이라는 전제가 깨질 수 있다.

## 출처

- 얄팍한 코딩사전, [Bridge 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242784)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 7. Bridge](https://www.youtube.com/watch?v=jKCF-7Z-y9w)

## 관련 문서

- [[Adapter패턴이란|Adapter 패턴]]
- [[Strategy패턴이란|Strategy 패턴]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
