---
tags: [cs, typescript, type-theory, curry-howard, functional]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Types As Proofs", "타입은 증명이다", "커리-하워드 대응", "Curry-Howard"]
verified_at: 2026-08-04
---

# Types as Proofs (타입은 증명이다)

타입 시스템을 **수학적 증명 체계**로 보는 관점이다. 커리-하워드 대응(Curry-Howard correspondence)을 TypeScript 코드에 적용하되, TypeScript는 의도적으로 불건전한 실용 언어이므로 이 대응을 엄밀한 정리 증명과 동일시하지 않는다.

## 한 줄 요약

> **타입은 명제이고, 그 타입의 값을 만드는 프로그램은 그 명제의 증명이다.**

건전한 타입 체계에서는 타입을 만족하는 프로그램을 증명 항으로 볼 수 있다. TypeScript의 타입 검사는 선언된 정적 모델 안에서 계약을 점검하지만 `any`, 타입 단언, 부정확한 선언 파일과 런타임 입력 때문에 통과 자체가 프로그램의 완전한 증명은 아니다.

## 논리학 ↔ 타입 대응 표

| 논리학 | TypeScript | 의미 |
|---|---|---|
| `A → B` (함의) | `(a: A) => B` | A를 받아 B를 만드는 함수 |
| `A ∧ B` (논리곱) | `[A, B]` 또는 `{ a: A; b: B }` | 두 타입의 곱(Product) |
| `A ∨ B` (논리합) | `A \| B` | 두 타입의 합(Sum) |
| `⊥` (거짓) | `never` | 값이 존재할 수 없는 타입 |
| `⊤` (참) | `unknown` | 모든 값을 안전하게 받을 수 있는 타입 |
| `∀T. P(T)` (전칭) | `<T>(x: T) => ...` | 제네릭 함수 |
| `¬A` (부정) | `(a: A) => never` | A를 받아 모순을 도출 |

## 핵심 대응 6가지

### 1. 함수 = "A이면 B"의 증명

```ts
function makeBread(flour: Flour): Bread { ... }
```

이 함수가 컴파일되면 "Flour가 주어지면 Bread를 만들 수 있다"는 명제의 **증명을 제출한 것**과 같다. 본문 안에서 진짜로 `Bread`를 반환할 수 없으면 컴파일 거부 → 거짓 증명 차단.

### 2. 유니온과 Exhaustiveness — `A ∨ B`

```ts
type Shape = { type: 'circle'; r: number } | { type: 'square'; s: number };

function area(shape: Shape): number {
  switch (shape.type) {
    case 'circle': return Math.PI * shape.r ** 2;
    case 'square': return shape.s ** 2;
    default: return assertNever(shape);  // 모든 케이스 처리 강제
  }
}
```

유니온은 "둘 중 하나"의 명제. 증명하려면 **모든 분기를 다뤄야 한다.** 누락하면 명제가 미증명.

### 3. `never` — Ex falso quodlibet (모순에서는 무엇이든 도출 가능)

```ts
function assertNever(x: never): never {
  throw new Error('Unreachable');
}
```

`never`에 도달했다는 것은 "있을 수 없는 일"이 일어났다는 뜻. 논리학에서 거짓에 도달하면 어떤 명제든 증명할 수 있다(`⊥ → P`). TypeScript에서 `assertNever`로 분기 누락을 컴파일 타임에 잡아내는 패턴이 정확히 이 원리.

### 4. 제네릭 = 전칭 명제 `∀T. P(T)`

```ts
function identity<T>(x: T): T { return x; }       // OK: 모든 T에 대해 성립
function broken<T>(x: T): T { return x + 1; }     // X: T가 number라는 보장 없음
```

제네릭 함수는 **"어떤 T를 넣어도 약속을 지킨다"** 는 전칭 명제. 본문이 특정 타입을 가정하면 증명 실패.

### 5. 함수 합성 = 삼단논법

`A → B`와 `B → C`가 있으면 `A → C`를 도출할 수 있다.

```ts
const parseNumber = (s: string): number => parseInt(s);
const isPositive = (n: number): boolean => n > 0;
const isPositiveString = (s: string): boolean => isPositive(parseNumber(s));
```

작은 증명을 합성해 큰 증명을 만든다 = 함수 합성.

### 6. 커링 = 수출 법칙 (Exportation)

논리학의 `(A ∧ B) → C ≡ A → (B → C)`가 그대로 함수 변환에 대응.

```ts
const make = (flour: Flour, water: Water): Dough => mix(flour, water);
const makeCurried = (flour: Flour) => (water: Water): Dough => mix(flour, water);
```

두 형태는 **동치(equivalent)**. 함수형 라이브러리들이 커링을 기본으로 두는 이유.

## 실무 사고 방식의 변화

이 관점을 받아들이면 코드 작성 습관이 다음처럼 바뀐다.

- **타입 에러 = "장애물"이 아니라 "계약 위반"** → 우회보다 계약 재설계를 먼저 검토
- **유니온이 보이면 exhaustiveness 점검 자동화** → `assertNever` 디폴트 분기 습관화
- **`any` 사용 = 증명 시스템 무효화** → 경계(외부 입력)에서만 한정적으로 사용, 내부로 퍼뜨리지 않음
- **함수 시그니처를 먼저 설계** → 시그니처가 명제, 본문이 증명이라는 관점에서 시그니처가 맞으면 절반은 끝
- **불필요한 타입 단언(`as`) 회피** → 단언은 "이 명제를 증명 없이 받아들여라"라는 선언, 안전성 손실

## TypeScript의 논리적 한계 (의도된 탈출구)

TS는 JS와의 실용적 호환을 위해 **불건전(unsound)** 한 지점들을 의도적으로 남겨뒀다. 이론적 증명 체계가 깨지는 지점들.

| 탈출구 | 무엇을 깨는가 |
|---|---|
| `any` | 모든 명제를 즉시 참으로 만듦. 증명 체계 자체 무효화 |
| 타입 단언 `as T` | 증명 없이 명제를 받아들임 |
| 함수 매개변수의 예외 | `strictFunctionTypes`를 끄거나 메서드 문법을 쓰면 이변적 검사가 남음. 함수 타입은 `strictFunctionTypes`에서 반공변 검사 |
| 인덱스 시그니처 | 없는 키 접근이 `undefined`로 추론되지 않음. `--noUncheckedIndexedAccess` 필요 |
| 옵셔널 프로퍼티 `{ a?: T }` | 기본 설정에서는 "키 없음"과 명시적 `undefined` 대입을 허용. `exactOptionalPropertyTypes`로 구분 가능 |
| 전역 `Function` 타입 | 호출 결과가 `any`가 되어 구체 함수 시그니처보다 안전하지 않음 |
| 전역 `Object`, 빈 객체 `{}` | `any`는 아니지만 의도가 모호함. 비원시 값에는 `object`, 모든 값에는 `unknown` 권장 |

**실무 권장**: `strict: true`에 `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`를 검토해 대표적인 안전성 구멍을 줄인다. 이 옵션들도 런타임 검증을 대신하지는 않는다.

## 면접 체크포인트

- **커리-하워드 대응**을 한 문장으로 설명할 수 있는가
- `never` 타입의 의미와 `assertNever` 패턴을 설명할 수 있는가
- 제네릭이 **전칭 명제**라는 의미와, 본문에서 특정 타입을 가정할 수 없는 이유
- **유니온과 exhaustive switch**의 관계
- TypeScript가 **불건전(unsound)** 한 지점들과 그 이유 (JS 호환)
- `any` vs `unknown`의 본질적 차이를 증명 관점에서 설명

## OOP vs 함수형 — TS는 어느 쪽에 가까운가

Java/C#의 명목 클래스와 일부 타입 메타데이터는 런타임 reflection과 DI에 활용할 수 있다. 세부 보존 범위는 언어와 타입 종류마다 다르다. TypeScript 고유의 타입 주석과 interface는 emit에서 사라지지만 JavaScript class와 `instanceof` 같은 런타임 값은 남는다.

### 타입 소거를 고려해야 하는 패턴
- `@Autowired` 같은 **인터페이스 기반 DI** — TS interface는 런타임에 없음 → Symbol 토큰이나 추상 클래스로 우회 ([[Clean-Architecture-NestJS]])
- **`instanceof` 기반 분기** — 인터페이스로는 불가, 클래스로만
- **폐쇄된 타입 계층과 exhaustive 분기** — Discriminated Union과 `never` 검사로 표현 가능
- **Decorator 기반 메타프로그래밍** — 런타임 토큰과 메타데이터를 별도로 설계해야 하며 interface 정보가 자동으로 생기지 않음

### TypeScript에서 선택할 수 있는 표현
- **함수가 일급 객체** — 전략을 class 대신 **함수의 Record**로 표현
- **구조적 타이핑(duck typing)** — 상속 없이도 형태가 맞으면 호환
- **불변성, 순수 함수**와 Discriminated Union — 상태 전이를 값으로 표현하기 쉬움

### 실용 원칙
- 패턴 이름보다 런타임 정체성, 확장 지점과 상태 모델을 먼저 본다. Strategy 같은 패턴은 작은 함수나 함수 맵으로 충분할 수도 있고, 수명 주기와 캡슐화가 중요하면 class가 더 명확할 수도 있다.
- 타입 수준의 `private`와 interface에 런타임 보안을 기대하지 않는다. 실제 캡슐화에는 JavaScript `#private`, 모듈 경계와 런타임 검증을 사용한다.
- OOP와 함수형 표현 중 하나를 언어의 유일한 기본값으로 일반화하지 않고, 팀이 유지할 수 있는 계약과 도구를 기준으로 선택한다.

## 출처
- [evan-moon — 타입 시스템은 왜 증명처럼 동작하는가](https://evan-moon.github.io/2026/01/25/types-as-proofs-typescript-hidden-math/)
- [velog @miinhho — OOP와 TypeScript](https://velog.io/@miinhho/oop-and-typescript)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript Declaration Files, Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript TSConfig, strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)
- [TypeScript TSConfig, exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)

## 관련 문서
- [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리]] — 명제, 집합, 귀납법의 기초 (커리-하워드의 전제)
- [[Products-And-Coproducts|Products and Coproducts (Sum type의 카테고리적 의미)]]
- [[Algebraic-Data-Types|Algebraic Data Types (타입 대수, 재귀 ADT 방정식)]]
- [[Function-Types-And-Currying|Function Types, Currying, CCC (함의의 카테고리적 정의)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트 (타입 시스템, 제네릭, 타입 조작)]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]] — 에러를 값으로 다루기
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
