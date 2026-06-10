---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
category: "CS - TypeScript"
aliases: ["사용자 정의 타입 가드", "asserts x is T"]
---

# TS Type Narrowing — Type Predicate와 Assertion Function

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

**경고**: predicate 함수가 **거짓을 말하면** 컴파일러는 그대로 믿음 — 잘못된 좁히기로 런타임 오류 가능. 신뢰 X 데이터엔 [Zod, io-ts, Typia](Runtime-Validation-Libraries) 같은 검증 라이브러리.

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
