---
tags: [cs, typescript, type, interface]
status: done
category: "CS - TypeScript"
aliases: ["Type vs Interface", "type alias vs interface"]
verified_at: 2026-08-04
---

# TypeScript type vs interface

둘 다 객체 형태에 이름을 붙일 수 있지만 **선언 병합, 확장 방식, 표현할 수 있는 타입의 범위**가 다르다. 객체 타입만 놓고 보면 자유롭게 선택할 수 있고, 필요한 기능과 팀 규칙으로 결정한다.

## 핵심 차이

| 특징 | `type` | `interface` |
|---|---|---|
| 객체 타입 정의 | ✅ | ✅ |
| **선언 병합** (같은 이름 여러 번 선언) | ✗ (에러) | ✅ 자동 병합 |
| **유니온, 인터섹션, 튜플** | ✅ | ✗ (간접적으로만) |
| 확장 | `&` 인터섹션 | `extends` |
| `implements`로 클래스에 적용 | ✅ | ✅ |
| 매핑된 타입, 조건부 타입 | ✅ | ✗ |

## Interface의 강점: 선언 병합

같은 이름으로 여러 번 선언하면 **자동 병합**된다.

```typescript
interface User {
  name: string;
}
interface User {
  email: string;
}

const u: User = { name: 'dc', email: 'x@x' };  // 자동 병합
```

### 언제 유용한가
- **라이브러리 확장** — 외부 라이브러리의 타입에 필드 추가 (예: Express Request에 커스텀 필드)
- **Global 타입 확장** — `declare global` 안에서 `Window`, `Process` 등 확장
- **점진적 스키마 확장** — 한 파일에서 조금씩 필드 추가

`type`으로는 이게 안 됨 — 중복 선언 시 에러.

## Type의 강점: 유니온, 튜플, 조건부

```typescript
type ID = string | number;              // 유니온
type Point = [number, number];          // 튜플
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // 매핑
type NonNull<T> = T extends null ? never : T;          // 조건부
```

interface는 객체 모양을 선언하므로 유니온, 튜플과 조건부 타입 자체에 이름을 붙일 수 없다. 이런 타입에는 type alias를 사용한다.

### Union + 함수 오버로드 대체
```typescript
type Handler =
  | { kind: 'click'; x: number; y: number }
  | { kind: 'key'; code: string };
```
각 variant는 interface로 선언할 수 있지만, 최종 유니온을 묶는 이름은 type alias가 필요하다.

## 확장 방식 차이

### Interface `extends`
```typescript
interface Animal { name: string }
interface Dog extends Animal { breed: string }
```

### Type 인터섹션 `&`
```typescript
type Animal = { name: string }
type Dog = Animal & { breed: string }
```

동일해 보이지만 충돌 시 동작이 다르다.
- `interface extends`: 같은 필드 다른 타입이면 **에러**
- `type &`: 같은 필드는 **교집합** 취함 (`string & number = never`)

확장 관계에서 충돌을 즉시 드러내고 싶다면 interface가 더 명확하다.

## 성능, 컴파일 속도

단순 객체 type alias와 interface 사이의 성능 차이를 일반화할 근거는 없다. 다만 TypeScript 팀의 성능 가이드는 여러 객체 타입을 합성할 때 큰 intersection보다 `interface extends`를 권한다. interface는 평평한 객체 타입을 만들고 관계를 캐시하며, 속성 충돌도 일찍 보고하기 때문이다.

성능 문제가 확인되지 않았다면 표현력과 가독성을 먼저 본다. 측정 없이 모든 객체를 interface로 바꾸거나 모든 type alias를 느리다고 판단하지 않는다.

## 선택 가이드

### Interface 선호
- **객체 타입만** 정의
- 라이브러리 타입 확장 필요
- 팀이 OOP 스타일에 익숙 (클래스 `implements` 자연스러움)
- 외부 확장을 의도한 공개 객체 API

### Type 선호
- **유니온, 튜플, 조건부** 필요
- 함수 시그니처 타입
- 유틸리티 타입 조합
- 리터럴 타입, 매핑 타입

### 실무 컨벤션
객체는 interface, 유니온과 타입 연산은 type으로 정하거나 객체까지 type으로 통일할 수 있다. 선언 병합이 의도치 않게 발생하면 type을 선택하고, 외부 확장 지점이면 interface를 선택하는 식으로 예외를 문서화한다.

## 섞어 쓰기

```typescript
interface User {
  name: string;
}
type UserRole = 'admin' | 'user';
type UserWithRole = User & { role: UserRole };
```

둘 다 자연스럽게 조합 가능.

## 흔한 실수

- `type`으로 정의한 객체 타입을 반복 선언 → **에러** (interface면 병합)
- `interface`로 유니온 만들려다 **안 됨**
- 같은 프로젝트에서 type, interface 혼재해 일관성 없음

## 면접 체크포인트

- type과 interface의 가장 큰 기능적 차이 (선언 병합, 유니온)
- Express Request 확장 같은 라이브러리 확장에 interface가 쓰이는 이유
- Discriminated Union이 type으로만 자연스러운 이유
- 팀 컨벤션으로 한쪽을 고정하는 게 좋은 이유

## 출처
- [TypeScript Handbook, Everyday Types, Differences Between Type Aliases and Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [TypeScript Handbook, Object Types, Interface Extension vs Intersection](https://www.typescriptlang.org/docs/handbook/2/objects.html#interface-extension-vs-intersection)
- [TypeScript Handbook, Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript Wiki, Performance, Preferring Interfaces Over Intersections](https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections)
- yongsoocho, [interface 기초](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137137)
- yongsoocho, [type과 interface 비교](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137148)
- yongsoocho, [type과 interface 비교 보충](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=156648)
- [이펙티브 타입스크립트 스터디 3-2회차, 정재남](https://www.inflearn.com/courses/lecture?courseId=327754&unitId=91631)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs]]
- [[TS-Enum-Antipattern|TS Enum 안티패턴]]
