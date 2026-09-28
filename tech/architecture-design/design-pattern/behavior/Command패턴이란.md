---
tags: [architecture, design-pattern, behavioral, command]
status: done
verified_at: 2026-09-27
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

Command가 맡는 일의 양은 설계 선택이다. 한쪽 끝은 위 예시처럼 Receiver와 호출할 동작을 묶기만 하는 얇은 Command이고, 다른 끝은 Receiver 없이 작업을 직접 구현하는 Command다. 기존 클래스와 독립적인 명령이거나 적절한 Receiver가 없으면 직접 구현해도 된다. 도메인 서비스가 이미 규칙을 가진 백엔드에서는 얇게 두고 위임해야 같은 규칙이 여러 Command에 복제되지 않는다.

## 선택 가능한 부가 기능

직렬화, 로깅과 `undo()`는 Command의 필수 요소가 아니다. 필요한 기능마다 별도 계약을 둔다.

- Undo: 역연산이 가능한지, 이전 상태를 Memento로 보관할지 정한다.
- Queue: 클래스 인스턴스가 아니라 버전이 있는 메시지 DTO와 Handler로 경계를 나눈다. 클래스 메서드는 prototype에 있고 `JSON.stringify()`는 자기 열거 가능 속성만 직렬화하므로, 인스턴스를 저장하거나 전송하면 `execute()`와 클래스 정보가 빠지고 `JSON.parse()`는 일반 객체를 돌려준다. 주입된 Receiver 참조도 현재 프로세스에서만 의미가 있다. 그래서 저장하고 전송하는 것은 Command의 종류, 버전과 인자이고, 받는 쪽은 종류와 버전에 맞는 Handler를 찾아 실행하거나 팩토리로 실행 객체를 다시 만든다.
- Retry: 멱등성, 중복 실행과 외부 부수효과를 설계한다.
- History: 민감 정보와 저장 비용, 보존 기간을 제한한다.

NestJS CQRS의 Command는 쓰기 의도를 나타내는 메시지와 Handler를 분리하는 방식이다. GoF Command와 비슷한 분리를 제공하지만 Command 객체가 Receiver나 실행 메서드, Undo를 반드시 갖는 것은 아니다.

### Undo와 Redo 이력

여러 단계의 Undo와 Redo는 실행한 Command의 이력 목록으로 구현한다. 목록을 뒤로 이동하며 `undo()`를 호출하면 효과가 취소되고, 앞으로 이동하며 `execute()`를 다시 호출하면 재실행된다. 목록의 최대 길이가 되돌릴 수 있는 단계 수이고, 한 단계만 필요하면 마지막 Command 하나만 보관한다. Undo 뒤에 새 Command를 실행했을 때 남은 Redo 이력을 버릴지도 정한다.

- 선택된 대상이나 실행 전 값처럼 실행마다 달라지는 상태를 가진 Command를 같은 인스턴스로 재사용하면 이전 실행의 되돌리기 정보를 덮어쓴다. 이력에 넣기 전에 복사하거나 실행마다 새 인스턴스를 만든다. 복사해 쓰는 Command는 [[Prototype패턴이란|Prototype]] 역할을 하고, 실행해도 상태가 바뀌지 않는 Command는 참조만 보관해도 된다.
- 부동소수점 배율 조정처럼 역연산이 정확한 역이 아니면 실행과 취소를 반복할 때 오차가 쌓여 원래 값과 어긋날 수 있다. 정확한 복원이 필요하면 실행 전 상태를 [[Memento패턴이란|Memento]]로 보관한다.

## 매크로 Command와 Composite

여러 Command를 순서대로 실행하는 매크로 Command는 Command 계약을 그대로 구현하면서 하위 Command 목록을 보관한다. 호출자는 단일 Command와 매크로를 구분하지 않으므로 [[Composite패턴이란|Composite]]의 한 형태다. 매크로 자체에는 Receiver가 없고 하위 Command가 각자의 Receiver를 가진다.

```typescript
interface UndoableCommand extends Command<void> {
  undo(): Promise<void>
}

/** 실행한 순서의 역순으로 되돌린다. */
const undoInReverse = async (commands: readonly UndoableCommand[]): Promise<void> => {
  for (const command of [...commands].reverse()) {
    await command.undo()
  }
}

/** 하위 Command 목록을 하나의 Command로 다루는 Composite다. */
class MacroCommand implements UndoableCommand {
  readonly #commands: readonly UndoableCommand[]

  constructor(commands: readonly UndoableCommand[]) {
    this.#commands = [...commands]
  }

  /**
   * 하위 Command를 순서대로 실행한다.
   * 중간에 실패하면 이미 실행한 Command를 역순으로 되돌리고 원래 오류를 다시 던진다.
   * @returns 모든 하위 Command가 끝나면 이행되는 Promise
   */
  async execute(): Promise<void> {
    const executed: UndoableCommand[] = []
    try {
      for (const command of this.#commands) {
        await command.execute()
        executed.push(command)
      }
    } catch (error) {
      await undoInReverse(executed)
      throw error
    }
  }

  undo(): Promise<void> {
    return undoInReverse(this.#commands)
  }
}
```

- 되돌리기는 실행의 역순으로 한다. 나중에 실행한 Command가 앞선 Command의 결과에 기대고 있을 수 있기 때문이다.
- 중간 실패 정책을 먼저 정한다. 위 예시는 이미 실행한 Command를 역순으로 보상한 뒤 원래 오류를 다시 던진다. 실패 지점에서 멈추고 부분 완료를 보고하거나, 나머지를 계속 실행하고 실패를 모아 보고하는 정책도 있다. 보상 중 `undo()`가 실패하면 그 오류가 원래 오류를 대신하고 남은 보상도 실행되지 않으므로 보상 실패 처리도 따로 정한다. 결제처럼 메모리 안에서 되돌릴 수 없는 외부 작업은 [[Saga-Pattern|Saga]]의 보상 트랜잭션(환불 같은 반대 거래)으로 설계한다. 메일 발송처럼 반대 거래로도 취소할 수 없는 작업은 보상 대상으로 두지 않고, 더는 되돌리지 않기로 정하는 Pivot 뒤에 두어 중복 발송을 막은 채 재시도로 완료한다([[Saga-Pattern#보상 트랜잭션 원칙|보상 트랜잭션 원칙]]).
- 일정 간격으로 재생할 때 `setTimeout` 콜백 안에서 다음 Command를 예약하면 `execute()`는 첫 예약 직후 반환해 호출자가 완료와 실패를 관찰할 수 없고, 콜백 안의 예외도 호출자의 `try/catch`에 잡히지 않는다. `for...of` 안에서 각 Command와 `node:timers/promises`의 `setTimeout`을 `await`하면 완료와 오류가 호출자의 Promise로 전달된다.

## 적용 경계

실행 지연, 재시도, 권한 검사나 이력이 실제로 필요할 때 유용하다. 단순한 동기 메서드 호출까지 모두 Command 클래스로 감싸면 탐색 비용과 보일러플레이트가 커진다.

JavaScript 함수는 일급 객체라 인자로 넘기고 배열이나 필드에 보관할 수 있다. 클로저는 Receiver와 인자를 함께 캡처하므로 `() => orders.cancel(orderId)`만으로도 실행을 미루거나 메모리 안의 대기열에 넣을 수 있다. Command는 콜백의 객체지향 대체물이다. 실행만 필요하면 함수로 충분하고, Undo, 로그에 남길 이름이나 권한 검사용 메타데이터처럼 실행 외의 계약이 필요해질 때 Command 객체로 올린다. 저장과 전송이 필요하면 위 Queue처럼 종류, 버전과 인자를 담은 메시지로 나눈다.

## 출처

- 얄팍한 코딩사전, [Command 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244829)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 21. Command](https://www.youtube.com/watch?v=XEvIQ-Z0F6o)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, CQRS](https://docs.nestjs.com/recipes/cqrs)
- [MDN, Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions)
- [MDN, Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN, JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [MDN, JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [MDN, setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [MDN, Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Node.js 공식 문서, Timers](https://nodejs.org/api/timers.html)

## 관련 문서

- [[Memento패턴이란|Memento 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[Prototype패턴이란|Prototype 패턴]]
- [[Clean-Architecture-NestJS-CQRS|NestJS Clean Architecture와 CQRS]]
- [[Transactional-Outbox|Transactional Outbox]]
