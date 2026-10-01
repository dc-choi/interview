---
tags: [cs, typescript, type-narrowing, type-guard, type-predicate]
status: done
category: "CS - TypeScript"
aliases: ["타입 좁히기 함정", "클로저 좁힘 해제"]
verified_at: 2026-10-01
---

# TS Type Narrowing — control flow, 흔한 실수, 면접 체크포인트

## 좁히기와 control flow

컴파일러는 제어 흐름과 재할당을 따라 관찰 지점의 타입을 갱신한다.

```ts
function f(x: string | number) {
  if (typeof x === 'string') {
    x.toUpperCase();        // string
  }
  x.toFixed(2);             // 다시 string | number — 좁힘 해제
}
```

클로저라고 항상 좁힘이 풀리는 것은 아니다. 변수가 다시 대입되지 않으면 좁힌 타입을 콜백에서도 사용할 수 있다.

```ts
function f(x: string | null) {
  if (x !== null) {
    setTimeout(() => x.toUpperCase()); // x: string
  }
}
```

TypeScript 5.4부터는 매개변수와 `let` 변수의 마지막 대입 뒤 생성된 비호이스팅 클로저에서도 좁힘을 보존한다. 반면 중첩 함수 어디에서든 같은 변수를 다시 대입하면 호출 순서를 증명할 수 없어 다른 클로저의 좁힘도 무효화할 수 있다.

```ts
function printLater(value: string | undefined) {
  if (value === undefined) value = "missing";

  setTimeout(() => {
    value = value; // 중첩 함수의 대입
  });

  setTimeout(() => value.toUpperCase()); // 오류: undefined 가능
}
```

콜백이 공유 변수를 바꿀 필요가 없다면 가드 뒤 값을 `const`로 캡처한다. non-null assertion으로 경고만 없애기보다 변경 가능성을 구조에서 제거하는 편이 안전하다.

## `unknown` vs `any`

| 축 | `unknown` | `any` |
|----|-----------|-------|
| 사용 전 좁히기 | 필수 | 불필요 |
| 안전성 | ✅ | ✗ |
| 활용 | 외부 입력, `JSON.parse` 결과 | 임시, 마이그레이션 |

`any`는 타입 시스템 우회 — 신뢰 X 데이터는 항상 `unknown`으로 받고 좁히기.

## null이 섞인 유니온의 `in`과 `instanceof`

여러 종류가 섞인 유니온은 원시 타입을 `typeof`, 내장 클래스 인스턴스를 `instanceof`, 남은 객체 타입을 `in`이나 판별 필드로 차례로 좁힌다.

```ts
type Person = { name: string; age: number };

function describe(value: number | string | Date | null | Person) {
  if (typeof value === "number") return value.toFixed();
  if (typeof value === "string") return value.toUpperCase();
  if (value instanceof Date) return value.toISOString();
  // 남은 타입: Person | null
  if (value !== null && "age" in value) return `${value.name} ${value.age}`;
  return "none";
}
```

- `in`의 오른쪽 피연산자가 객체가 아니면(`null`, `undefined`, 원시값) 실행 시 TypeError가 난다. `strictNullChecks`에서는 `'value' is possibly 'null'`(TS18047)로 막히지만, 옵션이 꺼져 있으면 컴파일을 통과하고 런타임에 실패한다. `in` 앞에서 `null`을 먼저 제외한다.
- `instanceof`의 오른쪽에는 런타임 생성자 값이 와야 한다. type alias나 interface로 만든 `Person`은 값이 없어 `value instanceof Person`이 TS2693(only refers to a type)이다. 구조로 구분할 때는 `in`이나 판별 필드를 쓴다.

## 흔한 실수

- **Type predicate가 거짓 약속** — 함수 본문이 검증을 안 하는데 `x is T` 선언. 컴파일러는 의심 X.
- **`typeof null === 'object'`** 잊고 좁히기 후 `.length` 호출 → 런타임 오류.
- **`instanceof` 다른 realm 함정** — 메시지 패싱, iframe, worker 경계에서 prototype 안 통함.
- **`in` 연산자가 prototype 체인 포함** — 상속받은 속성도 true.
- **`in` 앞에서 `null` 미제외** — 오른쪽 피연산자가 `null`, `undefined`, 원시값이면 런타임 TypeError. `value !== null &&`로 먼저 제외한다.
- **클로저의 재할당 분석 무시** — 클로저 자체가 아니라 마지막 대입과 중첩 함수의 대입 여부가 좁힘 보존을 결정한다.
- **exhaustive `default` 누락** — 새 variant 추가 시 컴파일러가 안 잡음. `assertNever` 패턴.
- **Assertion function 시그니처 빠뜨림** — 일반 throw 함수와 구분 안 돼 좁히기 안 됨. `asserts x is T` 명시.

## 면접 체크포인트

- 6가지 좁히기 도구와 각 적용 대상
- Discriminated Union + exhaustive check (`assertNever`)의 의미 — 새 case 추가 시 컴파일 에러로 누락 발견
- Type predicate(`x is T`) vs Assertion function(`asserts x is T`) 차이
- predicate가 거짓을 말할 수 있는 위험 — 신뢰 X 데이터는 검증 라이브러리(Zod 등)
- `instanceof` 다른 realm 함정
- 클로저 좁힘을 보존하거나 무효화하는 조건 — 마지막 대입과 중첩 함수의 재할당
- `unknown` vs `any` — 외부 입력 받기에 `unknown`
- `typeof null === 'object'` 함정

## 출처

- [TypeScript Handbook, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 5.4, Preserved Narrowing in Closures Following Last Assignments](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#preserved-narrowing-in-closures-following-last-assignments)
- [MDN, in](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)
- [인프런, 이정환 Winterlood, 타입 좁히기](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=156636)
