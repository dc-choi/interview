---
tags: [web, graphql, api, query-language, introspection]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Query Language", "GraphQL 쿼리 언어", "fragment", "variable", "directive", "introspection"]
---

# GraphQL 쿼리 언어와 introspection

쿼리는 원하는 데이터의 모양이고, 응답은 그 모양을 그대로 되돌려준다. 그 모양을 재사용하고(fragment) 동적으로 만드는(variable, directive) 기능, 그리고 스키마 자신을 질의하는 introspection이 쿼리 언어의 축이다. 타입 시스템은 [[GraphQL-Schema-Types|타입 시스템]]에 있다.

## 필드와 중첩 선택

루트 연산 타입(Query 등)에서 시작해 필요한 필드를 leaf(scalar, enum)까지 선택한다. 응답은 쿼리와 같은 모양이다. 필드가 Object를 반환하면 그 아래로 하위 선택을 이어가고, 연관 객체를 한 요청으로 훑어 REST의 여러 라운드트립을 하나로 줄인다. 단건이든 리스트든 쿼리 모양은 같고 어느 쪽인지는 스키마가 정한다. validation 규칙도 양방향이다: scalar, enum이 아닌 타입을 반환하는 필드는 selection set이 필수고, 반대로 leaf 필드에 selection set을 붙여도 invalid다.

## 인자

REST가 엔드포인트에 인자 한 벌만 주는 것과 달리, 모든 필드와 중첩 객체가 각자 인자를 가질 수 있다. scalar 필드에도 인자를 줄 수 있는데, 예를 들어 길이 단위 변환을 클라이언트마다가 아니라 서버에서 한 번 구현하는 식이다(`height(unit: FOOT)`).

## alias

결과 키는 필드명과 같고 인자를 포함하지 않는다. 그래서 같은 필드를 다른 인자로 두 번 조회하면 키가 충돌한다. alias가 결과 키 이름을 바꿔 이를 푼다.

```graphql
query {
  empireHero: hero(episode: EMPIRE) { name }
  jediHero: hero(episode: JEDI) { name }
}
```

## fragment

재사용 가능한 필드 선택 집합. 복잡한 데이터 요구를 조각으로 쪼개 여러 쿼리(특히 UI 컴포넌트별)에서 `...이름`으로 펼친다. fragment는 연산에 선언된 변수도 쓸 수 있다.

```graphql
query { left: hero(episode: EMPIRE) { ...f } right: hero(episode: JEDI) { ...f } }
fragment f on Character { name appearsIn }
```

inline fragment(`... on Type`)는 interface나 union의 구체 타입 필드를 꺼내는 별개 용법이다([[GraphQL-Schema-Types|union 처리]]). named fragment도 항상 타입 조건이 붙으므로 같은 방식으로 구체 타입 필드를 꺼내는 데 쓸 수 있다. fragment는 자기 자신을 직접적으로든 간접적으로든 참조할 수 없다 — 순환 spread는 결과가 무한히 커질 수 있어 validation이 거른다.

## operation 타입과 이름

연산 타입은 query, mutation, subscription이다. query에 한해 shorthand로 키워드를 생략할 수 있고, mutation과 subscription은 항상 필요하다. 이름을 붙이려면 연산 타입도 명시해야 한다. 이름은 프로덕션에서 디버깅과 트레이싱을 쉽게 하고, 한 문서에 여러 연산을 보낼 때는 필수다.

## variable

- 동적 값을 쿼리 문자열에 직접 끼워 넣지 않는다. 사용자 입력으로 쿼리를 문자열 조립하면 안 된다. 대신 값을 별도 변수 딕셔너리로 뺀다.
- 3단계: 정적 값을 `$이름`으로 교체, 연산이 받는 변수로 선언, 전송 시 `{ 이름: 값 }` 딕셔너리로 전달.
- 변수 선언에는 타입 뒤에 기본값을 붙일 수 있다: `($episode: Episode = JEDI)`. 모든 변수에 기본값이 있으면 변수를 아예 안 넘기고 호출할 수 있고, 딕셔너리로 넘긴 값이 기본값을 덮는다.
- 변수를 선언하려면 shorthand가 아니라 `query`, `mutation`, `subscription` 중 연산 타입을 명시해야 한다. 연산 이름은 선택 사항이지만 한 문서에 연산이 여러 개면 실행할 이름이 필요하다. 변수 타입은 Scalar, Enum, Input Object와 이들을 감싼 List, Non-Null 같은 input type만 된다.
- Non-Null 인자에는 보통 Non-Null 변수를 전달한다. 다만 nullable 변수에 Non-Null 기본값이 있거나 인자와 input field 위치에 기본값이 있으면 nullable 변수를 허용한다. 어떤 경우든 runtime에 명시적인 `null`을 보내면 Non-Null 위치에서 오류다.

## directive (실행)

클라이언트가 필드나 fragment 포함에 붙여 실행을 바꾸는 주석. 스펙이 정의하는 핵심 실행 directive는 정확히 둘이다: `@include(if: Boolean!)`은 참일 때만 그 필드를 포함하고, `@skip(if: Boolean!)`은 참이면 건너뛴다. learn 페이지는 spec-compliant 서버가 반드시 지원해야 한다고 명시하고(스펙 본문 자체는 should provide로 권고), 인자 타입은 스펙이 `Boolean!` non-null로 정의한다(learn 페이지는 `Boolean`으로 느슨히 표기). 구현은 새 directive를 정의해 실험적 기능을 얹을 수 있다(정의 문법과 타입 시스템 directive는 [[GraphQL-Schema-Types|타입 시스템]]).

```graphql
query Hero($withFriends: Boolean!) {
  hero { name friends @include(if: $withFriends) { name } }
}
```

## __typename

어느 지점에서든 그 위치 Object 타입의 이름을 주는 메타 필드. union이나 interface에서 클라이언트가 타입을 구분하는 데 쓴다. `__`로 시작하는 이름은 전부 예약이고(다른 예약 필드로 `__schema`, `__type`), Object, Interface, Union 출력 타입에서 조회할 수 있다.

## introspection

- 스키마가 무엇을 제공하는지 스키마 자신에게 묻는 시스템. GraphQL 개발 도구를 떠받친다.
- `__schema`는 query 루트에 항상 있고 모든 타입을 나열한다. `__type(name: "Droid")`로 특정 타입의 name, kind, fields, description을 본다. kind는 `__TypeKind` enum 값(OBJECT, INTERFACE 등)이다. non-null이나 list 같은 래퍼 타입은 이름이 없어 `ofType`로 내부 타입을 캔다.
- introspection 시스템 자체도 `__Schema`, `__Type`, `__Field`, `__InputValue`, `__EnumValue`, `__Directive` 같은 이중 밑줄 타입들로 스키마에 들어 있다. 그래서 introspection을 introspection할 수도 있다.

```graphql
query { __schema { types { name } } }
query { __type(name: "Droid") { name kind fields { name } } }
```

- 이 타입 정보로 문서 브라우저나 풍부한 IDE 경험을 만든다.
- 보안: private API에선 런타임 introspection이 대개 불필요하고(필요한 연산은 빌드 타임에 굽는다), 공격 표면을 줄이려 프로덕션에서 끄는 게 흔하다. depth, breadth, alias 제한, 순환 거부와 cost 분석, 타임아웃, safe-listing 같은 넓은 보안 전략의 일부다([[GraphQL-Security|보안]]).

## 흔한 실수

- 같은 필드를 다른 인자로 조회하며 alias를 안 씀. 결과 키가 충돌한다.
- 사용자 입력으로 쿼리 문자열을 조립함. 변수를 써야 한다.
- 변수 타입에 output Object를 지정. Scalar, Enum, Input Object만 된다.
- non-null 인자에 nullable 변수를 무조건 금지하거나 허용함. 변수와 위치의 기본값 예외까지 확인해야 한다.
- union이나 interface에서 `__typename` 없이 타입 구분 시도.
- 프로덕션에서 introspection을 방치해 스키마 전체를 노출.

## 면접 체크포인트

- alias가 왜 필요한가(결과 키 충돌)
- 변수를 쓰는 이유(문자열 조립 금지)와 허용 타입(Scalar, Enum, Input Object)
- `@include`, `@skip`이 스펙 강제 실행 directive라는 것
- `__typename`과 introspection의 관계, introspection을 프로덕션에서 끄는 이유
- fragment로 UI 요구를 조각내 재사용

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Schema-Types|타입 시스템 (__typename, inline fragment)]]
- [[GraphQL-Security|보안 (introspection 차단)]]
- [[GraphQL-Architecture-Map|전체 그림 지도 (parse, validate)]]

## 출처

- [graphql.org — Queries and Mutations](https://graphql.org/learn/queries/)
- [graphql.org — Validation](https://graphql.org/learn/validation/)
- [graphql.org — Introspection](https://graphql.org/learn/introspection/)
- [GraphQL September 2025 Specification — Variables](https://spec.graphql.org/September2025/#sec-Variables)
- [GraphQL September 2025 Specification — Variable usage validation](https://spec.graphql.org/September2025/#sec-All-Variable-Usages-Are-Allowed)
- [GraphQL September 2025 Specification — Directives](https://spec.graphql.org/September2025/#sec-Type-System.Directives)
