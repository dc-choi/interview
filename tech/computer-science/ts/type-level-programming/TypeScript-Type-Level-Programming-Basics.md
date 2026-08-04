---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 기초", "집합 관점과 조건부 타입"]
verified_at: 2026-08-04
---

# TypeScript 타입 레벨 프로그래밍 — 기초 (집합, Generic, 조건부 타입)

## 타입 = 집합

타입을 값들의 집합으로 해석하면 서브타입과 유니온, 인터섹션의 관계를 일관되게 설명할 수 있다.

```typescript
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

타입 별칭의 generic은 타입을 받아 새 타입을 만드는 타입 레벨 함수처럼 볼 수 있다. 함수와 클래스의 generic은 값 사이의 타입 관계를 보존한다.

```typescript
type Pair<T> = [T, T]
type StringPair = Pair<string>   // [string, string]
```

매개변수 여러 개, 기본값, 제약 조건(`extends`) 지원 → 고차 함수급 표현력.

## 조건부 타입 (Conditional Types)

`T extends U ? X : Y`는 assignability 조건에 따라 타입을 고른다.

```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>   // true
type B = IsString<42>        // false
```

실무 예:
```typescript
type NonNull<T> = T extends null | undefined ? never : T
type StringOrNull = string | null
type JustString = NonNull<StringOrNull>  // string
```

## 분배 조건부 타입 (Distributive Conditional Types)

조건식 왼쪽이 괄호나 다른 타입으로 감싸지지 않은 타입 매개변수인 `T extends U` 형태이고 `T`에 유니온을 넣으면 각 구성원에 조건을 적용한 뒤 결과를 다시 유니온으로 묶는다. 단순히 조건부 타입 안에 유니온이 있다고 항상 분배되는 것은 아니다.

```typescript
type ToArray<T> = T extends unknown ? T[] : never
type Result = ToArray<string | number>  // string[] | number[]
```

이 특성이 `Exclude`, `Extract` 내부 구현의 핵심.

```typescript
type Exclude<T, U> = T extends U ? never : T
type A = Exclude<'a' | 'b' | 'c', 'a'>  // 'b' | 'c'
```

분배를 막으려면 조건 양쪽을 tuple로 감싼다.

```typescript
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type Result = ToArrayNonDist<string | number>; // (string | number)[]
```

## 관련 문서

- [[TS-Generics|제네릭]]
- [[TypeScript-Type-Level-Programming-Advanced|타입 레벨 프로그래밍 심화]]

## 출처

- [TypeScript Handbook, Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook, Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook, Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- yongsoocho, [utility type](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138451)
- yongsoocho, [generic과 조건부 타입](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137140)
- [분산적인 조건부 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159061)
