---
tags: [web, network, api, typescript, trpc, ts-rest, type-safety]
status: done
verified_at: 2026-09-03
category: "웹&네트워크(Web&Network)"
aliases: ["Type-Safe API", "tRPC", "ts-rest", "End-to-End Type Safety"]
---

# Type-Safe API (tRPC, ts-rest)

서버와 클라이언트가 **모두 TypeScript**일 때 별도 코드 생성 없이 서버 라우터 타입이나 계약 객체를 공유하는 패턴. tRPC와 ts-rest는 각각 **함수 호출형 RPC**와 **계약 우선 REST**라는 다른 철학을 갖는다.

## 왜 필요한가

OpenAPI, Protobuf는 다언어 환경에서 강력하지만 TypeScript 전용 풀스택에선 **추가 단계**. tRPC, ts-rest는 별도 코드 생성 없이:

| 문제 | 해법 |
|------|------|
| 백엔드 변경 시 클라이언트 타입 수동 동기화 | 서버 타입 직접 import |
| OpenAPI 스펙 작성, 동기화 부담 | 코드 자체가 계약 |
| 런타임 입력 검증 누락 | procedure나 계약에 런타임 validator 결합 |
| API 변경 시 컴파일 에러로 즉시 인지 | end-to-end 타입 추론 |

## tRPC — 함수 호출형 RPC

서버는 `t.router({ user: { getById: t.procedure.input(schema).query(...) } })` 형태로 정의, **router 타입을 export**. v11 클라이언트는 `createTRPCClient<AppRouter>({ links: [httpBatchLink({ url })] })`로 만들고 `trpc.user.getById.query({id:1})`를 함수처럼 호출한다. `createTRPCProxyClient`는 v10 이름이며 v11에서는 deprecated 별칭이다.

| 측면 | 의미 |
|------|------|
| HTTP 메서드 | 기본은 query → GET, mutation → POST. subscription은 SSE GET 또는 WebSocket이고, query도 설정에 따라 POST 가능 |
| 계약 형태 | TypeScript 타입 자체 (router type export) |
| 입출력 검증 | Zod, Typia, Yup 등의 validator를 procedure에 결합 |
| 클라이언트 | 함수 호출 — 자동완성, 타입 추론 100% |
| 배치 | `httpBatchLink`로 한 라운드트립에 여러 호출 합치기 |

장점: **DX 최강**. 코드 생성, OpenAPI 작성 부담 0. React Query 통합(`@trpc/react-query`)으로 캐싱, invalidation까지.

단점: 공식 클라이언트의 타입 추론은 **TypeScript 전용**이다. 다른 언어도 공개 HTTP RPC 규격에 맞춰 직접 호출할 수 있지만 공식 타입 추론이나 다언어 코드 생성은 없다. 표준 REST가 아니어서 외부 공개 API에는 추가 계약과 도구가 필요하고, 자원 중심 HTTP 시맨틱도 약하다.

## ts-rest — 계약 우선 REST

`initContract().router({...})`로 method, path, pathParams, body, responses를 명시한 **REST 계약**을 먼저 정의. 서버는 `@TsRestHandler(contract)` (NestJS) 또는 Express adapter로 계약을 구현, 클라이언트는 같은 계약을 import해서 `client.users.getById({ params: { id: 1 } })` 호출. 응답은 `result.status === 200` discriminated union 분기.

| 측면 | 의미 |
|------|------|
| HTTP 메서드 | 명시적 GET/POST/PUT/DELETE — REST 표준 |
| 계약 형태 | router 객체 (path, method, body, response 명시) |
| 검증 스키마 | 안정판 3.52.1은 Zod 3 중심. Standard Schema와 Typia 연동은 3.53.0-rc.1부터 가능 |
| 응답 패턴 | discriminated union — `status`로 분기, 각 분기마다 타입 |
| OpenAPI | 별도 공식 패키지 `@ts-rest/open-api`의 `generateOpenApi` 사용 |

장점: **REST 호환 + 타입 안전**. OpenAPI 문서를 생성해 외부 클라이언트 코드 생성에 활용할 수 있다. 표준 HTTP 시맨틱 유지.

단점: tRPC 대비 **약간 더 verbose** (계약 작성 단계). 다국어 클라이언트는 OpenAPI 경유.

## tRPC vs ts-rest 직접 비교

| 축 | tRPC | ts-rest |
|----|------|---------|
| 패러다임 | RPC (함수 호출) | REST (자원, 메서드) |
| 엔드포인트 | 설정한 base path 아래 procedure별 path | RESTful path |
| HTTP 시맨틱 | 자원 모델이 약함. query/mutation/subscription과 transport 설정 사용 | 강함 (메서드, 상태코드) |
| OpenAPI 생성 | 별도 어댑터 (`trpc-to-openapi`, 구 `trpc-openapi`는 아카이브) | 별도 공식 `@ts-rest/open-api` 패키지 |
| 다국어 클라 | HTTP 직접 호출 가능, 공식 타입 추론과 코드 생성 없음 | OpenAPI 경유 가능 |
| 응답 분기 | throw → catch | status discriminated union |
| 배치 호출 | `httpBatchLink` 내장 | ✗ (REST 그대로) |
| 학습 곡선 | 낮음 | 중간 |
| 적합 | 풀스택 TS 모놀리스, Next.js | 외부 공개, Mobile, OpenAPI 필요 |

**선택 기준**:
- 풀스택 TypeScript + 단일 팀 → **tRPC**
- 외부 클라이언트, OpenAPI, REST 표준 필요 → **ts-rest**
- Mobile (iOS, Android) 클라이언트 → **ts-rest** (OpenAPI codegen)

## NestJS 통합 패턴

| 도구 | 통합 방식 | NestJS 파이프라인 |
|------|----------|-----------------|
| **tRPC, Express adapter 직접 마운트** | `app.use('/trpc', createExpressMiddleware(...))` | Nest controller route가 아니므로 route-level Guard, Pipe, Interceptor가 적용되지 않음 |
| **ts-rest** | `@TsRestHandler(contract)` 데코레이터로 Controller 메서드 안에서 직접 | ✅ Guard, Pipe, Interceptor 그대로 적용 |

NestJS 환경에서는 controller 기반인 **ts-rest가 기존 AOP 메커니즘을 바로 재사용**한다 ([[NestJS-AOP-Interceptor]], [[NestJS-Guards]]). 위 tRPC 제약은 Express adapter를 `app.use()`로 직접 마운트한 방식의 특성이지 tRPC 자체의 필수 제약은 아니다. 통합 adapter가 Nest controller route를 만들면 해당 adapter의 지원 범위를 따진다.

## Typia, Zod 검증 결합

두 도구 모두 validator를 결합할 수 있지만 ts-rest의 지원 범위는 버전에 따라 다르다. tRPC v11은 Typia를 공식 예제로 제공한다. ts-rest 안정판 3.52.1은 Zod 3 중심이고, Typia의 `createValidate`가 구현하는 Standard Schema 연동은 3.53.0-rc.1부터다.

| 라이브러리 | 특징 |
|-----------|------|
| **Zod** | 런타임 스키마 정의, 풍부한 생태계, tRPC 표준 |
| **Typia** | TS 타입에서 검증 함수 생성. 성능 차이는 스키마와 입력, 실행 환경에 따라 측정 |
| **Yup, Joi** | 레거시 |

자세한 비교: [[Runtime-Validation-Libraries]].

Typia의 강점은 **TS 타입을 그대로 검증** — 별도 스키마 정의 없이 `typia.assert<User>(input)`. 단, 컴파일러 플러그인 설정 필요.

## 흔한 실수

- **tRPC를 계약 없이 외부 공개 API에** — 다언어에서 공식 타입 추론과 코드 생성이 없다. 별도 규격화 또는 ts-rest, OpenAPI 검토
- **ts-rest 응답 status 분기 누락** — discriminated union이라 `if (result.status === 200)` 필수
- **검증 없는 procedure** — 입력 신뢰. Zod, Typia 강제
- **Nest에 직접 마운트한 tRPC Express middleware를 route-level Guard로 보호하려고** — controller route가 아니므로 적용되지 않는다. tRPC middleware나 Nest 통합 adapter의 지원 범위를 확인
- **응답 schema만 선언하고 런타임 검증했다고 착각** — ts-rest의 Express/serverless adapter는 `responseValidation`, Nest adapter는 `validateResponses`로 활성화하며 둘 다 기본값은 `false`다
- **tRPC + REST 혼재 무계획** — 같은 도메인을 두 스타일 둠. 도메인별로 한 가지 선택
- **ts-rest path param 타입을 number로** — URL은 string. `z.coerce.number()` 또는 명시 변환

## 면접 체크포인트

- tRPC와 ts-rest 모두가 풀스택 TS 환경의 OpenAPI 대안인 이유
- 함수 호출형 RPC (tRPC) vs 계약 우선 REST (ts-rest) 패러다임 차이
- end-to-end 타입 추론이 가능한 메커니즘 — 서버 라우터 타입을 클라이언트가 import
- Nest에 tRPC Express adapter를 직접 마운트할 때 route-level Guard, Pipe가 적용되지 않는 이유
- ts-rest의 discriminated union 응답 패턴
- Typia가 Zod보다 빠른 이유 (컴파일 타임 검증 코드 생성)
- 외부 공개 API에서 tRPC가 추가 계약과 도구를 요구하는 이유
- OpenAPI 생성 — ts-rest 공식 별도 패키지 vs tRPC 별도 어댑터

## 출처
- [NestJS 기반 API 기술별 구현 예시 — 학습 메모]
- [tRPC, Migrate from v10 to v11](https://trpc.io/docs/migrate-from-v10-to-v11)
- [tRPC, HTTP RPC Specification](https://trpc.io/docs/rpc)
- [tRPC, Input and Output Validators](https://trpc.io/docs/server/validators)
- [tRPC, Express Adapter](https://trpc.io/docs/server/adapters/express)
- [trpc-openapi archive notice and successor](https://github.com/trpc/trpc-openapi)
- [ts-rest, Contract Overview](https://ts-rest.com/contract/overview)
- [ts-rest, OpenAPI](https://ts-rest.com/openapi)
- [ts-rest releases](https://github.com/ts-rest/ts-rest/releases)
- [ts-rest, Express Response Validation](https://ts-rest.com/server/express)
- [ts-rest, Nest Server](https://ts-rest.com/server/nest)
- [ts-rest Nest options source, `validateResponses`](https://github.com/ts-rest/ts-rest/blob/main/libs/ts-rest/nest/src/lib/ts-rest-options.ts)
- [Typia, validate and Standard Schema](https://typia.io/docs/validators/validate/)
- [NestJS, Middleware](https://docs.nestjs.com/middleware)

## 관련 문서
- [[REST|REST]]
- [[GraphQL|GraphQL]]
- [[gRPC|gRPC]]
- [[API-Comparison|REST vs GraphQL vs gRPC vs tRPC vs ts-rest]]
- [[Runtime-Validation-Libraries|Typia, Zod, Ajv 검증 라이브러리]]
- [[NestJS-GraphQL|NestJS GraphQL]]
- [[NestJS-Microservices|NestJS Microservices (gRPC Transport)]]
