---
tags: [cs, functional, error-handling, monad, typescript, kotlin]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Railway Oriented Programming", "ROP", "철도지향 프로그래밍", "Result 모나드"]
---

# Railway-Oriented Programming (ROP)

함수형 패러다임에서 출발한 **에러 처리 설계 방법론**. 프로그램의 모든 흐름을 **성공 선로 / 실패 선로** 두 갈래로 추상화하고, 그 위에 **복구 선로**를 얹어 안전한 파이프라인을 만든다.

## 왜 필요한가: 사이드 이펙트 처리 전략 2가지

에러를 포함한 사이드 이펙트를 다루는 전통적 접근은 두 가지다.

### LBYL (Look Before You Leap) — "뛰기 전에 살펴라"

호출 전에 조건을 검사해서 에러 상황을 애초에 만들지 않는 방식.
- 구현 수단: **순수 함수 + Guard Clause** (early return)
- 장점: 흐름이 명시적, 스택 비용 없음
- 단점: 검사할 조건이 많아지면 **분기 폭발**, 도메인과 방어 로직이 섞임

### EAFP (Easier to Ask for Forgiveness than Permission) — "일단 시도하고 예외로 처리"

실행해보고 예외가 나면 잡아서 복구하는 방식.
- 구현 수단: **try-catch**, 또는 **Functor / Monad** 기반 타입 랩핑
- 장점: 도메인 로직이 방어 로직에 오염되지 않음
- 단점: try-catch는 **타입 시스템에서 보이지 않음**(Java checked exception 제외), 예외가 "제어 흐름 점프"라 추적 난이도 상승

**ROP는 EAFP를 타입 시스템 위에 올린 것**이다. try-catch 대신 **`Result<T, E>`** 같은 타입으로 에러를 값처럼 다룬다.

## Functor와 Monad: ROP의 이론적 토대

### Functor — "박스에 map 적용"

박스처럼 값을 감싸는 구조 + 박스를 열지 않고도 안에 있는 값에 함수를 적용할 수 있는 `map` 연산을 제공.

예: `Array.prototype.map`, `Promise.then`(성공 케이스), `Optional.map`, `Result.map`.

```
Result<Int, E>.map(x => x + 1) → Result<Int, E>
```

### Monad — "중첩 박스를 평탄화"

Functor의 `map`만 쓰면 박스가 중첩되는 문제(`Result<Result<Int>>`)가 생긴다. 이를 해결하는 **flatMap** (또는 `bind`, `chain`, `then`) 연산을 가진 구조가 Monad다.

```
Result<Int, E>.flatMap(x => divide(x, 2)) → Result<Int, E>   // 중첩 안 됨
```

핵심 직관: **연산을 체이닝할 때마다 실패 가능성이 있는 경우, flatMap으로 연결하면 실패는 자동 전파되고 성공만 다음 단계로 간다.** 이것이 ROP의 "두 선로" 본질이다.

## ROP의 세 선로

| 선로 | 역할 | 연산 |
|---|---|---|
| **성공 선로 (happy path)** | 값이 타입 안에 담겨 흐름을 이어감 | `map`, `flatMap` |
| **실패 선로 (failure path)** | 에러가 타입 안에 담겨 끝까지 전파 | 자동 (flatMap은 실패를 skip) |
| **복구 선로 (recovery)** | 실패를 성공으로 되돌리거나 대체값 주입 | `recover`, `mapError`, `orElse` |

### 실패 자동 전파 예시 (Kotlin 스타일)

```kotlin
fun sum(a: Int, b: Int): Result<Int, Exception> = Result.of { a + b }
fun divide(a: Int, b: Int): Result<Int, Exception> =
    if (b == 0) Result.failure(ArithmeticException()) else Result.success(a / b)

sum(2, 3)
  .flatMap { divide(it, 0) }   // 실패 발생, 아래 단계는 skip
  .map { it * 10 }              // 실행 안 됨
  .recover { 0 }                // 실패 선로에서 복구
```

포인트: `divide`가 실패해도 뒤의 `map`은 호출되지 않고, 마지막 `recover`가 실패를 성공(0)으로 되돌린다. **도메인 로직(.map)과 에러 처리(.recover)가 선로 분리로 깔끔하게 나뉜다.**

## TypeScript에서 실전 적용

TS 표준 라이브러리에는 Result 타입이 없지만, 실전에서는 두 가지 패턴이 자주 쓰인다.

### 1. 태그드 유니온으로 직접 구현

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

const flatMap = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> =>
  r.ok ? f(r.value) : r;
```

### 2. 라이브러리 활용

`neverthrow`, `fp-ts` 같은 라이브러리가 Result/Either 타입을 제공한다. Rust의 `?` 연산자, Kotlin의 `runCatching`에 대응하는 API를 바로 쓸 수 있다.

## 실무에서 쓰는 가치

- **타입으로 드러나는 에러**: 함수 시그니처만 봐도 실패 가능성을 알 수 있음. try-catch는 시그니처에 안 보임
- **도메인 로직과 방어 로직 분리**: `.map` 체인에 도메인만, `.mapError`/`.recover`에 방어만
- **에러 타입의 표현력**: `Result<Data, "NOT_FOUND" | "VALIDATION_ERROR" | "DB_ERROR">`처럼 **도메인 에러를 enum으로** 표현 가능 → switch 망라 체크가 타입 시스템으로 강제됨
- **테스트 용이성**: 예외 대신 값으로 다뤄지므로 어서션이 단순(`expect(result.ok).toBe(false)`)

## 주의점과 한계

- **JS/TS 생태계는 예외 기반**: 외부 라이브러리는 대부분 throw 한다. 경계에서 **try-catch로 감싸 Result로 변환**하는 어댑터가 필요
- **비동기와 결합 시 주의**: `Promise<Result<T, E>>`는 **두 겹 에러 채널**(Promise reject + Result err)이 된다. 하나로 통일해야(보통 never reject + Result만 사용)
- **학습 비용**: 팀원이 Functor/Monad 용어에 익숙하지 않으면 오히려 코드 리뷰 비용이 커짐. **"Result 타입 + flatMap 하나"** 정도로 시작하는 점진 도입이 현실적
- **과도하면 가독성 저하**: 단순 유효성 검사까지 전부 ROP로 만들면 체이닝이 길어져 디버깅이 어려움. **경계가 분명한 파이프라인**(요청 파싱 → 검증 → 저장 → 응답 생성 등)에 제한적으로 쓰는 게 효과적

## 면접 체크포인트

- try-catch와 Result 타입의 **트레이드오프**를 말할 수 있는가
- Functor와 Monad의 차이를 `map`과 `flatMap`으로 설명할 수 있는가
- TypeScript에서 **태그드 유니온 + 제네릭**으로 Result를 직접 정의할 수 있는가
- 에러를 **값으로 다룬다는 개념**이 타입 시스템/테스트/계약에 주는 이점을 설명할 수 있는가

## 출처
- [kciter.so — Railway-Oriented Programming](https://kciter.so/posts/railway-oriented-programming/)

## 관련 문서
- [[Monads-In-TypeScript|Monads in TypeScript — Functor/Applicative/Monad 심화]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트 (제네릭, 타입 조작)]]
- [[tech/computer-science/js/Promise-Async|Promise와 Async]]
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
