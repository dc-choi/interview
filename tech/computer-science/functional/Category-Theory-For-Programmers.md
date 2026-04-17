---
tags: [cs, functional, category-theory, math, foundations]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Category Theory", "Category Theory for Programmers", "카테고리 이론", "범주론"]
---

# Category Theory for Programmers — 개관

함수형 프로그래밍의 수학적 토대. **"합성 가능한 구조"** 를 형식적으로 다루는 추상 수학. Functor·Monad·Natural Transformation 같은 익숙한 개념이 모두 여기서 정의된다.

## 한 줄 정의

카테고리(Category, 범주)는 **객체(object)와 그 사이의 사상(morphism), 그리고 사상의 합성(composition) 규칙**으로 이루어진 구조다. 핵심은 "무엇으로 이루어졌나"가 아니라 **"어떻게 합성되는가"** 다.

## 왜 프로그래머가 알아야 하는가

- **합성(composition)이 프로그래밍의 본질** — 작은 함수를 모아 큰 함수를 만든다. 카테고리 이론은 합성의 규칙과 보장을 형식화한 유일한 체계
- **사고방식의 일치** — 추상 구조 중심이라 타입 시스템·인터페이스 설계와 자연스럽게 연결됨
- **멀티코어/동시성 시대** — 공유 가변 상태 기반 OOP가 데이터 레이스로 한계에 부딪히면서 함수형(불변·합성) 패러다임으로 이동. 그 이론적 토대가 카테고리 이론
- **다른 언어로의 확산** — Haskell에서 시작된 추상이 Java(Stream/Optional), C++(ranges), TypeScript(Result/Option), Rust(Result/Option/Iterator)로 보편화

## 카테고리의 4가지 구성요소

카테고리 `C`를 정의하려면 다음 4가지가 필요하다.

| 구성요소 | 정의 | 프로그래밍 대응 |
|---|---|---|
| **Object (객체)** | 카테고리 안의 "점" | 타입 (Number, String, User) |
| **Morphism (사상, 화살)** | 두 객체 사이의 화살표 `f: A → B` | 함수 (`(a: A) => B`) |
| **Composition (합성)** | `g: B → C`와 `f: A → B` 가 있으면 `g ∘ f: A → C`가 존재 | 함수 합성 (`x => g(f(x))`) |
| **Identity (항등 사상)** | 모든 객체 `A`마다 `id_A: A → A`가 존재 | 항등 함수 (`x => x`) |

## 카테고리 법칙 2가지

이 법칙을 만족하지 않으면 카테고리가 아니다.

### 1. 결합법칙 (Associativity)

`h ∘ (g ∘ f)` = `(h ∘ g) ∘ f` — 합성 순서를 어떻게 묶어도 결과가 같다. 큰 파이프라인을 안전하게 분해/재조합 가능.

### 2. 항등 법칙 (Identity Law)

`f ∘ id_A` = `f` = `id_B ∘ f` — 항등 사상은 합성에 영향 없음. `id`는 진짜 "아무것도 안 함"의 의미.

## 코드로 본 합성

같은 합성 `g ∘ f`(먼저 `f`, 그다음 `g`)를 언어별로 표현한 것.

```haskell
-- Haskell: 우측에서 좌측으로 읽음 (수학 표기와 동일)
g . f
```

```typescript
// TypeScript: 직접 구현
const compose = <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C => g(f(a));

const h = compose(g, f);   // h(a) === g(f(a))
```

```c
/* C: 임시 함수로 합성 */
C g_after_f(A a) { return g(f(a)); }
```

항등 함수는 모든 언어에서 같은 형태:

```typescript
const id = <T>(x: T): T => x;
```

다형(polymorphic) 정의여서 모든 타입에 대해 한 번만 정의해도 충분.

## 합성 순서 컨벤션 (오른쪽→왼쪽 vs 왼쪽→오른쪽)

같은 "f 다음에 g 실행"을 표현하는 두 가지 방향이 있다.

| 방향 | 예시 | 의미 |
|---|---|---|
| **오른쪽 → 왼쪽** | `g ∘ f`, Haskell `g . f`, F# `g << f` | 수학 표기와 동일. "g of f" |
| **왼쪽 → 오른쪽** | Unix pipe `f \| g`, F# `f >> g`, RxJS `pipe(f, g)` | 데이터 흐름 순서. 읽기 자연스러움 |

수학·Haskell의 우향 합성은 **함수 적용 순서**(`g(f(x))`의 괄호 안쪽이 먼저 실행되는 것)와 시각적으로 일치하기 위함. Unix pipe·RxJS의 좌향 합성은 **데이터 파이프라인의 흐름**을 그대로 따라 읽기 쉽게 한다. 트레이드오프이지 정답이 있는 건 아님.

## 합성이 프로그래밍의 본질인 이유

큰 문제를 작은 단위로 쪼개고, 작은 해결책을 합성해 큰 해결책을 만든다 — 이게 프로그래밍의 본질이다. 카테고리 이론은 이 합성 행위를 형식화한다.

**인지적 청크 관점**: 인간 단기 기억은 동시 추적 가능한 항목이 3~7개. 따라서 좋은 추상은:
- **면적(인터페이스)은 작게** — 호출자가 알아야 할 것 최소화
- **부피(구현)는 크게** — 안에 많은 일을 담아도 괜찮음
- **합성 가능성** — 작은 청크들을 묶어서 더 큰 청크로

함수 시그니처가 `A → B`로 단순하면 호출자는 그 안의 1만 줄을 신경 안 써도 된다. 결합법칙과 항등법칙은 **이 합성이 안전하게 동작한다는 수학적 보증**.

## 카테고리의 대표 예시

| 카테고리 | Object | Morphism |
|---|---|---|
| **Set** | 집합 | 집합 사이의 함수 |
| **Hask** | Haskell 타입 | Haskell 함수 |
| **TS-types** (비공식) | TypeScript 타입 | TypeScript 함수 |
| **Mon** | 모노이드 | 모노이드 준동형 |
| **Pos** | 부분 순서 집합 | 순서 보존 함수 |
| **Top** | 위상 공간 | 연속 함수 |
| **1 (terminal)** | 객체 1개 | id 1개 |
| **0 (initial)** | 객체 없음 | 사상 없음 |

프로그래머에게 가장 익숙한 건 **Hask 류 카테고리**: 객체 = 타입, 사상 = 함수. 합성 = 함수 합성, 항등 = `identity`.

## 후속 개념의 정의 위치

| 개념 | 정의 | 프로그래밍 의미 |
|---|---|---|
| **Functor** | 카테고리 사이의 **구조 보존 매핑** | 컨테이너의 `map` (`Array.map`, `Promise.then`) |
| **Natural Transformation** | Functor 사이의 변환 | `Array<T> → Maybe<T>` 같은 컨테이너 종류 변환 |
| **Monad** | Endofunctor + 두 자연 변환 (η/μ) | `flatMap` 가능한 컨테이너 (Maybe·Either·Promise·Array) |
| **Adjunction** | 두 Functor 사이의 짝짓기 | 자유 모노이드, currying ↔ uncurrying |
| **Initial / Terminal Object** | 카테고리의 시작·끝점 | `never` (initial), `unit/void` (terminal) |
| **Product / Coproduct** | 두 객체의 곱·합 | 튜플 `[A, B]` (product), 유니온 `A \| B` (coproduct) |
| **Yoneda Lemma** | 객체는 "다른 객체로의 사상 집합"으로 결정됨 | 인터페이스로 타입 정체성 파악 |

깊이 있게: [[Monads-In-TypeScript]], [[Railway-Oriented-Programming]], [[Types-As-Proofs]]

## 학습 전략

### 흔한 진입 장벽

- **수학 표기 알레르기** — 그리스 문자, 다이어그램, 화살표
- **추상도 자체** — 구체 예시 없이 "있다"고만 말하는 것 같은 정의들
- **Haskell 의존도** — 자료가 대부분 Haskell

### 완화 전략

- **다이어그램으로 그리기** — 객체와 화살로 그리면 직관 잡힘
- **익숙한 자료구조로 매핑** — `Array.map`이 곧 Functor, `Promise.then`이 곧 Monad의 사례
- **TypeScript/Rust 자료 활용** — Haskell 못해도 정적 타입 언어로 따라갈 수 있는 자료 다수
- **순수 수학 자료가 아닌 "프로그래머용" 자료부터** — Bartosz Milewski의 *Category Theory for Programmers* 가 대표 입문서
- **이론 → 코드 → 다시 이론 반복** — Maybe/Either를 직접 구현하면서 법칙을 확인

### 학습 순서 추천

1. Object / Morphism / Composition / Identity (이 문서)
2. Functor (`map` 의 일반화)
3. Natural Transformation (컨테이너 종류 변환)
4. Monad (`flatMap` + 단위원)
5. Product / Coproduct (튜플 / 유니온)
6. Adjunction (currying)
7. (선택) Yoneda, Kan extensions, Monoidal categories

## 자주 헷갈리는 포인트

- **"카테고리 = 폴더/분류"가 아니다** — 일상어 "카테고리"와는 다른 의미. 수학적 구조
- **Object가 "값"이 아니다** — Number 카테고리에서 객체는 "Number 자체"이지 `42`가 아님
- **Morphism이 "함수의 결과"가 아니다** — 함수 자체가 morphism이고, 결과는 별개
- **모든 함수형 패턴이 카테고리 이론에서 온 게 아니다** — Lens, Optics 같은 건 별도 발전
- **카테고리 이론을 알아야 함수형을 쓸 수 있는 건 아니다** — 이론은 보너스, `map`/`flatMap`만 알아도 충분

## 면접 체크포인트

- **카테고리의 4구성요소**(Object/Morphism/Composition/Identity)와 2법칙(결합·항등)
- **함수 합성과 결합법칙**의 의미 — 큰 파이프라인을 분해/재조합해도 동작이 같음
- **타입 = Object, 함수 = Morphism** 매핑 관점
- **Functor / Monad의 정의 위치**가 카테고리 이론임을 설명
- 이론을 모르고도 함수형을 쓸 수 있지만, **이론을 알면 왜 코드가 안전한가**를 설명할 수 있음
- Product = 튜플, Coproduct = 유니온의 카테고리 이론적 의미

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 0. 서문 (Bartosz Milewski 번역)](https://evan-moon.github.io/2024/01/30/category-theory-for-programmers-0-preface/)
- [evan-moon — 프로그래머를 위한 카테고리 이론 1. 카테고리: 합성의 본질](https://evan-moon.github.io/2024/01/30/category-theory-for-programmers-1-category/)

## 관련 문서
- [[Declarative-Programming|Declarative Programming — 카테고리 이론이 선언형의 메타언어]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Set/Hask, 순수함수, Void/Unit)]]
- [[Order-Monoid-Categories|Order·Monoid 카테고리 (Preorder/Poset, Monoid as Category)]]
- [[Kleisli-Category|Kleisli Category — 모나드의 카테고리적 정의]]
- [[Products-And-Coproducts|Products and Coproducts (튜플 vs sum type, duality)]]
- [[Functors|Functors — 카테고리 사이 매핑]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor → Applicative → Monad)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming (Result 모나드)]]
- [[Types-As-Proofs|Types as Proofs (커리-하워드 대응)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
