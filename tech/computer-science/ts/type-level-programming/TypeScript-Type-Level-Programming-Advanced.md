---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 심화", "infer와 Mapped Types와 재귀 타입"]
---

# TypeScript 타입 레벨 프로그래밍 — 심화 (infer, Mapped, Template Literal, 재귀)

## `infer` — 타입 추출 (Pattern Matching)

조건부 타입 안에서 특정 위치의 타입을 **변수로 끄집어냄**.

```
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type R = ReturnType<Fn>   // string
```

`infer`는 "이 위치에 뭐가 오든 R이라 부르자"고 선언. **패턴 매칭**의 핵심.

고급 예: 배열의 첫 원소 타입:
```
type Head<T> = T extends [infer H, ...any[]] ? H : never
type First = Head<[1, 2, 3]>  // 1
```

## 매핑된 타입 (Mapped Types)

객체 타입의 **모든 필드를 순회하며 변환**.

```
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

`Record`, `Required`, `NonNullable` 같은 빌트인 유틸리티가 모두 매핑 타입 + 조건부 타입 조합.

## Template Literal Types

문자열 리터럴을 **템플릿처럼 조합**. 4.1+.

```
type Greeting = `Hello, ${string}`
type Hi = 'Hello, World'  // Greeting에 할당 가능

type EventHandler<E extends string> = `on${Capitalize<E>}`
type ClickHandler = EventHandler<'click'>  // "onClick"
```

API 경로, CSS 클래스, 이벤트 이름 같은 **문자열 패턴을 타입으로 표현** 가능.

## 재귀 조건부 타입

타입 스스로를 재귀 호출 → **루프, 재귀 알고리즘** 구현.

```
type Length<T extends any[]> = T extends { length: infer L } ? L : never

type Reverse<T extends any[]> = T extends [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : []

type R = Reverse<[1, 2, 3]>  // [3, 2, 1]
```

TypeScript 4.1부터 꼬리 재귀 최적화, 4.5부터 **재귀 깊이 확장**. 다만 컴파일 타임에 너무 깊으면 **"Type instantiation is excessively deep"** 에러.
