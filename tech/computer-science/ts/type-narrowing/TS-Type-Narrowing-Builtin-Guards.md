---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
category: "CS - TypeScript"
aliases: ["TS 빌트인 타입 가드", "Discriminated Union 좁히기"]
---

# TS Type Narrowing — 타입 소거, 빌트인 가드, Discriminated Union

## 타입 소거와 두 레이어 (면접 빈출, 헷갈리기 쉬움)

타입 가드를 이해하려면 **두 레이어가 분리돼 있다**는 걸 먼저 잡아야 한다.

- **컴파일 타임(타입 시스템)**: TS의 타입은 컴파일 시 전부 **소거(type erasure)**된다. 트랜스파일된 JS에는 타입이 없고, 런타임에 `string`이나 `User` 같은 타입 정보는 존재하지 않는다.
- **런타임(JS 값)**: 타입 가드는 사실 **런타임 JS 검사**다. `typeof`, `instanceof`, `in`은 타입이 아니라 **실제 값**을 보는 평범한 JS 연산이라 컴파일 후에도 살아남는다.

타입 가드는 이 둘을 잇는 다리다. 컴파일러가 런타임 분기(`typeof x === 'string'`)를 읽고 **그 분기 안에서 컴파일 타임 타입을 좁힌다**. 그래서 "런타임엔 타입이 없는데 어떻게 좁히나"의 답은, 좁히는 대상이 런타임 값이 아니라 **컴파일러의 타입 뷰**이고 그 판단 근거로 런타임에도 살아있는 JS 연산을 쓰는 것이다. 타입 가드 레이어(컴파일 타임 좁히기)와 런타임 레이어(실제 JS 검사)는 다른 층위라는 점을 분리해서 말해야 한다.

## 좁히기 6가지 도구

| 도구 | 적용 대상 | 예 |
|------|----------|-----|
| `typeof` | 원시 타입 | `typeof x === 'string'` |
| `instanceof` | 클래스 인스턴스 | `err instanceof HttpError` |
| `in` 연산자 | 객체 속성 존재 | `'kind' in obj` |
| 동등성 (literal) | Discriminated Union | `obj.kind === 'success'` |
| 사용자 정의 type predicate | 임의 조건 | `function isUser(x): x is User` |
| Assertion function | throw 기반 검증 | `function assertUser(x): asserts x is User` |

각각 **흐름이 다르고 안전성, 인체공학도 다름**. 상황별 선택이 핵심.

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

런타임 prototype 체인 검사 → **다른 realm(iframe, worker)에서 만든 객체**는 `instanceof`로 못 잡힐 수 있음. 메시지 패싱 환경에서는 `code`/`name` 분기가 안전.

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

## 4. Discriminated Union — 가장 안전, 표현력 높음

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
