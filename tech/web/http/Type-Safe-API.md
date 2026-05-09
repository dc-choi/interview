---
tags: [web, network, api, typescript, trpc, ts-rest, type-safety]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Type-Safe API", "tRPC", "ts-rest", "End-to-End Type Safety"]
---

# Type-Safe API (tRPC · ts-rest)

서버와 클라이언트가 **모두 TypeScript**일 때 타입 정의를 코드 생성·계약 파일 없이 **공유 타입**으로 직접 잇는 패턴. tRPC와 ts-rest가 양대 솔루션이며, 각각 **함수 호출형 RPC**와 **계약 우선 REST**라는 다른 철학을 갖는다.

## 왜 필요한가

OpenAPI·Protobuf는 다언어 환경에서 강력하지만 TypeScript 전용 풀스택에선 **추가 단계**. tRPC·ts-rest는 별도 코드 생성 없이:

| 문제 | 해법 |
|------|------|
| 백엔드 변경 시 클라이언트 타입 수동 동기화 | 서버 타입 직접 import |
| OpenAPI 스펙 작성·동기화 부담 | 코드 자체가 계약 |
| 런타임 입력 검증 누락 | Zod·Typia로 자동 검증 |
| API 변경 시 컴파일 에러로 즉시 인지 | end-to-end 타입 추론 |

## tRPC — 함수 호출형 RPC

서버는 `t.router({ user: { getById: t.procedure.input(schema).query(...) } })` 형태로 정의, **router 타입을 export**. 클라이언트는 `createTRPCProxyClient<AppRouter>`로 `trpc.user.getById.query({id:1})` 함수 호출하듯 사용.

| 측면 | 의미 |
|------|------|
| HTTP 메서드 | query → GET, mutation → POST (단일 `/trpc/*` 엔드포인트) |
| 계약 형태 | TypeScript 타입 자체 (router type export) |
| 입력 검증 | Zod·Typia·Yup procedure에 결합 |
| 클라이언트 | 함수 호출 — 자동완성·타입 추론 100% |
| 배치 | `httpBatchLink`로 한 라운드트립에 여러 호출 합치기 |

장점: **DX 최강**. 코드 생성·OpenAPI 작성 부담 0. React Query 통합(`@trpc/react-query`)으로 캐싱·invalidation까지.

단점: **TypeScript 전용** — 다른 언어 클라이언트 불가. 표준 REST 아니라 외부 공개 API 부적합. HTTP 시맨틱(메서드·상태코드) 약함.

## ts-rest — 계약 우선 REST

`initContract().router({...})`로 method·path·pathParams·body·responses를 명시한 **REST 계약**을 먼저 정의. 서버는 `@TsRestHandler(contract)` (NestJS) 또는 Express adapter로 계약을 구현, 클라이언트는 같은 계약을 import해서 `client.users.getById({ params: { id: 1 } })` 호출. 응답은 `result.status === 200` discriminated union 분기.

| 측면 | 의미 |
|------|------|
| HTTP 메서드 | 명시적 GET/POST/PUT/DELETE — REST 표준 |
| 계약 형태 | router 객체 (path·method·body·response 명시) |
| 입력 검증 | Zod·Typia로 path·body·response schema |
| 응답 패턴 | discriminated union — `status`로 분기, 각 분기마다 타입 |
| OpenAPI | `generateOpenApi(contract)`로 자동 생성 |

장점: **REST 호환 + 타입 안전**. OpenAPI 자동 생성으로 외부 클라이언트도 지원 가능. 표준 HTTP 시맨틱 유지.

단점: tRPC 대비 **약간 더 verbose** (계약 작성 단계). 다국어 클라이언트는 OpenAPI 경유.

## tRPC vs ts-rest 직접 비교

| 축 | tRPC | ts-rest |
|----|------|---------|
| 패러다임 | RPC (함수 호출) | REST (자원·메서드) |
| 엔드포인트 | 단일 `/trpc/*` | RESTful path |
| HTTP 시맨틱 | 약함 (query/mutation만) | 강함 (메서드·상태코드) |
| OpenAPI 생성 | 별도 어댑터 (`trpc-openapi`) | 내장 (`generateOpenApi`) |
| 다국어 클라 | ✗ | OpenAPI 경유 가능 |
| 응답 분기 | throw → catch | status discriminated union |
| 배치 호출 | `httpBatchLink` 내장 | ✗ (REST 그대로) |
| 학습 곡선 | 낮음 | 중간 |
| 적합 | 풀스택 TS 모놀리스·Next.js | 외부 공개·Mobile·OpenAPI 필요 |

**선택 기준**:
- 풀스택 TypeScript + 단일 팀 → **tRPC**
- 외부 클라이언트·OpenAPI·REST 표준 필요 → **ts-rest**
- Mobile (iOS·Android) 클라이언트 → **ts-rest** (OpenAPI codegen)

## NestJS 통합 패턴

| 도구 | 통합 방식 | NestJS 파이프라인 |
|------|----------|-----------------|
| **tRPC** | `TrpcRouter` Provider + `TrpcController`가 `createExpressMiddleware`로 위임 | ✗ Guard·Pipe·Interceptor 우회 (Express 미들웨어 위임) |
| **ts-rest** | `@TsRestHandler(contract)` 데코레이터로 Controller 메서드 안에서 직접 | ✅ Guard·Pipe·Interceptor 그대로 적용 |

NestJS 환경에선 **ts-rest가 더 자연스러움** — 기존 AOP 메커니즘 재사용 ([[NestJS-AOP-Interceptor]]·[[NestJS-Guards]]). tRPC는 자체 middleware 사용해야 함.

## Typia · Zod 검증 결합

두 라이브러리 모두 입력 검증 라이브러리 선택 가능:

| 라이브러리 | 특징 |
|-----------|------|
| **Zod** | 런타임 스키마 정의·풍부한 생태계·tRPC 표준 |
| **Typia** | TS 타입에서 컴파일 타임 검증 함수 생성 (Zod 대비 ~60-100배 빠름) |
| **Yup·Joi** | 레거시 |

자세한 비교: [[Runtime-Validation-Libraries]].

Typia의 강점은 **TS 타입을 그대로 검증** — 별도 스키마 정의 없이 `typia.assert<User>(input)`. 단, 컴파일러 플러그인 설정 필요.

## 흔한 실수

- **tRPC를 외부 공개 API에** — TS 전용 종속, 다국어 클라이언트 불가. ts-rest 또는 OpenAPI
- **ts-rest 응답 status 분기 누락** — discriminated union이라 `if (result.status === 200)` 필수
- **검증 없는 procedure** — 입력 신뢰. Zod·Typia 강제
- **tRPC를 NestJS Guard로 보호하려고** — 미들웨어 위임이라 적용 안 됨. tRPC 자체 middleware 사용
- **응답 schema 검증 안 함** — 서버 응답이 계약과 다르면 클라 타입 거짓말. Typia로 응답도 assert
- **tRPC + REST 혼재 무계획** — 같은 도메인을 두 스타일 둠. 도메인별로 한 가지 선택
- **ts-rest path param 타입을 number로** — URL은 string. `z.coerce.number()` 또는 명시 변환

## 면접 체크포인트

- tRPC와 ts-rest 모두가 풀스택 TS 환경의 OpenAPI 대안인 이유
- 함수 호출형 RPC (tRPC) vs 계약 우선 REST (ts-rest) 패러다임 차이
- end-to-end 타입 추론이 가능한 메커니즘 — 서버 라우터 타입을 클라이언트가 import
- tRPC가 NestJS Guard·Pipe 파이프라인을 우회하는 이유 (Express 미들웨어 위임)
- ts-rest의 discriminated union 응답 패턴
- Typia가 Zod보다 빠른 이유 (컴파일 타임 검증 코드 생성)
- 외부 공개 API에 tRPC가 부적합한 이유
- OpenAPI 자동 생성 — ts-rest 내장 vs tRPC 어댑터

## 출처
- [NestJS 기반 API 기술별 구현 예시 — 학습 메모]

## 관련 문서
- [[REST|REST]]
- [[GraphQL|GraphQL]]
- [[gRPC|gRPC]]
- [[API-Comparison|REST vs GraphQL vs gRPC vs tRPC vs ts-rest]]
- [[Runtime-Validation-Libraries|Typia · Zod · Ajv 검증 라이브러리]]
- [[NestJS-GraphQL|NestJS GraphQL]]
- [[NestJS-Microservices|NestJS Microservices (gRPC Transport)]]
