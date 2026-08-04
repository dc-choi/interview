---
tags: [cs, typescript, enum, type-system]
status: done
verified_at: 2026-08-04
category: "CS - TypeScript"
aliases: ["TS Enum", "TypeScript Enum Antipattern", "TypeScript enum 선택"]
---

# TypeScript enum과 대안 선택

`enum`은 이름 있는 상수 집합을 선언하며 타입과 JavaScript 런타임 값을 함께 만든다. 런타임 객체가 필요한지, 외부 데이터와 어떤 값으로 교환할지, 빌드 도구가 TypeScript 전용 문법을 변환하는지를 기준으로 선택한다.

## 런타임 동작

```typescript
enum Direction {
  Up,
  Down,
}
```

숫자 enum은 이름에서 숫자로, 숫자에서 이름으로 찾는 reverse mapping을 생성한다. 따라서 `Object.values(Direction)`에는 이름과 숫자가 함께 나타날 수 있다. 문자열 enum은 값에서 이름으로 향하는 reverse mapping을 만들지 않는다.

```typescript
enum Role {
  Admin = "ADMIN",
  User = "USER",
}
```

TypeScript 5.0부터 모든 enum은 각 멤버가 고유 타입을 갖는 union enum으로 계산된다. enum 멤버를 discriminant로 사용할 수 있지만, enum 자체는 타입 소거 대상이 아닌 런타임 문법이다. `erasableSyntaxOnly`를 켜거나 Node의 기본 type stripping을 직접 사용할 때는 일반 enum을 사용할 수 없다.

## 문자열 union과 `as const` 객체

런타임 값이 필요 없으면 union이 가장 단순하다.

```typescript
type Role = "ADMIN" | "USER";
```

값을 순회하거나 다른 모듈에서 이름 있는 상수로 가져와야 하면 일반 객체에서 타입을 도출할 수 있다.

```typescript
const Role = {
  Admin: "ADMIN",
  User: "USER",
} as const;

type Role = (typeof Role)[keyof typeof Role];
```

이 객체는 JavaScript에 그대로 남는다. `as const`는 타입 추론을 readonly literal로 만들 뿐 런타임 객체를 동결하지 않는다. 외부 JSON의 문자열이 union과 같아 보이더라도 런타임 검증 없이 안전해지는 것은 아니다.

## `const enum`의 경계

`const enum`은 사용 지점에 값을 inline해 런타임 enum 객체를 만들지 않을 수 있다. 그러나 declaration을 다른 패키지에 배포하면 소비자의 TypeScript 버전, `isolatedModules`, 빌드 변환 순서와 어긋날 수 있다. 애플리케이션 내부에서 빌드 체인을 통제할 때도 실제 산출물을 확인하고, 공개 라이브러리는 일반 enum 또는 객체/union 계약을 우선 검토한다.

## 선택 기준

| 요구 | 적합한 표현 |
|---|---|
| 타입 검사에만 필요한 닫힌 값 집합 | literal union |
| 런타임 순회와 이름 있는 값도 필요 | `as const` 객체와 값 union |
| enum의 namespace와 런타임 객체가 의도 | 일반 `enum` |
| 통제된 내부 빌드에서 inline 상수 필요 | 제약을 검토한 `const enum` |

enum을 일괄 안티패턴으로 판단하거나 객체가 항상 더 작은 bundle을 만든다고 단정하지 않는다. 사용하지 않은 코드 제거는 export 형태와 bundler 분석에도 좌우된다. 핵심은 타입 전용 개념에 불필요한 런타임 객체를 만들지 않고, 런타임 값이 필요하면 그 존재를 API 계약으로 명시하는 것이다.

## 관련 문서

- [[TS-Declaration-Spaces-and-Inference|타입 공간과 값 공간]]
- [[TS-Type-Assertions|as const와 타입 단언]]
- [[TS-Collection-Type-Design|컬렉션 타입 설계]]
- [[MySQL-Enum-Antipattern|MySQL ENUM 선택]]

## 출처

- [TypeScript Handbook, Enums](https://www.typescriptlang.org/docs/handbook/enums)
- [TypeScript 5.0, All Enums Are Union Enums](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#all-enums-are-union-enums)
- [TypeScript TSConfig, erasableSyntaxOnly](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html)
- yongsoocho, [literal type과 enum](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137133)
