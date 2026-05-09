---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
category: "CS - TypeScript"
aliases: ["TS Type Narrowing", "Type Guard", "Type Predicate", "Assertion Function"]
---

# TypeScript Type Narrowing — 타입 좁히기 종합

Union·`unknown`·`any` 같은 **넓은 타입**을 조건문 흐름으로 **구체 타입**으로 좁혀, 좁혀진 컨텍스트 안에서 안전하게 메서드·속성에 접근하는 메커니즘. 컴파일러는 control flow analysis로 각 분기 안의 타입을 추적한다.

## 좁히기 6가지 도구

| 도구 | 적용 대상 | 예 |
|------|----------|-----|
| `typeof` | 원시 타입 | `typeof x === 'string'` |
| `instanceof` | 클래스 인스턴스 | `err instanceof HttpError` |
| `in` 연산자 | 객체 속성 존재 | `'kind' in obj` |
| 동등성 (literal) | Discriminated Union | `obj.kind === 'success'` |
| 사용자 정의 type predicate | 임의 조건 | `function isUser(x): x is User` |
| Assertion function | throw 기반 검증 | `function assertUser(x): asserts x is User` |

각각 **흐름이 다르고 안전성·인체공학도 다름**. 상황별 선택이 핵심.

## 1. typeof — 원시 타입

```ts
function len(x: string | number) {
  if (typeof x === 'string') return x.length;     // x: string
  return x.toFixed(2).length;                      // x: number
}
```

`'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'` 8가지만 인식. **null이 `'object'`로 나오는 함정** 그대로 — `typeof x === 'object' && x !== null`로 보호.

## 2. instanceof — 클래스 인스턴스

```ts
try { ... } catch (err) {
  if (err instanceof HttpError) return err.statusCode;
  if (err instanceof Error) return err.message;
  return 'unknown';
}
```

런타임 prototype 체인 검사 → **다른 realm(iframe·worker)에서 만든 객체**는 `instanceof`로 못 잡힐 수 있음. 메시지 패싱 환경에서는 `code`/`name` 분기가 안전.

## 3. `in` 연산자 — 속성 존재

```ts
type Bird = { fly: () => void };
type Fish = { swim: () => void };

function move(x: Bird | Fish) {
  if ('fly' in x) x.fly();                        // x: Bird
  else x.swim();                                   // x: Fish
}
```

prototype 체인 포함 — 상속받은 속성도 true. **본인 속성만 검사**하려면 `Object.hasOwn(x, 'fly')`.

## 4. Discriminated Union — 가장 안전·표현력 높음

공통 리터럴 필드(`kind`/`type`/`status`)로 분기.

```ts
type ApiResponse =
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

function handle(r: ApiResponse) {
  switch (r.status) {
    case 'loading': return null;
    case 'success': return r.data;       // r: { status: 'success', data: string }
    case 'error':   return r.error;      // r: { status: 'error', error: string }
  }
}
```

**exhaustive check** — `never` 타입 활용:

```ts
function handle(r: ApiResponse): string | null {
  switch (r.status) {
    case 'loading': return null;
    case 'success': return r.data;
    case 'error':   return r.error;
    default:        return assertNever(r);   // 새 case 추가 시 컴파일 에러
  }
}
function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }
```

새 variant 추가 → switch 누락하면 컴파일 에러 → 빠른 발견. 도메인 상태 모델링의 표준.

## 5. 사용자 정의 Type Predicate — `x is T`

조건이 복잡해 빌트인 도구로 표현 안 될 때 함수로 추출.

```ts
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null
    && 'id' in value && 'email' in value;
}

if (isUser(input)) {
  input.email.toLowerCase();            // input: User
}
```

**경고**: predicate 함수가 **거짓을 말하면** 컴파일러는 그대로 믿음 — 잘못된 좁히기로 런타임 오류 가능. 신뢰 X 데이터엔 [Zod·io-ts·Typia](Runtime-Validation-Libraries) 같은 검증 라이브러리.

## 6. Assertion Function — `asserts x is T`

throw 기반 검증. 통과하면 그 이후 코드 전체에서 타입 좁혀짐.

```ts
function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== 'number') throw new Error('Expected number');
}

function double(value: unknown) {
  assertIsNumber(value);
  return value * 2;                     // value: number
}
```

**Type predicate vs Assertion function**:

| 축 | predicate (`x is T`) | assertion (`asserts x is T`) |
|----|---------------------|------------------------------|
| 반환 | boolean | void (또는 throw) |
| 사용 | `if (isFoo(x)) {...}` | `assertFoo(x); use(x);` |
| 실패 시 | 다른 분기로 | throw |
| 적합 | 분기 처리 필요 | "여기서부터 X 타입이 보장됨" |

## 좁히기와 control flow

컴파일러는 **변수 재할당 시점**에 좁힘 상태를 갱신.

```ts
function f(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase();        // string
  }
  x.toFixed(2);             // 다시 string | number — 좁힘 해제
}
```

특히 **클로저 안에서**는 좁힘이 풀림 — 비동기 콜백 시점에 변수가 바뀌었을 수 있어 보수적으로 처리.

```ts
function f(x: string | null) {
  if (x !== null) {
    setTimeout(() => x.toUpperCase());   // ❌ x: string | null (콜백 시점)
  }
}
```

해결: 지역 변수로 캡처 (`const v = x;`) 또는 non-null assertion `x!.toUpperCase()`.

## `unknown` vs `any`

| 축 | `unknown` | `any` |
|----|-----------|-------|
| 사용 전 좁히기 | 필수 | 불필요 |
| 안전성 | ✅ | ✗ |
| 활용 | 외부 입력·`JSON.parse` 결과 | 임시·마이그레이션 |

`any`는 타입 시스템 우회 — 신뢰 X 데이터는 항상 `unknown`으로 받고 좁히기.

## 흔한 실수

- **Type predicate가 거짓 약속** — 함수 본문이 검증을 안 하는데 `x is T` 선언. 컴파일러는 의심 X.
- **`typeof null === 'object'`** 잊고 좁히기 후 `.length` 호출 → 런타임 오류.
- **`instanceof` 다른 realm 함정** — 메시지 패싱·iframe·worker 경계에서 prototype 안 통함.
- **`in` 연산자가 prototype 체인 포함** — 상속받은 속성도 true.
- **클로저 안에서 좁힘 풀림 무시** — 비동기 콜백 안에서 `x.foo()` 호출 시 컴파일 에러 또는 의도와 다른 동작.
- **exhaustive `default` 누락** — 새 variant 추가 시 컴파일러가 안 잡음. `assertNever` 패턴.
- **Assertion function 시그니처 빠뜨림** — 일반 throw 함수와 구분 안 돼 좁히기 안 됨. `asserts x is T` 명시.

## 면접 체크포인트

- 6가지 좁히기 도구와 각 적용 대상
- Discriminated Union + exhaustive check (`assertNever`)의 의미 — 새 case 추가 시 컴파일 에러로 누락 발견
- Type predicate(`x is T`) vs Assertion function(`asserts x is T`) 차이
- predicate가 거짓을 말할 수 있는 위험 — 신뢰 X 데이터는 검증 라이브러리(Zod 등)
- `instanceof` 다른 realm 함정
- 클로저 안에서 좁힘이 풀리는 이유 — 변수 재할당 가능성
- `unknown` vs `any` — 외부 입력 받기에 `unknown`
- `typeof null === 'object'` 함정

## 관련 문서

- [[TypeScript-Type-Compatibility|TS 타입 호환성 (구조적 타이핑·Variance·Brand)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍 (Conditional·Mapped·Infer)]]
- [[TS-Pattern-Matching|패턴 매칭 (ts-pattern·exhaustive)]]
- [[Runtime-Validation-Libraries|Runtime 검증 라이브러리 (Zod·Typia)]]
- [[Types-As-Proofs|Types as Proofs (never·exhaustive)]]
