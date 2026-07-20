---
tags: [nodejs, graphql, apollo-server, api]
status: done
verified_at: 2026-07-20
category: "OS & Runtime"
aliases: ["Apollo Server", "아폴로 서버", "@apollo/server"]
---

# Apollo Server

오픈소스, spec-compliant GraphQL 서버. 특정 GraphQL 클라이언트 프레임워크에 묶이지 않고 동작하며, Apollo Client와의 결합은 매끄럽지만 선택 사항이다. Node.js에서 GraphQL API를 서빙하는 대표 구현 중 하나로, [[NestJS-GraphQL|NestJS의 @nestjs/graphql]]이 백엔드 드라이버로 쓰는 서버이기도 하다.

## 버전 지형

- v5가 현행 안정 버전. v4 대비 동작 변경보다 의존성과 지원 버전 갱신이 중심이라, 공식 문서가 v4와 v5를 함께 다룬다. Node.js는 v20.0.0 이상을 요구한다.
- v3는 2024년 10월 EOL. v3에서 v5로 곧장 올라가는 마이그레이션 가이드가 제공된다.
- v3 → v4의 구조 재편: apollo-server, apollo-server-express, apollo-server-core 같은 패키지 무리가 단일 코어 `@apollo/server`로 통합됐고, 자체 유지하던 프레임워크 통합(fastify, hapi, koa, lambda 등)은 중단되어 커뮤니티 유지의 `@as-integrations/*` 네임스페이스로 넘어갔다. 현재 공식 유지 통합은 Express(v4, v5)뿐이고 나머지는 커뮤니티 유지라 공식 지원이 없다. 플러그인은 `@apollo/server/plugin/*` deep import로 쓴다.
- 에러 모델도 v4에서 정리됐다: ApolloError와 내장 에러 클래스(AuthenticationError 등)가 제거되고, graphql 패키지의 GraphQLError에 코드 문자열을 `extensions.code`로 싣는 방식이 됐다 — top-level error의 extensions code 관례([[GraphQL-Schema-Design|에러 채널]])의 구현이다. Apollo가 자체 인식하는 코드는 `ApolloServerErrorCode` enum으로 제공되고, 그 밖의 UNAUTHENTICATED 같은 값은 임의 custom 문자열이다.
- 프로덕션 지향 기본값 전환(v4 이후): CSRF 방지 기본 활성(simple request CSRF 표면 대응, [[GraphQL-File-Uploads|CSRF 리스크]]), HTTP batching 기본 비활성(옵트인), 인메모리 캐시가 unbounded에서 bounded로, 로컬 landing page는 내장 Apollo Sandbox, subgraph에서 usage reporting 기본 비활성.
- usage reporting 텔레메트리는 APOLLO_KEY와 graph ref 환경변수가 있으면 자동 활성화된다(subgraph 제외). 프라이버시 기본값도 보수적이다: 변수와 헤더는 기본 미전송이고 authorization, cookie, set-cookie 헤더는 설정과 무관하게 항상 차단되며, 에러 상세는 기본 마스킹된다. 필드 단위 계측은 확률 샘플링(예: 1%)으로 수집하고 보고 수치를 역수 배로 보정해 전량을 추정한다.
- 스키마 등록은 두 경로다: 런타임 자동 보고(명시 옵트인, 기동 시 스키마 해시를 heartbeat로 등록, 다중 인스턴스의 동시 보고를 피하려 0에서 10초 랜덤 지연)와 CI에서 Rover CLI로 publish. federation을 쓰는 그래프는 런타임 보고가 지원되지 않아 publish 경로를 쓴다.
- v4 → v5의 실질 변경: Express 통합(`expressMiddleware`)이 코어에서 분리되어 별도 패키지 `@as-integrations/express4`(Express 5용은 `@as-integrations/express5`)로 나갔고, `startStandaloneServer`는 내부 Express 의존을 버리고 Node 내장 HTTP 서버로 직접 돈다. graphql.js 최소 버전은 16.11.0. 플러그인의 HTTP 클라이언트가 node-fetch에서 Node 내장 fetch로 바뀌어 프록시 환경 설정 경로도 달라졌다 — 대상은 usage와 schema reporting, subscription callback처럼 서버가 GraphOS 쪽으로 내보내는 요청들이다.
- variable coercion 오류의 상태 코드가 기본 400이 됐다(`status400ForVariableCoercionErrors` 기본 true, v3 동작 복원, 레거시 200이 필요하면 명시적으로 false). request error 상태 코드 서술이 문서 간에 갈리는 지점([[GraphQL-Caching|상태 코드]])에서 Apollo 현행 기본값은 400 쪽이라는 데이터 포인트다.

## 최소 구성

- 필요한 패키지는 둘이다: `graphql`(GraphQL 코어 알고리즘 구현)과 `@apollo/server`(HTTP 요청을 GraphQL 연산으로 바꿔 실행하는 서버 본체).
- 부팅 흐름: SDL 문자열 typeDefs와 resolver 맵을 `ApolloServer` 생성자에 넘기고, `startStandaloneServer`로 리슨한다. 서버 URL로 접속하면 Apollo Sandbox(GraphOS Explorer 웹 IDE의 계정 불필요 모드)가 떠서 바로 쿼리를 실행해 볼 수 있다.
- 프로덕션 환경에선 introspection이 기본으로 꺼진다 — 그래서 introspection에 의존하는 Sandbox 같은 도구도 프로덕션 landing page에선 동작하지 않는다 ([[GraphQL-Security|보안]]).
- 스키마 기반 모킹은 @graphql-tools/mock의 addMocksToSchema로 스키마를 감싸 켠다. 기본은 mock이 resolver를 덮고, preserveResolvers를 켜면 실제 resolver를 살린 채 빈 곳만 모킹한다. custom scalar는 기본 mock 값이 없어 명시적으로 정의해야 한다.
- 확장은 플러그인으로 한다: 이벤트가 두 갈래다. 서버 수명 이벤트(serverWillStart 등)는 기동 시 한 번, 요청 수명 이벤트는 요청마다 돈다. 후자는 중첩 패턴이다 — requestDidStart가 요청 시작 시 불리고 그 안에서 parsingDidStart, validationDidStart, executionDidStart 같은 하위 단계 핸들러를 반환해 요청 로직을 한 곳에 캡슐화한다. 훅 이름이 parse, validate, execute 단계([[GraphQL-Architecture-Map|지도]])와 그대로 대응해 로깅, 메트릭 계측을 꽂는 자리다. 각 단계엔 end 훅이 있어 그 단계 종료 후 에러를 받는다(validate의 end 훅은 그 단계의 모든 에러 배열을 받는다).
- 전용 헬스체크 엔드포인트는 없다. GraphQL 수준 체크는 `{__typename}` 같은 trivial 쿼리를 GET으로 날린다 — 프로세스 생존만이 아니라 GraphQL 실행 능력까지 확인된다. 이 GET은 Content-Type이 없어 CSRF 방지에 걸리므로 `apollo-require-preflight: true` 헤더를 동봉한다. HTTP 수준 체크만 필요하면 프레임워크에 항상 성공하는 별도 GET 핸들러를 둔다.
- 통합 테스트는 executeOperation으로 HTTP 없이 요청 파이프라인만 태운다 — 테스트용 contextValue를 직접 주입하고, parse, validate, execute 에러도 던져지지 않고 응답 body(`singleResult.errors`)로 온다. 전송 중립 경계의 실용 이점이다. HTTP 계층과 context 함수의 실제 동작은 supertest 같은 진짜 HTTP e2e로만 검증된다.

## 에러 처리

- 에러 코드 어휘(`ApolloServerErrorCode`)가 요청 라이프사이클의 실패 단계를 그대로 드러낸다: GRAPHQL_PARSE_FAILED(문법 오류), GRAPHQL_VALIDATION_FAILED(스키마 불일치), BAD_USER_INPUT(인자 값 오류), OPERATION_RESOLUTION_FAILURE(연산이 여럿인데 operationName 미지정), BAD_REQUEST(파싱 시도 전 오류), PERSISTED_QUERY_NOT_FOUND와 NOT_SUPPORTED(APQ), INTERNAL_SERVER_ERROR(그 외 기본). UNAUTHENTICATED, FORBIDDEN은 관례적 custom 코드다.
- `extensions.http`로 에러의 HTTP 상태와 헤더를 지정한다. 기본값은 resolver 에러 200(부분 성공 원칙, [[GraphQL-Caching|상태 코드]]), context 함수 에러 500.
- `formatError` 훅이 클라이언트로 나가기 전 에러를 재작성한다 — 내부 정보를 흘리지 않는 에러 마스킹([[GraphQL-Security|보안]])의 구현 자리. 스택트레이스는 NODE_ENV가 production이나 test면 응답에서 기본 제외된다.

## 캐시 백엔드

- 서버의 캐시 소비처 셋 — APQ 저장소, 응답 캐시 플러그인, RESTDataSource — 이 같은 KeyValueCache 인터페이스(get, TTL 있는 set, delete)를 공유한다. 기본은 약 30MiB로 제한된 인메모리 LRU이고, 다중 인스턴스에선 Keyv 어댑터로 Redis(단일, Sentinel, Cluster)나 Memcached 같은 외부 백엔드를 물린다.
- 외부 캐시 장애 대비로 캐시 에러를 캐시 미스로 강등하는 래퍼(ErrorsAreMissesCache)를 둘 수 있다 — 백엔드가 죽어도 원본 조회 경로로 폴백해 캐시가 단일 장애점이 되지 않는다.
- 별도로 documentStore가 있다: 파싱과 검증을 통과한 연산의 DocumentNode를 LRU(약 30MiB 기본)에 캐시해, 같은 연산이 다시 오면 parse와 validate 단계를 건너뛴다([[GraphQL-Architecture-Map|지도]]의 앞 두 단계). 이 캐시 때문에 custom validation 규칙은 연산과 스키마에만 의존해야 한다 — 검증 결과가 요청 간에 재사용되므로 요청별 상태에 의존하면 안 된다.

## RESTDataSource

- REST 백엔드를 감싸는 공식 유지 데이터 소스 클래스. baseURL을 두고 get, post 같은 헬퍼로 호출한다. 사용자 입력으로 URL을 조립할 땐 encodeURIComponent로 URI 주입을 막는다.
- 캐시가 2계층이다: 같은 요청 생명주기 안에서 동시 GET, HEAD 요청을 method와 URL 키로 중복 제거하고(인스턴스 내부), REST 응답의 HTTP 캐시 헤더(cache-control TTL)를 존중해 결과를 캐시한다. 클라이언트 쪽에선 잃는 URL 기반 HTTP 캐싱이 서버 뒤편의 REST 호출 계층에선 그대로 유효한 셈이다 ([[GraphQL-Caching|캐싱]]).
- 그래서 인스턴스는 요청마다 새로 만든다 — 아니면 캐시하면 안 되는 응답까지 요청 간에 캐시된다. 다중 서버 배포에서 캐시를 공유하려면 외부 캐시 백엔드를 물린다. willSendRequest로 인증 헤더를 얹고, resolveURL로 런타임에 대상 URL을 정한다.
- 배치 API가 없는 REST 엔드포인트에는 내부에 DataLoader를 쓸 수 있지만, 배칭이 캐싱 효과를 해칠 수 있어 캐시되지 않는 요청에 한정하는 것이 권장이다.

## Subscription 지원 형태

- 코어가 subscription을 내장하지 않는다(non-federated 기준). graphql-ws의 WebSocketServer를 같은 http.Server에 붙여 스키마를 공유하는 별도 전송 계층으로 세운다 — `startStandaloneServer`로는 안 되고 expressMiddleware 통합이 필요하며, drain 플러그인으로 HTTP와 WebSocket 양쪽을 우아하게 종료한다. federated 구성에선 Router의 subscription callback 방식도 있다 — subgraph가 Router가 지정한 URL로 업데이트를 HTTP 콜백으로 밀어 Router와 subgraph 사이에 상시 연결이 필요 없다. 대신 이 구현은 요청 라이프사이클을 우회해 플러그인 훅이 불리지 않고 메트릭과 트레이싱 지원이 없다. 다중 인스턴스 전파와 PubSub 선택 문제는 [[NestJS-GraphQL|NestJS Subscription 정본]].
- WebSocket 인증은 HTTP 헤더가 아니라 핸드셰이크의 connectionParams로 전달한다. useServer의 context 함수는 구독 요청당 1회 실행되고(이벤트 발행마다가 아니다), onConnect에서 자격 검증에 실패하면 연결을 거부한다.

## 배치 형태

- standalone 서버로 단독 실행하거나(프로토타이핑에 적합, 프로덕션은 프레임워크 통합 권장), Express(MERN 스택 포함), Fastify 등 Node.js 프레임워크에 통합해 실행. 프레임워크 통합에선 standalone이 자동 처리하던 CORS와 본문 파싱을 직접 배선하고(cors, express.json), `server.start()`를 await한 뒤에 미들웨어로 넘긴다. standalone의 기본 CORS는 와일드카드라 어느 origin이든 쿠키 없이 요청하고 읽을 수 있다 — 공개 API엔 맞지만 쿠키 인증이나 사내 API면 통합 쪽에서 origin을 명시하고 credentials를 켠다([[CORS|CORS 정본]]). 같은 앱에서 기존 REST 라우트와 공존할 수 있다. TLS는 관례대로 앞단 로드밸런서나 프록시에서 종료하고, 인프로세스 종료가 필요하면 Node의 https 모듈 위에 미들웨어를 얹는다([[HTTPS-TLS|HTTPS와 TLS]]).
- AWS Lambda, Azure Functions, Cloudflare Workers 같은 서버리스 플랫폼에서도 실행. 서버리스 통합에선 `server.start()`를 명시적으로 부르지 않는다 — 핸들러 생성 함수가 시작을 내부에서 관리한다(프레임워크 통합의 start 선행 계약과 대비). Lambda의 event와 context는 GraphQL context 함수의 인자로 전달된다.
- federation 아키텍처에서는 subgraph 컴포넌트로 앉는다 ([[GraphQL-Federation|Federation]]).
- 종료는 stop()이 조율한다: drain이 새 연결 수신을 멈추고 idle 연결을 닫고, 활성 연결은 idle해지는 대로 닫다가 유예 기간(기본 10초)이 지나면 강제 종료한다. 그 뒤 새 연산을 차단하고 종료 훅을 실행한다. standalone은 drain이 자동이고 프레임워크 통합은 drain 플러그인을 명시적으로 단다. 기본으로 SIGINT, SIGTERM을 잡아 stop()을 부른 뒤 시그널을 재전송한다(test 환경과 서버리스에선 비활성).
- 통합의 구조는 어댑터다: 코어는 전송 중립의 HTTPGraphQLRequest와 Response만 처리하고(`executeHTTPGraphQLRequest`는 던지지 않으며 에러도 응답 객체로 낸다), 통합은 프레임워크 요청과 이 표준 형태 사이의 번역만 맡는다. CSRF 방지가 POST의 `content-type: application/json` 요구를 전제하므로 통합의 본문 파싱이 이를 지켜야 한다.
- CSRF 방지의 동작은 preflight 강제다: 브라우저가 preflight 없이 보낼 수 있는 모양의 요청을 거부한다. POST는 `application/json` Content-Type이 그 증거가 되고, Content-Type 없는 GET은 비어 있지 않은 `X-Apollo-Operation-Name`이나 `Apollo-Require-Preflight` 커스텀 헤더를 요구한다 — 커스텀 헤더가 요청을 simple request에서 벗어나게 해 preflight를 태운다 ([[GraphQL-File-Uploads|simple request CSRF 표면]]).

## 설계 지향

- 빠른 셋업으로 바로 시작하고, 기능은 필요해질 때 점진적으로 얹는다(incremental adoption).
- 데이터 소스, 빌드 도구에 대한 범용 호환과 프로덕션 사용 전제의 안정성을 표방한다.

## 면접 체크포인트

- Apollo Server가 클라이언트 프레임워크와 독립이라는 것 (Apollo Client 필수 아님)
- standalone vs 프레임워크 통합 vs 서버리스, 배치 형태 선택지
- federation에서 subgraph로 동작하는 위치

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[NestJS-GraphQL|NestJS GraphQL (Apollo 드라이버 통합)]]
- [[GraphQL-Federation|Federation (subgraph, gateway)]]
- [[Hono|Hono (다른 Node.js 웹 프레임워크)]]

## 출처

- [Apollo Server — Introduction](https://www.apollographql.com/docs/apollo-server)
- [Apollo Server — Get started](https://www.apollographql.com/docs/apollo-server/getting-started)
- [Apollo Server — Migrating from Apollo Server 4](https://www.apollographql.com/docs/apollo-server/migration)
- [Apollo Server — Migrating from Apollo Server 3](https://www.apollographql.com/docs/apollo-server/migration-from-v3)
- [Apollo Server — Error handling](https://www.apollographql.com/docs/apollo-server/data/errors)
- [Apollo Server — Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions)
- [Apollo Server — Fetching from REST (RESTDataSource)](https://www.apollographql.com/docs/apollo-server/data/fetching-rest)
- [Apollo Server — Integrations index](https://www.apollographql.com/docs/apollo-server/integrations/integration-index)
- [Apollo Server — Building integrations](https://www.apollographql.com/docs/apollo-server/integrations/building-integrations)
- [Apollo Server — MERN stack tutorial](https://www.apollographql.com/docs/apollo-server/integrations/mern)
- [Apollo Server — Build and run queries (Sandbox, landing page)](https://www.apollographql.com/docs/apollo-server/workflow/build-run-queries)
- [Apollo Server — Operation request format (CSRF prevention)](https://www.apollographql.com/docs/apollo-server/workflow/requests)
- [Apollo Server — Mocking](https://www.apollographql.com/docs/apollo-server/testing/mocking)
- [Apollo Server — Integration testing (executeOperation)](https://www.apollographql.com/docs/apollo-server/testing/testing)
- [GraphOS — Explorer (Sandbox와의 관계)](https://www.apollographql.com/docs/graphos/platform/explorer)
- [Apollo Server — Configuring cache backends](https://www.apollographql.com/docs/apollo-server/performance/cache-backends)
- [Apollo Server — Configuring CORS](https://www.apollographql.com/docs/apollo-server/security/cors)
- [Apollo Server — Terminating SSL](https://www.apollographql.com/docs/apollo-server/security/terminating-ssl)
- [Apollo Server — Proxy configuration](https://www.apollographql.com/docs/apollo-server/security/proxy-configuration)
- [Apollo Server — Deploying with AWS Lambda](https://www.apollographql.com/docs/apollo-server/deployment/lambda)
- [Apollo Server — Metrics and logging](https://www.apollographql.com/docs/apollo-server/monitoring/metrics)
- [Apollo Server — Health checks](https://www.apollographql.com/docs/apollo-server/monitoring/health-checks)
- [Apollo Server — API reference: ApolloServer](https://www.apollographql.com/docs/apollo-server/api/apollo-server)
- [Apollo Server — Usage reporting plugin](https://www.apollographql.com/docs/apollo-server/api/plugin/usage-reporting)
- [Apollo Server — Schema reporting plugin](https://www.apollographql.com/docs/apollo-server/api/plugin/schema-reporting)
- [Apollo Server — Drain HTTP server plugin](https://www.apollographql.com/docs/apollo-server/api/plugin/drain-http-server)
- [Apollo Server — Subscription callback plugin](https://www.apollographql.com/docs/apollo-server/api/plugin/subscription-callback)
- [Apollo Server — Building plugins](https://www.apollographql.com/docs/apollo-server/integrations/plugins)
