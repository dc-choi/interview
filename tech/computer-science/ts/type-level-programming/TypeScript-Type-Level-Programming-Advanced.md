---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 심화", "infer와 Mapped Types와 재귀 타입"]
verified_at: 2026-08-04
---

# TypeScript 타입 레벨 프로그래밍 — 심화 (infer, Mapped, Template Literal, 재귀)

## `infer` — 타입 추출 (Pattern Matching)

조건부 타입의 true branch에서 사용할 타입 변수를 패턴 위치에 선언한다.

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type R = ReturnType<Fn>   // string
```

`infer R`은 조건에 맞는 타입의 해당 위치를 `R`로 추론한다.

고급 예: 배열의 첫 원소 타입:
```typescript
type Head<T> = T extends [infer H, ...any[]] ? H : never
type First = Head<[1, 2, 3]>  // 1
```

## 매핑된 타입 (Mapped Types)

`PropertyKey` 유니온을 순회하며 객체 속성을 만든다. 주로 `keyof`와 indexed access type을 함께 사용한다.

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
}

type Partial<T> = {
  [K in keyof T]?: T[K]
}

type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}
```

유틸리티 타입은 구현 원리에 따라 구분해야 한다.

- mapped type 기반: `Partial`, `Required`, `Readonly`, `Pick`, `Record`
- conditional type 기반: `Exclude`, `Extract`
- conditional type과 `infer` 기반: `Parameters`, `ReturnType`, `InstanceType`
- intersection 기반: TypeScript 4.8 이후의 `NonNullable<T>`는 `T & {}`
- 조합형: `Omit`은 key 제외와 속성 선택을 결합한다.

## Template Literal Types

문자열 리터럴을 **템플릿처럼 조합**. 4.1+.

```typescript
type Greeting = `Hello, ${string}`
type Hi = 'Hello, World'  // Greeting에 할당 가능

type EventHandler<E extends string> = `on${Capitalize<E>}`
type ClickHandler = EventHandler<'click'>  // "onClick"
```

API 경로, CSS 클래스, 이벤트 이름 같은 문자열 패턴을 타입으로 표현할 수 있다.

## 재귀 조건부 타입

조건부 타입은 분기 안에서 자신을 다시 참조할 수 있다.

```typescript
type Length<T extends any[]> = T extends { length: infer L } ? L : never

type Reverse<T extends any[]> = T extends [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : []

type R = Reverse<[1, 2, 3]>  // [3, 2, 1]
```

TypeScript 4.1에서 재귀 조건부 타입을 지원했고, 4.5에서 일부 tail-recursive conditional type의 평가 제한을 완화했다. 그래도 재귀가 너무 깊거나 타입이 크게 팽창하면 `Type instantiation is excessively deep` 진단이 발생할 수 있다.

## 관련 문서

- [[TypeScript-Type-Level-Programming-Basics|타입 레벨 프로그래밍 기초]]
- [[TypeScript-Type-Level-Programming-Practice|타입 레벨 프로그래밍 실전]]

## 출처

- [TypeScript Handbook, Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook, Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook, Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript 4.8 Release Notes, Improved Intersection Reduction](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-8.html#improved-intersection-reduction-union-compatibility-and-narrowing)
- [TypeScript 4.5 Release Notes, Tail-Recursion Elimination on Conditional Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#tail-recursion-elimination-on-conditional-types)
- [맵드 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=158374)
- [infer, 조건부 타입 내에서 타입 추론하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159063)
- [맵드 타입 기반의 유틸리티 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159864)
- [조건부 타입 기반의 유틸리티 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159866)
