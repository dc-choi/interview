---
tags: [cs, functional, category-theory, functor, fmap]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Functors", "Functor", "펑터", "fmap"]
---

# Functors

**두 카테고리 사이의 구조 보존 매핑**. 객체와 사상을 동시에 옮기되, 합성과 항등 관계를 깨뜨리지 않는다. 프로그래밍에서는 `fmap` (또는 `map`)으로 나타나며, Maybe, List, Promise 같은 컨테이너의 핵심 인터페이스다. 카테고리 일반은 [[Category-Theory-For-Programmers]] 참조.

## 핵심 명제

Functor `F: C → D`는 카테고리 `C`의 모든 것을 카테고리 `D`로 옮긴다.
- **객체** `a ∈ C` → **객체** `F a ∈ D`
- **사상** `f: a → b` ∈ `C` → **사상** `F f: F a → F b` ∈ `D`
- 두 가지 보존 법칙 만족 (아래)

핵심 직관: 카테고리의 **구조(연결 관계)를 그대로 이동시키는** 매핑. 분해, 재조합 불가, 함수의 합성 관계가 그대로 옮겨짐.

## Functor 법칙 2가지

이 법칙을 만족하지 않으면 Functor가 아니다.

### 1. 항등 보존 (Identity Preservation)

```
F(id_a) = id_(F a)
```

각 객체의 항등 사상을 매핑한 결과는, 매핑된 객체의 항등 사상이어야 함.

```haskell
fmap id = id
```

### 2. 합성 보존 (Composition Preservation)

```
F(g ∘ f) = F(g) ∘ F(f)
```

합성을 먼저 한 뒤 매핑한 결과 = 각각 매핑한 뒤 합성한 결과.

```haskell
fmap (g . f) = fmap g . fmap f
```

### 법칙 만족 증명 예 — Maybe Functor

```haskell
fmap id Nothing  = Nothing  = id Nothing       -- ✓
fmap id (Just x) = Just (id x) = Just x = id (Just x)  -- ✓
```

이런 식의 **방정식 추론(equational reasoning)** 으로 모든 Functor 인스턴스의 법칙 준수를 확인할 수 있다 (단, 함수가 순수해야 — 아래 "법칙이 깨지는 경우" 참조).

## Endofunctor — 프로그래밍이 다루는 형태

같은 카테고리 안에서의 Functor `F: C → C`를 **Endofunctor**라 한다. 프로그래밍에서는 거의 항상 Endofunctor를 다룬다 — 타입을 타입으로, 함수를 함수로 매핑하므로 둘 다 Hask(또는 TS-types) 안.

`Array`, `Maybe`, `Promise`, `Either`, `Reader` 모두 Endofunctor on Hask.

## fmap — typeclass로서의 Functor

Haskell은 `Functor`를 typeclass로 정의:

```haskell
class Functor f where
  fmap :: (a -> b) -> f a -> f b
```

`f`가 일반 타입이 아니라 **타입 생성자(`f` 자체로 인스턴스를 가질 수 없고 `f a` 형태로 써야 함)**라는 점이 핵심.

TypeScript에는 1급 typeclass가 없지만 인터페이스로 비슷하게 표현 가능:

```ts
interface Functor<F> {
  map: <A, B>(fa: F & { _A: A }, f: (a: A) => B) => F & { _A: B };
}
// 실용에선 컨테이너별로 .map 메서드를 직접 두는 게 일반적
```

## 주요 Functor 인스턴스

### Maybe — 선택적 값

```ts
type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };

const mapMaybe = <A, B>(m: Maybe<A>, f: (a: A) => B): Maybe<B> =>
  m.tag === 'Just' ? { tag: 'Just', value: f(m.value) } : m;
```

### List, Promise, Either — 익숙한 컨테이너

`Array.prototype.map`이 정확히 List Functor의 `fmap`. `Promise.then`도 callback 반환값이 thenable, 즉 callable한 `then` 프로퍼티를 가진 값이 아닐 때 Functor의 `fmap` 역할을 한다. Thenable이면 Promise resolution 절차가 이를 동화해 flatten하므로 일반적인 `fmap`과 다르다. `Either<L, R>`은 R에 대한 Functor다.

### Reader — 함수도 Functor

함수 타입 `r → a` 자체가 Functor(`r` 고정, `a` 변수). `fmap`은 **함수 합성과 동치**:

```ts
const mapReader = <R, A, B>(g: (r: R) => A, f: (a: A) => B) =>
  (r: R): B => f(g(r));
```

함수도 데이터처럼 다뤄질 수 있음을 보여주는 사례.

### Const, Constant — 무시하는 Functor

`Const<C, A> = { value: C }` (A 무시)와 `Δc` (모든 객체→c, 모든 사상→id_c). 타입 인자나 사상을 무시하지만 법칙은 만족 → "변환을 강제하는 게 아니라 법칙을 만족하면 Functor"라는 정의의 정당성. Lens, Limits 같은 고급 개념의 빌딩 블록.

## Functor 합성 — Functor of Functor

Functor도 합성 가능. `Maybe<List<A>>` 같은 중첩 컨테이너에 `fmap . fmap`을 적용해 안쪽 값에 함수를 적용한다.

```haskell
mis :: Maybe [Int]
mis = Just [1, 2, 3]

(fmap . fmap) (*2) mis  -- Just [2, 4, 6]
```

```ts
const xs: Maybe<number[]> = { tag: 'Just', value: [1, 2, 3] };
mapMaybe(xs, (arr) => arr.map(n => n * 2));
// → { tag: 'Just', value: [2, 4, 6] }
```

Functor 합성도 Functor 법칙을 만족하므로 합성된 컨테이너에도 `fmap`을 적용할 수 있다. 고정한 `C`, `D` 사이의 Functor와 자연 변환은 `[C, D]` 또는 `Fun(C, D)`를 이룬다. `Cat`은 카테고리, Functor, 자연 변환을 각각 0, 1, 2-cell로 갖는 2-category이므로 둘을 같은 이름으로 부르지 않는다.

## Functor 법칙이 깨지는 경우 — 사이드이펙트

`fmap`은 함수가 **순수**해야 안전하다. 사이드이펙트가 있으면 합성 법칙(`fmap (g.f) = fmap g . fmap f`)이 깨진다.

```ts
const effects: string[] = [];
const f = (x: number): number => { effects.push(`f${x}`); return x + 1; };
const g = (x: number): number => { effects.push(`g${x}`); return x * 2; };

[1, 2].map(x => g(f(x)));   // f1, g2, f2, g3
[1, 2].map(f).map(g);       // f1, f2, g2, g3
```

**referential transparency**가 모든 함수형 추론의 전제. 이 때문에 함수형 언어가 순수성을 강조한다 ([[Types-And-Functions-As-Category]] 참조).

## 다른 종류의 Functor

| 종류 | 의미 |
|---|---|
| **Bifunctor** | 두 인자에 모두 functorial. `Either`, `Tuple`이 대표 |
| **Profunctor** | 첫 인자는 contravariant, 둘째는 covariant. 함수 타입 `a → b`가 대표 |
| **Contravariant Functor** | 화살표 방향이 뒤집힘. `contramap :: (b → a) → f a → f b` |
| **Applicative Functor** | Functor + 두 효과 결합 (`<*>`) |
| **Monad** | Functor + flatten (`>>=` / `flatMap`) |

자세한 Applicative/Monad는 [[Monads-In-TypeScript]].

## 자주 헷갈리는 포인트

- **Functor는 함수가 아니라 매핑** — "객체와 사상을 동시에 옮기는" 두 단계 매핑이지 단일 함수 아님
- **타입 생성자 ≠ 타입** — `Maybe`는 타입이 아니라 타입을 받아 타입을 만드는 것 (kind `* → *`). `Maybe Int`가 진짜 타입
- **`fmap`이 항상 컨테이너 안 값만 바꾸는 건 아니다** — Reader Functor의 `fmap`은 함수 합성. 의미는 "출력 변환"
- **JS에 `map`이 없다고 Functor가 아닌 것은 아님** — 수학적 `Set`은 원소의 상(image)으로 map을 정의할 수 있다. JavaScript `Set`에는 표준 `map`이 없고, 사용자 구현은 동등성, 가변값, 두 법칙을 직접 점검해야 한다
- **`fmap id = id`만으로 Functor 보장 안 됨** — 합성 법칙도 동시에 만족해야 한다. 사용자 정의 `map`은 두 법칙을 함께 검증한다
- **Const Functor가 "Functor 같지 않다"** — 인자를 무시해서 직관에 반하지만 법칙은 만족. Functor의 정의가 "변환을 강제"하는 게 아니라 "법칙을 만족"임을 보여줌

## 면접 체크포인트

- **Functor의 카테고리 정의** — 두 카테고리 사이 매핑 + 객체, 사상, 합성, 항등 보존
- **Functor 두 법칙** — `fmap id = id`, `fmap (g.f) = fmap g . fmap f`
- **Endofunctor**가 프로그래밍이 다루는 일반 형태인 이유
- 흔한 Functor 5종 — `Maybe`, `Array`, `Promise`, `Either`, `Reader`
- **`Array.map`이 곧 List Functor의 `fmap`**
- **타입 생성자(kind `* → *`)** 와 일반 타입의 차이
- 사이드이펙트가 Functor 법칙을 깨는 이유
- Functor → Applicative → Monad 진화 단계 ([[Monads-In-TypeScript]])

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 7. Functors](https://evan-moon.github.io/2024/03/15/category-theory-for-programmers-7-functors/)
- [ECMAScript Language Specification, Promise Resolve Functions](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-createresolvingfunctions)
- [GHC, Data.Functor.Contravariant](https://gitlab.haskell.org/ghc/ghc/-/blob/master/libraries/base/src/Data/Functor/Contravariant.hs)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Bifunctors-Profunctors|Bifunctors, Profunctors, Functor 변형 (bimap, contramap, dimap)]]
- [[Natural-Transformations|Natural Transformations — Functor 사이 매핑]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (순수성)]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor → Applicative → Monad)]]
- [[Kleisli-Category|Kleisli Category — Endofunctor의 모나드 합성]]
- [[Products-And-Coproducts|Products and Coproducts]]
- [[Algebraic-Data-Types|Algebraic Data Types (Maybe = 1+a 같은 ADT가 Functor)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
