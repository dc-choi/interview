---
tags: [cs, functional, category-theory, adt, type-algebra, sum-type, product-type]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["타입 대수 법칙", "재귀 ADT 방정식"]
---

# ADT — 타입 대수 법칙, 지수, 재귀 방정식

## 타입 대수 법칙 — 산술처럼 작동

| 법칙 | 산술 | 타입 |
|---|---|---|
| **덧셈 항등원** | `a + 0 = a` | `Either<A, never> ≅ A` |
| **곱셈 항등원** | `a × 1 = a` | `[A, void] ≅ A` |
| **영 곱하기** | `a × 0 = 0` | `[A, never] ≅ never` |
| **덧셈 교환** | `a + b = b + a` | `Either<A, B> ≅ Either<B, A>` |
| **곱셈 교환** | `a × b = b × a` | `[A, B] ≅ [B, A]` |
| **결합법칙** | `(a × b) × c = a × (b × c)` | `[[A, B], C] ≅ [A, [B, C]]` |
| **분배법칙** | `a × (b + c) = a×b + a×c` | `[A, Either<B, C>] ≅ Either<[A,B], [A,C]>` |

`≅`는 동형(isomorphism). 두 타입 사이에 **양방향 무손실 변환**이 있다는 의미.

### 분배법칙의 실용 의미

```ts
// (User × (PaidPlan + FreePlan)) ≅ (User × PaidPlan) + (User × FreePlan)
type A = readonly [User, Either<PaidPlan, FreePlan>];
type B = Either<readonly [User, PaidPlan], readonly [User, FreePlan]>;
// A와 B는 동형 — 어느 쪽으로 모델링해도 정보량이 같음
```

도메인 모델링 시 두 표현 중 무엇을 쓸지는 **사용 패턴**이 결정 (왼쪽이 분기 처리에 자연스러움 vs 오른쪽이 case별 데이터 분리에 명확).

## Exponential = 함수 타입

함수 `a → b`의 원소 개수는 `b^a`. "a 종류의 입력 각각에 대해 b 종류의 출력을 선택" → 곱하기.

```ts
type BoolToBool = (b: boolean) => boolean;
// |BoolToBool| = 2^2 = 4
// (T→T,F→F), (T→F,F→T), (T→T,F→T), (T→F,F→F)
```

이는 **Curry-Howard와 직결** — 함수 타입 = 함의(implication) `A → B`. 자세한 논리 대응은 [[Types-As-Proofs]].

## 재귀 ADT — 방정식으로 풀기

타입 대수의 강력한 점: **재귀 자료구조도 방정식**으로 표현된다.

```haskell
data List a = Nil | Cons a (List a)
```

방정식으로:
```
x = 1 + a × x
```

반복 대입하면:
```
x = 1 + a + a² + a³ + a⁴ + ...
```

각 항이 "길이 N인 리스트"의 원소 개수에 대응. 같은 수법으로 `Tree`, `BinaryTree` 같은 재귀 구조를 분석 가능.

```haskell
data Tree a = Leaf | Node a (Tree a) (Tree a)
-- t = 1 + a × t × t
```
