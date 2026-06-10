---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
category: "CS - TypeScript"
aliases: ["타입 좁히기 함정", "클로저 좁힘 해제"]
---

# TS Type Narrowing — control flow, 흔한 실수, 면접 체크포인트

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
| 활용 | 외부 입력, `JSON.parse` 결과 | 임시, 마이그레이션 |

`any`는 타입 시스템 우회 — 신뢰 X 데이터는 항상 `unknown`으로 받고 좁히기.

## 흔한 실수

- **Type predicate가 거짓 약속** — 함수 본문이 검증을 안 하는데 `x is T` 선언. 컴파일러는 의심 X.
- **`typeof null === 'object'`** 잊고 좁히기 후 `.length` 호출 → 런타임 오류.
- **`instanceof` 다른 realm 함정** — 메시지 패싱, iframe, worker 경계에서 prototype 안 통함.
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
