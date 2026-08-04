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

## 관련 문서

- [[Adapter패턴이란|Adapter 패턴]]
- [[Strategy패턴이란|Strategy 패턴]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
