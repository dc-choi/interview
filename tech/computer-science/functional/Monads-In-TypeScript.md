---
tags: [cs, typescript, functional, monad, functor, applicative, category-theory]
status: done
verified_at: 2026-09-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Monads in TypeScript", "모나드", "Functor Applicative Monad", "모나드 법칙"]
---

# Monads in TypeScript — Functor → Applicative → Monad

함수형의 추상 계단(Functor → Applicative → Monad)을 TypeScript로 정리. **"효과(effect)가 수반되는 계산을 어떻게 안전하게 합성하는가"** 라는 공학적 질문에 카테고리 이론이 답하는 구조. [[Railway-Oriented-Programming|ROP]]에서 짧게 다룬 Functor/Monad의 심화 자료다.

## 모나드란 무엇인가

### 한 줄 정의

> 모나드는 **"특정 효과가 수반되는 계산의 맥락"** 을 다루는 도구이다. 단순한 박스가 아니라 **값을 만들어내는 과정의 구조를 보존**한다.

여기서 "효과"란: 값이 없을 수 있음(Maybe), 실패할 수 있음(Either), 비동기일 수 있음(Promise), 여러 결과가 있을 수 있음(Array), 외부 환경에 의존(Reader) 등.

### 수학적 정의 (참고)

> "내부함자 범주(Endofunctor Category)의 모노이드 대상."

세 요소로 구성: **타입 생성자 `M<_>`**, **항등원 `pure: A → M<A>`**, **이항 연산 `join: M<M<A>> → M<A>`**. 그리고 결합, 단위 법칙을 만족.

## 추상 계단: Functor → Applicative → Monad

각 단계는 앞 단계의 한계를 넘기 위해 필요해진다.

| 단계 | 시그니처 | 무엇을 할 수 있는가 | 한계 |
|---|---|---|---|
| **Functor** | `map: M<A> × (A → B) → M<B>` | 컨테이너 안의 값에 **순함수** 적용 | 컨테이너에 든 함수는 못 씀 |
| **Applicative** | `apply: M<A → B> × M<A> → M<B>` | 컨테이너 안의 함수도 적용, **독립 효과를 합성** | 이전 결과로 다음 효과를 결정할 수 없음 (정적) |
| **Monad** | `flatMap: M<A> × (A → M<B>) → M<B>` | **이전 결과가 다음 계산을 결정**하는 동적 합성 | 추상도 비용 |

핵심 직관: **flatMap = map + join**. `map`만 쓰면 `M<M<B>>`로 중첩이 생기는데, `flatMap`은 그 중첩을 자동으로 평탄화한다.

### 왜 단계가 필요한가 — 코드로

```ts
// findUser, findTeam이 둘 다 Maybe를 반환할 때:
const findUser: (id: number) => Maybe<User>;
const findTeam: (user: User) => Maybe<Team>;

// map만 쓰면 중첩
findUser(1).map(findTeam);                       // Maybe<Maybe<Team>>  X

// flatMap이 필요
findUser(1).flatMap(user => findTeam(user));     // Maybe<Team>          O
```

함수의 결과가 다시 컨테이너에 담길 때, **체인을 평탄하게 유지**하는 것이 모나드의 역할.

## 모나드 법칙 3가지

이 법칙들이 만족돼야 **리팩토링이 안전**하다는 수학적 보증을 받는다.

### 1. 좌단위법칙 (Left Identity)
```
pure(a).flatMap(f)  ===  f(a)
```
"값을 감싼 뒤 즉시 풀면 원점." → `pure`가 효과를 추가하지 않음.

### 2. 우단위법칙 (Right Identity)
```
m.flatMap(pure)  ===  m
```
"각 값을 다시 감싸기만 하면 원상태." → `pure`가 항등 함수처럼 동작.

### 3. 결합법칙 (Associativity)
```
m.flatMap(f).flatMap(g)  ===  m.flatMap(x => f(x).flatMap(g))
```
같은 `f → g` 순서를 유지하면 체인의 괄호를 어느 쪽으로 묶어도 같은 결과다. `f`와 `g`의 순서를 바꿔도 된다는 교환법칙은 아니다.

**실무적 의미**: 평가 순서를 보존한 괄호 재결합, 헬퍼 추출과 합성 분해를 안전하게 할 수 있다. 효과가 있는 연산의 순서를 바꾸면 결과도 바뀔 수 있다.

## TypeScript에서 만나는 주요 모나드

| 모나드 | 효과 | flatMap 직관 |
|---|---|---|
| **Maybe / Option** | 값이 없을 수 있음 | None이면 다음 단계 skip |
| **Either / Result** | 실패할 수 있음 (에러 정보 포함) | Left(err)이면 skip하고 에러 전파 |
| **Promise** | 비동기 | `.then(f)`로 체이닝, 반환 Promise/thenable 동화 |
| **Array** | 비결정 / 다중 결과 | `flatMap`이 카르테시안 곱처럼 작동 |
| **Reader** | 외부 환경에 의존 | 환경을 함께 끌고 다님 |
| **State** | 상태를 동반 | 상태를 함께 변형 |
| **Writer** | 로그, 메타데이터 누적 | 추가 데이터를 같이 쌓음 |

### Array도 모나드다

```ts
[1, 2, 3].flatMap(x => [x, x * 2]);
// [1, 2, 2, 4, 3, 6]
```

`flatMap`이 정확히 모나드의 `bind`. 그래서 자바스크립트의 모든 배열은 사실 모나드를 일상적으로 쓰고 있는 셈.

## Promise를 모나드로 볼 수 있는가

`Promise.resolve`를 `pure`, `.then`을 `flatMap`으로 보는 모델은 유용하다. 핸들러의 반환값이 Promise 또는 thenable이면 ECMAScript의 Promise resolution procedure가 이를 채택해 결과 Promise를 만든다. 따라서 중첩 Promise가 평탄화되는 현상은 `join: M<M<A>> → M<A>`에 해당하며, Promise를 모나드에서 제외하는 근거가 아니다.

다만 Promise의 rejection, 예외, thenable 동화와 microtask scheduling까지 관찰하면 순수하고 전체적인 모나드 법칙을 그대로 등식으로 적용할 수 있다고 단정하기 어렵다. 법칙을 논할 때는 최종 상태만 볼지, 값과 관찰 가능한 실행 순서까지 볼지 동치의 범위를 정해야 한다.

**실용적 영향**: Promise를 모나드처럼 합성해도 보통 동작한다. 다만 **`Promise<Result<T, E>>`** 같은 합성에서 두 겹의 효과 채널이 생기면 직접 핸들링이 필요하다. 라이브러리(`fp-ts`, `effect-ts`)가 이를 위한 `TaskEither` 같은 구조를 제공한다.

## 실무 가치와 한계

### 가치
- **합성 안전성**: 모나드 법칙이 리팩토링을 보장
- **선언적 에러 처리**: 체인 중단을 시그니처로 표현
- **순차 흐름의 가독성**: try/catch보다 평평한 파이프라인
- **타입 시스템과의 결합**: 효과를 시그니처에 노출

### 한계와 주의
- **합성 폭발**: 두 종류 효과(예: 비동기 + 실패) 결합은 monad transformer 없이는 어렵다
- **Promise 법칙의 범위**: `pure`/`flatMap` 모델은 유용하지만, thenable 동화, rejection과 microtask scheduling을 포함한 관찰 가능 동치를 정해야 함
- **팀 학습 비용**: Functor/Applicative/Monad 용어가 진입 장벽
- **과도한 추상화 비용**: 단순 검증을 모나드로 감싸면 디버깅이 어려워짐
- **JS/TS 생태계 마찰**: 외부 라이브러리는 throw/Promise 기반이라 경계에서 변환 필요

## 면접 체크포인트

- Functor / Applicative / Monad의 **차이를 코드로** 설명할 수 있는가
- **flatMap = map + join** 직관을 그릴 수 있는가
- **모나드 3법칙**과 그 실무적 의미(리팩토링 안전성)
- TypeScript에서 일상적으로 쓰는 **모나드 4가지**(Maybe, Either, Promise, Array)
- **Promise를 모나드로 모델링할 때의 주의** (thenable 동화, rejection, scheduling)
- 모나드 합성의 한계 — **두 효과를 동시에** 다루기 어려움 (transformer 필요)
- 어디서 모나드를 도입하고 어디서 도입하지 말아야 하는가 (경계의 판단)

## 출처
- [evan-moon — 펑터를 넘어서, 모나드까지](https://evan-moon.github.io/2026/02/07/monads-in-typescript/)
- [ECMAScript Language Specification, Promise Objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 수학적 토대]]
- [[Functors|Functors — 카테고리 이론적 정의와 법칙]]
- [[Natural-Transformations|Natural Transformations (η, μ 자연 변환)]]
- [[Kleisli-Category|Kleisli Category — 모나드의 카테고리적 정의]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming (Result 모나드 실전)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트 (제네릭, 타입 조작)]]
- [[Promise-Async|Promise와 Async]]
