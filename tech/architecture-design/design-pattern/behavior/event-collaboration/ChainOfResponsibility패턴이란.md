---
tags: [architecture, design-pattern, behavioral, chain-of-responsibility]
status: done
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

- 첫 처리자에서 종료할지, 모든 Handler를 통과할지 정한다.
- 아무도 처리하지 않았을 때 기본값, 오류 또는 무시 중 하나를 선택한다.
- 순서가 결과에 영향을 주면 구성 코드와 테스트에서 고정한다.
- 비동기 Handler의 시간 제한, 실패 전파와 재시도 책임을 정한다.

Express/NestJS의 Middleware, Guard, Pipe, Interceptor는 체인 또는 파이프라인 성격을 갖지만 각각 실행 계약과 책임이 다르다. 프레임워크 수명주기를 무시하고 하나의 일반 패턴으로 동일시하지 않는다.

여러 규칙이 모두 결과에 기여한다면 Composite나 명시적인 파이프라인이 더 적합할 수 있다. Chain은 다음 처리자를 직접 연결하는 유연성을 얻는 대신 전체 흐름을 한눈에 보기 어려워질 수 있다.

## 출처

- 얄팍한 코딩사전, [Chain of Responsibility 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=245642)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Middleware패턴이란|Middleware 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[Specification패턴이란|Specification 패턴]]
