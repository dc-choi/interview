---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["TypeScript Type-Level Programming", "타입 레벨 프로그래밍"]
---

# TypeScript 타입 레벨 프로그래밍

TypeScript의 타입 시스템은 **튜링 완전한 함수형 언어**에 가깝다. 조건 분기·재귀·패턴 매칭이 모두 가능해서 **컴파일 타임에 타입 수준에서 로직을 표현**할 수 있다. 이것이 라이브러리 저자가 쓰는 `Pick`·`Omit`·`Parameters` 같은 고급 유틸리티 타입의 기반.

## 타입 = 집합

타입 시스템을 이해하는 가장 쉬운 관점: **타입은 값들의 집합**.

```
type A = 1 | 2 | 3        // 3개 원소 집합
type B = 2 | 3 | 4        // 3개 원소 집합
type C = A | B            // 합집합 {1,2,3,4}
type D = A & B            // 교집합 {2,3}
```

- **Union (`|`)**: 집합 합집합 (Union Type)
- **Intersection (`&`)**: 집합 교집합 (Intersection Type)
- **`never`**: 공집합
- **`unknown`**: 전체 집합
- **서브타입**: 부분집합 관계

## 타입 레벨 함수: Generic

Generic은 **타입을 받아 타입을 반환하는 함수**.

```
type Pair<T> = [T, T]
type StringPair = Pair<string>   // [string, string]
```

매개변수 여러 개, 기본값, 제약 조건(`extends`) 지원 → 고차 함수급 표현력.

## 조건부 타입 (Conditional Types)

타입 레벨의 `if-else`. **`T extends U ? X : Y`** 문법.

```
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>   // true
type B = IsString<42>        // false
```

실무 예:
```
type NonNull<T> = T extends null | undefined ? never : T
type StringOrNull = string | null
type JustString = NonNull<StringOrNull>  // string
```

## 분배 조건부 타입 (Distributive Conditional Types)

Conditional Type의 제네릭 T가 **Union이면** 자동으로 각 원소에 적용 후 Union으로 묶음.

```
type ToArray<T> = T extends any ? T[] : never
type Result = ToArray<string | number>  // string[] | number[]
```

이 특성이 `Exclude`·`Extract` 내부 구현의 핵심.

```
type Exclude<T, U> = T extends U ? never : T
type A = Exclude<'a' | 'b' | 'c', 'a'>  // 'b' | 'c'
```

## `infer` — 타입 추출 (Pattern Matching)

조건부 타입 안에서 특정 위치의 타입을 **변수로 끄집어냄**.

```
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type R = ReturnType<Fn>   // string
```

`infer`는 "이 위치에 뭐가 오든 R이라 부르자"고 선언. **패턴 매칭**의 핵심.

고급 예: 배열의 첫 원소 타입:
```
type Head<T> = T extends [infer H, ...any[]] ? H : never
type First = Head<[1, 2, 3]>  // 1
```

## 매핑된 타입 (Mapped Types)

객체 타입의 **모든 필드를 순회하며 변환**.

```
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

`Record`·`Required`·`NonNullable` 같은 빌트인 유틸리티가 모두 매핑 타입 + 조건부 타입 조합.

## Template Literal Types

문자열 리터럴을 **템플릿처럼 조합**. 4.1+.

```
type Greeting = `Hello, ${string}`
type Hi = 'Hello, World'  // Greeting에 할당 가능

type EventHandler<E extends string> = `on${Capitalize<E>}`
type ClickHandler = EventHandler<'click'>  // "onClick"
```

API 경로·CSS 클래스·이벤트 이름 같은 **문자열 패턴을 타입으로 표현** 가능.

## 재귀 조건부 타입

타입 스스로를 재귀 호출 → **루프·재귀 알고리즘** 구현.

```
type Length<T extends any[]> = T extends { length: infer L } ? L : never

type Reverse<T extends any[]> = T extends [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : []

type R = Reverse<[1, 2, 3]>  // [3, 2, 1]
```

TypeScript 4.1부터 꼬리 재귀 최적화, 4.5부터 **재귀 깊이 확장**. 다만 컴파일 타임에 너무 깊으면 **"Type instantiation is excessively deep"** 에러.

## 실용 예시: API 응답 타입 검증

```
type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string }

type Unwrap<R> = R extends { ok: true; data: infer D } ? D : never

type User = Unwrap<ApiResponse<{ id: number }>>   // { id: number }
```

타입 수준에서 응답을 **"성공 데이터만 추출"** 하는 유틸리티.

## 실용 예시: 라우터 타입

```
type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : Path extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {}

type Params = ExtractParams<'/users/:id/posts/:postId'>
// { id: string; postId: string }
```

Express·React Router 경로 문자열에서 **파라미터 타입 자동 추출**. 실제로 라이브러리(hono·ts-rest)가 이런 방식으로 엔드-투-엔드 타입 안전성 제공.

## 흔한 함정

### 재귀 깊이
```
type Build<N extends number, Acc extends any[] = []> =
  Acc['length'] extends N ? Acc : Build<N, [...Acc, any]>

type X = Build<1000, []>   // "Type instantiation is excessively deep"
```
100 근처가 실용 한계.

### `any`와 동등성
`Equal<T, U>`를 완벽히 구현하기 어려움. `any`가 모든 타입과 동시에 같고 다름 → 엣지 케이스.

### 성능
복잡한 타입 계산은 **IDE 반응 속도** 저하. 라이브러리 작성자가 아니면 적당히.

## 언제 쓰는가

- **라이브러리·프레임워크 API** 설계 — 엔드유저에게 타입 안전성 제공
- **코드 생성 대체** — 타입으로 검증·변환을 표현
- **API 경로·스키마 타입화** — 문자열 기반 DSL의 타입 안전성

애플리케이션 코드 대부분은 **기본 타입 + Generic + 조건부** 정도로 충분. 과용하면 코드 읽는 사람이 타입 해독에 시간 소모.

## 면접 체크포인트

- TypeScript 타입 시스템이 튜링 완전하다는 의미
- Distributive Conditional Type의 동작 방식
- `infer` 키워드의 패턴 매칭 역할
- Mapped Type으로 `Partial`·`Readonly`·`Pick` 구현
- Template Literal Types의 실용 예
- 재귀 조건부 타입의 한계 (깊이·성능)

## 출처
- [velog @gomjellie — 타입스크립트 타입 레벨 프로그래밍](https://velog.io/@gomjellie/You-dont-know-type)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs (커리-하워드)]]
- [[TypeScript-AST|TypeScript와 AST]]
- [[TS-Type-vs-Interface|type vs interface]]
- [[TS-Enum-Antipattern|TS Enum 안티패턴]]
