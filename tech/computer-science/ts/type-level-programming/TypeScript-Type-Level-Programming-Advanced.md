---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 심화", "infer와 Mapped Types와 재귀 타입"]
verified_at: 2026-10-01
---

# TypeScript 타입 레벨 프로그래밍 — 심화 (infer, indexed access, Mapped, Template Literal, 재귀)

## `infer` — 타입 추출 (Pattern Matching)

조건부 타입의 true branch에서 사용할 타입 변수를 패턴 위치에 선언한다.

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type R = ReturnType<Fn>   // string
```

`infer R`은 조건에 맞는 타입의 해당 위치를 `R`로 추론한다.

고급 예: 배열의 첫 원소 타입:
```typescript
type Head<T> = T extends [infer H, ...any[]] ? H : never
type First = Head<[1, 2, 3]>  // 1
```

### readonly 배열과 튜플을 받는 패턴

가변 배열과 튜플은 readonly 배열에 대입할 수 있지만 반대 방향은 허용되지 않는다. `as const`로 만든 값의 타입은 `readonly [1, "a", true]`처럼 readonly 튜플이므로, 가변 패턴에 대면 조건이 거짓이 되어 오류 없이 `never`가 나온다.

```typescript
const tuple = [1, "a", true] as const  // readonly [1, "a", true]

type HeadRO<T> = T extends readonly [infer H, ...unknown[]] ? H : never
type Elem<T> = T extends readonly (infer U)[] ? U : never

type A = Head<typeof tuple>    // never, 위의 가변 패턴은 맞지 않는다
type B = HeadRO<typeof tuple>  // 1
type C = HeadRO<[2, 3]>        // 2, 가변 튜플도 받는다
type D = Elem<typeof tuple>    // 1 | "a" | true
```

제약도 같다. `T extends any[]`로 제약한 타입에 readonly 튜플을 넘기면 제약 위반 오류가 난다. 입력을 읽기만 하는 패턴과 제약은 `readonly [...]`, `readonly unknown[]` 형태로 써서 가변과 readonly 입력을 모두 받는다. 값 수준에서 `readonly T[]` 매개변수가 두 종류 배열을 모두 받는 원리와 같다([[TS-Collection-Type-Design|컬렉션 타입 설계]]).

## 기존 타입에서 파생하기 (indexed access, keyof)

인덱스드 액세스 타입은 객체, 배열, 튜플 타입에서 특정 속성이나 요소의 타입을 꺼낸다. 원본을 참조하므로 작성자 타입을 매개변수마다 따로 적을 때와 달리 원본에 필드가 추가되면 파생 타입도 따라 바뀐다.

```typescript
interface Post {
  title: string;
  author: { id: number; name: string };
}

type Author = Post["author"];
type AuthorId = Post["author"]["id"]; // number, 대괄호 중첩 가능
type PostList = Post[];
type Item = PostList[number]; // Post, 배열 요소 타입
type Tup = [number, string, boolean];
type Second = Tup[1]; // string
type AnyElement = Tup[number]; // number | string | boolean
```

- 대괄호 안에는 타입만 온다. `const key = "author"`로 `Post[key]`를 쓰면 TS2749(값을 타입으로 사용)이고, `Post[typeof key]`나 리터럴 타입을 쓴다. 없는 속성은 TS2339, 튜플 길이를 넘는 인덱스는 TS2493이다.
- 키 매개변수를 `string`으로 두면 없는 키도 통과해 런타임에 `undefined`가 된다. `key: keyof Person`으로 제한하면 실제 키만 허용하고 속성 추가도 자동 반영된다. `keyof`는 타입에만 쓰므로 값에서 시작하면 `keyof typeof person`처럼 타입 위치의 `typeof`로 먼저 타입을 얻는다([[TS-Declaration-Spaces-and-Inference|두 가지 typeof]]).

## 매핑된 타입 (Mapped Types)

`PropertyKey` 유니온을 순회하며 객체 속성을 만든다. 주로 `keyof`와 indexed access type을 함께 사용한다.

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
}

type Partial<T> = {
  [K in keyof T]?: T[K]
}

type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}
```

유틸리티 타입은 구현 원리에 따라 구분해야 한다.

- mapped type 기반: `Partial`, `Required`, `Readonly`, `Pick`, `Record`
- conditional type 기반: `Exclude`, `Extract`
- conditional type과 `infer` 기반: `Parameters`, `ReturnType`, `InstanceType`
- intersection 기반: TypeScript 4.8 이후의 `NonNullable<T>`는 `T & {}`
- 조합형: `Omit`은 key 제외와 속성 선택을 결합한다.

매핑 중에 `readonly`와 `?` 수정자를 `-`로 제거하고 `+`로 추가한다. 접두사가 없으면 `+`다.

```typescript
// lib.es5.d.ts의 정의
type Required<T> = { [P in keyof T]-?: T[P] }
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
type Record<K extends keyof any, T> = { [P in K]: T }

// lib에 없는 역방향: 읽기 전용 해제
type Mutable<T> = { -readonly [P in keyof T]: T[P] }
```

- `Omit`은 `Exclude`로 뺄 키를 제외한 키 유니온을 만든 뒤 `Pick`으로 고른다. `K`가 `keyof any`(`string | number | symbol`) 제약이라 `Omit<Post, "titel">` 같은 오타 키도 오류 없이 원본을 돌려준다. 오타를 잡으려면 `K extends keyof T`로 제약한 자체 Omit을 쓰되, 이 제약은 유니온의 일부 변형에만 있는 키를 거부한다.
- `Omit`은 유니온에 분배되지 않는다. 유니온의 `keyof`는 공통 키만 남겨 변형별 속성이 사라지므로, 변형마다 적용하려면 `T extends unknown ? Omit<T, K> : never` 같은 분배형을 쓴다.
- `Record`의 `K extends keyof any`는 객체 키가 될 수 있는 타입이어야 한다는 제약이다. `Record<"large" | "medium" | "small", { url: string }>`처럼 같은 값 구조의 반복 선언을 줄이고 값 구조를 한 곳에서 바꾼다.

## Template Literal Types

문자열 리터럴을 **템플릿처럼 조합**. 4.1+.

```typescript
type Greeting = `Hello, ${string}`
type Hi = 'Hello, World'  // Greeting에 할당 가능

type EventHandler<E extends string> = `on${Capitalize<E>}`
type ClickHandler = EventHandler<'click'>  // "onClick"
```

API 경로, CSS 클래스, 이벤트 이름 같은 문자열 패턴을 타입으로 표현할 수 있다.

보간 위치에 유니온을 넣으면 가능한 모든 조합의 유니온이 된다. `` `${"red" | "black" | "green"}-${"dog" | "cat" | "chicken"}` ``는 3 x 3 = 9개 문자열 리터럴이고, 원본 유니온을 고치면 조합도 따라 바뀐다. 조합 수는 유니온 크기의 곱으로 늘어 10만 개에 이르면 TS2590(Expression produces a union type that is too complex to represent)으로 거부된다(6.0.3, 7.0.2에서 9만 개는 통과). 큰 문자열 유니온은 미리 생성해 두는 편이 낫다.

## 재귀 조건부 타입

조건부 타입은 분기 안에서 자신을 다시 참조할 수 있다.

```typescript
// readonly 튜플도 받도록 제약과 패턴을 readonly로 둔다
type Length<T extends readonly unknown[]> = T extends { length: infer L } ? L : never

type Reverse<T extends readonly unknown[]> = T extends readonly [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : []

type R = Reverse<[1, 2, 3]>        // [3, 2, 1]
type R2 = Reverse<typeof tuple>    // [true, "a", 1]
```

TypeScript 4.1에서 재귀 조건부 타입을 지원했고, 4.5에서 일부 tail-recursive conditional type의 평가 제한을 완화했다. 그래도 재귀가 너무 깊거나 타입이 크게 팽창하면 `Type instantiation is excessively deep` 진단이 발생할 수 있다.

## 관련 문서

- [[TypeScript-Type-Level-Programming-Basics|타입 레벨 프로그래밍 기초]]
- [[TypeScript-Type-Level-Programming-Practice|타입 레벨 프로그래밍 실전]]

## 출처

- [TypeScript Handbook, Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook, Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook, Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript Handbook, Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TypeScript Handbook, Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript Handbook, Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript Handbook, The ReadonlyArray Type](https://www.typescriptlang.org/docs/handbook/2/objects.html#the-readonlyarray-type)
- [es5.d.ts — microsoft/TypeScript release-6.0](https://github.com/microsoft/TypeScript/blob/release-6.0/src/lib/es5.d.ts)
- [TypeScript 4.8 Release Notes, Improved Intersection Reduction](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-8.html#improved-intersection-reduction-union-compatibility-and-narrowing)
- [TypeScript 4.5 Release Notes, Tail-Recursion Elimination on Conditional Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#tail-recursion-elimination-on-conditional-types)
- [맵드 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=158374)
- [infer, 조건부 타입 내에서 타입 추론하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159063)
- [맵드 타입 기반의 유틸리티 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159864)
- [맵드 타입 기반의 유틸리티 타입 2 - Pick, Omit, Record, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159865)
- [인덱스드 엑세스 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=158372)
- [keyof 연산자, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=158373)
- [템플릿 리터럴 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=158375)
- [조건부 타입 기반의 유틸리티 타입, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=159866)
- [제네릭 + 조건부, yongsoocho](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137140)
