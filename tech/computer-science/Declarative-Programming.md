---
tags: [cs, functional, category-theory, declarative, frp, paradigm]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Declarative Programming", "선언형 프로그래밍", "Imperative vs Declarative", "Denotational Semantics"]
---

# Declarative Programming

**"무엇(what)"을 명시하고 "어떻게(how)"는 런타임에 맡기는 패러다임**. SQL·Haskell·Terraform·React·CSS 같은 도구의 공통 철학이며, **카테고리 이론이 선언형 추론의 메타언어** 역할을 한다. 명령형과 대비된다.

## 핵심 명제

| 패러다임 | 강조 | 코드가 말하는 것 |
|---|---|---|
| **Imperative** | "어떻게(how)" | 단계별 명령 시퀀스 — 변수를 바꾸고 루프를 돌고 상태를 갱신 |
| **Declarative** | "무엇(what)" | 결과의 속성/관계/제약 — 실행 순서는 런타임이 결정 |

선언형 도구의 공통점:
- 코드가 **문제의 명세**에 가까움
- 사이드이펙트를 피하고 **참조 투명성** 유지
- **조합 가능**(composable) — 작은 조각을 큰 조각으로 합성 가능
- 최적화 자유도가 크다 — 컴파일러/런타임이 실행 전략 선택

## 코드 비교

### 합계 구하기

```ts
// Imperative — 단계적
let sum = 0;
for (let i = 0; i < xs.length; i++) sum += xs[i];

// Declarative — 의도
const sum = xs.reduce((a, b) => a + b, 0);
```

### 데이터 조회

```ts
// Imperative — 순회·필터·변환·정렬을 직접
const result = [];
for (const u of users) if (u.active) result.push(u.name);
result.sort();

// Declarative — 질의 표현
const result = users.filter(u => u.active).map(u => u.name).sort();

// SQL — 더 선언적
SELECT name FROM users WHERE active = true ORDER BY name;
```

### 상태와 UI

```ts
// Imperative DOM 조작
const el = document.getElementById('count');
el.textContent = String(count);

// Declarative — React·Vue
<span>{count}</span>   // 상태가 바뀌면 UI가 따라옴
```

## 물리학의 이중성 — Local vs Global

명령형과 선언형의 관계는 물리학의 두 접근 방식과 정확히 같다.

| 접근 | 물리학 | 프로그래밍 |
|---|---|---|
| **Local (국소)** | 뉴턴 미분방정식 — "이 순간 힘·가속도로 다음 순간 결정" | Imperative — "이 단계 실행 → 다음 단계" |
| **Global (전역)** | 페르마 최소시간 원리·최소 작용 원리 — "출발과 도착이 주어지면, 사이 경로는 작용을 최소화" | Declarative — "입력·출력을 명시, 경로는 런타임 선택" |

**두 접근이 같은 결과**를 기술한다 (뉴턴역학 ↔ 라그랑주역학이 동치). 선언형이 실제 실행을 포기하는 게 아니라, **다른 언어로 같은 것을 기술**하는 것.

파인만이 이 최소 작용 원리를 양자역학으로 일반화(경로 적분) → 선언형 사고가 더 근본적 추상일 수 있다는 시사.

## 카테고리 이론이 선언형을 장려하는 이유

### 1. 추상적 관계만 존재

카테고리에는 "위치·거리·시간" 같은 국소 개념이 없다. 객체와 사상, 그리고 합성 규칙만. 이는 본질적으로 **전역 선언형 관점** — "이 객체에서 저 객체로 가는 사상이 존재한다"만 말하지 "어떻게 가는가"는 말하지 않음.

### 2. Universal Construction = 선언형 전역 접근

Product·Coproduct·Exponential·Limit은 모두 "**어떤 속성을 만족하는 유일한 객체**"로 정의된다. 구성 방법이 아니라 성질로 정의 → 선언형 정의의 전형.

```
-- "Product는 두 projection을 가진 객체이며, 다른 후보를 유일하게 인수분해하는 것"
-- → 데카르트 곱이라는 구체 구현이 아니라 속성으로 정의
```

카테고리 이론에서 배운 패턴(Functor·Monad·Natural Transformation)이 선언형으로 번역되는 이유가 이것.

### 3. 조합 가능성의 보장

카테고리 법칙(결합법칙·항등법칙)이 합성의 안전성을 수학적으로 보장 → 선언적 조각을 안심하고 이어붙일 수 있다.

## FRP — 이벤트를 선언으로

**Functional Reactive Programming**: 사용자 이벤트·시간 흐름·네트워크 응답 같은 "시간에 따라 변하는 값"을 **무한 스트림**으로 다룬다.

```ts
// 명령형 — 각 이벤트에 핸들러
button.addEventListener('click', () => { count++; render(); });

// 선언형 — 스트림 변환
clickStream$.pipe(scan((c) => c + 1, 0)).subscribe(render);
```

핵심 아이디어: 마우스 위치, 난수 수열, 시간 tick, 네트워크 응답, 스트림 데이터가 **같은 추상(stream)** 아래 통합. 프로그램 관점에서 이들의 차이가 사라짐.

**인과성(causality)** 은 유지됨 — n번째 값을 내려면 0~(n-1)번째 값을 거쳐야 함. 시간이 뒤섞이지는 않는다.

## 실무 선언형 도구

| 영역 | 도구 | "무엇"을 기술 |
|---|---|---|
| **DB 질의** | SQL | 조회 결과의 모양 (조인 순서는 옵티마이저가) |
| **인프라** | Terraform, Kubernetes manifest, CloudFormation | 원하는 최종 상태 (어떻게 도달할지는 리소스 컨트롤러가) |
| **UI** | React JSX, Vue template, SwiftUI | 상태별 렌더링 결과 (DOM 조작은 런타임) |
| **스타일** | CSS | 요소별 스타일 (렌더링은 브라우저) |
| **빌드** | Make, Gradle dependency graph | 산출물 간 의존 (실행 순서는 빌드 시스템) |
| **함수형** | Haskell, Elm, PureScript | 타입·수식 (효과는 런타임) |
| **구성** | Nix, Guix | 의존 그래프로 패키지 정의 |

이들 모두 **"결과가 어떤 속성을 만족해야 한다"** 를 선언하고, 실행 전략은 런타임/시스템이 결정.

## 선언형의 장점과 한계

### 장점
- **간결성** — 의도가 바로 드러남
- **최적화 자유도** — 런타임이 실행 전략을 최적화 가능 (SQL opimizer, React reconciler)
- **조합성** — 작은 규칙/쿼리를 모아 큰 행동 만들기 쉬움
- **병렬화 용이** — 순서를 고정하지 않으므로 자동 병렬화 여지
- **테스트 용이** — 사이드이펙트 최소화 → 입출력 매핑으로 검증

### 한계
- **성능 튜닝이 우회적** — SQL 쿼리 힌트, React memo 등 runtime 내부 이해 필요
- **디버깅 난이도** — "언제·왜 이 순서로 실행됐는가"를 추적하기 어려움
- **학습 곡선** — 명령형에 익숙한 개발자에게 초기 진입 장벽
- **저수준 제어 불가** — 실시간·임베디드·드라이버 같은 영역은 명령형이 여전히 유리
- **선언 가능성의 한계** — 본질적으로 순차적인 로직(파일 쓰기·타임스탬프 기반 처리 등)은 선언으로 표현하기 어색

**현실 전략**: 대부분의 프로덕션 코드는 **선언형 껍질 + 명령형 알맹이**의 섞인 구조. 예: React UI는 선언형이지만 useEffect 안은 명령형. SQL로 조회하지만 트랜잭션 스크립트는 명령형.

## 자주 헷갈리는 포인트

- **함수형 = 선언형이 아님** — 함수형은 도구, 선언형은 사고 방식. 함수형 언어로도 명령형 스타일 가능 (IO 연쇄 등)
- **선언형이 항상 느린 건 아님** — SQL은 선언형인데 수동 명령형보다 훨씬 빠른 경우가 흔하다 (옵티마이저)
- **선언형 = "쉬움"이 아님** — 짧고 우아하지만, 실행 모델을 이해해야 성능 문제 해결 가능
- **"선언형"은 스펙트럼** — 완전 선언형도 완전 명령형도 드물다. 어느 쪽에 가까운가의 문제
- **최소 작용 원리가 "마법"이 아님** — 적절한 목적함수(cost function)를 정해야 원리가 작동. SQL의 비용 모델, React의 VDOM diff가 이 역할

## 면접 체크포인트

- **선언형 vs 명령형**의 차이를 한 문장으로 ("무엇" vs "어떻게")
- **물리학 Local/Global 이중성** 비유 (미분방정식 vs 최소 작용)
- **Universal Construction = 선언형**의 전형인 이유 (속성으로 정의)
- FRP가 이벤트를 **무한 스트림**으로 다루는 관점
- **실무 선언형 도구 5가지** (SQL, Terraform, React, CSS, Haskell)
- 선언형의 **장점(조합성·최적화 자유도)** 과 **한계(디버깅·저수준 제어)**
- **"선언형 껍질 + 명령형 알맹이"** 의 실무 구조

## 출처
- [evan-moon — 프로그래머를 위한 카테고리 이론 11. Declarative Programming](https://evan-moon.github.io/2024/12/25/category-theory-for-programmers-11-declarative-programming/)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory for Programmers — 일반 개념]]
- [[Types-And-Functions-As-Category|타입과 함수의 카테고리 (순수성)]]
- [[Products-And-Coproducts|Products and Coproducts (Universal Construction)]]
- [[Function-Types-And-Currying|Function Types · Currying · CCC]]
- [[Natural-Transformations|Natural Transformations (자연 변환)]]
- [[Monads-In-TypeScript|Monads in TypeScript]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
