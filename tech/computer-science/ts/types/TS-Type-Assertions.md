---
tags: [cs, typescript, type-system, assertion]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Type Assertion", "타입 단언", "satisfies 연산자"]
verified_at: 2026-08-04
---

# TypeScript 타입 단언과 `satisfies`

타입 단언은 값을 변환하지 않고 TypeScript 검사기가 식을 바라보는 타입만 바꾼다. emit 결과에서 사라지며 런타임 검사도 추가하지 않는다.

```typescript
const input = document.querySelector("input") as HTMLInputElement;
```

실제로 다른 요소가 선택되거나 `null`이면 단언이 보호해 주지 않는다. 가능한 경우 제어 흐름 좁히기와 런타임 검증을 먼저 사용한다.

## 도구별 계약

| 문법 | 검사기의 동작 | 런타임 효과 |
|---|---|---|
| `value as T` | `value`를 `T`로 취급 | 없음 |
| `value!` | 타입에서 `null`, `undefined` 제거 | 없음 |
| `expr as const` | 리터럴 넓힘 억제, 객체 속성과 배열을 readonly로 추론 | 없음 |
| `expr satisfies T` | `expr`이 `T`와 호환되는지 검사하고 식 자체의 추론을 보존 | 없음 |

## 타입 주석과 `satisfies`

타입 주석은 변수의 공개 타입을 지정한다. `satisfies`는 형태를 검사하되 각 속성에서 추론한 구체 타입을 유지하고 싶을 때 사용한다.

```typescript
type Routes = Record<"home" | "admin", `/${string}`>;

const routes = {
  home: "/",
  admin: "/admin",
} satisfies Routes;

routes.admin.toUpperCase();
```

`satisfies`도 런타임 validation은 아니다. JSON이나 API 응답에는 schema validator 또는 직접 작성한 type guard가 필요하다.

## `as const`의 범위

```typescript
const states = ["idle", "loading", "done"] as const;
type State = (typeof states)[number];
```

`as const`는 리터럴 타입과 readonly 추론을 보존하지만 객체를 `Object.freeze`하지 않는다. 런타임 불변성이 필요하면 별도 구현이 필요하다.

## 위험 신호

- `as unknown as T`는 서로 겹치지 않는 타입 사이의 검사를 강제로 우회한다. 데이터 검증이나 어댑터로 근거를 만든 뒤 경계 한곳에 제한한다.
- non-null assertion `!`는 값이 실제로 존재한다는 증거가 아니다. 조건문, optional chaining, 명시적 오류 처리로 좁힐 수 있는지 먼저 본다.
- 클래스 필드의 확정 할당 단언 `field!: T`도 초기화를 수행하지 않는다. 프레임워크가 외부에서 값을 주입하는 등 수명 주기를 별도로 증명할 수 있을 때만 쓴다.
- 반복되는 단언은 타입 모델이나 함수 경계가 실제 데이터와 어긋났다는 신호일 수 있다.

## 선택 순서

1. 값의 타입을 직접 지정할 수 있으면 타입 주석을 쓴다.
2. 조건으로 증명할 수 있으면 narrowing을 쓴다.
3. 외부 입력이면 런타임 검증 후 좁힌다.
4. 형태 검사와 구체 추론을 함께 원하면 `satisfies`를 쓴다.
5. 컴파일러가 알 수 없는 사실을 개발자가 증명할 때만 좁은 범위의 단언을 쓴다.

## 관련 문서

- [[타입특징|타입 특징]]
- [[TS-Type-Narrowing|Type Narrowing]]
- [[Runtime-Validation-Libraries|런타임 검증 라이브러리]]

## 출처

- [TypeScript Handbook, Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [TypeScript Handbook, Literal Inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-inference)
- [TypeScript 4.9 Release Notes, The satisfies Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- yongsoocho, [type casting과 type assertion](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=149242)
- [타입 단언, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=156635)
