---
tags: [cs, functional, category-theory, product, coproduct, sum-type, adt]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Products and Coproducts", "Product Coproduct", "곱 합 카테고리", "Sum Type", "Universal Construction"]
---

# Products and Coproducts

카테고리 이론에서 **두 객체를 결합하는 두 가지 표준 방법**. Product는 튜플·구조체로, Coproduct는 sum type·Either·discriminated union으로 프로그래밍에 나타난다. 카테고리 이론 일반은 [[Category-Theory-For-Programmers]] 참조.

## 핵심 명제

- **Product (곱)** = "두 값을 함께 들고 다님" → 튜플 `[A, B]`, 구조체, `{a: A; b: B}`
- **Coproduct (합)** = "둘 중 하나" → `A | B`, `Either<A, B>`, sum type, discriminated union
- 두 개념은 **화살표 방향만 뒤집은 쌍대(dual) 관계** — 같은 정의 패턴을 반대 방향으로 적용한 결과

## Universal Construction (보편 구성)

카테고리 이론에서 객체를 정의하는 표준 패턴:

1. 원하는 **패턴(property)** 을 정의 (예: "두 객체로의 화살표를 가진 객체")
2. 그 패턴을 만족하는 **모든 후보**를 모음
3. 후보들을 비교해 **가장 보편적인(universal) 것**을 고름 — "다른 모든 후보가 이 객체로 유일하게 인수분해(factor)됨"

이 방식으로 정의된 객체는 **동형(isomorphism)을 기준으로 유일**하다 (unique up to isomorphism). 즉 구체적 표현(튜플 vs 구조체)은 달라도 카테고리 이론적으로 같은 것.

## Initial Object & Terminal Object

가장 단순한 universal construction 사례. 카테고리의 양 극단.

| 종류 | 정의 | 집합 카테고리 | 프로그래밍 대응 |
|---|---|---|---|
| **Initial Object** | 모든 객체로 향하는 사상이 **유일** | 공집합 `∅` | `Void`, `never` |
| **Terminal Object** | 모든 객체에서 오는 사상이 **유일** | 1원소 집합 `{*}` | `()`, `unit`, `void` |

```ts
// Initial — 호출 불가 (인자가 존재할 수 없음)
const absurd = <A>(_: never): A => { throw new Error('unreachable'); };

// Terminal — 어떤 값이든 받아 unit 반환
const unit = <A>(_: A): void => undefined;
```

**Unique up to Isomorphism**: 두 initial object `i₁`, `i₂`가 있다면 둘 사이에 유일한 동형사상이 존재해 사실상 같은 객체. terminal도 마찬가지. 그래서 "**the** initial object"라고 부른다.

## Product의 카테고리적 정의

객체 `A`, `B`의 **곱** `A × B`는 다음을 만족하는 객체 + 두 사상:

- 두 **투영 사상(projections)**: `fst: A×B → A`, `snd: A×B → B`
- 같은 패턴을 만족하는 다른 객체 `C` 와 사상 `p: C → A`, `q: C → B` 가 있으면, **유일한 사상** `m: C → A×B`가 존재해 `p = fst ∘ m`, `q = snd ∘ m`을 만족 (universal property)

```ts
type Product<A, B> = readonly [A, B];

const fst = <A, B>(p: Product<A, B>): A => p[0];
const snd = <A, B>(p: Product<A, B>): B => p[1];

// universal property 의 "유일한 m" — factorizer
const factorizer = <C, A, B>(
  p: (c: C) => A,
  q: (c: C) => B,
) => (c: C): Product<A, B> => [p(c), q(c)];
```

**프로그래밍 대응**: 튜플 `[A, B]`, 객체 `{a: A; b: B}`, 구조체, dataclass, record. 다 이름만 다른 같은 product 구조.

## Coproduct의 카테고리적 정의

객체 `A`, `B`의 **합** `A + B`는 Product의 화살표를 모두 뒤집은 것:

- 두 **삽입 사상(injections)**: `left: A → A+B`, `right: B → A+B`
- 같은 패턴을 만족하는 다른 객체 `C` 와 사상 `i: A → C`, `j: B → C` 가 있으면, **유일한 사상** `m: A+B → C`가 존재해 `i = m ∘ left`, `j = m ∘ right`를 만족

```ts
type Either<A, B> =
  | { tag: 'Left';  value: A }
  | { tag: 'Right'; value: B };

const left = <A, B>(a: A): Either<A, B> => ({ tag: 'Left',  value: a });
const right = <A, B>(b: B): Either<A, B> => ({ tag: 'Right', value: b });

// universal property — Either를 다른 타입으로 풀어냄
const factorizer = <A, B, C>(
  i: (a: A) => C,
  j: (b: B) => C,
) => (e: Either<A, B>): C =>
  e.tag === 'Left' ? i(e.value) : j(e.value);
```

집합 카테고리에서 Coproduct는 **Disjoint Union**(서로소 합집합) — 같은 원소가 양쪽에 있어도 별개로 취급. tag로 구분.

**프로그래밍 대응**: discriminated/tagged union, sum type, ADT, `Result<T, E>`, `Maybe<T>`(Just/Nothing), Rust `enum`.

## Duality (쌍대성) — 한 번에 두 개념 얻기

카테고리 `C`의 모든 화살표를 뒤집은 카테고리를 `C^op`라 한다. `C`에서의 정의를 `C^op`에 적용하면 자동으로 쌍대 개념이 나온다 — **공짜로 두 개념을 얻는 메커니즘**.

| 개념 | 쌍대 |
|---|---|
| Initial Object | Terminal Object |
| Product | Coproduct |
| Limit | Colimit |
| Monad | Comonad |
| Algebra | Coalgebra |

화살표를 두 번 뒤집으면 원래대로 → "co-coproduct"는 그냥 product. 그래서 모든 개념은 자기 자신의 "co-co-자신". `Co-Comonad = Monad`.

## 프로그래밍 비대칭성 — FP vs OOP

집합의 `|A × B| = |A| · |B|` (곱), `|A + B| = |A| + |B|` (합) 라는 크기 차이가 함수의 비대칭성과 결합되어 패러다임 차이로 이어진다.

| 패러다임 | 친화 | 표현 방식 |
|---|---|---|
| **FP (Haskell, Rust, F#)** | **Coproduct 친화** | ADT/sum type으로 "둘 중 하나"를 1급 시민으로 |
| **OOP (Java, C#)** | **Product 친화** | 클래스/구조체 + 인터페이스 조합으로 "함께 들고 다님" |

- FP에서 "결제 결과는 성공이거나 실패"는 자연스럽게 `Result<Success, Failure>`
- OOP에서 같은 것은 보통 `PaymentResult` 추상 클래스 + `Success`/`Failure` 서브클래스 (Visitor 패턴)
- 후자는 새 case 추가 시 모든 visitor 수정 필요. 전자는 `match`/`switch` 한 곳만 수정 (Expression Problem의 한 면)

TypeScript 같이 두 패러다임을 다 지원하는 언어는 둘 다 자연스럽게 표현 가능. **discriminated union + exhaustive switch**는 sum type을 안전하게 다루는 핵심 기법 ([[Types-As-Proofs]]).

## 자주 헷갈리는 포인트

- **Product ≠ 단순 튜플** — 튜플은 product의 한 표현. 구조체·record도 모두 product. 정의의 본질은 두 개의 projection
- **Coproduct ≠ 일반 union** — TypeScript의 raw union (`A | B`)은 두 타입이 겹치면 구별 불가. **Discriminated union**이라야 진짜 coproduct (tag 필요)
- **Initial = `never` ≠ `null`/`undefined`** — `never`는 값이 존재하지 않는 타입. `null`은 1원소 타입(terminal에 가까움)
- **Terminal = `void` ≠ "값 없음"** — `void`는 1원소 타입(`undefined` 하나만 가능). 그 자체로 정보가 1개
- **`A | A` ≠ `A` (집합 카테고리에서)** — Disjoint union이라 같은 원소가 두 번 들어감. 단, TS의 raw union에서는 합쳐짐 (수학적 coproduct가 아님)

## 면접 체크포인트

- **Universal Construction**의 의미와 "unique up to isomorphism"
- **Product = 튜플/구조체, Coproduct = sum type/Either** 매핑과 universal property
- **Duality**가 한 번의 정의로 두 개념을 만드는 메커니즘 (Initial↔Terminal, Product↔Coproduct)
- **FP vs OOP**의 비대칭성 — Coproduct 친화 vs Product 친화
- **Discriminated union vs raw union**의 차이 (진짜 coproduct가 되려면 tag 필요)
- **Expression Problem**: sum type은 case 추가가 쉬움/연산 추가가 어려움 / 클래스 계층은 그 반대

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 5. Products and Coproducts](https://evan-moon.github.io/2024/02/27/category-theory-for-programmers-5-products-and-coproducts/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Declarative-Programming|Declarative Programming (Universal Construction의 선언형 성격)]]
- [[Algebraic-Data-Types|Algebraic Data Types (타입 대수·분배법칙·재귀 방정식)]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Void/Unit/Bool)]]
- [[Order-Monoid-Categories|Order·Monoid 카테고리]]
- [[Kleisli-Category|Kleisli Category — 부수효과 모나드 합성]]
- [[Monads-In-TypeScript|Monads in TypeScript — Maybe/Either는 coproduct]]
- [[Types-As-Proofs|Types as Proofs — Exhaustiveness]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
