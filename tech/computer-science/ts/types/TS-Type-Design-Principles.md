---
tags: [cs, typescript, type-design, domain-modeling]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript 타입 설계 원칙", "유효한 상태 타입"]
verified_at: 2026-08-04
---

# TypeScript 타입 설계 원칙

좋은 타입은 가능한 값을 많이 허용하는 타입이 아니라 프로그램에서 유효한 상태만 표현하는 타입이다. 타입 이름과 경계는 실제 도메인, 데이터 명세와 런타임 검증을 따라야 한다.

## 유효한 상태만 표현하기

서로 배타적인 상태를 선택적 속성 여러 개로 표현하면 불가능한 조합이 생긴다.

```typescript
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "failure"; error: Error };
```

각 variant가 자기 상태에 필요한 값만 가지므로 `status`로 좁힐 수 있고, `never`를 이용해 분기 누락도 검사할 수 있다. 공통 인터페이스 안에 여러 유니온 속성을 넣기보다 완전한 객체 타입들의 유니온을 우선한다.

## 관련된 `null`은 함께 배치하기

여러 필드가 함께 존재하거나 함께 없어야 한다면 각 필드에 `null`을 붙이지 않는다.

```typescript
type Range = { start: Date; end: Date } | null;
```

`{ start: Date | null; end: Date | null }`은 한쪽만 있는 중간 상태까지 허용한다. 그 중간 상태가 실제 도메인에 필요하면 별도 variant로 이름을 붙이고, 필요하지 않으면 전체 관계를 nullable로 만든다.

`exactOptionalPropertyTypes`를 켜면 속성이 없는 상태와 `undefined`를 명시적으로 대입한 상태를 구분한다. 이 차이가 직렬화나 patch API에서 의미가 있을 때 유용하다.

## 입력은 최소 계약, 출력은 정규화된 계약

함수 입력은 구현에 필요한 최소 구조와 readonly 성질만 요구하고, 생성 결과는 구체적인 정상 형태를 반환한다.

```typescript
type Role = "admin" | "member";

interface CreateUserInput {
  name: string;
  role?: Role;
}

interface User {
  id: UserId;
  name: string;
  role: Role;
}

function createUser(input: Readonly<CreateUserInput>): User {
  return { id: nextUserId(), name: input.name, role: input.role ?? "member" };
}
```

너그러운 입력은 `any`나 무제한 인덱스 시그니처를 뜻하지 않는다. 호출자가 가진 더 큰 객체도 구조적으로 전달할 수 있으므로 함수는 실제로 읽는 속성만 요구하면 된다. 반환 타입은 기본값과 정규화를 끝낸 상태를 약속한다.

## 문자열보다 도메인 타입

가능한 값이 유한하면 리터럴 유니온을 쓰고, 같은 구조지만 의미가 다른 식별자는 brand를 고려한다.

```typescript
declare const userIdBrand: unique symbol;
type UserId = string & { readonly [userIdBrand]: true };

function parseUserId(value: unknown): UserId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid user id");
  }
  return value as UserId;
}
```

brand는 구조적 호환성을 제한할 뿐 런타임 검증을 만들지 않는다. 단언을 곳곳에 흩뿌리지 말고 검증 또는 생성 함수 안에서만 brand를 부여한다.

타입 이름은 구현 세부가 아니라 업무 용어를 사용한다. 같은 개념에 여러 이름을 붙이거나 하나의 이름을 다른 의미로 재사용하면 타입이 맞아도 모델이 읽히지 않는다.

## 부정확한 완성보다 정확한 미완성

외부 데이터에서 확인하지 못한 필드를 추측해 구체 타입으로 선언하지 않는다. 아는 필드만 모델링하고 나머지는 `unknown` 경계에 두며, 공식 API 명세나 schema를 원천으로 삼는다.

TypeScript 타입은 런타임 응답을 검증하지 않는다. OpenAPI, JSON Schema, GraphQL schema 같은 실행 시 계약이 있다면 타입 생성과 validator의 원천을 하나로 맞춰 drift를 줄인다. TypeScript의 객체 타입도 기본적으로 exact object가 아니므로 금지된 추가 키까지 검사하려면 런타임 schema가 필요하다.

## 비동기와 문서 계약

- 순차 콜백 중첩보다 `Promise`와 `async`로 완료 값을 드러내면 반환 타입과 오류 흐름을 합성하기 쉽다.
- 독립 작업은 의도를 확인한 뒤 `Promise.all`로 병렬화한다. 단순히 `async`로 바꾼다고 자동 병렬화되지는 않는다.
- `Promise<T>`는 reject 사유를 타입으로 표현하지 않는다. 업무 실패가 정상 흐름이면 성공과 실패의 discriminated union을 반환한다.
- 주석은 매개변수와 반환 타입을 다시 적지 말고 단위, 전제 조건, 부작용, 보안 제약처럼 타입만으로 표현되지 않는 의미를 설명한다.

## 관련 문서

- [[TS-Pattern-Matching|Discriminated Union과 exhaustive check]]
- [[TypeScript-Type-Compatibility|구조적 타이핑과 brand]]
- [[TS-Generics|Promise 제네릭]]
- [[Runtime-Validation-Libraries|런타임 검증]]

## 출처

- [TypeScript Handbook, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript TSConfig, exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [이펙티브 타입스크립트 스터디 5-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91636)
- [이펙티브 타입스크립트 스터디 5-3회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91639)
- [이펙티브 타입스크립트 스터디 6-1회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91640)
