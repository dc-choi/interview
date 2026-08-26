---
tags: [cs, functional, category-theory, natural-transformation, parametricity, free-theorem]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Natural Transformations", "자연 변환", "Naturality", "Free Theorem", "Functor Category"]
---

# Natural Transformations

**두 Functor 사이의 구조 보존 매핑**. 같은 카테고리에서 다른 카테고리로 가는 두 Functor `F`, `G: C → D`가 있을 때, 이들 사이의 변환을 정의한다. 순수하고 강한 매개변수성을 만족하는 다형성 함수(`forall a. F a → G a`)는 자연 변환으로 해석할 수 있으며, 이 사실이 **free theorem**의 기반이다. 시그니처만으로 항상 보장되는 것은 아니다. Functor 일반은 [[Functors]] 참조.

## 핵심 명제

자연 변환 `α: F ⇒ G`는 카테고리 `C`의 **각 객체 `a` 마다** `D`의 사상 `α_a: F a → G a`를 지정한다.
- `α_a`를 **component morphism** (성분 사상)이라 부름
- 모든 `f: a → b`에 대해 **naturality condition** 만족

타입으로 보면:
```haskell
α :: forall a. F a -> G a
```

## Naturality Condition — 자연성 정사각형

다음 다이어그램이 **가환(commute)** 해야 한다:

```
          α_a
   F a ─────→ G a
    │          │
F f │          │ G f
    ↓          ↓
   F b ─────→ G b
          α_b
```

수식으로:
```
G f ∘ α_a  =  α_b ∘ F f          (모든 f: a → b 에 대해)
```

**의미**: 두 경로(먼저 변환 후 매핑 vs 먼저 매핑 후 변환)가 항상 같은 결과. **변환과 펑터적 매핑이 서로 간섭하지 않음**.

## 프로그래밍에서의 자연 변환

### `safeHead : List ⇒ Maybe`

```ts
const safeHead = <A>(xs: A[]): Maybe<A> =>
  xs.length === 0 ? { tag: 'Nothing' } : { tag: 'Just', value: xs[0] };
```

자연성 검증: `mapMaybe(safeHead(xs), f) = safeHead(xs.map(f))` — 양쪽이 항상 같음.

- `xs = []`: 양쪽 모두 `Nothing`
- `xs = [x, ...]`: 양쪽 모두 `Just(f(x))`

### 다른 흔한 자연 변환

| 자연 변환 | 의미 |
|---|---|
| `reverse : List ⇒ List` | 같은 컨테이너 안 순서 뒤집기 |
| `length : List ⇒ Const Int` | 컨테이너 → 길이 (값 무시) |
| `listToMaybe : List ⇒ Maybe` | 첫 원소만 |
| `maybeToList : Maybe ⇒ List` | 0개 또는 1개 리스트 |
| `singleton : Identity ⇒ List` | 값을 원소 하나인 리스트로 |
| `keys : Map K ⇒ Const (List K)` | 키 타입 `K`를 고정하고 값 타입만 매개변수로 볼 때, 키 목록으로 변환 |

이들은 지정한 타입 매개변수 안의 값이 무엇이냐와 무관하게 작동하므로 자연 변환이다. `keys`는 키와 값을 모두 동시에 매개변수로 보는 `Map` 전체가 아니라, `K`를 고정한 `Map K`에 대한 예시다.

## Parametricity와 Free Theorem

Haskell의 순수하고 매개변수적인 부분에서는 시그니처 `forall a. F a → G a`로부터 자연성 같은 **free theorem**을 얻을 수 있다. 전제는 함수가 `a`의 구체 타입이나 값을 관찰하지 못하고, unsafe 기능과 관찰 가능한 부수효과를 쓰지 않는다는 것이다.

```haskell
f :: forall a. [a] -> Maybe a
-- 시그니처만 보고도 다음을 보장 가능:
-- fmap g . f = f . fmap g
```

Rust와 TypeScript의 제네릭 시그니처만으로는 같은 보장을 얻지 못한다. 예를 들어 Rust의 `size_of::<T>()`는 `T`의 타입별 크기를 관찰할 수 있다.

```rust
fn choose<T>(xs: Vec<T>) -> Option<T> {
    if std::mem::size_of::<T>() == 0 { None } else { xs.into_iter().next() }
}
```

`g: () → u8`와 `xs = vec![()]`에 대해 `choose(xs).map(g)`는 `None`이지만, 먼저 `g`를 `Vec`에 map한 뒤 `choose`하면 `Some(0)`이다. 따라서 `Vec ⇒ Option` 자연 변환이 아니다. Haskell에서도 type class 제약, `unsafeCoerce`, 타입 관찰이나 효과가 들어가면 전제를 다시 확인해야 한다.

## Functor Category `[C, D]`

자연 변환을 morphism으로 보면 그 자체가 카테고리를 이룬다.

| 구성 | 정의 |
|---|---|
| **객체** | `C → D`의 모든 Functor |
| **Morphism** | Functor 사이의 자연 변환 |
| **합성** | Vertical composition (아래) |
| **항등** | 각 Functor에 대한 항등 자연 변환 (`id_F : F ⇒ F`) |

표기: `Fun(C, D)`, `[C, D]`, 또는 지수 `D^C`. **Functor 자체가 객체가 되는** 메타 카테고리.

## Vertical Composition (`⋅`)

같은 Functor category 안의 자연 변환 합성.

```
F ──α──→ G ──β──→ H
```

성분별로:
```
(β ⋅ α)_a = β_a ∘ α_a
```

타입으로:
```ts
const vertCompose = <F, G, H>(
  beta: NaturalT<G, H>,
  alpha: NaturalT<F, G>,
): NaturalT<F, H> =>
  <A>(fa: F<A>): H<A> => beta(alpha(fa));
```

## Horizontal Composition (`◦`)

서로 다른 Functor category 사이.

```
F: C → D, F': C → D, α: F ⇒ F'
G: D → E, G': D → E, β: G ⇒ G'
─────────────────────────────────
β ◦ α : G∘F ⇒ G'∘F'
```

성분:
```
(β ◦ α)_a = β_{F'(a)} ∘ G(α_a)
```

**Interchange Law** (교환 법칙): vertical과 horizontal 합성이 함께 다음을 만족.
```
(β' ⋅ α') ◦ (β ⋅ α) = (β' ◦ β) ⋅ (α' ◦ α)
```

## 추상화 계층 — Cat은 2-Category

자연 변환은 "사상의 사상"이다. 이로 인해 카테고리 이론에 추상화 층이 생긴다.

| 레벨 | 객체 | Morphism |
|---|---|---|
| **1-Category** (일반) | 객체 (타입) | 사상 (함수) |
| **2-Category** (`Cat`) | 카테고리 | Functor (1-cell), Natural Transformation (2-cell) |

`Cat`이 2-category — 객체는 (작은) 카테고리, 1-cell은 Functor, 2-cell은 자연 변환. 더 위로 올라가면 ∞-category까지 정의 가능.

이 추상화 계층이 **Adjunction**, **Limit**, **Yoneda Lemma** 같은 고급 개념의 토대.

## 자주 헷갈리는 포인트

- **자연 변환 ≠ 함수 변환** — 하나의 함수가 아니라 **각 타입마다 하나씩**의 함수 family. 매개변수성 전제를 만족하는 다형성 함수와 대응한다
- **Naturality는 시그니처만으로 보장되지 않음** — 순수한 Haskell의 매개변수적 부분에서는 free theorem으로 얻을 수 있지만, Rust와 TypeScript 제네릭에는 타입 관찰 경로가 있다
- **`length`가 자연 변환인 이유** — 결과 타입은 `Int`이지만 `Const Int a`로 보면 펑터 → 펑터 매핑
- **2-cell vs 1-cell 표기** — 1-cell(Functor)는 `→`, 2-cell(자연 변환)은 `⇒`로 구분
- **Free theorem이 만능 아님** — type class 제약, side effect, reflection이 있으면 깨짐
- **"자연(natural)"의 어원** — 좌표/표현 선택과 무관하게 정의되는 변환이라서 "자연". 임의 선택에 의존하면 자연스럽지 않음

## 면접 체크포인트

- **자연 변환의 정의** — 두 Functor 사이, 성분 사상, naturality condition
- **naturality square**가 commute 한다는 의미
- **매개변수적 다형성 함수가 자연 변환이 되는 조건**과 free theorem
- 흔한 자연 변환 5종 (`safeHead`, `reverse`, `length`, `keys`, `singleton`)
- **Functor category `[C, D]`** 의 구조 — Functor가 객체, 자연 변환이 morphism
- **Vertical vs Horizontal composition** 차이
- **2-Category Cat** — 객체→Functor→Natural Transformation 추상화 계층
- 매개변수 다형성이 깨지는 경우 (type class 제약, reflection)

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 10. Natural Transformations](https://evan-moon.github.io/2024/06/01/category-theory-for-programmers-10-natural-transformations/)
- [Rust, std::mem::size_of](https://doc.rust-lang.org/stable/std/mem/fn.size_of.html)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Functors|Functors — 자연 변환의 출발점]]
- [[Bifunctors-Profunctors|Bifunctors, Profunctors — Functor 변형]]
- [[Function-Types-And-Currying|Function Types, Currying, CCC]]
- [[Monads-In-TypeScript|Monads in TypeScript (η, μ 자연 변환으로 정의)]]
- [[Kleisli-Category|Kleisli Category]]
- [[Types-As-Proofs|Types as Proofs]]
