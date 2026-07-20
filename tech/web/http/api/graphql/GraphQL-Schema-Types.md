---
tags: [web, graphql, api, schema, type-system]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Schema Types", "GraphQL 타입 시스템", "GraphQL 스키마 타입", "interface union input scalar enum"]
---

# GraphQL 타입 시스템 (스키마의 6가지 타입)

GraphQL 스키마는 이름 있는 타입 6종으로 짠다: Object, Scalar, Enum, Interface, Union, Input Object. 여기에 List와 Non-Null 두 수식자가 붙어 배열과 nullability를 표현한다. 각 타입 kind의 문법과 의미가 아래이고, nullability 전략과 버전 없는 진화, mutation 설계 같은 설계 판단은 [[GraphQL-Schema-Design|스키마 설계]]에 있다.

## 스키마 정의 방식과 SDL

스키마를 어떻게 만들지는 라이브러리마다 다르다: 호스트 언어 코드로 타입, 필드, resolver를 함께 구성하거나, SDL(schema definition language)로 타입을 선언하고 resolver를 따로 작성하거나(흔히 schema-first), resolver 코드에 주석, 데코레이터를 달아 스키마를 유추하거나(흔히 code-first), 데이터 소스에서 타입과 resolver를 모두 유추한다. SDL은 특정 구현 언어에 의존하지 않는 표기라 스키마를 논의하는 공용어로 쓴다. code-first 구현 예는 [[NestJS-GraphQL]].

## Object 타입과 필드, 인자

객체 종류와 그 필드를 정의하는 기본 블록. 쿼리에서 그 타입에 대해 물을 수 있는 필드는 여기 정의된 것뿐이다. 모든 필드는 인자를 0개 이상 받고, 인자는 전부 이름으로 전달된다(위치 인자 없음). 선택 인자엔 기본값을 준다.

```graphql
type Starship {
  id: ID!
  length(unit: LengthUnit = METER): Float
}
```

Scalar를 반환하는 필드에도 인자를 줄 수 있다(서버측 변환 등).

## Scalar (내장 5종 + custom)

쿼리의 leaf 값이라 하위 선택이 없다. 내장 5종: Int(부호 있는 32비트 정수), Float(배정밀도), String(Unicode code point sequence), Boolean, ID(문자열로 직렬화되지만 human-readable이 아님을 의미, refetch나 캐시 키로 씀). UTF-8 같은 내부 인코딩은 서비스 구현의 선택이고, 와이어에서의 표현은 전송, 직렬화 포맷이 따로 정한다. custom scalar는 SDL에선 키워드만 두고 동작은 구현이 정의한다. graphql-js 계열의 계약은 함수 셋이다: serialize(백엔드 표현을 응답 JSON으로), parseValue(변수로 들어온 JSON을 백엔드 표현으로), parseLiteral(쿼리 문자열 안 인라인 리터럴의 AST 노드를 백엔드 표현으로). 입력이 변수와 인라인 리터럴 두 경로로 들어오므로 파서도 둘이고, 어느 함수에서든 던지면 검증 실패다.

```graphql
scalar Date
```

## Enum

허용된 값 집합으로 제한된 특수 scalar. 인자가 그 집합 중 하나인지 검증하고, 필드가 유한 집합 중 하나임을 타입으로 알린다.

```graphql
enum Episode { NEWHOPE EMPIRE JEDI }
```

구현이 내부에서 값을 뭘로 표현하든(첫 클래스 enum, 정수 매핑 등) 클라이언트에는 새지 않는다. 클라이언트는 값의 이름 문자열로만 다룬다.

## List와 Non-Null 수식자

기본은 nullable에 단수다. 수식자는 둘, List `[ ]`와 Non-Null `!`. 개별로도 조합으로도 쓰고 임의 중첩이 된다. Non-Null 출력은 서버 약속이라 resolver가 null을 내면 실행 에러, Non-Null 인자는 검증 규칙이라 null을 넘기면 validation 에러다.

| 표기 | 리스트 자체 | 원소 | 무엇이 에러 |
|---|---|---|---|
| `[String]` | nullable | nullable | 없음 (`null`, `[]`, `[null]` 모두 valid) |
| `[String!]` | nullable | non-null | `[..., null, ...]` |
| `[String]!` | non-null | nullable | `null` |
| `[String!]!` | non-null | non-null | `null`, `[..., null, ...]` |

- 기억법: 바깥 `!`은 리스트 자체가 null일 수 있나, 안쪽 `!`은 원소가 null일 수 있나.
- 빈 리스트 함정: `[String!]!`도 `[]`는 valid다. 비어있지 않음을 타입으로 강제할 방법은 없다.

## Interface

구현 타입이 반드시 포함해야 하는 필드 집합을 정의하는 추상 타입. Interface 필드와 인자는 같은 이름과 인자 타입으로 포함해야 하고, 반환 타입은 같거나 interface 반환 타입의 유효한 subtype이어야 한다. 구현체가 추가하는 인자는 optional이어야 한다.

```graphql
interface Character { id: ID! name: String! }
type Human implements Character { id: ID! name: String! totalCredits: Int }
```

- interface 필드를 쿼리하면 interface에 있는 필드만 물을 수 있고, 구현 타입 고유 필드는 inline fragment로 꺼낸다: `... on Human { totalCredits }`.
- interface가 interface를 implement할 수 있다. 단 자기 자신 구현이나 순환 참조는 금지.
- 공통 필드가 있다는 것만으로 interface를 만들지는 않는다. 클라이언트 개발자에게 의미 있는 공유 추상(행동)일 때만 도입한다 — 필드 이름이 우연히 겹치는 것과 도메인적으로 같은 것을 구분.

## Union

멤버 타입을 묶지만 공통 필드를 정의하지 않는다. 멤버는 반드시 구체 Object 타입이어야 한다(interface나 다른 union 불가).

```graphql
union SearchResult = Human | Droid | Starship
```

- 공통 필드가 없어 모든 필드 접근에 타입 조건 fragment(보통 inline)가 필요하고, 타입 구분은 `__typename` 메타 필드로 한다.
- 서버 구현 쪽에선 abstract 타입(union, interface 공통)이 반환한 값의 구체 타입을 알려줄 type resolver가 필요하다. graphql-tools, Apollo 계열 resolver 맵 관례는 `__resolveType(obj, context, info)` — 값의 필드 모양 등으로 판별해 타입 이름 문자열을 반환하고, null을 반환하면 실행 에러가 난다.
- interface와 차이: interface는 공통 필드를 보장한다. union은 자체로는 공통 필드가 없어 멤버 필드를 inline fragment로 꺼내지만, 멤버들이 같은 interface를 구현하면 `... on Character` 한 fragment로 공통 필드를 모아 조회할 수 있다. `__typename`은 클라이언트가 응답에서 타입을 구분하는 메타 필드일 뿐 필드 선택의 전제가 아니다.

## Input Object

구조화된 인자를 넘기는 타입. 특히 mutation에서 객체를 통째로 넘길 때 쓴다. `type` 대신 `input` 키워드.

```graphql
input ReviewInput { stars: Int! commentary: String }
type Mutation { createReview(review: ReviewInput!): Review }
```

Input Object의 필드는 다른 Input Object를 참조할 수 있지만(중첩 입력), 인자를 가질 수 없고 출력 위치에 쓸 수 없다. 반대로 Object, Interface, Union은 입력 위치에 쓸 수 없다. Scalar와 Enum은 입력과 출력 양쪽에 사용할 수 있다. 변수에는 Scalar, Enum, Input Object와 이들을 감싼 List, Non-Null 같은 input type만 쓸 수 있다.

## Root 타입 (Query, Mutation, Subscription)

스키마 진입점. Query는 필수, Mutation과 Subscription은 선택이다. 진입점이라는 특별함을 빼면 셋 다 평범한 Object 타입이고 필드도 똑같이 작동한다. `schema { query: ... mutation: ... }`로 루트 타입 이름을 바꿀 수 있다.

## Directive

`@`로 타입, 필드, 인자, 연산을 다르게 검증하거나 실행하게 하는 주석. 타입 시스템 directive(스키마 주석)와 실행 directive(연산에서 `@skip`, `@include`)로 나뉜다. 내장 `@deprecated(reason:)`는 FIELD_DEFINITION, ARGUMENT_DEFINITION, INPUT_FIELD_DEFINITION, ENUM_VALUE에 붙는다. directive도 필드처럼 인자와 기본값을 가진다 — `reason`의 기본값은 `"No longer supported"`. custom scalar에는 내장 `@specifiedBy(url:)`로 명세 URL을 다는 것이 스펙 권장(should)이다 — 사람이 읽는 포맷 명세 링크이며 검증을 강제하진 않는다. custom directive도 정의할 수 있고 처리는 custom scalar처럼 구현이 정한다. graphql-js 계열 서버는 custom 타입 시스템 directive를 자동 실행하지 않으므로, 스키마 구성 시점에 directive를 읽어 필드 resolver를 감싸거나 스키마를 고쳐 쓰는 transformer 패턴(@graphql-tools)을 쓴다.

```graphql
type User { name: String @deprecated(reason: "Use `fullName`.") }
```

문서화도 구분된다: `"""triple quote"""` description은 Markdown으로 쓰는, introspection으로 노출되는 사람이 읽는 문서화다(GraphiQL 등 도구에 표시, 이름이 자명하지 않은 모든 요소에 권장). `#` 주석은 무시된다.

## 흔한 실수

- interface나 union에서 구체 타입 고유 필드를 직접 물음. 타입 조건이 붙은 fragment(inline 또는 named)가 필요하다.
- union에서 `__typename`을 빠뜨려 멤버 구분 불가.
- `[T!]!`가 빈 리스트를 막는다고 오해. `[]`는 valid다.
- Object나 Input Object 하나를 input과 output에 겸용으로 씀. 구조가 같아도 각각 `type`과 `input`으로 정의한다. Scalar와 Enum은 양쪽에 쓸 수 있다.

## 면접 체크포인트

- List와 Non-Null 4조합의 null 허용 차이 (바깥 `!` vs 안쪽 `!`)
- interface vs union (공통 필드 보장 유무, `__typename` 분기), interface는 의미 있는 공유 추상일 때만 도입
- Non-Null이 출력에선 약속, 입력에선 검증 규칙인 이유
- Object 계열과 Input Object의 입력, 출력 위치가 왜 분리되는가
- ID scalar가 문자열이지만 human-readable이 아님을 의미하는 것

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Schema-Design|스키마 설계 (nullability 전략, breaking change, mutation 설계)]]
- [[GraphQL-Query-Language|쿼리 언어 (fragment, variable, __typename)]]
- [[GraphQL-Architecture-Map|전체 그림 지도]]

## 출처

- [graphql.org — Schema and Types](https://graphql.org/learn/schema/)
- [graphql.org — Queries and Mutations](https://graphql.org/learn/queries/)
- [GraphQL September 2025 Specification — Type System](https://spec.graphql.org/September2025/#sec-Type-System)
- [GraphQL September 2025 Specification — Objects implementing interfaces](https://spec.graphql.org/September2025/#sec-Objects)
- [Apollo Server — Unions and interfaces (__resolveType)](https://www.apollographql.com/docs/apollo-server/schema/unions-interfaces)
- [Apollo Server — Custom scalars (serialize, parseValue, parseLiteral)](https://www.apollographql.com/docs/apollo-server/schema/custom-scalars)
- [Apollo Server — Directives (custom directive transformer)](https://www.apollographql.com/docs/apollo-server/schema/directives)
