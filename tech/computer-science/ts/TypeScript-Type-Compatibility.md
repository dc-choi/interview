---
tags: [cs, typescript, type-system, subtyping]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Type Compatibility", "타입 호환성"]
---

# TypeScript 타입 호환성

TS는 **구조적 타이핑**(Structural Typing) 언어. "이름이 같냐"가 아니라 "구조가 맞냐"로 타입 호환성을 판정한다. Java·C#의 명목 타이핑(Nominal Typing)과 반대. 이 차이가 **Freshness·공변/반공변·덕 타이핑** 같은 TS 특유 동작의 뿌리.

## 구조적 vs 명목 타이핑

| 축 | Java/C# (Nominal) | TypeScript (Structural) |
|---|---|---|
| 호환 판정 | **선언된 이름** 일치 | **구조(필드·시그니처)** 일치 |
| 명시적 상속 | `implements`·`extends` 필수 | 필요 없음 |
| Duck typing | ✗ | ✅ "walks like a duck" |

예시:
```ts
interface Duck { quack(): void; swim(): void; }

class MysteryBird {
  quack() { console.log('quack'); }
  swim() { console.log('swim'); }
  // Duck을 implements 안 했음
}

const duck: Duck = new MysteryBird();  // ✅ OK — 구조가 맞음
```

Java였으면 에러. TS는 구조만 맞으면 호환.

## Freshness (엄격 초과 속성 검사)

**객체 리터럴을 함수에 직접 넘길 때**만 TS가 더 엄격하게 검사. 초과 속성(extra property)을 에러로 잡음.

```ts
function feed(meal: { calorie: number }) { ... }

// ❌ 에러 — 객체 리터럴 직접 전달
feed({ calorie: 500, brand: 'Burger King' });

// ✅ OK — 변수 통해 간접 전달
const meal = { calorie: 500, brand: 'Burger King' };
feed(meal);
```

같은 값을 전달하는데 **전달 방식**에 따라 검사 엄격도가 다름. 이게 Freshness.

### 왜 이렇게 설계했나
두 가지 문제를 잡기 위해:

1. **오타 감지** — `brand`를 `brnad`로 써도 객체 리터럴이면 잡힘. 변수 거쳐서 넘기면 못 잡음
2. **의미 혼동 방지** — "이 함수가 brand 필드도 쓰나?" 싶은 오해 차단

### 우회 방법
- 변수에 할당 후 전달 (자연스럽게 freshness 해제)
- **Index Signature** 추가 (`{ [k: string]: any }`)
- `// @ts-expect-error` 같은 주석 (비권장)
- `satisfies` 연산자 (타입 좁히기 + 초과 속성 허용)

## 함수 타입 호환성 (공변·반공변)

### 반환 타입은 공변 (Covariant)
하위 타입을 반환하는 함수는 상위 타입 반환 함수에 **할당 가능**.

```ts
type GetAnimal = () => Animal;
type GetDog = () => Dog;   // Dog extends Animal

let f: GetAnimal = (() => new Dog()) as GetDog;  // ✅ OK
```

`Dog`를 반환하는 함수는 `Animal`을 반환하는 함수로 쓸 수 있음. 호출자가 `Animal`로 받아도 안전.

### 파라미터 타입은 반공변 (Contravariant) — 이론적
수학적으로는 상위 타입을 받는 함수가 하위 타입 받는 함수에 할당 가능해야 안전:

```ts
type FeedAnimal = (a: Animal) => void;
type FeedDog = (d: Dog) => void;

// 이론적으론 FeedAnimal을 FeedDog에 할당해야 안전
```

### TS의 실용적 양공변 (Bivariance)
**메서드 문법**(`method():`)은 양공변(파라미터도 공변처럼)으로 허술한 편.
**함수 타입 문법**(`() => void`)에서 `strictFunctionTypes: true`일 때만 진짜 반공변.

실무 함의: **콜백·이벤트 핸들러**에서 타입 안전성 구멍이 있을 수 있음. `strict` 옵션 켜야 타입 체커가 제대로 잡음.

## 타입 호환 규칙 체크리스트

### 객체 타입
- 대상 타입의 **모든 속성이 존재**하고 **타입이 호환**되면 OK
- 초과 속성은 (freshness 아닌 한) 허용

### 함수 타입
- 파라미터 수: **적은 쪽**이 많은 쪽에 할당 가능 (함수가 안 쓰면 OK)
- 파라미터 타입: (strict면) 반공변
- 반환 타입: 공변

### 유니온 타입
- `A | B`는 `A`에도 `B`에도 할당 가능해야 함 — 부분집합 관계
- 인수 위치에선 유니온이 교집합처럼 동작 (intersection)

### 제네릭 타입
- 인스턴스화된 타입끼리 구조 비교

## 구조적 타이핑의 함정

### "Brand" 타입으로 우회
같은 구조인데 **의미적으로 구분**하고 싶을 때:

```ts
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

function getUser(id: UserId) { ... }

const userId = 'abc' as UserId;
const postId = 'xyz' as PostId;

getUser(userId);   // ✅
getUser(postId);   // ❌ Brand 다름
```

명목 타이핑 효과를 수동으로 만드는 패턴. `__brand`는 런타임에 없음(타입에만 존재).

### 빈 인터페이스의 위험
```ts
interface Empty {}
const n: Empty = 42;   // ✅ — 아무 속성도 요구 안 하니까 뭐든 OK
```

구조가 "없음"이면 모든 타입이 호환. 의도와 다르면 `Record<string, never>` 같은 걸로.

## `any` vs `unknown` vs `never`

| 타입 | 역할 | 특징 |
|---|---|---|
| **`any`** | 타입 체크 **회피** | 모든 타입과 호환. 전염성 있음. 사용 지양 |
| **`unknown`** | 타입 안전한 top type | 모든 값 받음. 사용 전 **타입 좁히기** 필수 |
| **`never`** | bottom type (공집합) | 어떤 값도 될 수 없음. 예외·무한 루프·exhaustive check |

외부 입력·JSON은 `unknown`으로 받고 런타임 검증 후 좁히는 게 안전 패턴.

## 실무 권장

- **`strict` 옵션 ON** — 반공변·null 체크 모두 켜기
- **외부 데이터는 `unknown`** — `any` 금지
- **Brand 타입** — ID·Token 같은 의미 구분 필요할 때
- **빈 인터페이스 주의** — 의도 없으면 쓰지 말기

## 면접 체크포인트

- 구조적 타이핑과 명목 타이핑의 차이
- Freshness가 필요한 이유 (오타·의미 혼동 방지)
- 함수 반환 공변·파라미터 반공변의 의미
- TS의 양공변(bivariance) 기본 동작과 `strictFunctionTypes`
- Brand 타입 패턴이 해결하는 문제
- `any`와 `unknown`의 차이

## 출처
- [Toss Tech — TypeScript 타입 시스템 뜯어보기: 타입 호환성](https://toss.tech/article/typescript-type-compatibility)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs]]
- [[TS-Type-vs-Interface|type vs interface]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍]]
