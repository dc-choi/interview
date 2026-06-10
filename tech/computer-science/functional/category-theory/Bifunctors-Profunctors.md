---
tags: [cs, functional, category-theory, functor, bifunctor, profunctor, contravariant]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Bifunctors and Profunctors", "Functoriality", "Bifunctor", "Profunctor", "Contravariant Functor"]
---

# Bifunctors · Profunctors · Functor 변형

기본 [[Functors|Functor]]는 한 인자에 대해 functorial이지만, 실무에서는 **두 인자 모두에 functorial**(Bifunctor), **사상 방향이 역전된**(Contravariant), **두 방향이 섞인**(Profunctor) 변형이 자주 등장한다. 이 변형들과 그 합성 규칙이 ADT가 "자동으로 Functor가 되는" 카테고리적 근거다.

## 핵심 명제

| 종류 | 시그니처 | 어디에 |
|---|---|---|
| **Functor** (covariant) | `fmap : (a → b) → f a → f b` | 한 인자, 정방향 |
| **Bifunctor** | `bimap : (a → c) → (b → d) → f a b → f c d` | 두 인자, 둘 다 정방향 |
| **Contravariant** | `contramap : (b → a) → f a → f b` | 한 인자, 역방향 |
| **Profunctor** | `dimap : (a → b) → (c → d) → p b c → p a d` | 두 인자, 첫째 역·둘째 정 |

이름은 추상적이지만 모두 일상 코드의 핵심 인터페이스에 대응 (Either·Tuple·함수 타입·Lens 등).

## Bifunctor — 두 인자 모두에 functorial

두 카테고리 `C`, `D`의 객체 쌍을 `E`로 매핑하는 펑터. 두 morphism 모두 보존.

```haskell
class Bifunctor f where
  bimap  :: (a -> c) -> (b -> d) -> f a b -> f c d
  first  :: (a -> c) -> f a b -> f c b
  second :: (b -> d) -> f a b -> f a d
```

`first`·`second`는 `bimap`의 특수 케이스 (한쪽만 변환). 보통 `bimap`이 기본이고 두 보조는 디폴트 구현.

### Tuple은 Bifunctor

```haskell
instance Bifunctor (,) where
  bimap f g (x, y) = (f x, g y)
```

```ts
const bimapTuple = <A, B, C, D>(
  f: (a: A) => C,
  g: (b: B) => D,
) => ([a, b]: [A, B]): [C, D] => [f(a), g(b)];
```

### Either는 Bifunctor

```haskell
instance Bifunctor Either where
  bimap f _ (Left x)  = Left  (f x)
  bimap _ g (Right y) = Right (g y)
```

```ts
const bimapEither = <A, B, C, D>(
  f: (a: A) => C,
  g: (b: B) => D,
) => (e: Either<A, B>): Either<C, D> =>
  e.tag === 'Left'
    ? { tag: 'Left',  value: f(e.value) }
    : { tag: 'Right', value: g(e.value) };
```

`Result<T, E>`/`Either<L, R>`에서 **에러 변환과 값 변환을 동시에** 할 때 `bimap`이 핵심. 보통 `mapError`·`map` 두 메서드로 노출.

## Contravariant Functor — 사상 방향 역전

```haskell
class Contravariant f where
  contramap :: (b -> a) -> f a -> f b
```

`fmap`은 `(a → b) → f a → f b`인데 `contramap`은 화살표 방향이 뒤집힘 — `b → a`로 역변환을 받아 `f a`를 `f b`로 만든다.

### 대표 예 — `Op r a = a -> r` (Predicate, Comparator 같은 "입력을 받는" 타입)

```haskell
newtype Op r a = Op (a -> r)

instance Contravariant (Op r) where
  contramap f (Op g) = Op (g . f)   -- f를 먼저 적용해서 입력 변환
```

```ts
type Predicate<A> = (a: A) => boolean;

const contramapPredicate = <A, B>(
  f: (b: B) => A,
) => (pa: Predicate<A>): Predicate<B> =>
  (b: B) => pa(f(b));

// 예: User → boolean 술어를 (req: Request) → boolean으로 변환
const isPaidUser: Predicate<User> = (u) => u.paid;
const isPaidRequest: Predicate<Request> = contramapPredicate((r: Request) => r.user)(isPaidUser);
```

**직관**: `f a`가 "a를 소비하는" 구조면 contravariant. 함수의 **입력 위치**가 contravariant 자리.

## Profunctor — covariant + contravariant 결합

```haskell
class Profunctor p where
  dimap :: (a -> b) -> (c -> d) -> p b c -> p a d
  lmap  :: (a -> b) -> p b c -> p a c   -- 첫 인자 (contravariant)
  rmap  :: (c -> d) -> p a c -> p a d   -- 둘째 인자 (covariant)
```

수학적으로 `C^op × D → Set` (첫 카테고리는 화살표 뒤집은 카테고리).

### 함수 타입이 가장 자연스러운 Profunctor

```haskell
instance Profunctor (->) where
  dimap ab cd bc = cd . bc . ab
  lmap = flip (.)
  rmap = (.)
```

```ts
const dimap = <A, B, C, D>(
  ab: (a: A) => B,        // 입력 변환 (contravariant)
  cd: (c: C) => D,        // 출력 변환 (covariant)
) => (bc: (b: B) => C): ((a: A) => D) =>
  (a: A) => cd(bc(ab(a)));
```

직관: 함수 `B → C`를 `A → D`로 만들려면 (1) 입력 `A`를 `B`로 미리 변환(`ab`), (2) 결과 `C`를 `D`로 사후 변환(`cd`). 입력은 역방향, 출력은 정방향.

이 Profunctor 구조가 **Lens·Optics 라이브러리**의 수학적 토대.

## Functor 합성 — 복합 컨테이너도 Functor

Functor·Bifunctor·Profunctor를 합성해도 결과는 같은 종류의 펑터. 즉 펑터들은 **닫힌 합성 시스템**을 이룬다.

대표 패턴 — 두 펑터를 Bifunctor 안에 넣어 새 Bifunctor 만들기:

```haskell
newtype BiComp bf fu gu a b = BiComp (bf (fu a) (gu b))

instance (Bifunctor bf, Functor fu, Functor gu) =>
  Bifunctor (BiComp bf fu gu) where
    bimap f g (BiComp x) = BiComp (bimap (fmap f) (fmap g) x)
```

이게 **ADT가 자동으로 Functor가 되는 이유**.

## ADT의 자동 Functor 도출

ADT는 **Const(인자 무시)·Identity(그대로)·Tuple(Bifunctor)·Either(Bifunctor)** 의 합성으로 만들어진다. 빌딩 블록이 이미 펑터이므로 합성 결과도 자동으로 펑터.

예: `Maybe a ≅ Either (Const () a) (Identity a)` → 손으로 `fmap`을 짜지 않아도 도출 가능.

Haskell `{-# LANGUAGE DeriveFunctor #-}`의 `data Tree a = ... deriving Functor`가 이 카테고리적 사실에 근거한 자동 코드 생성. Rust/Scala의 derive 매크로도 같은 원리.

## 자주 헷갈리는 포인트

- **Bifunctor의 `first`·`second` ≠ Tuple `fst`·`snd`** — 변환 함수이지 추출 함수가 아님
- **`Either`의 `bimap`은 두 함수 모두 받지만 한 case만 적용** — 어느 쪽이냐에 따라 한 함수만 호출
- **Contravariant는 "거꾸로 매핑"이 아니라 "입력 위치 매핑"** — 함수 합성으로 입력을 변환
- **Profunctor가 "양방향 Functor" 아님** — 첫 인자 역·둘째 인자 정. 비대칭
- **함수 타입은 `(input, output)` 페어가 아닌 Profunctor** — Tuple과 다른 카테고리적 의미
- **`deriving Functor`가 가능한 건 우연이 아님** — Const/Identity/Either/(,)의 합성이라는 카테고리적 근거. 임의의 타입 생성자는 자동 도출 안 됨

## 면접 체크포인트

- **Bifunctor**의 `bimap` 시그니처와 Tuple/Either 인스턴스
- **Contravariant Functor**의 `contramap`과 함수 입력 위치의 카테고리적 의미
- **Profunctor**의 `dimap`이 함수 변환에 어떻게 동작하는가
- **함수 타입 `a → b`가 Profunctor**인 이유 (입력 역, 출력 정)
- **ADT가 자동으로 Functor**가 되는 카테고리적 근거 (빌딩 블록 합성)
- `deriving Functor`/`derive_more`/`#[derive(Debug, Clone)]` 같은 자동 도출의 수학적 정당성
- **Lens·Optics**가 Profunctor 구조 위에 만들어진다는 사실

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 8. Functoriality](https://evan-moon.github.io/2024/04/02/category-theory-for-programmers-8-functoriality/)

## 관련 문서
- [[Functors|Functors — 기본 정의와 법칙]]
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Products-And-Coproducts|Products and Coproducts (Tuple/Either가 Bifunctor)]]
- [[Algebraic-Data-Types|Algebraic Data Types (ADT 자동 Functor 도출의 토대)]]
- [[Kleisli-Category|Kleisli Category]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor 진화)]]
