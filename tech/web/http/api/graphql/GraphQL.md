---
tags: [web, network, graphql, api, http]
status: index
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL"]
---

# GraphQL

GraphQL은 Facebook이 만든 **API 쿼리 언어이자, 데이터에 대해 정의한 타입 시스템으로 쿼리를 실행하는 서버사이드 런타임**이다. 클라이언트가 필요한 데이터의 모양을 직접 명세하면 서버가 그 모양대로 응답한다. REST의 오버페칭, 언더페칭, 여러 라운드트립 문제를 한 번의 요청으로 해결하려는 접근.

**스펙이지 특정 구현체가 아니다** — 2015년 스펙이 오픈소스로 공개된 뒤 여러 언어에서 서버 구현 라이브러리와 클라이언트 라이브러리로 각각 구현되어 있다. 특정 데이터베이스나 스토리지 엔진에 묶이지 않고 기존 코드와 데이터 위에 얹힌다 (조합 계층으로서의 위치는 [[GraphQL-Architecture-Map|지도]] 그림 1).

## 심화 문서 (graphql/ 클러스터)

- [[GraphQL-Architecture-Map|전체 그림 지도]] — 요청 라이프사이클(parse→validate→execute→응답), N+1과 운영 관심사의 자리
- [[GraphQL-Schema-Types|타입 시스템]] — scalar, enum, interface, union, input, List와 Non-Null 수식자
- [[GraphQL-Schema-Design|스키마 설계]] — nullability 전략, 버전 없는 진화, mutation 모양, 네이밍 컨벤션, 비즈니스 로직 계층
- [[GraphQL-Query-Language|쿼리 언어와 introspection]] — fragment, variable, directive, `__typename`, introspection
- [[GraphQL-Pagination|페이지네이션]] — offset vs cursor, Relay Connection, Global Object Identification
- [[GraphQL-Caching|캐싱과 HTTP 전송]] — 정규화 캐시, persisted document, GET vs POST, 상태 코드
- [[GraphQL-Security|보안과 인가]] — demand control, introspection 차단, 인가는 비즈니스 로직 계층
- [[GraphQL-File-Uploads|파일 업로드]] — multipart 관례의 리스크 5가지, signed URL 패턴
- [[GraphQL-Federation|Federation]] — subgraph, gateway, schema composition, 도입 판단, 거버넌스

## 핵심 명제

- **단일 엔드포인트** — `/graphql` 하나로 모든 쿼리, 뮤테이션 수신
- **클라이언트가 응답 모양을 결정** — 필요한 필드만 요청 → 응답 크기 최소화
- **타입 시스템(Schema)** — 서버가 자기가 제공하는 데이터 모양을 스키마로 명세 → 자동 문서화, 타입 안전성
- **단일 요청, 여러 리소스** — 중첩 객체, 연관 엔티티를 한 번의 쿼리로 가져옴

## 기본 구성 요소

### Schema
서버가 제공하는 타입과 필드를 정의한다.
```graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}
type Post {
  id: ID!
  title: String!
  author: User!
}
```

### Query / Mutation / Subscription
- **Query**: 데이터 조회 (REST의 GET)
- **Mutation**: 데이터 변경 (POST/PUT/DELETE)
- **Subscription**: long-lived 요청으로 실시간 증분 업데이트. 전송은 스펙이 정하지 않아 서버가 고르며 보통 WebSocket이나 SSE (자세히는 [[NestJS-GraphQL-Subscription|NestJS Subscription]])

### Resolver
각 필드를 어떻게 가져올지 정의하는 함수. 스키마와 데이터 소스를 연결. graphql-js 계열의 관례적 시그니처는 `(parent, args, context, info)` — parent는 상위 필드 resolver가 반환한 객체, args는 필드 인자, context는 요청 스코프 공유 객체로 인증된 사용자, DB 접근 같은 것을 나른다 (예: `me` 필드는 context의 인증 정보로, `name` 필드는 그 user id로 DB 조회). info는 현재 연산과 스키마에 대한 필드 메타 정보로 고급 케이스에서만 쓴다.

- resolver를 생략하면 많은 라이브러리가 parent에서 같은 이름의 프로퍼티를 읽어 반환한다(기본 resolver, 프로퍼티가 함수면 호출해 그 결과를 쓴다). 단순 필드마다 resolver를 손으로 쓸 필요가 없는 이유.
- context 객체는 서버 통합의 context 함수가 요청마다 새로 만들어(헤더 같은 요청 정보 접근) 그 연산의 모든 resolver가 같은 인스턴스를 공유한다. DataLoader 인스턴스를 요청 스코프로 두는 자리가 여기다. resolver가 context를 파괴적으로 수정하지 않는 것이 계약이다.
- context 함수에서 던지면 그 요청 전체가 거부된다(기본 500, GraphQLError의 `extensions.http`로 401 같은 상태 코드 지정 가능). 인증 실패를 실행 전에 통째로 끊는 자리다 — 실행 중 필드 단위로 판단되어 partial response가 되는 인가 실패와 대비된다([[GraphQL-Security|인증 vs 인가]]). 단 전면 거부는 공개 접근이 전혀 없는 API에만 적합하고, 공개 필드가 섞여 있으면 필드 수준으로 끊어 부분 응답을 살린다.
- resolver 반환값은 타입 시스템이 스키마 계약에 맞게 변환한다(scalar coercion). 서버 내부 표현이 정수여도 스키마가 enum이면 enum 값 이름으로 나가는 식.
- resolver는 Promise 같은 비동기 값을 반환할 수 있고, 실행 엔진이 완료를 기다렸다가 하위 필드로 내려간다. 쿼리 쪽은 비동기 여부를 모른다.

## 장점

- **오버페칭 제거** — `{ user { id, name } }`만 요청하면 그 두 필드만 응답. 모바일, 저대역 환경에서 유리
- **언더페칭 제거** — 한 요청으로 user + posts + author를 한꺼번에 가져옴 → REST의 N번 요청 → 1번
- **깊은 객체 구조에 강함** — 4~5단계 중첩에서 특히 유용
- **프론트엔드 유연성** — 백엔드 DTO 변경 없이 쿼리만 조정. 모바일, 웹, 다른 클라이언트가 같은 엔드포인트를 다르게 사용
- **자동 문서화** — 스키마 자체가 명세 → GraphiQL, Apollo Studio 등으로 IDE-like 탐색
- **타입 안전성** — 컴파일 단계에서 클라이언트 코드가, codegen을 쓰면 서버 resolver 구현까지 스키마와 일치하는지 검증 가능
- **스키마 기반 모킹** — 스키마가 타입 계약이라 mock 응답을 자동 생성할 수 있다(타입별 기본값 또는 커스텀). 백엔드 완성 전에 프론트가 병렬로 개발하는 근거

## 단점

### HTTP 캐싱이 어렵다
실무에서 mutation과 복잡한 query를 `POST /graphql` 단일 엔드포인트로 보내는 경우가 많아 URL 기반 캐시(`Cache-Control`, CDN)를 그대로 쓰기 어렵다. 다만 GraphQL over HTTP는 query에 GET을 허용할 수 있고, persisted query를 쓰면 CDN 캐싱 여지도 생긴다. Apollo, Relay 같은 클라이언트 사이드 캐시로 보완하는 경우도 많다.

### 복잡한 에러 핸들링
한 쿼리에 여러 리소스가 섞여 있을 때 일부만 실패하면 응답이 `{ data: {...}, errors: [...] }` 형태로 부분 성공/부분 실패. 클라이언트가 필드별로 에러를 파악해야 함. REST의 단순한 4xx/5xx 모델보다 까다롭다.

### 쿼리 복잡도 폭발
악의적, 실수로 깊은 중첩이나 큰 리스트를 요청하면 서버가 N+1 폭발하거나 타임아웃. **Query depth limit, complexity limit, timeout, persisted queries**를 사전에 설계해야 한다.

### N+1 문제
중첩 필드 resolver가 각 부모마다 DB를 한 번씩 호출하면 1+N 쿼리. **DataLoader 패턴**(요청을 배치, 캐싱)으로 해결 필수.

### 백엔드 구현 복잡도
스키마 정의 + resolver + DataLoader + 권한 + 캐싱 인프라까지 셋업 비용이 REST보다 크다. 가벼운 서비스에는 오버엔지니어링.

### 파일 업로드 제한
JSON 기반이라 multipart 업로드는 별도 명세(graphql-multipart-request) 필요. REST에 비해 번거로움. 리스크와 signed URL 우회 패턴은 [[GraphQL-File-Uploads|파일 업로드]].

### 클라이언트 의존성
백엔드가 필드 타입을 바꾸면 클라이언트 쿼리도 갱신해야 함. 모바일 앱처럼 강제 업데이트가 어려운 환경에선 위험.

### MSA에서의 복잡도
여러 마이크로서비스를 GraphQL 한 게이트웨이로 묶으려면 Federation, Schema Stitching이 필요. 추가 설계, 운영 비용. 구조와 도입 판단은 [[GraphQL-Federation|Federation]].

## 언제 쓸까

**적합한 경우**:
- 다양한 클라이언트(웹, iOS, Android)가 다른 데이터 모양을 요구
- 깊은 중첩 객체를 자주 다루는 도메인(소셜, 이커머스 카탈로그)
- 프론트엔드가 빠르게 진화하고 백엔드 의존을 줄이고 싶을 때

**부적합한 경우**:
- 단순 CRUD 위주 내부 API
- 강력한 HTTP 캐싱, CDN이 핵심 성능 전략인 공개 API
- 파일 업로드, 바이너리 스트리밍 위주 서비스
- 작은 팀에서 운영 부담을 늘리고 싶지 않을 때

## REST와의 차이 (요약)

| 항목 | REST | GraphQL |
|---|---|---|
| 엔드포인트 | 자원별 다수 | 단일 `/graphql` |
| 응답 모양 | 서버가 결정 | 클라이언트가 결정 |
| 오버/언더페칭 | 발생 | 거의 없음 |
| HTTP 캐싱 | 잘 동작 | 어려움 |
| 에러 모델 | 상태 코드 | `errors` 배열 |
| 타입 시스템 | 없음(OpenAPI 별도) | 내장 |
| 학습 곡선 | 낮음 | 높음 |

## 면접 체크포인트

- GraphQL이 스펙이라는 구분 — 특정 언어, 데이터베이스, 스토리지에 묶이지 않는 이유
- 단일 엔드포인트가 주는 장점 vs HTTP 캐싱 손실 트레이드오프
- N+1 문제와 DataLoader 패턴의 역할
- 쿼리 복잡도 제한이 왜 필요한가 (Depth Limit, Complexity Limit)
- 부분 성공/부분 실패 응답을 클라이언트가 어떻게 처리해야 하는가
- 작은 내부 API에 GraphQL을 도입하면 안 되는 이유
- Federation이 MSA에서 어떤 역할을 하는가

## 출처
- [graphql.org — Introduction to GraphQL](https://graphql.org/learn/introduction/)
- [graphql.org — Execution](https://graphql.org/learn/execution/)
- [Apollo Server — Resolvers (context 초기화, 기본 resolver)](https://www.apollographql.com/docs/apollo-server/data/resolvers)
- [Apollo Server — Context and contextValue](https://www.apollographql.com/docs/apollo-server/data/context)
- [Apollo Server — Mocking](https://www.apollographql.com/docs/apollo-server/testing/mocking)
- [Apollo Server — Authentication and authorization](https://www.apollographql.com/docs/apollo-server/security/authentication)
- [요즘IT — GraphQL 도입 시 주의할 점](https://yozm.wishket.com/magazine/detail/2113/)
- [velog @mdy0102 — GraphQL을 사용하며 느낀 장단점](https://velog.io/@mdy0102/GraphQL을-사용하며-느낀-장단점)

## 관련 문서
- [[GraphQL-Architecture-Map|GraphQL 전체 그림 지도 (요청 라이프사이클, N+1과 운영 관심사의 자리)]]
- [[Content-Availability-System-Design|콘텐츠 가용성 조회 시스템 설계 사례 (Federation, Redis, Outbox, OpenSearch)]]
- [[REST|REST, RESTful API]]
- [[gRPC|gRPC]]
- [[API-Comparison|REST vs GraphQL vs gRPC 비교]]
