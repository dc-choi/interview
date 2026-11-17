---
tags: [web, http, api]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["API", "api 인덱스"]
---

# API (api 인덱스)

API 스타일 선택부터 실무 컨벤션, 문서화까지. 상위 인덱스는 [[HTTP|HTTP & API]].

## API 스타일
- [x] [[REST|REST, RESTful API]]
- [x] [[GraphQL|GraphQL 클러스터 (실행 구조, 타입, 스키마, 쿼리, 에러, 페이지네이션, 테스트, 보안, Federation)]] — `api/graphql/`
- [x] [[gRPC|gRPC (HTTP/2, Protobuf tag와 varint, 4가지 통신 방식, MSA 내부 통신)]]
- [x] [[Connect-RPC|Connect RPC (단일 Protobuf 계약, 브라우저/curl/gRPC 호환, streaming 제한)]]
- [x] [[API-Comparison|REST vs GraphQL vs gRPC vs tRPC vs ts-rest 비교 (선택 가이드, BFF 패턴)]]
- [x] [[Type-Safe-API|tRPC, ts-rest (TS end-to-end 타입 안전 API)]]

## API 실무
- [x] [[API-Documentation|API 문서화 (OpenAPI, Swagger, Code-First vs Spec-First)]]
- [x] [[API-Conventions|API 실무 컨벤션 인덱스 (ISO 8601, camelCase, Envelope, 페이지네이션, 버저닝)]]
- [x] [[API-Conventions-Format|시간(UTC, ISO 8601), JSON 키 네이밍, URI 컨벤션]]
- [x] [[API-Conventions-Response|에러 응답, 페이지네이션, 필터링과 정렬, Envelope 응답 구조]]
- [x] [[API-Conventions-Operations|버저닝, HTTP 메서드, 인증 헤더, 헬스 체크, 흔한 실수, 면접 체크포인트]]
- [x] [[API-Versioning|API 버저닝의 HTTP 표면 (URI, Header, Media Type, 폐기)]]
- [x] [[Async-Job-API|비동기 작업 API (202 Accepted, 상태 리소스, 폴링과 웹훅, 취소와 보존)]]

## 문제 신호로 찾기

패턴 이름보다 그 패턴이 푸는 문제를 먼저 알아본다.

- 동작마다 URL이 늘어난다: [[REST#Resource URI 설계|리소스 URI 설계]]
- 컬렉션이 커서 한 번에 돌려줄 수 없다: [[API-Conventions-Response#페이지네이션|페이지네이션]], [[Pagination-Optimization|페이징 성능 최적화]]
- 클라이언트가 일부 항목이나 일부 필드만 필요하다: [[API-Conventions-Response#필터링, 정렬, 검색|필터링, 정렬, 검색]], [[REST#API 성능 개선 기법|필드 선택]]
- 같은 요청이 재시도로 반복될 수 있다: [[Idempotency#POST를 멱등하게 만드는 패턴|POST를 멱등하게 만드는 패턴]], [[Idempotency-Key|멱등성 키]]
- 클라이언트마다 필요한 데이터 모양이 다르다: [[Microservice-Edge-and-Composition-Patterns#BFF|BFF]]
- 서비스가 늘어 클라이언트가 위치와 인증을 각각 알아야 한다: [[Microservice-Edge-and-Composition-Patterns#API Gateway 경계|API Gateway 경계]]
- 작업이 한 요청 안에 끝나지 않는다: [[Async-Job-API|비동기 작업 API]]
- 쓰이고 있는 API를 바꿔야 한다: [[Backward-Compatibility-Design|하위 호환성 설계]], [[API-Versioning-Design|API 버저닝 설계]]
