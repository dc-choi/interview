---
tags: [architecture, design-pattern, behavioral, chain-of-responsibility]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Chain of Responsibility Pattern", "책임 연쇄 패턴"]
---

# Chain of Responsibility 패턴이란?

Chain of Responsibility는 요청을 처리할 수 있는 후보들을 연결하고, 각 Handler가 처리하거나 다음 Handler로 넘기게 하는 행동 패턴이다. 발신자는 최종 처리자의 구체 타입을 알 필요가 없다.

## 예시

```typescript
interface RefundHandler {
  handle(request: RefundRequest): Promise<RefundDecision | undefined>
}

class LimitHandler implements RefundHandler {
  constructor(private readonly next?: RefundHandler) {}

  async handle(request: RefundRequest) {
    if (request.amount.isGreaterThan(request.limit)) {
      return { approved: false, reason: 'LIMIT_EXCEEDED' }
    }
    return this.next?.handle(request)
  }
}
```

## 처리 의미를 먼저 정한다

- 첫 처리자에서 종료하는 GoF Chain of Responsibility로 둘지, 모든 Handler를 차례로 통과시키는 파이프라인으로 둘지 정한다.
- 아무도 처리하지 않았을 때 기본값, 오류 또는 무시 중 하나를 선택한다.
- 순서가 결과에 영향을 주면 구성 코드와 테스트에서 고정한다.
- 비동기 Handler의 시간 제한, 실패 전파와 재시도 책임을 정한다.

Express/NestJS의 Middleware, Guard, Pipe, Interceptor는 체인 또는 파이프라인 성격을 갖지만 각각 실행 계약과 책임이 다르다. 프레임워크 수명주기를 무시하고 하나의 일반 패턴으로 동일시하지 않는다.

여러 규칙이 모두 결과에 기여한다면 Composite나 명시적인 파이프라인이 더 적합할 수 있다. Chain은 다음 처리자를 직접 연결하는 유연성을 얻는 대신 전체 흐름을 한눈에 보기 어려워질 수 있다.

## 전달 책임을 어디에 둘지 정한다

참여자는 요청 처리 인터페이스를 정의하는 Handler, 맡은 요청을 처리하고 아니면 다음 Handler로 넘기는 ConcreteHandler, 체인의 Handler에 요청을 보내는 Client다. 다음 Handler 참조와 기본 전달 동작은 선택적으로 Handler 기반 클래스에 둘 수 있다.

위 예시처럼 ConcreteHandler마다 `this.next?.handle(request)`를 호출하면 전달 전후 처리와 조건부 전달을 자유롭게 구현할 수 있지만, 한 Handler가 호출을 빠뜨리면 뒤쪽 체인이 오류 없이 실행되지 않는다. 전달 여부가 처리 결과만으로 정해지면 전달을 기반 클래스의 Template Method로 올리고 ConcreteHandler는 판단만 구현한다. 위 예시의 `LimitHandler`를 이 구조로 옮기면 다음과 같다.

```typescript
abstract class BaseRefundHandler implements RefundHandler {
  constructor(private readonly next?: RefundHandler) {}

  /**
   * 이 Handler가 판단하면 그 결정을 반환하고, 아니면 다음 Handler에 넘긴다.
   * @param request 환불 요청
   * @returns 환불 결정, 체인 끝까지 아무도 판단하지 않으면 undefined
   */
  async handle(request: RefundRequest): Promise<RefundDecision | undefined> {
    const decision = await this.decide(request)
    return decision ?? this.next?.handle(request)
  }

  /** 이 Handler가 판단할 요청이 아니면 undefined를 반환한다. */
  protected abstract decide(request: RefundRequest): Promise<RefundDecision | undefined>
}

class LimitHandler extends BaseRefundHandler {
  protected async decide(request: RefundRequest): Promise<RefundDecision | undefined> {
    const exceedsLimit = request.amount.isGreaterThan(request.limit)
    return exceedsLimit ? { approved: false, reason: 'LIMIT_EXCEEDED' } : undefined
  }
}
```

기반 클래스가 처리 결과와 관계없이 다음 Handler를 호출하면 모든 Handler가 차례로 실행되는 파이프라인이 되어, 요청을 처리한 Handler가 체인을 멈출 수 없다. 첫 처리자에서 끝내려면 위처럼 단계 메서드의 반환값에 처리 여부를 담아 기반 클래스가 판단한다. TypeScript의 `protected`는 타입 검사에서만 적용되고, 하위 클래스는 `decide`를 public으로 다시 선언할 수 있고 `handle`도 재정의할 수 있다. `noImplicitOverride`를 켜도 `handle` 재정의는 `override`만 붙이면 통과하고, 추상 메서드 `decide`를 처음 구현하는 하위 클래스는 `override`를 요구받지 않아 public으로 선언해도 아무 표시 없이 통과한다. 기반 클래스의 전달 규칙은 [[TemplateMethod패턴이란|Template Method]]처럼 상속 계약과 테스트로 지킨다.

## 체인을 연결하고 조립한다

- 생성자 주입: 체인을 뒤에서부터 만든다(`new LimitHandler(new PeriodHandler())`). `readonly` 참조는 타입 검사에서 재할당이 막히고 이미 만든 객체만 넘길 수 있어, 일반적인 생성 순서로는 순환이 생기지 않는다.
- 세터(`setNext()`): 앞에서부터 연결하고 실행 중에 체인을 바꿀 수 있다. 대신 같은 Handler 인스턴스를 두 체인이 공유하면 한쪽의 재연결이 다른 체인도 바꾸고, 뒤쪽 Handler의 다음으로 앞쪽 Handler를 연결하면 순환이 생긴다.

순환은 전달 방식에 따라 다르게 드러난다. Node.js v26.7.0 기준으로, 다음 Handler를 동기로 호출하거나 첫 `await` 전에 호출하면 `RangeError: Maximum call stack size exceeded`로 끝난다. 위 기반 클래스처럼 `await` 뒤에 전달하면 호출마다 스택이 비워져 예외 없이 microtask가 계속 이어지고, 그동안 타이머 같은 다른 작업은 실행되지 못한 채 메모리 사용량이 늘어 힙 한도를 넘을 수 있다.

새 Handler를 추가할 때 기존 Handler와 요청을 보내는 쪽은 고치지 않지만 체인을 조립하는 코드는 바뀐다. NestJS에서는 `useFactory` Provider가 `inject`로 받은 의존성으로 체인을 만들고 첫 Handler를 `Symbol` 토큰으로 등록하면 조립 순서가 한 곳에 모이고, 도메인 코드는 첫 Handler의 계약에만 의존한다.

## 출처

- 얄팍한 코딩사전, [Chain of Responsibility 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245642)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 17. Chain of responsibility](https://www.youtube.com/watch?v=DSedrbHRXh4)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript TSConfig Reference, noImplicitOverride](https://www.typescriptlang.org/tsconfig/noImplicitOverride.html)
- [MDN, InternalError: too much recursion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion), [Using microtasks in JavaScript with queueMicrotask()](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide), [await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[Middleware패턴이란|Middleware 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[Specification패턴이란|Specification 패턴]]
