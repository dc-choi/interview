---
tags: [web, graphql, api, caching, http]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Caching", "GraphQL 캐싱", "serving over HTTP", "persisted query", "global object id caching"]
---

# GraphQL 캐싱과 HTTP 전송

REST는 URL이 자원의 전역 유일 키라 HTTP 캐시가 그냥 된다. GraphQL은 단일 엔드포인트로 동작해 객체별 URL이 없어 그 키가 사라진다. 그래서 클라이언트 측 캐싱은 서버가 객체마다 전역 유일 id를 노출하고 그걸 키로 정규화 캐시를 쌓는 구조가 된다. HTTP 계층 캐싱은 GET과 persisted document로 CDN까지 태우는 별도 축이고, 전송 규약(GET vs POST, 응답 포맷)이 여기 얽힌다. 서버 안에는 필드 단위 cache hint로 응답 캐시를 굴리는 축이 하나 더 있다. 캐시가 아예 안 되는 것은 아니다 — 쿼리 파라미터를 받는 REST처럼 파라미터화된 요청을 받는 API만큼은 캐시할 수 있고, 서버와 클라이언트 라이브러리에 캐싱 기능이 내장된 경우도 많다.

## URL 키의 상실

- REST에선 URL이 자원의 전역 유일 키라 클라이언트가 그걸로 HTTP 캐시를 만들고 두 자원이 같은지도 판단한다.
- GraphQL은 단일 엔드포인트라 객체별 URL이 없다. URL이라는 전역 유일 키가 사라지므로, API가 객체 식별자를 표준 방식으로 노출하는 것이 특정 유형의 캐싱(클라이언트 정규화 캐시)의 전제가 된다.

## 객체를 전역 유일 id로 식별

- 권장 패턴은 `id` 필드를 전역 유일 식별자로 예약하는 것이다. REST URL이 하던 전역 유일 키 역할을 id가 한다.
- 백엔드에 이미 전역 유일 id(UUID 등)가 있으면 그대로 노출하고, 없으면 GraphQL 계층이 만든다. 흔히 타입 이름을 id에 붙이고 base64로 인코딩해 불투명하게 만든다.
- 이 id는 global object identification의 `node(id)` 패턴과 이어진다(Node 인터페이스와 단건 refetch는 [[GraphQL-Pagination|Global Object Identification]]).
- 기존 API와 병행할 때: 기존 API가 타입별 id를 쓴다면 그 id를 별도 필드(예: previousApiId)로 함께 노출한다. GraphQL 클라이언트는 전역 유일 id를, 기존 API와 붙어야 하는 클라이언트는 그 필드를 쓴다. 반대로 기존 API를 GraphQL로 대체하는 상황에서 다른 필드는 다 같은데 id 의미만 바뀌어 혼란스럽다면, id를 전역 유일 필드로 쓰지 않고 클라이언트 유도 식별자(`__typename` 조합)로 가는 선택도 있다.

## 정규화 캐시 (클라이언트)

- 서버가 안정적인 객체 id를 주면 클라이언트는 응답 그래프를 객체 단위로 펼쳐, id를 키로 하는 평면 저장소에 담을 수 있다. 같은 객체가 여러 쿼리에 나와도 한 곳에 병합된다.
- 정규화 캐시와 `id`, `__typename` 조합 키는 Apollo Client, Relay, urql 같은 클라이언트 라이브러리 관례다. 공식이 권장하는 것은 단일 전역 유일 `id`이고, 서버가 id를 못 주면 클라이언트가 `__typename`과 타입 내 식별자로 직접 식별자를 만드는 대안을 든다.

## 서버 응답 캐시 (필드 단위 cache hint)

- 응답 모양을 클라이언트가 정하므로 캐시 수명도 고정일 수 없다. 필드마다 maxAge와 scope(PUBLIC, PRIVATE) 힌트를 두고, 응답 전체는 포함된 필드 중 가장 제한적인 값으로 계산한다: maxAge는 최솟값, 하나라도 PRIVATE면 PRIVATE, 하나라도 0이면 응답을 캐시하지 않는다.
- 기본값이 보수적이다: 루트 필드와 비스칼라 반환 필드는 0, 스칼라 필드는 부모를 상속한다. 힌트를 명시하지 않으면 아무것도 캐시되지 않는 구조다. 전역 기본 maxAge를 올려 전부 캐시 가능으로 만드는 옵션도 있지만, 부모 값을 물려받는 inheritMaxAge 인자가 생긴 뒤로는 필드 단위 상속과 명시가 권장 경로다.
- 힌트는 스키마의 @cacheControl directive로 정적으로 주거나 resolver 런타임에 동적으로 준다(동적이 정적을 덮는다). Apollo 계열 관례이고 스펙이 아니다.
- 계산된 정책은 Cache-Control 응답 헤더로 나간다(캐시 가능하면 max-age와 scope, 불가면 no-store). 조건은 단일 응답과 에러 없음이다. CDN이 이 헤더를 존중하게 구성하고, CDN은 GET만 캐시하므로 아래 persisted query GET과 결합한다.
- 전체 응답 캐시 플러그인은 계산된 정책대로 응답을 인메모리, Redis 같은 백엔드에 통째로 저장한다. PRIVATE 응답은 세션 식별 함수가 있어야 캐시되며, 로그인과 비로그인 사용자의 캐시가 분리된다.
- 응답 단위 캐시의 약점은 무효화다: 세밀한 invalidation이 안 되므로 캐시 키에 연산 이름 같은 접두사를 설계해 두고, mutation 이벤트 때 접두사 패턴으로 배치 삭제한다(Redis에선 블로킹인 KEYS 대신 SCAN 순회). 안정적인 데이터는 긴 TTL로, 자주 변하는 데이터는 이벤트 기반 eviction으로 나눈다. 키가 연산별로 충분히 유일하지 않으면 다른 쿼리나 사용자의 응답이 새어 나갈 수 있다.

## persisted document로 GET 캐싱

- GET은 query 연산에만 쓸 수 있고 HTTP 캐시나 CDN 엣지 캐시를 태울 수 있다. 하지만 복잡한 쿼리는 문자열이 길어 브라우저와 CDN의 URL 길이 한도를 넘는다.
- 그래서 식별된 문서를 서버에 저장해 두고(persisted document, automatic persisted queries, trusted document) 클라이언트가 전체 쿼리 대신 짧은 문서 id만 보낸다. 이걸로 GET 캐싱이 가능해진다.
- APQ의 SHA-256 해시 전송과 미등록 시 재전송 handshake는 Apollo가 정의한 protocol extension이다. 순서는 해시만 전송 → PERSISTED_QUERY_NOT_FOUND 에러 → 쿼리 전문과 해시를 함께 재전송해 등록 → 이후 해시만으로 성공. 그래서 유니크 쿼리마다 최소 한 번은 전문이 전송된다. GraphQL-over-HTTP은 `extensions`를 구현 확장 지점으로 둘 뿐 APQ 절차를 표준화하지 않는다. 다른 persisted 또는 trusted document 방식과 호환된다고 가정하지 않는다. 용도 구분도 중요하다: APQ는 성능 장치라 누구든 새 쿼리를 등록할 수 있고, 허용 목록으로 실행 자체를 막는 보안 게이트는 trusted document 쪽이다([[GraphQL-Security|보안]]).

## HTTP 전송 규약 (GET vs POST)

GraphQL-over-HTTP은 Stage 2 draft라 아직 최종 표준이 아니다. 구현할 때는 사용하는 draft revision과 server framework 동작을 함께 고정한다.

- POST는 query와 mutation 둘 다 처리해야 하고, GET은 query 연산에만 쓸 수 있다. mutation은 POST 필수.
- POST 본문은 `Content-Type: application/json`에 `{ query, operationName, variables, extensions }`. query는 필수이고(파라미터 이름과 달리 mutation을 포함한 모든 연산을 담는 GraphQL 문서 소스다), 문서에 연산이 여럿이면 operationName도 필수. `Content-Type` 헤더가 빠진 요청엔 서버가 4xx로 응답해야 한다.
- GET은 query를 쿼리스트링 `query` 파라미터에, variables는 JSON 문자열 파라미터로 싣는다.
- 응답은 `{ data, errors, extensions }`. 에러가 없으면 errors를 생략하고, 실행 전 에러면 data를 생략한다.
- 미디어 타입은 응답이 `application/graphql-response+json`(레거시는 `application/json`). 클라이언트는 `Accept` 헤더로 `application/graphql-response+json`을 보내고, 레거시 서버 호환이 필요하면 `application/json`을 함께 나열한다(`application/graphql-response+json, application/json;q=0.9`처럼 새 타입 우선). 인코딩 명시가 없으면 양방향 모두 utf-8로 가정한다.
- 새 미디어 타입의 의의: 프록시, 게이트웨이 같은 중간자도 에러를 JSON으로 응답할 수 있지만 `application/graphql-response+json`으로 내지는 않는다. 이 타입이면 non-2xx 상태여도 GraphQL 응답으로 안전하게 파싱할 수 있다.
- 응답이 대부분 텍스트(JSON)라 GZIP, deflate, brotli로 압축이 매우 잘 된다. 프로덕션 서비스는 압축을 켜고 클라이언트가 `Accept-Encoding: gzip`을 보내도록 권장한다.

## 상태 코드

- JSON이나 GraphQL document를 parsing하지 못하면 현행 draft는 400을 권고한다. 지원하지 않는 HTTP 메서드(PUT, DELETE, mutation을 GET으로)는 405, 못 알아듣는 Content-Type(text/plain 등)은 구현에 따라 415로 나온다.
- 잘못된 request parameter, validation 실패, operation 선택 실패, variable coercion 실패처럼 실행 전 request error에는 422를 권고한다. 단 공식 디버깅 가이드는 400을 1차 권고로 두고 422를 대부분의 경우 스펙이 권하지 않는 구현 특이 코드로 분류한다 — 문서와 draft revision에 따라 서술이 갈리는 지점.
- 실행이 시작된 뒤 생긴 field error는 GraphQL response의 `errors`로 표현한다. 2026-07-13 Stage 2 draft는 status-code 본문에서 `data`와 `errors`가 함께 있으면 294를 권고하지만 field-error 예시는 200을 권고하므로 현재 문서 자체에도 불일치가 있다. Production 계약은 media type, server 구현과 고정한 draft revision으로 테스트한다.
- GraphQL response를 만들 수 없는 transport, authentication, overload 실패에는 의미에 맞는 4xx 또는 5xx를 사용한다. `application/json` legacy client의 동작은 별도 호환성 테스트가 필요하다.
- 디버깅 요령: 응답의 errors 배열과 data 유무를 본다. data가 있으면 문서는 유효하고 런타임 예외(잘못된 입력, 접근 거부, 서버 버그) 쪽이고, data가 아예 없으면 validation 단계 실패 쪽이다. 레거시 서버가 완전 실패에도 200 + errors로 응답하는 경우에 특히 유용하다.

## 흔한 실수

- GraphQL도 URL HTTP 캐시가 그냥 된다고 가정.
- `data`가 있는데 필드 에러가 있다고 5xx를 기대(부분 성공은 2xx).
- 전역 유일 id 없이 클라이언트 정규화 캐시를 기대.
- mutation을 GET으로 보냄.
- 긴 쿼리를 GET에 그대로 실어 URL 한도 초과(persisted document로 해결).

## 면접 체크포인트

- GraphQL에서 HTTP URL 캐시가 왜 어려운가(단일 엔드포인트, 객체별 URL 부재)
- 전역 유일 id가 클라이언트 정규화 캐시의 전제인 이유
- persisted document가 GET 캐싱을 어떻게 살리나
- `data`가 있으면 에러가 있어도 2xx인 이유(부분 성공)
- 필드 단위 cache hint에서 응답 정책이 가장 제한적인 값으로 계산되는 이유(클라이언트가 응답 모양을 정하므로)

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Pagination|Global Object Identification (Node, node(id))]]
- [[GraphQL-Architecture-Map|전체 그림 지도]]
- [[GraphQL-Security|보안 (trusted document)]]
- [[Content-Availability-System-Design|Federation subgraph의 서버 캐시와 장애 격리 사례]]
- [[REST|REST (URL 캐시)]]

## 출처

- [graphql.org — Caching](https://graphql.org/learn/caching/)
- [graphql.org — Serving over HTTP](https://graphql.org/learn/serving-over-http/)
- [graphql.org — Performance](https://graphql.org/learn/performance/)
- [graphql.org — Common GraphQL over HTTP Errors](https://graphql.org/learn/debug-errors/)
- [Apollo Server — Server-side caching (@cacheControl)](https://www.apollographql.com/docs/apollo-server/performance/caching)
- [Apollo Server — Response cache eviction](https://www.apollographql.com/docs/apollo-server/performance/response-cache-eviction)
- [Apollo Server — Automatic persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq)
- [Apollo Server — Hardening for production (APQ vs safelisting 구분)](https://www.apollographql.com/docs/apollo-server/security/hardening-for-production)
- [Apollo Server — Cache control plugin (defaultMaxAge, inheritMaxAge)](https://www.apollographql.com/docs/apollo-server/api/plugin/cache-control)
- [GraphQL-over-HTTP Stage 2 Draft](https://graphql.github.io/graphql-over-http/draft/)
- [Apollo Router — Automatic Persisted Queries](https://www.apollographql.com/docs/graphos/routing/operations/apq)
