---
tags: [cs, functional, category-theory, adt, type-algebra, sum-type, product-type]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["ADT 실용적 가치", "ADT 면접 체크포인트"]
---

# ADT — 실용적 가치, Curry-Howard, 면접 체크포인트

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
| `A ∧ B` (AND) | `a × b` | `[A, B]` |
| `A ∨ B` (OR) | `a + b` | `Either<A, B>` |
| `A → B` (함의) | `b^a` | `(a: A) => B` |

논리 법칙이 그대로 타입 대수 법칙. 자세한 건 [[Types-As-Proofs]].

## 자주 헷갈리는 포인트

- **모든 product가 튜플은 아니다** — record/struct/class도 모두 product. 이름 있는 product
- **모든 sum이 Either는 아니다** — Maybe(`1 + a`), Bool(`1 + 1`), discriminated union 모두 sum
- **타입의 원소 개수가 무한이라도 대수는 작동** — `String`은 무한 집합이지만 `String × Bool`은 여전히 곱
- **JavaScript의 raw union (`A | B`)은 진짜 sum이 아니다** — 타입이 겹치면 구별 불가. tag 있어야 disjoint union → 진짜 sum
- **`a × 0 = 0`의 의미** — `[A, never]`는 만들 수 없는 타입(never의 인스턴스가 없으니까). 이를 활용해 "이 분기는 도달 불가"를 타입으로 표현 가능
- **카디널리티 일치 ≠ 동형** — `[A, B]`와 `[B, A]`는 카디널리티 같고 동형. 그러나 의미 다른 두 타입이 카디널리티만 같고 동형 아닌 경우도 있음 (구조적 일치 필요)

## 면접 체크포인트

- **Product = 곱셈, Sum = 덧셈, Function = 지수**의 카디널리티 의미
- **타입 대수 법칙** — 항등원(0/1), 영(`a × 0 = 0`), 분배법칙
- **재귀 ADT를 방정식으로** 표현 (List = `1 + a×x`)
- **Make illegal states unrepresentable** — sum type으로 잘못된 상태를 타입에서 차단
- `deriving Eq/Show/Ord`의 카테고리적 정당성 (합성성)
- TS의 raw union vs discriminated union 차이 — 후자가 진짜 coproduct/sum
