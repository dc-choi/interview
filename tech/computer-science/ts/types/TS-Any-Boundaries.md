---
tags: [cs, typescript, any, unknown, type-safety]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript any 경계", "any 다루기"]
verified_at: 2026-08-04
---

# TypeScript `any` 경계 설계

`any`는 모르는 값을 나타내는 일반 타입이 아니라 해당 값에서 타입 검사를 끄는 탈출구다. 외부 입력과 마이그레이션 경계에서는 `unknown`으로 검사를 미루고, 불가피한 `any`는 한 표현식이나 어댑터 내부에 가둔다.

## `any`가 퍼지는 방식

`any`의 속성 접근, 호출과 연산 결과도 대부분 `any`가 된다. 정상 타입과 유니온해도 정보가 사라지는 경우가 많고, `any`를 반환하는 함수는 호출자까지 검사를 약화한다.

```typescript
declare const payload: any;

const id = payload.user.id; // any가 연쇄 전파됨
const count: number = id;   // 검사 없이 통과
```

TypeScript 5.8은 선언된 반환 타입을 가진 함수의 직접 조건식 분기를 더 세밀하게 검사하지만, `any`의 일반적인 전파를 해결한 것은 아니다.

## 모르는 값은 `unknown`

```typescript
function readId(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }
  throw new Error("Invalid payload");
}
```

`unknown`은 모든 값을 받을 수 있지만 좁히기 전에는 사용할 수 없다. API 응답, 역직렬화 결과, catch 경계와 플러그인 입력에 적합하다. 키-값 사전이라는 사실까지 확인했을 때만 `Record<string, unknown>`으로 좁힌다.

## 불가피한 `any`를 좁게 쓰기

라이브러리 타입이 실제 동작을 표현하지 못하거나 동적 호출을 감싸야 할 때는 안전한 공개 계약 뒤로 숨긴다.

```typescript
function invokeLegacy(input: LegacyInput): Result {
  const raw = legacyLibrary(input) as unknown;
  return parseResult(raw);
}
```

- 함수 전체나 반환값을 `any`로 만들지 않는다.
- `as any`가 필요하면 해당 식에만 적용하고 바로 구체 타입 또는 `unknown`으로 되돌린다.
- 반복되는 단언은 타입 선언, 어댑터 또는 런타임 검증이 빠졌다는 신호로 본다.
- 제네릭 constraint 안의 `(...args: any[]) => any`처럼 의도적으로 임의의 함수 형태를 나타내는 사례와 업무 데이터를 `any`로 두는 사례를 구분한다.

## `any` 진화에 의존하지 않기

초기값 없는 변수나 빈 배열은 일부 제어 흐름에서 대입을 따라 타입이 진화할 수 있다. 이 동작은 읽기 위치와 분기에 따라 달라져 계약으로 쓰기 어렵다. 누적 결과의 타입을 선언하거나 `map`, `filter`, `reduce`처럼 결과 타입이 흐르는 연산을 사용한다.

```typescript
const names: string[] = [];
for (const user of users) names.push(user.name);
```

함수형 연산이 언제나 우월한 것은 아니다. 핵심은 중간 컨테이너가 암묵적 `any`가 되지 않고 입력에서 출력까지 타입 관계가 유지되는지다.

## 몽키 패치와 선언 병합

런타임 객체에 임의 속성을 붙이고 단언으로 덮기보다 wrapper, subclass 또는 별도 객체를 우선한다. 기존 라이브러리가 실제로 확장 지점을 제공할 때는 module augmentation으로 타입을 맞출 수 있다.

module augmentation은 런타임 메서드를 생성하지 않는다. 실제 구현을 설치하는 코드와 타입 선언이 함께 있어야 한다. 타입만 추가하면 컴파일은 통과해도 실행 시 속성이 없을 수 있다.

## 안전성 추적

`noImplicitAny`는 추론 실패로 생기는 암묵적 `any`를 막지만 명시적 `any`, 잘못된 단언과 외부 선언의 `any`까지 없애지는 않는다.

- 새 `any`와 suppression을 코드 리뷰에서 확인한다.
- 공개 함수 반환 타입과 생성된 `.d.ts`에 `any`가 새지 않는지 본다.
- 타입 테스트에는 성공 사례와 실패 사례를 함께 둔다.
- 실패를 기대하는 줄에는 `@ts-expect-error`를 사용한다. 오류가 사라지면 unused directive 진단이 나므로 무조건 숨기는 `@ts-ignore`보다 회귀 테스트에 적합하다.

타입 검사 통과율을 숫자로 추적할 수는 있지만 지표 자체가 안전성의 증명은 아니다. 런타임 검증, 테스트와 실제 데이터 계약을 함께 본다.

## 관련 문서

- [[타입특징|any, unknown, never]]
- [[TS-Type-Assertions|타입 단언]]
- [[TS-Type-Narrowing|타입 좁히기]]
- [[TS-Module-Augmentation|Module Augmentation]]
- [[Runtime-Validation-Libraries|런타임 검증]]

## 출처

- [TypeScript Handbook, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Declaration Files, Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript TSConfig, noImplicitAny](https://www.typescriptlang.org/tsconfig/noImplicitAny.html)
- [TypeScript 3.9, ts-expect-error Comments](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#ts-expect-error-comments)
- [TypeScript 5.8, Granular Checks for Branches in Return Expressions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#granular-checks-for-branches-in-return-expressions)
- [이펙티브 타입스크립트 스터디 6-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91642)
