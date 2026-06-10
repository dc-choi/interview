---
tags: [cs, functional, category-theory, adt, type-algebra, sum-type, product-type]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Algebraic Data Types", "ADT", "타입 대수", "Type Algebra"]
---

# Algebraic Data Types (타입 대수)

타입을 **덧셈과 곱셈으로 다루는 대수적 구조**. Product를 곱셈, Sum을 덧셈으로 보면 자연수 산술과 거의 같은 법칙(항등원·영·분배법칙)이 성립한다. 이 관점이 ADT가 "algebraic"이라 불리는 이유다. Product/Coproduct의 카테고리적 정의는 [[Products-And-Coproducts]] 참조.

## 핵심 명제

| 타입 | 대수 | 항등원 | 의미 |
|---|---|---|---|
| **Product** `(a, b)` | 곱셈 `a · b` | `1` (Unit) | 두 값을 함께 가짐 (AND) |
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

## 타입 대수 법칙 — 산술처럼 작동

| 법칙 | 산술 | 타입 |
|---|---|---|
| **덧셈 항등원** | `a + 0 = a` | `Either<A, never> ≅ A` |
| **곱셈 항등원** | `a · 1 = a` | `[A, void] ≅ A` |
| **영 곱하기** | `a · 0 = 0` | `[A, never] ≅ never` |
| **덧셈 교환** | `a + b = b + a` | `Either<A, B> ≅ Either<B, A>` |
| **곱셈 교환** | `a · b = b · a` | `[A, B] ≅ [B, A]` |
| **결합법칙** | `(a · b) · c = a · (b · c)` | `[[A, B], C] ≅ [A, [B, C]]` |
| **분배법칙** | `a · (b + c) = a·b + a·c` | `[A, Either<B, C>] ≅ Either<[A,B], [A,C]>` |

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
x = 1 + a · x
```

반복 대입하면:
```
x = 1 + a + a² + a³ + a⁴ + ...
```

각 항이 "길이 N인 리스트"의 원소 개수에 대응. 같은 수법으로 `Tree`, `BinaryTree` 같은 재귀 구조를 분석 가능.

```haskell
data Tree a = Leaf | Node a (Tree a) (Tree a)
-- t = 1 + a · t · t
```

## ADT의 실용적 가치

### 합성성 (Compositionality)

기본 연산(Product/Sum)의 성질이 합성된 타입에도 자동으로 전파된다. Haskell의 `deriving (Eq, Show, Ord)`가 정확히 이 원리:

- 동등성: 모든 필드가 `Eq`면 자동으로 `Eq`
- 순서: 모든 필드가 `Ord`면 lexicographic 순서로 `Ord`
- 직렬화: 각 필드가 `Show`면 자동으로 `Show`

OOP의 수동 구현(equals/hashCode/compareTo) 대비 자동화의 카테고리 이론적 근거.

### 패턴 매칭의 안전성

Sum type은 case가 유한하고 명시적 → **exhaustive switch**로 컴파일러가 누락을 잡아냄.

```ts
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number };
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.s ** 2;
    // 새 case 추가하면 컴파일러가 누락 알림
  }
}
```

### 도메인을 타입으로 표현

ADT를 잘 쓰면 "잘못된 상태가 표현될 수 없는" 타입을 만들 수 있다 — 일명 **make illegal states unrepresentable**.

```ts
// 잘못된 상태 가능 (loading=true && data존재)
type Bad = { loading: boolean; data?: User; error?: Error };

// 잘못된 상태 불가능 (sum type 활용)
type Good =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'success'; data: User }
  | { tag: 'error'; error: Error };
```

## Curry-Howard 대응 (간단)

| 논리 | 타입 대수 | 프로그래밍 |
|---|---|---|
| `false` (모순) | `0` | `never` / `Void` |
| `true` | `1` | `void` / `()` |
| `A ∧ B` (AND) | `a · b` | `[A, B]` |
| `A ∨ B` (OR) | `a + b` | `Either<A, B>` |
| `A → B` (함의) | `b^a` | `(a: A) => B` |

논리 법칙이 그대로 타입 대수 법칙. 자세한 건 [[Types-As-Proofs]].

## 자주 헷갈리는 포인트

- **모든 product가 튜플은 아니다** — record/struct/class도 모두 product. 이름 있는 product
- **모든 sum이 Either는 아니다** — Maybe(`1 + a`), Bool(`1 + 1`), discriminated union 모두 sum
- **타입의 원소 개수가 무한이라도 대수는 작동** — `String`은 무한 집합이지만 `String × Bool`은 여전히 곱
- **JavaScript의 raw union (`A | B`)은 진짜 sum이 아니다** — 타입이 겹치면 구별 불가. tag 있어야 disjoint union → 진짜 sum
- **`a · 0 = 0`의 의미** — `[A, never]`는 만들 수 없는 타입(never의 인스턴스가 없으니까). 이를 활용해 "이 분기는 도달 불가"를 타입으로 표현 가능
- **카디널리티 일치 ≠ 동형** — `[A, B]`와 `[B, A]`는 카디널리티 같고 동형. 그러나 의미 다른 두 타입이 카디널리티만 같고 동형 아닌 경우도 있음 (구조적 일치 필요)

## 면접 체크포인트

- **Product = 곱셈, Sum = 덧셈, Function = 지수**의 카디널리티 의미
- **타입 대수 법칙** — 항등원(0/1), 영(`a · 0 = 0`), 분배법칙
- **재귀 ADT를 방정식으로** 표현 (List = `1 + a·x`)
- **Make illegal states unrepresentable** — sum type으로 잘못된 상태를 타입에서 차단
- `deriving Eq/Show/Ord`의 카테고리적 정당성 (합성성)
- TS의 raw union vs discriminated union 차이 — 후자가 진짜 coproduct/sum

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 6. Simple Algebraic Data Types](https://evan-moon.github.io/2024/03/05/category-theory-for-programmers-6-simple-algebraic-data-types/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Products-And-Coproducts|Products and Coproducts (카테고리 이론적 정의)]]
- [[Function-Types-And-Currying|Function Types · Currying · CCC (지수 법칙)]]
- [[Bifunctors-Profunctors|Bifunctors·Profunctors (ADT가 자동 Functor 되는 근거)]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Void/Unit)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[Order-Monoid-Categories|Order·Monoid 카테고리]]
- [[Monads-In-TypeScript|Monads in TypeScript (Maybe = 1+a)]]
