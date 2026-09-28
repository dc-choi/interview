---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["State 패턴이란?"]
verified_at: 2026-09-27
---

# State 패턴이란?
객체의 내부 상태에 따라 동작이 변경되는 패턴. 상태를 별도 객체로 캡슐화하여 상태 전환과 상태별 행위를 관리한다.

## 왜 쓸까?

### 상태별 조건문을 줄인다
상태마다 별도 클래스를 두어 커지는 조건 분기를 분산할 수 있다. 작고 안정적인 상태 머신은 `switch`나 전이 테이블이 더 명확할 수 있다.

### 새 상태 추가 시 영향 범위를 제한한다
새 상태의 행동은 별도 객체에 둘 수 있지만 전이 규칙, 생성 팩토리와 상태 타입 목록은 함께 바뀔 수 있다. 상태와 요청은 상태 수와 요청 수를 곱한 크기의 표를 이룬다. State 패턴은 이 표를 상태별 클래스로 나눌 뿐 칸 수를 줄이지 않는다. 행동이 여러 클래스로 흩어지므로 클래스가 늘고 한 클래스에 모은 구현보다 덜 간결하다. 새 요청을 추가하면 State 인터페이스와 Context의 위임 메서드가 바뀌고, 기본 동작이 없는 설계에서는 모든 구체 상태가 그 요청을 구현해야 한다. TypeScript에서 요청을 `abstract` 메서드나 `interface` 멤버로 선언하면 구현을 빠뜨린 상태 클래스가 컴파일 오류로 드러난다. 기반 클래스에 기본 동작을 두면 무효 요청을 한곳에서 처리하고 그 요청을 허용하는 상태만 재정의하면 되지만 이 누락 검사는 사라진다.

### 상태 전환 로직을 명시적으로 관리
상태 객체나 Context 중 한곳에 전이 책임을 명시적으로 둔다. 전이를 상태에 분산하면 국소적인 이해가 쉽고, Context나 전이 표에 모으면 전체 흐름을 보기 쉽다.

### 상태별 동작을 독립적으로 테스트
각 상태가 독립된 객체이므로 개별 테스트가 쉽다.

## 핵심 개념

### 구조와 협력
- Context: 클라이언트가 쓰는 인터페이스를 정의하고 현재 상태 객체를 보관해 상태별 요청을 위임한다.
- State: 한 상태에 묶인 행동의 공통 인터페이스다. 기반 클래스로 두면 요청의 기본 동작을 제공할 수 있다.
- ConcreteState: 한 상태의 행동을 구현한다. 전이를 상태에 분산한 설계에서는 다음 상태도 정한다.

상태 객체에 Context마다 달라지는 인스턴스 필드가 있는지가 공유 범위를 정하고, Context를 참조하는 방식이 그 대표적인 요인이다. 생성자에서 Context를 받아 필드로 두면 상태 인스턴스가 그 Context에 묶여 Context마다 따로 만들어야 한다. 요청마다 Context를 인자로 넘기거나 다음 상태를 반환하게 해서 Context마다 달라지는 인스턴스 필드를 없애면 상태가 타입만으로 표현되어 모든 Context가 같은 상태 객체를 공유할 수 있다. 이런 상태 객체는 [[Flyweight패턴이란|Flyweight]]처럼 공유되고 흔히 상태 클래스마다 인스턴스를 하나만 둔다. 아래 `status`처럼 클래스마다 고정된 값은 Context와 무관한 내재 상태이고, 인스턴스 변수가 전혀 없으면 내재 상태 없이 행동만 가진 Flyweight가 된다. 아래 `OfflineState`처럼 큐를 필드로 가지는 상태는 Context마다 별도 인스턴스가 필요하다.

상태가 Context의 현재 상태를 직접 바꾸려면 Context에 상태 교체 메서드가 필요하다. GoF의 C++ 예제는 `friend` 선언으로 이 메서드를 상태 클래스에만 연다. TypeScript에는 `friend`에 해당하는 선언이 없고, Context 본문 밖에 선언한 상태 클래스는 Context의 하위 클래스가 아니라서 `protected`로도 열 수 없다. 접근 검사와 `#` 이름은 클래스 본문의 렉시컬 범위를 따르므로 상태 클래스를 Context 본문 안에 클래스 식으로 두면 `#` 교체 메서드도 호출할 수 있지만([[Iterator패턴이란#ConcreteIterator의 접근 권한|ConcreteIterator의 접근 권한]]), 모든 상태가 Context 본문에 모여 아래처럼 파일을 나눌 수 없다. 교체 메서드를 `public`으로 두면 클라이언트도 전이 규칙을 거치지 않고 임의의 상태를 넣을 수 있으므로, 아래 주문 예시처럼 상태 메서드가 다음 상태를 반환하고 Context가 `#state` 필드에 대입하는 방식으로 피할 수 있다. TypeScript `private`는 대괄호 표기 접근을 허용하는 soft private라 이 용도로는 부족하다([[TS-Class-Type-System#접근 제어자의 실행 시점|접근 제어자의 실행 시점]]).

### Strategy와의 차이
- Strategy: 클라이언트가 외부에서 알고리즘을 선택/교체
- State: 현재 상태가 Context의 행동과 다음 전이에 영향을 준다. 상태 전환이 반드시 자동인 것은 아니다.
- 전이를 상태에 분산하면 구체 상태가 다음 구체 상태를 직접 참조하므로 상태 클래스끼리 구현 의존이 생긴다. Concrete Strategy는 서로를 알 필요가 없다.

### 코드 예시: FailsafeSocket
```typescript
// 오프라인 상태에서는 메시지를 큐에 저장, 온라인이 되면 전송
class OfflineState {
  private queue: string[] = []

  send(message: string) {
    this.queue.push(message) // 큐에 저장
  }

  activate(socket: FailsafeSocket) {
    const queued = [...this.queue]
    this.queue = []
    socket.changeState(new OnlineState())
    for (const msg of queued) socket.send(msg)
  }
}

class OnlineState {
  send(message: string) {
    // 직접 전송
  }
}
```

### 코드 예시: 공유 상태 객체와 전이 반환
```typescript
const ORDER_STATUS = { PENDING: 'PENDING', PAID: 'PAID', CANCELLED: 'CANCELLED' } as const
type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

class InvalidOrderTransitionError extends Error {
  constructor(status: OrderStatus, action: string) {
    super(`${status} 상태에서는 ${action}할 수 없다`)
    this.name = 'InvalidOrderTransitionError'
  }
}

/** 기본 구현은 전이를 거부한다. 필드가 상태 코드뿐이라 모든 주문이 인스턴스를 공유한다. */
abstract class OrderState {
  abstract readonly status: OrderStatus
  pay(): OrderState { throw new InvalidOrderTransitionError(this.status, '결제') }
  cancel(): OrderState { throw new InvalidOrderTransitionError(this.status, '취소') }
}

class PendingState extends OrderState {
  readonly status = ORDER_STATUS.PENDING
  override pay(): OrderState { return STATES.PAID }
  override cancel(): OrderState { return STATES.CANCELLED }
}

class PaidState extends OrderState {
  readonly status = ORDER_STATUS.PAID
  override cancel(): OrderState { return STATES.CANCELLED }
}

class CancelledState extends OrderState {
  readonly status = ORDER_STATUS.CANCELLED
}

/** 상태 코드별 공유 인스턴스. 저장소에서 읽은 상태 코드를 상태 객체로 복원할 때도 쓴다. */
const STATES: Readonly<Record<OrderStatus, OrderState>> = {
  PENDING: new PendingState(),
  PAID: new PaidState(),
  CANCELLED: new CancelledState(),
}

class Order {
  #state: OrderState
  /** @param status 저장소에서 읽은 상태 코드. 새 주문은 PENDING에서 시작한다. */
  constructor(status: OrderStatus = ORDER_STATUS.PENDING) { this.#state = STATES[status] }
  get status(): OrderStatus { return this.#state.status }
  pay(): void { this.#state = this.#state.pay() }
  cancel(): void { this.#state = this.#state.cancel() }
}

const order = new Order()
order.pay() // order.status === 'PAID'
new Order(ORDER_STATUS.CANCELLED).pay() // InvalidOrderTransitionError: CANCELLED 상태에서는 결제할 수 없다
```

저장소에는 `status` 문자열만 두고 불러올 때 `STATES[status]`로 상태 객체를 복원한다. 저장소에서 읽은 값은 런타임에 `OrderStatus`임이 보장되지 않으므로 복원 전에 `Object.hasOwn(STATES, status)`(ES2022)로 알려진 상태 코드인지 확인하고 모르는 코드는 그 자리에서 거부한다. TypeScript에서 `Object.hasOwn`은 타입을 좁히지 않으므로 `(value: string): value is OrderStatus => Object.hasOwn(STATES, value)` 같은 타입 가드로 감싼다. 확인 없이 `'SHIPPED'` 같은 값을 넘기면 생성은 성공하지만 상태가 `undefined`로 남아 나중의 `pay()`나 `status` 읽기에서 `TypeError`가 나고, `in` 연산자로 확인하면 `'toString'` 같은 prototype 키도 통과한다. 구체 상태는 허용하는 전이만 재정의하는데, `override`(TypeScript 4.3부터)를 붙이면 `cancle()`처럼 이름을 잘못 쓴 재정의가 기본 거부 동작을 조용히 남기지 않고 컴파일 오류가 된다.

### TypeScript 파일 분리와 순환 import
전이를 상태에 분산한 채 클래스마다 파일을 나누면 구체 상태끼리 서로 import하고 Context는 초기 상태를, State 기반 클래스는 Context 타입을 import해 cycle이 생기기 쉽다. 메서드 안에서 다음 상태를 생성하는 참조는 호출 시점에 읽혀 문제가 없지만 `class RunState extends State`는 모듈을 평가할 때 `State`를 읽는다. 진입 순서 때문에 기반 클래스 모듈이 아직 평가되지 않았으면 ES 모듈 출력은 `ReferenceError: Cannot access 'State' before initialization`, CommonJS 출력은 `TypeError: Class extends value undefined is not a constructor or null`로 시작 시점에 실패한다(TypeScript 5.9.3, Node.js 26.7.0에서 재현).

- State 기반 클래스는 Context 타입을 `import type`으로 가져온다. 기본 import elision은 타입으로만 쓴 import를 지우지만 `verbatimModuleSyntax`와 Node.js type stripping은 `type`이 없는 import를 남긴다. 이 두 경우에는 `import { type Context }`도 `import {}`로 남아 cycle을 유지한다.
- 구체 상태는 기반 클래스를 배럴(`index.ts`)이 아니라 정의 파일에서 직접 import한다. 배럴이 Context를 기반 클래스보다 먼저 re-export하면 배럴을 거쳐 진입할 때 같은 오류가 날 수 있다.
- 일반 원리는 [[JavaScript-ES-Modules#순환 의존성과 평가 순서|ES 모듈 순환 의존성]]을 따른다.

### 상태 머신
상태 전이를 명시적으로 정의:
- IDLE → PROCESSING (작업 시작)
- PROCESSING → COMPLETED (성공)
- PROCESSING → FAILED (실패)
- FAILED → PROCESSING (재시도)

## 실 사용 사례
1. TCP 연결(수동 개방): CLOSED → LISTEN → SYN_RECEIVED → ESTABLISHED → CLOSE_WAIT
2. 주문 시스템: 대기 → 결제완료 → 배송중 → 완료
3. 게임 캐릭터: 대기 → 이동 → 공격 → 피격
4. 비동기 컴포넌트 초기화: QueuingState → InitializedState

## 출처

- 얄팍한 코딩사전, [State 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242756)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 23. State](https://www.youtube.com/watch?v=RvTcKaRQZ5g)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [State — Refactoring.Guru](https://refactoring.guru/design-patterns/state)
- [RFC 9293 — Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.txt)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 3.8, Type-Only Imports and Export — TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- [TypeScript 4.3, override and the --noImplicitOverride Flag — TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-3.html#override-and-the---noimplicitoverride-flag)
- [TypeScript 5.0, --verbatimModuleSyntax — TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#--verbatimmodulesyntax)
- [Node.js 공식 문서, Modules: TypeScript](https://nodejs.org/api/typescript.html#importing-types-without-type-keyword)
- [MDN, JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#cyclic_imports)
- [MDN, Object.hasOwn()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)

## 관련 문서

- [[Strategy패턴이란|Strategy 패턴]]
- [[Memento패턴이란|Memento 패턴]]
