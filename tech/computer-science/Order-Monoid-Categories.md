---
tags: [cs, functional, category-theory, monoid, order, poset, preorder]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Order Monoid Categories", "Order 카테고리", "Monoid as Category", "Preorder", "Poset"]
---

# Order·Monoid 카테고리

카테고리는 Set·Hask 같은 거대한 것만 있는 게 아니다. **순서 관계**(Preorder/Poset/Total Order)나 **모노이드** 같은 익숙한 수학 구조도 사실은 작은 카테고리다. 일반 개념은 [[Category-Theory-For-Programmers]]·[[Types-And-Functions-As-Category]] 참조.

## 카테고리 종류 개관

| 카테고리 | 객체 수 | morphism 특징 | 용도 |
|---|---|---|---|
| **Empty (0)** | 0 | 없음 | 다른 카테고리 분석 시 극한 사례 |
| **Singleton (1)** | 1 | id만 존재 | terminal category |
| **Free** | 그래프에서 생성 | 합성 자동 추가 | 임의 구조에 최소 법칙 부여 |
| **Preorder** | 자유 | Hom(a,b) ≤ 1 (Thin) | 의존성 그래프, 위상 정렬 |
| **Poset** | 자유 | Preorder + 반대칭성 | 부분 순서 (타입 계층) |
| **Total Order** | 자유 | Poset + 모든 원소 비교 | 정렬 알고리즘 |
| **Monoid** | 정확히 1개 | 모노이드 원소들 | 문자열 concat, 누적 연산 |
| **Set** | 모든 집합 | 함수 | 일반 함수 합성 |
| **Hask** | Haskell 타입 | Haskell 함수 | 함수형 프로그래밍 |

## Order 카테고리 — 순서 관계가 곧 카테고리

집합에 **순서 관계 ≤** 가 있으면 그 자체가 카테고리가 된다.
- **객체** = 집합의 원소
- **morphism** `a → b` = "a ≤ b"인 관계
- **합성** = 추이성 (`a ≤ b`, `b ≤ c` → `a ≤ c`)
- **항등** = 반사성 (`a ≤ a`)

### 3단계 순서 분류

| 종류 | 추가 조건 | 예시 |
|---|---|---|
| **Preorder (원순서)** | 반사성 + 추이성 | "X가 Y에 의존" (사이클 가능, 순환 의존) |
| **Poset (부분순서)** | + 반대칭성 (`a≤b ∧ b≤a → a=b`) | 부분집합 포함 관계, 타입 상속 계층, DAG |
| **Total Order (전순서)** | + 임의 두 원소 비교 가능 | 정수 ≤, 문자열 사전순 |

### Thin 카테고리 — Order의 핵심 성질

Order 카테고리에서는 **두 객체 사이 morphism이 0개 또는 1개**(Hom(a,b) ≤ 1). "a ≤ b가 성립한다/안 한다"의 boolean 정보만 필요하기 때문. 이런 카테고리를 **Thin Category**라 부른다.

Thin 카테고리는 단순하지만 정렬·검색·DAG 분석 같은 실무 알고리즘의 토대가 된다.

## Monoid as Category — 단일 객체 카테고리

모노이드는 두 가지 관점에서 정의 가능하고 **두 정의가 동치**.

### 집합 관점 (전통적 정의)

타입 `M`이 다음을 갖추면 모노이드:
- **이항 연산** `⊕ : M × M → M` (결합법칙: `(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)`)
- **항등원** `e ∈ M` (`e ⊕ a = a = a ⊕ e`)

```haskell
class Monoid m where
  mempty  :: m              -- 항등원
  mappend :: m -> m -> m    -- 이항 연산
```

```ts
interface Monoid<M> {
  empty: M;
  concat: (a: M, b: M) => M;
}

const StringMonoid: Monoid<string> = {
  empty: '',
  concat: (a, b) => a + b,
};
```

### 카테고리 관점

**객체 1개**, morphism이 모노이드 원소들. 자세히:
- 객체 = 단 하나의 점 (이름은 무관)
- morphism `f: • → •` = 모노이드 원소 하나
- 합성 `g ∘ f` = 모노이드 연산 `g ⊕ f`
- 항등 사상 `id: • → •` = 항등원 `e`

이 관점에서 **카테고리의 합성·항등 법칙이 곧 모노이드의 결합·항등 법칙**이 된다. 두 정의가 정확히 같은 구조를 다른 언어로 표현한 것.

### 흔한 모노이드 예시

| 모노이드 | 연산 | 항등원 |
|---|---|---|
| **String / List** | concat (`++`) | 빈 문자열/리스트 |
| **Number (덧셈)** | `+` | 0 |
| **Number (곱셈)** | `*` | 1 |
| **Boolean (and)** | `&&` | true |
| **Boolean (or)** | `\|\|` | false |
| **Set (union)** | `∪` | `∅` |
| **Function (composition)** | `g ∘ f` | `id` |
| **Max / Min** | `max` / `min` | `-∞` / `+∞` |

**교환법칙은 필수가 아님** — 문자열 concat은 `"a" + "b" ≠ "b" + "a"`이지만 결합·항등은 만족하므로 모노이드.

## 프로그래밍 응용

| 카테고리 구조 | 응용 |
|---|---|
| **Preorder/DAG** | 빌드 시스템 의존 그래프 (Make·Bazel·Gradle), 패키지 의존성, 테스트 위상 정렬 |
| **Poset** | 타입 상속 계층, 권한 계층(Owner > Admin > User), 부분집합 포함 |
| **Total Order** | 정렬 알고리즘 (퀵소트·머지소트), B-Tree·인덱스 |
| **Monoid** | `reduce`/`fold` 누적, 분산 집계(MapReduce), CRDT의 LWW·Counter, 함수 합성 |
| **Hom Set** | 인터페이스 = "이 객체에서 다른 객체로의 사상 집합" |

특히 **모노이드는 분산 시스템의 친구** — 결합법칙 덕분에 어떤 순서로 합쳐도 같은 결과가 나오므로, 병렬 reduce·MapReduce가 안전하다.

## Locally Small Category

엄밀하게는 **두 객체 사이 morphism이 집합을 이루는** 카테고리만 "Locally Small Category"라 부른다. Set·Hask는 모두 이에 해당. 매우 큰 카테고리(예: 모든 카테고리의 카테고리)는 morphism이 진짜 집합이 아닌 더 큰 구조라 별도 다룬다.

실무 학습에서는 무시해도 무방. 다만 "왜 굳이 'Locally Small'을 따지나"라는 의문이 들면 답은 **러셀 패러독스 회피** — 집합론의 기초 안전성 문제.

## 자주 헷갈리는 포인트

- **Preorder가 Poset이 아닌 경우**: 사이클이 있는 의존 그래프 (`a → b → a`) 는 Preorder지만 Poset 아님
- **모노이드 ≠ 그룹**: 그룹은 역원까지 요구. 모노이드는 역원 없어도 됨 (예: 자연수 덧셈은 모노이드, 정수 덧셈은 그룹)
- **교환 모노이드 (Commutative Monoid)**: 교환법칙까지 만족 (예: 숫자 덧셈). 모든 모노이드가 교환적은 아님
- **`fold`와 모노이드는 다른 개념**: `fold`는 더 일반적. 모노이드는 `fold`의 특수 케이스 중 하나 (시작값 = 항등원, 결합법칙 → 병렬 가능)

## 면접 체크포인트

- **Preorder vs Poset vs Total Order**의 정의와 예시
- **Thin 카테고리**가 무엇이며 왜 Order 카테고리가 Thin인가
- **모노이드의 두 가지 정의**(집합 + 이항연산 / 단일객체 카테고리)와 동치성
- 모노이드의 **결합법칙이 분산 처리 안전성**에 주는 의미 (병렬 reduce, MapReduce)
- 흔한 모노이드 예시 5개 이상 (String, Number, Boolean, Set, Function 합성)
- **교환법칙은 모노이드의 필수 조건이 아니다**

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 3. 카테고리: 거대한 것과 작은 것](https://evan-moon.github.io/2024/02/13/category-theory-for-programmers-3-categories-great-and-small/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (Set/Hask)]]
- [[Monads-In-TypeScript|Monads in TypeScript (Functor/Monad)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
- [[Types-As-Proofs|Types as Proofs]]
