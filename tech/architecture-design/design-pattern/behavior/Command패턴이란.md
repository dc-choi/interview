---
tags: [architecture, design-pattern, behavioral, command]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Command Pattern", "커맨드 패턴"]
---

# Command 패턴이란?

Command는 요청을 객체로 캡슐화해 요청을 보내는 Invoker와 실제 작업을 수행하는 Receiver를 분리하는 행동 패턴이다. 요청을 매개변수처럼 전달하거나 대기열, 이력과 매크로로 조합할 수 있다.

## 역할

- Command: 실행 계약을 정의한다.
- Concrete Command: Receiver와 실행에 필요한 인자를 보관한다.
- Invoker: 실행 시점을 결정한다.
- Receiver: 실제 도메인 작업을 수행한다.
- Client: Command와 Receiver를 조립한다.

```typescript
interface Command<R = void> {
  execute(): Promise<R>
}

class CancelOrderCommand implements Command<void> {
  constructor(
    private readonly orders: OrderService,
    private readonly orderId: OrderId,
  ) {}

  execute(): Promise<void> {
    return this.orders.cancel(this.orderId)
  }
}
```

## 선택 가능한 부가 기능

직렬화, 로깅과 `undo()`는 Command의 필수 요소가 아니다. 필요한 기능마다 별도 계약을 둔다.

- Undo: 역연산이 가능한지, 이전 상태를 Memento로 보관할지 정한다.
- Queue: 클래스 인스턴스가 아니라 버전이 있는 메시지 DTO와 Handler로 경계를 나눈다.
- Retry: 멱등성, 중복 실행과 외부 부수효과를 설계한다.
- History: 민감 정보와 저장 비용, 보존 기간을 제한한다.

NestJS CQRS의 Command는 쓰기 의도를 나타내는 메시지와 Handler를 분리하는 방식이다. GoF Command와 비슷한 분리를 제공하지만 Command 객체가 Receiver나 실행 메서드, Undo를 반드시 갖는 것은 아니다.

## 적용 경계

실행 지연, 재시도, 권한 검사나 이력이 실제로 필요할 때 유용하다. 단순한 동기 메서드 호출까지 모두 Command 클래스로 감싸면 탐색 비용과 보일러플레이트가 커진다.

## 출처

- 얄팍한 코딩사전, [Command 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244829)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, CQRS](https://docs.nestjs.com/recipes/cqrs)

## 관련 문서

- [[Memento패턴이란|Memento 패턴]]
- [[Clean-Architecture-NestJS-CQRS|NestJS Clean Architecture와 CQRS]]
- [[Transactional-Outbox|Transactional Outbox]]
