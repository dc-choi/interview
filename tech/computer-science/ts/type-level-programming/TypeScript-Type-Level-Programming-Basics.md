---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 기초", "집합 관점과 조건부 타입"]
---

# TypeScript 타입 레벨 프로그래밍 — 기초 (집합, Generic, 조건부 타입)

## 타입 = 집합

타입 시스템을 이해하는 가장 쉬운 관점: **타입은 값들의 집합**.

```
type A = 1 | 2 | 3        // 3개 원소 집합
type B = 2 | 3 | 4        // 3개 원소 집합
type C = A | B            // 합집합 {1,2,3,4}
type D = A & B            // 교집합 {2,3}
```

- **Union (`|`)**: 집합 합집합 (Union Type)
- **Intersection (`&`)**: 집합 교집합 (Intersection Type)
- **`never`**: 공집합
- **`unknown`**: 전체 집합
- **서브타입**: 부분집합 관계

## 타입 레벨 함수: Generic

Generic은 **타입을 받아 타입을 반환하는 함수**.

```
type Pair<T> = [T, T]
type StringPair = Pair<string>   // [string, string]
```

매개변수 여러 개, 기본값, 제약 조건(`extends`) 지원 → 고차 함수급 표현력.

## 조건부 타입 (Conditional Types)

타입 레벨의 `if-else`. **`T extends U ? X : Y`** 문법.

```
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>   // true
type B = IsString<42>        // false
```

실무 예:
```
type NonNull<T> = T extends null | undefined ? never : T
type StringOrNull = string | null
type JustString = NonNull<StringOrNull>  // string
```

## 분배 조건부 타입 (Distributive Conditional Types)

Conditional Type의 제네릭 T가 **Union이면** 자동으로 각 원소에 적용 후 Union으로 묶음.

```
type ToArray<T> = T extends any ? T[] : never
type Result = ToArray<string | number>  // string[] | number[]
```

이 특성이 `Exclude`, `Extract` 내부 구현의 핵심.

```
type Exclude<T, U> = T extends U ? never : T
type A = Exclude<'a' | 'b' | 'c', 'a'>  // 'b' | 'c'
```
