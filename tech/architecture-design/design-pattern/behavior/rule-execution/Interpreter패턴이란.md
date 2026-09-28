---
tags: [architecture, design-pattern, behavioral, interpreter]
status: done
verified_at: 2026-09-27
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

문법 규칙 하나를 클래스 하나로 옮기고, 규칙 오른쪽의 하위 식을 그 클래스의 필드로 둔다. Nonterminal Expression의 해석은 필드에 든 하위 식의 해석을 재귀 호출하고, Terminal Expression이 재귀의 끝이 된다.

- 고정된 나열: `and ::= expression 'AND' expression`은 위 `And`처럼 하위 식마다 필드를 하나씩 둔다. `'AND'` 같은 구분 토큰은 필드가 아니다.
- 개수가 정해지지 않은 반복: `block ::= statement*`는 자식 Expression의 읽기 전용 배열을 두고 순서대로 해석한다.
- 대안 선택: `expression ::= feature | and`처럼 대안 중 하나가 오는 규칙은 공통 타입(`Expression`)과 대안별 구현 클래스로 표현한다.

## 파싱과 해석의 분리

Interpreter 패턴은 문장에서 추상 구문 트리를 만드는 방법, 즉 파싱을 다루지 않는다. 트리는 클라이언트가 직접 조립하거나, 테이블 기반 파서나 직접 작성한 파서(보통 재귀 하강)가 만든다.

각 Expression에 `parse(tokens): boolean`을 두어 노드가 자기 토큰을 읽게 하면 작은 문법에서는 규칙과 파싱 코드가 한 클래스에 모인다. 대신 노드를 먼저 만든 뒤 `parse`가 필드를 채우므로 필드를 `readonly`로 둘 수 없고, `strictPropertyInitialization`을 통과하려면 `!` 단언, 선택 속성이나 `undefined` 포함 타입, 임시 초기값 같은 우회가 필요하며, 파싱에 실패한 노드도 실행할 수 있는 상태로 남는다. `false`만 반환하면 어느 토큰이 틀렸는지 잃고, 토큰 위치를 해석용 Context에 함께 두면 파싱과 해석의 수명이 섞인다.

파서가 생성자로 불변 노드를 조립하고 문법 오류를 위치가 담긴 전용 에러로 던지면, 노드는 해석만 책임지고 한 번 만든 트리를 여러 Context로 반복해 해석할 수 있다. `Context`, `Expression`, `And`는 위 예시의 선언을 그대로 쓴다.

```typescript
class Feature implements Expression {
  constructor(private readonly name: string) {}

  interpret(context: Context): boolean {
    return context[this.name] === true
  }
}

class RuleSyntaxError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} (토큰 ${position})`)
  }
}

const FEATURE_NAME = /^[a-z][a-z0-9-]*$/

/**
 * `이름 (AND 이름)*` 형태의 규칙 문자열을 Expression 트리로 만든다.
 * @param source 해석할 규칙 문자열
 * @returns 규칙 전체를 나타내는 루트 Expression
 * @throws RuleSyntaxError 기대한 토큰이 없으면 위치와 함께 던진다
 */
const parseRule = (source: string): Expression => {
  const tokens = source.trim().split(/\s+/)
  const readFeature = (position: number): Feature => {
    const name = tokens[position]
    if (name === undefined || !FEATURE_NAME.test(name)) {
      throw new RuleSyntaxError('기능 이름이 필요하다', position)
    }
    return new Feature(name)
  }

  let expression: Expression = readFeature(0)
  for (let position = 1; position < tokens.length; position += 2) {
    if (tokens[position] !== 'AND') {
      throw new RuleSyntaxError('AND가 필요하다', position)
    }
    expression = new And(expression, readFeature(position + 1))
  }
  return expression
}

const rule = parseRule('paid AND beta')
rule.interpret({ paid: true, beta: true }) // true
rule.interpret({ paid: true }) // false
parseRule('paid OR beta') // RuleSyntaxError를 던진다 (position 1)
```

## 적용 경계

- 문법이 작고 안정적이며 규칙 조합을 객체로 다룰 가치가 있을 때 적합하다.
- 규칙 종류마다 클래스가 늘어나므로 문법이 크거나 우선순위와 오류 복구가 복잡하면 파서 생성기나 전용 DSL 도구가 낫다.
- 사용자 입력을 해석한다면 허용 문법, 최대 깊이, 실행 시간과 접근 가능한 기능을 제한한다.
- 문자열을 `eval`하는 것은 Interpreter 패턴 구현이 아니며 코드 실행 취약점을 만들 수 있다.
- 실행 외에 설명 문자열 생성, 정적 검증처럼 같은 트리를 해석하는 방법이 계속 늘면 연산마다 `Expression`과 모든 구현 클래스를 고쳐야 한다. 이때는 연산을 [[Visitor패턴이란|Visitor]]로 분리하거나, TypeScript에서는 노드를 discriminated union으로 두고 연산별 함수의 `switch`에서 `never`로 전수 검사한다. 반대로 연산은 고정이고 문법 규칙이 자주 늘면, 연산을 노드 클래스에 두는 기본 형태에서는 노드 쪽 변경이 새 클래스 추가로 끝난다(파서는 새 규칙에 맞게 따로 고친다).

Specification은 후보가 비즈니스 조건을 만족하는지 표현하는 데 초점이 있고, Interpreter는 언어 문법과 해석에 초점이 있다. Composite는 두 패턴의 트리 구조를 구현하는 데 활용될 수 있다.

## 출처

- 얄팍한 코딩사전, [Interpreter 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=246635)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 24. Interpreter](https://www.youtube.com/watch?v=vSp9GBcXTfM)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript TSConfig Reference, strictPropertyInitialization](https://www.typescriptlang.org/tsconfig/strictPropertyInitialization.html)
- [TypeScript Handbook, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[Visitor패턴이란|Visitor 패턴]]
- [[Specification패턴이란|Specification 패턴]]
- [[Security|보안]]
