---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
verified_at: 2026-10-01
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

**경고**: predicate 함수가 **거짓을 말하면** 컴파일러는 그대로 믿음 — 잘못된 좁히기로 런타임 오류 가능. 신뢰 X 데이터엔 [[Runtime-Validation-Libraries|Zod, io-ts, Typia]] 같은 검증 라이브러리.

### boolean 헬퍼와 추론된 predicate (TypeScript 5.5+)

좁히기는 제어 흐름 분석이 한 함수 안의 조건식을 따라가며 계산한다. 조건을 다른 함수로 옮기면 호출부는 그 함수의 시그니처만 보므로, 반환 타입이 `boolean`이면 인자에 대한 정보가 전달되지 않는다. 호출 경계를 넘어 좁히려면 시그니처에 `x is T`가 있어야 한다.

TypeScript 5.5부터는 다음 조건을 모두 만족하는 함수의 predicate를 컴파일러가 추론한다.

1. 반환 타입이나 predicate를 명시하지 않았다.
2. `return` 문이 하나이고 암묵적 반환이 없다.
3. 매개변수를 변경하지 않는다.
4. 매개변수에 대한 좁히기와 연결된 `boolean` 식을 반환한다.

```ts
interface Person { name: string; work(): void }
interface Animal { name: string; bark(): void }

function isPerson(obj: Person | Animal) {         // 추론: obj is Person
  return 'work' in obj;
}
function isPersonFlag(obj: Person | Animal): boolean {
  return 'work' in obj;                           // 반환 타입 명시로 추론 꺼짐
}

declare const pet: Person | Animal;
if (isPerson(pet)) pet.work(); else pet.bark();   // 통과
if (isPersonFlag(pet)) pet.work();                // 오류: Animal에 work 없음

const ids = [1, undefined, 2].filter(x => x !== undefined); // 5.5+: number[]
```

- predicate는 참이면 `T`, 거짓이면 `T`가 아니라는 양방향 계약이다. `typeof x === 'string' && x !== ''`는 거짓 분기에도 빈 문자열이 남으므로 추론되지 않고 `boolean`이 된다. `number | undefined`에 대한 `!!score`도 `0` 때문에 추론되지 않는다.
- 추론된 predicate는 선언 파일에도 `obj is Person`으로 나가 공개 시그니처가 된다. 구현을 고치면 시그니처가 조용히 바뀔 수 있으므로 공개 API의 가드는 `x is T`를 명시한다. 명시한 predicate는 구현과의 일치를 검사받지 않는다는 위 경고는 그대로다.
- 5.4 이하에서 `(number | undefined)[]`였던 `filter` 결과가 5.5부터 `number[]`로 좁아져, 이후 `undefined`를 넣는 코드가 오류가 될 수 있다. 넓은 타입이 필요하면 변수 타입을 명시한다.

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

사용자 정의 predicate는 함수 구현을 검사해 반환 타입의 진실성을 증명하지 않는다. 외부 데이터 경계에서는 속성 몇 개만 확인한 가드를 전체 schema validation으로 오해하지 않고, 검증된 결과를 domain type으로 변환한다.

## 출처

- [TypeScript Handbook, Using Type Predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [TypeScript Handbook, Assertion Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [TypeScript 5.5 Release Notes, Inferred Type Predicates](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- yongsoocho, [type guard](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138762)
- yongsoocho, [type guard 보충](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138764)
