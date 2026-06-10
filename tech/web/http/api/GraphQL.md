---
tags: [web, network, graphql, api, http]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL"]
---

# GraphQL

GraphQL은 Facebook이 만든 **API 쿼리 언어이자 런타임**이다. 클라이언트가 필요한 데이터의 모양을 직접 명세하면 서버가 그 모양대로 응답한다. REST의 오버페칭·언더페칭·여러 라운드트립 문제를 한 번의 요청으로 해결하려는 접근.

## 핵심 명제

- **단일 엔드포인트** — `/graphql` 하나로 모든 쿼리·뮤테이션 수신
- **클라이언트가 응답 모양을 결정** — 필요한 필드만 요청 → 응답 크기 최소화
- **타입 시스템(Schema)** — 서버가 자기가 제공하는 데이터 모양을 스키마로 명세 → 자동 문서화·타입 안전성
- **단일 요청, 여러 리소스** — 중첩 객체·연관 엔티티를 한 번의 쿼리로 가져옴

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
- **Subscription**: 실시간 푸시(WebSocket 기반)

### Resolver
각 필드를 어떻게 가져올지 정의하는 함수. 스키마와 데이터 소스를 연결.

## 장점

- **오버페칭 제거** — `{ user { id, name } }`만 요청하면 그 두 필드만 응답. 모바일·저대역 환경에서 유리
- **언더페칭 제거** — 한 요청으로 user + posts + author를 한꺼번에 가져옴 → REST의 N번 요청 → 1번
- **깊은 객체 구조에 강함** — 4~5단계 중첩에서 특히 유용
- **프론트엔드 유연성** — 백엔드 DTO 변경 없이 쿼리만 조정. 모바일·웹·다른 클라이언트가 같은 엔드포인트를 다르게 사용
- **자동 문서화** — 스키마 자체가 명세 → GraphiQL·Apollo Studio 등으로 IDE-like 탐색
- **타입 안전성** — 컴파일 단계에서 클라이언트 코드가 스키마와 일치하는지 검증 가능

## 단점

### HTTP 캐싱이 어렵다
모든 요청이 `POST /graphql`로 들어가서 URL 기반 캐시(`Cache-Control`·CDN)가 무력화된다. Apollo·Relay 같은 클라이언트 사이드 캐시로 보완해야 함.

### 복잡한 에러 핸들링
한 쿼리에 여러 리소스가 섞여 있을 때 일부만 실패하면 응답이 `{ data: {...}, errors: [...] }` 형태로 부분 성공/부분 실패. 클라이언트가 필드별로 에러를 파악해야 함. REST의 단순한 4xx/5xx 모델보다 까다롭다.

### 쿼리 복잡도 폭발
악의적·실수로 깊은 중첩이나 큰 리스트를 요청하면 서버가 N+1 폭발하거나 타임아웃. **Query depth limit · complexity limit · timeout · persisted queries**를 사전에 설계해야 한다.

### N+1 문제
중첩 필드 resolver가 각 부모마다 DB를 한 번씩 호출하면 1+N 쿼리. **DataLoader 패턴**(요청을 배치·캐싱)으로 해결 필수.

### 백엔드 구현 복잡도
스키마 정의 + resolver + DataLoader + 권한 + 캐싱 인프라까지 셋업 비용이 REST보다 크다. 가벼운 서비스에는 오버엔지니어링.

### 파일 업로드 제한
JSON 기반이라 multipart 업로드는 별도 명세(graphql-multipart-request) 필요. REST에 비해 번거로움.

### 클라이언트 의존성
백엔드가 필드 타입을 바꾸면 클라이언트 쿼리도 갱신해야 함. 모바일 앱처럼 강제 업데이트가 어려운 환경에선 위험.

### MSA에서의 복잡도
여러 마이크로서비스를 GraphQL 한 게이트웨이로 묶으려면 Federation·Schema Stitching이 필요. 추가 설계·운영 비용.

## 언제 쓸까

**적합한 경우**:
- 다양한 클라이언트(웹·iOS·Android)가 다른 데이터 모양을 요구
- 깊은 중첩 객체를 자주 다루는 도메인(소셜·이커머스 카탈로그)
- 프론트엔드가 빠르게 진화하고 백엔드 의존을 줄이고 싶을 때

**부적합한 경우**:
- 단순 CRUD 위주 내부 API
- 강력한 HTTP 캐싱·CDN이 핵심 성능 전략인 공개 API
- 파일 업로드·바이너리 스트리밍 위주 서비스
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

- 단일 엔드포인트가 주는 장점 vs HTTP 캐싱 손실 트레이드오프
- N+1 문제와 DataLoader 패턴의 역할
- 쿼리 복잡도 제한이 왜 필요한가 (Depth Limit, Complexity Limit)
- 부분 성공/부분 실패 응답을 클라이언트가 어떻게 처리해야 하는가
- 작은 내부 API에 GraphQL을 도입하면 안 되는 이유
- Federation이 MSA에서 어떤 역할을 하는가

## 출처
- [요즘IT — GraphQL 도입 시 주의할 점](https://yozm.wishket.com/magazine/detail/2113/)
- [velog @mdy0102 — GraphQL을 사용하며 느낀 장단점](https://velog.io/@mdy0102/GraphQL을-사용하며-느낀-장단점)

## 관련 문서
- [[REST|REST · RESTful API]]
- [[gRPC|gRPC]]
- [[API-Comparison|REST vs GraphQL vs gRPC 비교]]
