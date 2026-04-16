---
tags: [cs, typescript, functional, monad, functor, applicative, category-theory]
status: done
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

세 요소로 구성: **타입 생성자 `M<_>`**, **항등원 `pure: A → M<A>`**, **이항 연산 `join: M<M<A>> → M<A>`**. 그리고 결합·단위 법칙을 만족.

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
"체인 그룹화 방식과 무관하게 동일 결과." → 어떤 순서로 합성해도 안전.

**실무적 의미**: 이 법칙을 만족하는 한, 체인 순서 변경·헬퍼 추출·합성 분해 같은 리팩토링이 동작 변경 없이 가능.

## TypeScript에서 만나는 주요 모나드

| 모나드 | 효과 | flatMap 직관 |
|---|---|---|
| **Maybe / Option** | 값이 없을 수 있음 | None이면 다음 단계 skip |
| **Either / Result** | 실패할 수 있음 (에러 정보 포함) | Left(err)이면 skip하고 에러 전파 |
| **Promise** | 비동기 (느슨한 모나드) | `.then(f)`로 체이닝 |
| **Array** | 비결정 / 다중 결과 | `flatMap`이 카르테시안 곱처럼 작동 |
| **Reader** | 외부 환경에 의존 | 환경을 함께 끌고 다님 |
| **State** | 상태를 동반 | 상태를 함께 변형 |
| **Writer** | 로그·메타데이터 누적 | 추가 데이터를 같이 쌓음 |

### Array도 모나드다

```ts
[1, 2, 3].flatMap(x => [x, x * 2]);
// [1, 2, 2, 4, 3, 6]
```

`flatMap`이 정확히 모나드의 `bind`. 그래서 자바스크립트의 모든 배열은 사실 모나드를 일상적으로 쓰고 있는 셈.

## Promise는 진정한 모나드인가

**엄밀히는 아니다.**

- 모나드는 `M<M<A>>`라는 중첩 상태를 **타입 수준에서** 명확히 가져야 한다
- Promise는 `Promise<Promise<A>>`를 즉시 펼쳐서 `Promise<A>`로 만든다 → 자동 unwrap
- `.then(f)`는 `f`의 반환이 Promise이면 flatMap, 아니면 map으로 동작 (다형 동작)

**실용적 영향**: Promise를 모나드처럼 합성해도 보통 동작한다. 다만 **`Promise<Result<T, E>>`** 같은 합성에서 두 겹의 효과 채널이 생기면 직접 핸들링이 필요하다. 라이브러리(`fp-ts`, `effect-ts`)가 이를 위한 `TaskEither` 같은 구조를 제공한다.

## 실무 가치와 한계

### 가치
- **합성 안전성**: 모나드 법칙이 리팩토링을 보장
- **선언적 에러 처리**: 체인 중단을 시그니처로 표현
- **순차 흐름의 가독성**: try/catch보다 평평한 파이프라인
- **타입 시스템과의 결합**: 효과를 시그니처에 노출

### 한계와 주의
- **합성 폭발**: 두 종류 효과(예: 비동기 + 실패) 결합은 monad transformer 없이는 어렵다
- **Promise는 진짜 모나드 아님**: `Promise<Promise<T>>`가 표현 불가
- **팀 학습 비용**: Functor/Applicative/Monad 용어가 진입 장벽
- **과도한 추상화 비용**: 단순 검증을 모나드로 감싸면 디버깅이 어려워짐
- **JS/TS 생태계 마찰**: 외부 라이브러리는 throw/Promise 기반이라 경계에서 변환 필요

## 면접 체크포인트

- Functor / Applicative / Monad의 **차이를 코드로** 설명할 수 있는가
- **flatMap = map + join** 직관을 그릴 수 있는가
- **모나드 3법칙**과 그 실무적 의미(리팩토링 안전성)
- TypeScript에서 일상적으로 쓰는 **모나드 4가지**(Maybe, Either, Promise, Array)
- **Promise가 엄밀한 모나드가 아닌 이유**
- 모나드 합성의 한계 — **두 효과를 동시에** 다루기 어려움 (transformer 필요)
- 어디서 모나드를 도입하고 어디서 도입하지 말아야 하는가 (경계의 판단)

## 출처
- [evan-moon — 펑터를 넘어서, 모나드까지](https://evan-moon.github.io/2026/02/07/monads-in-typescript/)

## 관련 문서
- [[Railway-Oriented-Programming|Railway-Oriented Programming (Result 모나드 실전)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트 (제네릭, 타입 조작)]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
