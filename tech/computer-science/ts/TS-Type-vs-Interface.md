---
tags: [cs, typescript, type, interface]
status: done
category: "CS - TypeScript"
aliases: ["Type vs Interface", "type alias vs interface"]
---

# TypeScript type vs interface

기능적으로 80% 겹치지만 **선언 병합·확장 방식·복잡한 타입 표현**에서 차이가 있다. 실무 선택은 대부분 "팀 컨벤션"이지만, 각자의 강점을 알면 상황 맞게 씀.

## 핵심 차이

| 특징 | `type` | `interface` |
|---|---|---|
| 객체 타입 정의 | ✅ | ✅ |
| **선언 병합** (같은 이름 여러 번 선언) | ✗ (에러) | ✅ 자동 병합 |
| **유니온·인터섹션·튜플** | ✅ | ✗ (간접적으로만) |
| 확장 | `&` 인터섹션 | `extends` |
| `implements`로 클래스에 적용 | ✅ | ✅ |
| 매핑된 타입·조건부 타입 | ✅ | ✗ |

## Interface의 강점: 선언 병합

같은 이름으로 여러 번 선언하면 **자동 병합**된다.

```
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
- **Global 타입 확장** — `declare global` 안에서 `Window`·`Process` 등 확장
- **점진적 스키마 확장** — 한 파일에서 조금씩 필드 추가

`type`으로는 이게 안 됨 — 중복 선언 시 에러.

## Type의 강점: 유니온·튜플·조건부

```
type ID = string | number;              // 유니온
type Point = [number, number];          // 튜플
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // 매핑
type NonNull<T> = T extends null ? never : T;          // 조건부
```

**interface로는 이게 불가능**하거나 매우 번거로움.

### Union + 함수 오버로드 대체
```
type Handler =
  | { kind: 'click'; x: number; y: number }
  | { kind: 'key'; code: string };
```
Discriminated Union 패턴은 **type으로만 자연스럽게** 가능.

## 확장 방식 차이

### Interface `extends`
```
interface Animal { name: string }
interface Dog extends Animal { breed: string }
```

### Type 인터섹션 `&`
```
type Animal = { name: string }
type Dog = Animal & { breed: string }
```

**동일해 보이지만 충돌 시 동작 다름**:
- `interface extends`: 같은 필드 다른 타입이면 **에러**
- `type &`: 같은 필드는 **교집합** 취함 (`string & number = never`)

에러가 명확한 건 interface 쪽. type은 조용히 `never` 만들어 버그 숨김.

## 성능·컴파일 속도

대규모 프로젝트에서 `interface`가 **타입 체커에 친화적** — 선언 병합 기반이라 캐싱 가능. `type`의 복잡한 조건부·매핑은 재계산 비용 큼.

일반 규모에선 체감 없음. 수만 줄 타입 쓰는 거대 프로젝트에서나 문제.

### Microsoft·Google 공식 권고

TypeScript 팀 리드 발언: **"interfaces behave better"**, `type` aliases는 display·performance 이슈 있음. Microsoft는 **`interface extends`를 `type &`보다 권장** (성능·IDE 표시 이유).

Google TypeScript Style Guide의 실용 권고:
- **기본은 interface**로 객체 타입 정의
- **복잡한 Mapped·Conditional Types는 가급적 피하기**
  - 사람이 머릿속에 타입을 모델링하기 어려워짐
  - 컴파일러 버전마다 미묘하게 다르게 동작 가능
  - 에디터·도구가 완전히 지원 못 할 수 있음
- **명시적 반복이 복잡한 유틸리티보다 낫다**
  - ❌ `type FoodPreferences = Pick<User, 'icecream' | 'chocolate'>`
  - ✅ `interface FoodPreferences { icecream: ...; chocolate: ...; }`

**가독성·유지보수 > 기교**가 Google·Microsoft 공통 입장. 라이브러리 저자가 아닌 애플리케이션 개발자는 **타입을 단순하게**.

## 선택 가이드

### Interface 선호
- **객체 타입만** 정의
- 라이브러리 타입 확장 필요
- 팀이 OOP 스타일에 익숙 (클래스 `implements` 자연스러움)
- 공개 API 타입 (라이브러리 저자)

### Type 선호
- **유니온·튜플·조건부** 필요
- 함수 시그니처 타입
- 유틸리티 타입 조합
- 리터럴 타입·매핑 타입

### 실무 컨벤션
많은 팀이 **"기본은 interface, 복잡한 유니온·유틸이면 type"** 규칙 사용. 또는 **"전부 type"** 통일 (Airbnb 등) — 일관성 우선.

## 섞어 쓰기

```
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
- 같은 프로젝트에서 type·interface 혼재해 일관성 없음

## 면접 체크포인트

- type과 interface의 가장 큰 기능적 차이 (선언 병합·유니온)
- Express Request 확장 같은 라이브러리 확장에 interface가 쓰이는 이유
- Discriminated Union이 type으로만 자연스러운 이유
- 팀 컨벤션으로 한쪽을 고정하는 게 좋은 이유

## 출처
- [매일메일 — type과 interface 차이](https://www.maeil-mail.kr/question/58)
- [velog @miinhho — Type vs Interface (Google·MS 가이드)](https://velog.io/@miinhho/Type-vs-Interface)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs]]
- [[TS-Enum-Antipattern|TS Enum 안티패턴]]
