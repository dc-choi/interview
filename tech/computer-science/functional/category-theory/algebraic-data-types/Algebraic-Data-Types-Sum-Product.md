---
tags: [cs, functional, category-theory, adt, type-algebra, sum-type, product-type]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["ADT Sum과 Product", "타입 대수의 덧셈과 곱셈"]
---

# ADT — Sum과 Product (덧셈과 곱셈)

## 핵심 명제

| 타입 | 대수 | 항등원 | 의미 |
|---|---|---|---|
| **Product** `(a, b)` | 곱셈 `a × b` | `1` (Unit) | 두 값을 함께 가짐 (AND) |
| **Sum** `Either a b` | 덧셈 `a + b` | `0` (Void) | 둘 중 하나만 가짐 (OR) |
| **Function** `a → b` | 지수 `b^a` | — | a를 받아 b 반환 |

타입의 **원소 개수**(cardinality)를 산술처럼 다룰 수 있다. `Bool`은 2, `()`은 1, `Void`는 0.

## Product = 곱셈

두 값을 동시에 가지는 타입. 원소 개수는 두 타입의 곱.

```ts
type Pair<A, B> = readonly [A, B];
// |Pair<Bool, Bool>| = 2 * 2 = 4
// 가능한 값: [F,F], [F,T], [T,F], [T,T]
```

**항등원 = 1 (Unit)**: `(A, ()) ≅ A`. 곱하기 1은 자기 자신.

```haskell
data Element = Element { name :: String, symbol :: String, atomicNumber :: Int }
-- 세 타입의 곱
```

## Sum = 덧셈

둘 중 하나만 가지는 타입. 원소 개수는 두 타입의 합.

```ts
type Either<A, B> = { tag: 'Left'; value: A } | { tag: 'Right'; value: B };
// |Either<Bool, Bool>| = 2 + 2 = 4
```

**항등원 = 0 (Void)**: `Either<A, never> ≅ A`. 더하기 0은 자기 자신. `Right(never)`는 만들 수 없으니 사실상 `Left(A)`만 남음.

```haskell
data Maybe a = Nothing | Just a   -- 1 + a
data Bool    = False  | True       -- 1 + 1 = 2
```
