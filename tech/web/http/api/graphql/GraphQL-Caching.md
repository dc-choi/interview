---
tags: [web, graphql, api, caching, http]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Caching", "GraphQL 캐싱", "serving over HTTP", "persisted query", "global object id caching"]
---

# GraphQL 캐싱과 HTTP 전송

REST는 URL이 자원의 전역 유일 키라 HTTP 캐시가 그냥 된다. GraphQL은 단일 엔드포인트로 동작해 객체별 URL이 없어 그 키가 사라진다. 그래서 클라이언트 측 캐싱은 서버가 객체마다 전역 유일 id를 노출하고 그걸 키로 정규화 캐시를 쌓는 구조가 된다. HTTP 계층 캐싱은 GET과 persisted document로 CDN까지 태우는 별도 축이고, 전송 규약(GET vs POST, 응답 포맷)이 여기 얽힌다.

## URL 키의 상실

- REST에선 URL이 자원의 전역 유일 키라 클라이언트가 그걸로 HTTP 캐시를 만들고 두 자원이 같은지도 판단한다.
- GraphQL은 단일 엔드포인트라 객체별 URL이 없다. URL이라는 전역 유일 키가 사라지므로, API가 객체 식별자를 표준 방식으로 노출하는 것이 특정 유형의 캐싱(클라이언트 정규화 캐시)의 전제가 된다.

## 객체를 전역 유일 id로 식별

- 권장 패턴은 `id` 필드를 전역 유일 식별자로 예약하는 것이다. REST URL이 하던 전역 유일 키 역할을 id가 한다.
- 백엔드에 이미 전역 유일 id(UUID 등)가 있으면 그대로 노출하고, 없으면 GraphQL 계층이 만든다. 흔히 타입 이름을 id에 붙이고 base64로 인코딩해 불투명하게 만든다.
- 이 id는 global object identification의 `node(id)` 패턴과 이어진다(Node 인터페이스와 단건 refetch는 [[GraphQL-Pagination|Global Object Identification]]).

## 정규화 캐시 (클라이언트)

- 서버가 안정적인 객체 id를 주면 클라이언트는 응답 그래프를 객체 단위로 펼쳐, id를 키로 하는 평면 저장소에 담을 수 있다. 같은 객체가 여러 쿼리에 나와도 한 곳에 병합된다.
- 정규화 캐시와 `id`, `__typename` 조합 키는 Apollo Client, Relay, urql 같은 클라이언트 라이브러리 관례다. 공식이 권장하는 것은 단일 전역 유일 `id`이고, 서버가 id를 못 주면 클라이언트가 `__typename`과 타입 내 식별자로 직접 식별자를 만드는 대안을 든다.

## persisted document로 GET 캐싱

- GET은 query 연산에만 쓸 수 있고 HTTP 캐시나 CDN 엣지 캐시를 태울 수 있다. 하지만 복잡한 쿼리는 문자열이 길어 브라우저와 CDN의 URL 길이 한도를 넘는다.
- 그래서 식별된 문서를 서버에 저장해 두고(persisted document, automatic persisted queries, trusted document) 클라이언트가 전체 쿼리 대신 짧은 문서 id만 보낸다. 이걸로 GET 캐싱이 가능해진다.
- APQ의 구체 절차(쿼리 해시 전송, 미등록 시 재등록 핸드셰이크)는 Apollo 구현과 GraphQL-over-HTTP 스펙 쪽에 정의된다.

## HTTP 전송 규약 (GET vs POST)

GraphQL-over-HTTP는 아직 개발 중인 스펙 권고라 강제는 아니지만, 상호운용성 때문에 대개 이쪽으로 수렴한다.

- POST는 query와 mutation 둘 다 처리해야 하고, GET은 query 연산에만 쓸 수 있다. mutation은 POST 필수.
- POST 본문은 `Content-Type: application/json`에 `{ query, operationName, variables, extensions }`. query는 필수이고, 문서에 연산이 여럿이면 operationName도 필수.
- GET은 query를 쿼리스트링 `query` 파라미터에, variables는 JSON 문자열 파라미터로 싣는다.
- 응답은 `{ data, errors, extensions }`. 에러가 없으면 errors를 생략하고, 실행 전 에러면 data를 생략한다.
- 미디어 타입은 응답이 `application/graphql-response+json`(레거시는 `application/json`).

## 상태 코드

- `data`가 있고 null이 아니면 에러가 섞여 있어도 2xx다. HTTP에 부분 성공 코드가 없기 때문.
- validation 에러로 실행이 막히면 대개 400이다(레거시 `application/json`은 2xx로 답하기도 한다).
- `application/graphql-response+json`에선 유효한 요청이 실행에 실패하면 4xx나 5xx.

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

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Pagination|Global Object Identification (Node, node(id))]]
- [[GraphQL-Architecture-Map|전체 그림 지도]]
- [[GraphQL-Security|보안 (trusted document)]]
- [[REST|REST (URL 캐시)]]

## 출처

- [graphql.org — Caching](https://graphql.org/learn/caching/)
- [graphql.org — Serving over HTTP](https://graphql.org/learn/serving-over-http/)
