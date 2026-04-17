---
tags: [cs, functional, category-theory, types, pure-function, set]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Types and Functions as Category", "타입과 함수의 카테고리", "Set Category", "Hask"]
---

# 타입과 함수의 카테고리 (Set, Hask)

프로그래밍 언어의 **타입을 집합(set), 함수를 morphism**으로 보면 그 자체가 카테고리를 이룬다. 이 관점은 Functor·Monad 같은 함수형 추상이 왜 "카테고리 이론적"으로 정당한지의 출발점이다. 카테고리 이론의 일반 개념은 [[Category-Theory-For-Programmers]] 참조.

## 핵심 명제

- **타입 = 집합**: `Bool` = `{True, False}`, `Char` = 모든 유니코드 문자, `Integer` = 정수 집합
- **함수 = morphism**: `f :: A → B`는 집합 A에서 집합 B로의 사상
- **Set 카테고리**: 객체는 모든 집합, morphism은 집합 사이의 함수
- **Hask 카테고리**: 객체는 Haskell 타입, morphism은 Haskell 함수 (Set과 비슷하지만 미묘한 차이 있음)

이 관점에서 타입 시스템은 **컴파일 타임 의미 검증기** — "잘못 합성될 수 없는 사상"을 컴파일러가 거른다.

## 함수가 morphism이 되기 위한 3조건

수학적 함수가 카테고리의 morphism으로 동작하려면 다음을 만족해야 한다.

| 조건 | 의미 | 위반 사례 |
|---|---|---|
| **Totality (전체성)** | 정의역의 모든 입력에 대해 결과 정의됨 | 입력에 따라 무한 루프, 예외, undefined |
| **Determinism (결정성)** | 같은 입력 → 항상 같은 출력 | `Math.random()`, `Date.now()`, 외부 상태 의존 |
| **Compositionality (합성성)** | `f: A→B`, `g: B→C` 가 있으면 `g∘f: A→C` 가 자동 정의됨 | 합성이 추가 부수효과를 만들면 위반 |

세 조건을 모두 만족하는 함수가 **순수 함수(pure function)**.

## 순수 함수와 Referential Transparency

순수 함수의 핵심은 **참조 투명성(referential transparency)** — 표현식을 그 결과 값으로 자유롭게 치환해도 프로그램 의미가 변하지 않음.

```ts
const expensive = compute(x);
return expensive + expensive;
// 동일하게:
return compute(x) + compute(x);
```

순수 함수만으로 표현식을 치환하면 **메모이제이션·병렬화·부분 평가** 같은 최적화가 안전해진다. 또한 수학적 증명·표시적 의미론(denotational semantics)이 적용 가능 → 코드의 형식적 추론이 가능.

**비순수 함수의 흔적**:
- I/O (파일, 네트워크, 콘솔)
- 외부 상태 변경 (전역 변수, mutable 인자)
- 시간·랜덤 의존
- 예외 throw

## Hask vs Set — Bottom 문제

이론적으로 Haskell의 카테고리 Hask는 Set과 다르다. 이유는 **bottom (`⊥`)**.

- Haskell은 정지 문제 때문에 `undefined`나 무한 루프를 표현할 수 있다
- bottom은 **모든 타입의 원소**로 취급됨 — `⊥ :: Bool`, `⊥ :: Integer`, ...
- 결과적으로 Hask의 함수는 totality를 깨뜨릴 수 있어 **partial function**을 허용

이 때문에 엄밀한 카테고리 이론자는 Hask를 "진짜 카테고리"가 아니라고 보기도 한다. 실무에서는 **Hask를 Set처럼 취급해도 무방**하며, partial function 문제는 panic/예외 발생을 별도 채널로 모델링하면 된다.

JavaScript/TypeScript도 비슷한 문제가 있다 — `throw`·`undefined`·infinite loop. 모두 모델 단순화를 위해 무시하거나, Result/Maybe 같은 컨테이너로 명시화.

## 단순 타입의 카테고리적 의미

| 타입 | 집합 | 카테고리 이론 의미 |
|---|---|---|
| **Void** (또는 `never`) | `∅` (공집합) | **Initial object** — 모든 객체로 향하는 유일한 사상 존재 (`absurd: Void → A`). 호출 불가능 (인자가 없음). 논리학의 "거짓에서 모든 명제 도출" |
| **Unit** (또는 `()`, `void`) | `{*}` (1원소 집합) | **Terminal object** — 모든 객체에서 오는 유일한 사상 존재 (`unit: A → ()`). `() → A`는 A의 한 원소를 선택하는 것과 동치 |
| **Bool** | `{True, False}` (2원소 집합) | 가장 단순한 비자명 타입. 술어(predicate) `A → Bool`로 부분집합 표현 |

특히 Void와 Unit은 **카테고리 이론의 양 극단**이며, 다른 모든 타입을 만들어내는 빌딩 블록이다.

```ts
// TypeScript에서
type Void = never;        // initial
type Unit = void;         // terminal (대략)

const absurd = <A>(_: never): A => { throw new Error('unreachable'); };
const unit = <A>(_: A): void => undefined;
```

## 정적 타입의 실무 가치

타입을 카테고리적으로 보는 관점이 주는 실무 통찰:

- **컴파일 타임에 합성 오류 차단** — `f: A → B`와 `g: C → D` 합성 시도 시 컴파일러가 `B ≠ C`를 잡아냄. 동적 타입은 런타임에야 발견
- **타입 = 의미적 계약** — 함수 시그니처가 이미 부분적인 명세
- **순수성을 시그니처에 노출** — Haskell의 `IO a`, Rust의 `Result<T, E>`, TypeScript의 `Promise<T>` 같은 컨테이너로 부수효과를 타입에 박음
- **리팩토링 안전성** — 결합법칙 + 항등법칙 보장이 큰 파이프라인 분해/재조합에 안전성 부여
- **설계 사고 도구** — "이 함수가 진짜 morphism인가?"를 자문하면 부수효과·예외·외부 상태 의존을 탐지하게 됨

## 자주 헷갈리는 포인트

- **Set 카테고리의 객체는 "타입 자체"이지 "값"이 아님** — `Integer` 객체에서 `42`는 객체가 아니라 객체 안의 원소
- **순수성 ≠ 멱등성** — 순수 함수는 부수효과 없음, 멱등 함수는 여러 번 실행해도 결과 동일. 다른 개념 (모든 순수 함수는 멱등이지만 역은 아님)
- **`void` 반환 함수가 항상 비순수는 아님** — TypeScript의 `(): void`는 결과가 `undefined`인 순수 함수일 수도 있다
- **bottom은 비순수가 아니다** — 무한 루프나 panic은 totality 위반이지 결정성 위반이 아니다
- **Hask가 진짜 카테고리가 아닌 게 실용에서 큰 문제는 아니다** — Set처럼 다뤄도 추론은 잘 작동

## 면접 체크포인트

- **타입 = 집합** 매핑과 그 직관 (Bool은 2원소, Integer는 무한)
- **순수 함수의 3조건**(totality·determinism·compositionality)
- **Referential transparency**가 메모이제이션·병렬화·증명에 주는 의미
- **Bottom**과 Hask vs Set의 차이 (그리고 실용에서 무시해도 되는 이유)
- **Void(`never`) = initial, Unit(`void`) = terminal**의 의미
- 정적 타입이 **컴파일 타임 합성 검증기**라는 관점

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 2. 타입과 함수](https://evan-moon.github.io/2024/02/06/category-theory-for-programmers-2-types-and-functions/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 카테고리 일반 개념]]
- [[Order-Monoid-Categories|Order·Monoid 카테고리 (다른 종류의 카테고리들)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor/Applicative/Monad)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
