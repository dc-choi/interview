---
tags: [architecture, design-pattern, behavioral, interpreter]
status: done
category: "Architecture & Design"
aliases: ["Interpreter Pattern", "인터프리터 패턴"]
---

# Interpreter 패턴이란?

Interpreter는 작은 언어의 문법 규칙을 객체 구조로 표현하고, 문장을 그 구조로 해석하는 행동 패턴이다. 보통 Terminal Expression과 여러 식을 조합하는 Nonterminal Expression으로 추상 구문 트리를 만든다.

## 예시

```typescript
type Context = Readonly<Record<string, boolean>>

interface Expression {
  interpret(context: Context): boolean
}

class And implements Expression {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
  ) {}

  interpret(context: Context): boolean {
    return this.left.interpret(context) && this.right.interpret(context)
  }
}
```

`Feature('paid') AND Feature('beta')` 같은 작은 권한 규칙을 Composite 구조로 표현할 수 있다.

## 적용 경계

- 문법이 작고 안정적이며 규칙 조합을 객체로 다룰 가치가 있을 때 적합하다.
- 규칙 종류마다 클래스가 늘어나므로 문법이 크거나 우선순위와 오류 복구가 복잡하면 파서 생성기나 전용 DSL 도구가 낫다.
- 사용자 입력을 해석한다면 허용 문법, 최대 깊이, 실행 시간과 접근 가능한 기능을 제한한다.
- 문자열을 `eval`하는 것은 Interpreter 패턴 구현이 아니며 코드 실행 취약점을 만들 수 있다.

Specification은 후보가 비즈니스 조건을 만족하는지 표현하는 데 초점이 있고, Interpreter는 언어 문법과 해석에 초점이 있다. Composite는 두 패턴의 트리 구조를 구현하는 데 활용될 수 있다.

## 출처

- 얄팍한 코딩사전, [Interpreter 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=246635)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[Specification패턴이란|Specification 패턴]]
- [[Security|보안]]
