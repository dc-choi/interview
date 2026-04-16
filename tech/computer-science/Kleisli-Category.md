---
tags: [cs, functional, category-theory, monad, kleisli, side-effect]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Kleisli Category", "Kleisli 카테고리", "Kleisli composition", "Fish operator"]
---

# Kleisli Category

**부수효과를 가진 함수들을 합성 가능하게 만드는 카테고리**. 일반 함수 합성으로는 부수효과 함수를 직접 이을 수 없는 문제를 해결하며, **모나드의 카테고리적 정의**가 바로 Kleisli 카테고리다. 일반 카테고리 개념은 [[Category-Theory-For-Programmers]], 모나드의 함수형 관점은 [[Monads-In-TypeScript]] 참조.

## 왜 필요한가 — 부수효과 함수 합성 문제

순수 함수의 합성은 단순하다. `f: A → B`와 `g: B → C`가 있으면 `g ∘ f: A → C`. 그런데 함수가 부수효과(로깅·실패·비동기·여러 결과)를 가지면 시그니처가 `A → m B` 같은 형태가 되어, 결과 타입이 `m B`라서 다음 함수의 입력 `B`와 직접 안 맞는다.

**전역 상태로 우회한 안티패턴**:
```ts
let logger = '';
const negate = (b: boolean): boolean => {
  logger += 'Not so! ';   // 전역 상태 변경
  return !b;
};
```

전역 상태 의존 → 동시성 문제, 순수성 상실, 테스트 곤란. Kleisli 카테고리는 **부수효과를 반환값에 담아** 합성 가능한 형태로 만든다.

## Embellished Function — 장식된 함수

함수의 결과에 부수효과 정보를 함께 담는 형태:

```ts
// 일반 함수
type Plain = (a: A) => B;

// Embellished (장식된) 함수
type Embellished = (a: A) => M<B>;
```

`M`은 컨테이너(모나드). 종류에 따라 표현하는 효과가 다르다.

| `M` | 표현하는 효과 |
|---|---|
| `Writer<W, _>` | 로그·메타데이터 누적 (W는 모노이드) |
| `Maybe / Option` | 값이 없을 가능성 |
| `Either / Result<E, _>` | 실패 가능성 (에러 정보 포함) |
| `Promise / Task` | 비동기 |
| `[]` (Array) | 비결정성 (여러 결과) |
| `State<S, _>` | 상태 동반 |
| `Reader<R, _>` | 환경 의존 |
| `IO` | 입출력 부수효과 |

## Kleisli 카테고리 정의

Embellished function을 morphism으로 보면 그 자체가 카테고리를 이룬다. 모나드 `M`에 대한 Kleisli 카테고리 `Kleisli(M)`:

| 구성요소 | 정의 |
|---|---|
| **Object** | 일반 타입 (A, B, C, ...) |
| **Morphism** `A → B` | embellished 함수 `A → M<B>` |
| **합성** | fish 연산자 `>=>` (아래 정의) |
| **항등 사상** | `return : A → M<A>` (값을 효과 없이 컨테이너에 담음) |

핵심은 **객체는 일반 타입이지만 morphism은 컨테이너 결과**를 가진다는 점. 합성과 항등은 모나드 연산으로 정의된다.

## Fish 연산자 (`>=>`) — Kleisli 합성

```ts
const fish = <A, B, C>(
  f: (a: A) => M<B>,
  g: (b: B) => M<C>
) => (a: A): M<C> => {
  const mb = f(a);
  return mb.flatMap(g);    // M<B> 안의 B를 꺼내 g에 전달
};
```

Haskell 표기:
```haskell
(>=>) :: Monad m => (a -> m b) -> (b -> m c) -> (a -> m c)
f >=> g = \x -> f x >>= g
```

일반 합성 `g ∘ f`와의 차이:

| 합성 | 시그니처 | 합성 방식 |
|---|---|---|
| **일반 (`.`)** | `(B → C) ∘ (A → B) = A → C` | 함수 결과를 그대로 다음 함수에 전달 |
| **Kleisli (`>=>`)** | `(B → MC) ∘ (A → MB) = A → MC` | `flatMap`으로 컨테이너를 풀고 효과를 누적 |

**flatMap이 핵심** — 일반 `map`만 쓰면 결과가 `M<M<C>>`로 중첩되는데, `flatMap`이 이를 `M<C>`로 평탄화. 그래서 Kleisli 합성에는 모나드(=flatMap 가능한 컨테이너)가 필요하다.

## 항등 사상 — `return / pure`

```ts
const pure = <A>(a: A): M<A> => /* 모나드별 정의 */;
```

`pure`(또는 `return`)은 **값을 효과 없이 컨테이너에 담는 함수**. 카테고리 항등 법칙이 모나드 좌·우 단위 법칙과 일치:

```
f >=> pure = f      (우단위)
pure >=> f = f      (좌단위)
```

→ 모나드 법칙 = 카테고리 법칙. 자세한 법칙은 [[Monads-In-TypeScript]].

## 모나드별 Kleisli 합성 예시

### Maybe — 값이 없을 가능성

```ts
const findUser = (id: number): Maybe<User> => /* ... */;
const findTeam = (u: User): Maybe<Team> => /* ... */;

const findUserTeam = fish(findUser, findTeam);  // (id) => Maybe<Team>
```

중간 단계에서 `None`이 나오면 자동으로 끝까지 `None` 전파. if-null 사다리가 사라짐.

### Either / Result — 실패 가능성

```ts
const parse = (s: string): Result<number, Error> => /* ... */;
const validate = (n: number): Result<number, Error> => /* ... */;

const pipeline = fish(parse, validate);
```

중간 실패 시 `Err`가 끝까지 전파. try-catch 사다리 대체. 자세한 패턴은 [[Railway-Oriented-Programming]].

### Writer — 로그 누적

```ts
type Writer<W, A> = { value: A; log: W };
const upper = (s: string): Writer<string, string> => ({ value: s.toUpperCase(), log: 'upper ' });
const exclaim = (s: string): Writer<string, string> => ({ value: s + '!', log: 'exclaim ' });

const shout = fish(upper, exclaim);  // 로그가 자동으로 누적됨
// shout('hi') → { value: 'HI!', log: 'upper exclaim ' }
```

로그는 모노이드여야 한다 (concat 가능 + 항등원). 자세한 모노이드는 [[Order-Monoid-Categories]].

### Promise — 비동기

```ts
const fetchUser = (id: number): Promise<User> => /* ... */;
const fetchOrders = (u: User): Promise<Order[]> => /* ... */;

const pipeline = (id: number) => fetchUser(id).then(fetchOrders);
// .then이 사실상 fish 역할
```

JS의 `Promise.then`이 부분적인 fish 연산자다 (Promise는 엄밀한 모나드는 아님 — [[Monads-In-TypeScript]] 참조).

## 모나드 ↔ Kleisli 카테고리 — 정의 동치

다음 둘은 동일한 구조를 다른 언어로 표현한 것:

| 모나드 정의 (함수형 관점) | Kleisli 카테고리 (카테고리 관점) |
|---|---|
| `flatMap : M<A> → (A → M<B>) → M<B>` | morphism 합성 |
| `pure / return : A → M<A>` | 항등 morphism |
| 모나드 좌단위 법칙 | 항등 합성 좌측 |
| 모나드 우단위 법칙 | 항등 합성 우측 |
| 모나드 결합법칙 | 카테고리 결합법칙 |

**한 방향 정의 가능**: `flatMap` + `pure`로 `>=>` 정의 가능, 거꾸로도 가능. 그래서 모나드를 "Kleisli triple"이라고도 부른다.

## 자주 헷갈리는 포인트

- **모든 컨테이너가 Kleisli 카테고리를 만드는 건 아니다** — Functor만으로는 부족하고 모나드여야 함 (`flatMap` 필요)
- **Kleisli 합성은 모나드 종류마다 다르다** — 같은 `>=>` 표기지만 Maybe·Promise·Writer가 각각 다른 합성 동작
- **fish vs `then`/`bind`** — `>=>`는 두 함수의 합성, `>>=`(bind)는 값과 함수의 적용. 둘은 상호 정의 가능하지만 추상화 수준 다름
- **Promise는 엄밀한 Kleisli 카테고리 아님** — `Promise<Promise<T>>`가 자동 평탄화되어 모나드 법칙을 부분적으로만 만족
- **부수효과 표현 ≠ 부수효과 실행** — Kleisli 합성은 효과를 **표현**할 뿐, 실제 실행은 별도 (`runIO`·`unsafePerformIO` 같은 경계)

## 면접 체크포인트

- **Kleisli 카테고리의 4구성요소**(Object·Embellished morphism·Fish 합성·`pure` 항등)
- **부수효과 함수 합성 문제**와 그 해결 (전역 상태 → 결과에 효과 담기)
- **Fish 연산자(`>=>`)와 일반 합성의 차이** — `flatMap`으로 평탄화
- **모나드 = Kleisli triple** 이라는 동치성
- 흔한 모나드 4종(Maybe·Either·Writer·Promise)의 Kleisli 합성 의미
- 부수효과를 **표현 vs 실행** 분리하는 함수형 사고

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 4. Kleisli 카테고리](https://evan-moon.github.io/2024/02/20/category-theory-for-programmers-4-kleisli-category/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Set/Hask)]]
- [[Order-Monoid-Categories|Order·Monoid 카테고리 (Writer가 의존하는 모노이드)]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor/Applicative/Monad 진화)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming (Either/Result Kleisli 패턴)]]
- [[Types-As-Proofs|Types as Proofs]]
