---
tags: [cs, functional, category-theory, function-type, currying, exponential, ccc, lambda-calculus]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Function Types and Currying", "Exponential Object", "Cartesian Closed Category", "CCC", "Currying"]
---

# Function Types · Currying · CCC

함수 타입 `a → b`를 카테고리 이론으로 다루면 **Exponential Object** `b^a`로 표현된다. 이로부터 Currying(`(a×b)→c ≅ a→(b→c)`)이 자연스럽게 도출되고, 함수 타입을 1급으로 다룰 수 있는 카테고리를 **Cartesian Closed Category (CCC)** 라 부른다. 일반 카테고리 개념은 [[Category-Theory-For-Programmers]] 참조.

## 핵심 명제

- 함수 타입 `a → b` ↔ 카테고리의 **Exponential Object** `b^a`
- `eval : b^a × a → b` 가 universal property를 만족하는 사상
- **Currying**은 `(a × b) → c` 와 `a → (b → c)` 사이의 자연 동형(natural isomorphism)
- **CCC**: Terminal Object + Product + Exponential을 모두 가진 카테고리. 람다 계산법의 모델

## Exponential Object — 함수 타입의 카테고리적 정의

집합 카테고리에서 `a → b` 함수의 개수는 `|b|^|a|` (지수). 그래서 카테고리 이론에서 함수 타입을 **`b^a`** (또는 `a ⇒ b`)로 표기.

| 카디널리티 | 의미 |
|---|---|
| `\|Bool → Int\| = Int^Bool` | Bool 두 값 각각에 Int를 할당 → `Int × Int` |
| `\|Char → Bool\| = 2^256` | Char(256개)마다 True/False |
| `\|A → Void\|` | `0^\|A\|` = 0 (A 비어있으면 1) |

이 표기 덕에 함수 타입에 **지수 법칙**이 그대로 적용된다 (아래).

## Evaluation Morphism + Universal Property

Exponential Object를 정의하는 핵심 사상:

```
eval : (b^a × a) → b
eval (f, x) = f x
```

**Universal Property**: 다른 객체 `z`와 사상 `g : z × a → b` 가 있으면, **유일한 사상** `h : z → b^a` 가 존재해 `g = eval ∘ (h × id_a)` 를 만족.

```
       g
z × a ─────→ b
  │           ↑
h × id        eval
  ↓           │
b^a × a ──────┘
```

이게 Currying의 카테고리적 정의 — `g`(곱 입력)에 대응하는 유일한 `h`(curried 형태)가 항상 존재.

## Currying — 카테고리적 동형

Universal property로부터 다음 동형성이 따라온다:

```
(a × b) → c   ≅   a → (b → c)
```

곱 타입을 입력으로 받는 함수와 함수를 반환하는 함수가 **자연 동형(natural isomorphism)**. 어느 쪽으로 모델링해도 정보량 동일.

```ts
// Uncurried — 곱 타입 입력
const cat = (s1: string, s2: string): string => s1 + s2;
type Uncurried = (pair: [string, string]) => string;

// Curried — 함수를 반환
const catC = (s1: string) => (s2: string): string => s1 + s2;
type Curried = (s1: string) => (s2: string) => string;

// 두 형태 사이 변환
const curry = <A, B, C>(f: (a: A, b: B) => C) => (a: A) => (b: B) => f(a, b);
const uncurry = <A, B, C>(f: (a: A) => (b: B) => C) => (a: A, b: B) => f(a)(b);
```

Haskell 같은 함수형 언어는 **모든 함수가 기본적으로 curried** — 다인자 함수는 그냥 단인자 함수의 체인.

```haskell
greet :: String -> String -> String
greet salutation name = salutation ++ " " ++ name

hello = greet "Hello"        -- 부분 적용 (자연스러운 currying)
hello "Alice"                -- "Hello Alice"
```

## Cartesian Closed Category (CCC)

다음 셋을 모두 가진 카테고리를 **CCC**라 부른다.

| 구성 | 의미 | 프로그래밍 대응 |
|---|---|---|
| **Terminal Object** | 모든 객체에서 유일 사상 | `()`/`unit`/`void` |
| **Binary Products** | 모든 객체 쌍의 곱 | 튜플 `[A, B]` |
| **Exponentials** | 모든 객체 쌍의 함수 객체 | 함수 타입 `(a: A) => B` |

**Set 카테고리는 CCC** — 일반적인 함수형 프로그래밍이 작동하는 토대.

### Bicartesian Closed Category

CCC에 **Initial Object + Coproduct(sum type)** 까지 추가. 분배 법칙 자동 성립:

```
a × (b + c) ≅ a × b + a × c
```

→ 사실상 모든 ADT를 표현할 수 있는 카테고리. Haskell·OCaml·Rust enum 같은 언어가 이 위에서 동작.

## 지수 법칙 — 자동 성립하는 동형

지수 표기 덕에 산술 법칙이 그대로 타입에 적용된다.

| 지수 법칙 | 타입 동형 | 의미 |
|---|---|---|
| `a^0 = 1` | `Void → A ≅ Unit` | `absurd` 함수 하나만 존재 |
| `a^1 = a` | `Unit → A ≅ A` | `() → A`는 A의 한 원소 선택 |
| `1^a = 1` | `A → Unit ≅ Unit` | 어떤 A든 unit 반환하는 함수는 하나뿐 |
| `a^(b+c) = a^b × a^c` | `(B + C) → A ≅ (B → A) × (C → A)` | sum type 처리 = 두 함수의 쌍 |
| `(a^b)^c = a^(b×c)` | `C → (B → A) ≅ (C × B) → A` | **Currying!** |
| `(a × b)^c = a^c × b^c` | `C → (A × B) ≅ (C → A) × (C → B)` | tuple 반환 = 두 함수 쌍 |

마지막 두 줄이 Currying·tuple 반환 패턴의 카테고리적 정당성. 모든 함수형 라이브러리의 `curry`·`uncurry`·`split` 같은 헬퍼는 이 동형의 직접적 구현.

## 람다 계산법과의 연결

CCC는 **단순 타입 람다 계산법(simply typed λ-calculus)의 모델**. 다음 대응:

| 람다 계산 | CCC |
|---|---|
| 타입 `τ` | 객체 |
| 변수 `x : τ` | morphism |
| 함수 추상화 `λx. e` | curried morphism (Exponential 사용) |
| 함수 적용 `f x` | `eval ∘ (f × x)` |
| 타입 `τ₁ → τ₂` | Exponential `τ₂^τ₁` |
| Product type `τ₁ × τ₂` | Product |

→ **타입 시스템과 카테고리는 같은 구조의 두 표현**. 함수형 언어가 카테고리 이론에 기댈 수 있는 근본 이유. 더 나아가 [[Types-As-Proofs|Curry-Howard 대응]]으로 이어짐.

## 자주 헷갈리는 포인트

- **`b^a`는 `a→b`이지 `b→a`가 아님** — 지수의 위가 출력, 아래가 입력. 산술 직관과 일치
- **모든 카테고리가 CCC는 아니다** — Set은 CCC지만, 위상 공간 카테고리(Top)는 CCC 아님 (특정 조건 필요)
- **Currying은 단순 문법 변환이 아님** — 카테고리 이론의 동형성으로 정당성이 보장된 변환. 임의 언어에서 가능
- **부분 적용 ≠ Currying** — Currying은 다인자 → 단인자 체인 변환. 부분 적용은 그 결과를 인자 일부에만 적용. JS의 `bind`나 `f.bind(null, x)`는 부분 적용
- **Haskell의 모든 함수가 curried라는 게 성능 차이 없음** — 컴파일러가 인라인·최적화로 일반 다인자 호출과 동일하게 처리
- **`Either<A, B> → C ≅ (A → C) × (B → C)`** — sum type을 다루는 함수는 case별 함수의 쌍. 패턴 매칭의 카테고리적 의미

## 면접 체크포인트

- **함수 타입 `a → b` = Exponential Object `b^a`** 의 카테고리적 의미
- **Evaluation morphism**과 그 universal property
- **Currying의 동형성** `(a × b) → c ≅ a → (b → c)`
- **CCC의 3구성** (Terminal·Product·Exponential) + Bicartesian 추가 (Initial·Coproduct)
- **지수 법칙이 타입 동형으로 자동 성립** — 특히 `(a^b)^c = a^(b×c)`가 Currying
- **람다 계산법과 CCC의 동등성** — 타입 시스템의 수학적 토대
- **부분 적용 vs Currying** 구분

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 9. Function Types](https://evan-moon.github.io/2024/04/18/category-theory-for-programmers-9-function-types/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Set/Hask)]]
- [[Products-And-Coproducts|Products and Coproducts (Product/Coproduct)]]
- [[Algebraic-Data-Types|Algebraic Data Types (지수 법칙과 타입 대수)]]
- [[Functors|Functors]]
- [[Bifunctors-Profunctors|Bifunctors·Profunctors (함수 타입이 Profunctor)]]
- [[Types-As-Proofs|Types as Proofs (Curry-Howard)]]
