---
tags: [nestjs, ai, llm, mcp, agent]
status: done
verified_at: 2026-11-09
category: "OS & Runtime - NestJS"
aliases: ["NestJS AI and MCP", "@nestjs/ai", "@nestjs/mcp", "NestJS AI 모듈과 MCP 모듈"]
---

# NestJS AI 모듈과 MCP 모듈

`@nestjs/ai`와 `@nestjs/mcp`는 LLM 기능을 NestJS의 기존 계층(의존성 주입, guard, interceptor, pipe, exception filter, 인증과 인가)에 넣는 공식 모듈이다. 앞의 것은 애플리케이션이 모델을 호출하는 쪽, 뒤의 것은 외부 MCP 클라이언트가 애플리케이션을 도구로 부르는 쪽이다. 같은 프로바이더 메서드를 두 쪽 모두에 노출할 수 있다.

2026-11-09 기준 두 패키지는 갓 공개된 초기 버전이다(npm 첫 공개는 `@nestjs/mcp` 2026-11-04, `@nestjs/ai` 2026-11-05이고, 최신은 각각 0.0.4와 0.0.2로 둘 다 2026-11-06(UTC) 공개). 0.x 버전이라 API가 바뀔 수 있으므로 도입 전 공식 문서와 변경 기록을 다시 확인한다.

## 역할 구분

| 구분 | `@nestjs/ai` | `@nestjs/mcp` |
|---|---|---|
| 방향 | 애플리케이션이 언어 모델을 호출한다 | MCP 클라이언트가 애플리케이션의 도구, 리소스, 프롬프트를 호출한다 |
| 선언 | `@AgentFunction()`으로 모델에 줄 도구를 표시한다 | `@Tool()`, `@Resource()`, 프롬프트 데코레이터로 표시한다 |
| 기반 | AI SDK(`ai` 7)와 `@ai-sdk/*` 공급자 패키지 | 공식 MCP TypeScript SDK(`@modelcontextprotocol/server`) |
| 스키마 | Zod 4.2 이상 또는 JSON Schema를 만드는 Standard Schema 라이브러리 | Zod, ArkType, Valibot 또는 JSON Schema |
| 실행 맥락 | 컨텍스트 타입 `'ai'`, `AiExecutionContext` | 컨텍스트 타입 `'mcp'`, `McpExecutionContext` |

한 메서드에 `@AgentFunction()`과 `@Tool()`을 함께 붙이면 내부 에이전트와 외부 MCP 클라이언트가 같은 업무 코드를 쓴다. 두 데코레이터는 서로의 옵션을 읽지 않으므로 스키마는 상수 하나로 두고 양쪽에 넘긴다. enhancer 안에서는 컨텍스트 타입으로 호출 경로를 구분한다.

## @nestjs/ai: 모델 호출을 운영 계층에 둔다

- **이름 붙은 모델:** `AiModule.forRoot({ models: { default, fast } })`처럼 모델을 이름으로 등록하고 의존성 주입으로 쓴다. 임베딩 모델도 별도 레지스트리를 가진다.
- **실패 처리:** 호출마다 타임아웃, 재시도와 대체 모델을 두며 `@nestjs/resilience` 정책이나 직접 만든 정책 위에서 돈다. 예산과 사용량 이벤트도 제공한다.
- **구조화 출력과 스트리밍:** `generateObject({ schema })`는 스키마로 검증한 객체를, `streamText()`는 컨트롤러가 브라우저로 흘려보낼 응답을 만든다.
- **에이전트 함수의 권한:** 모델이 부르는 도구 호출은 클래스와 메서드의 guard, interceptor, pipe, filter를 거치고, 에이전트가 대신 일하는 사용자로 실행된다. `@nestjs/authentication`(0.1.4 이상)과 `@nestjs/authorization`(0.1.2 이상)으로 인증과 인가를 건다. 모델의 판단이 아니라 기존 권한 계층이 허용 여부를 정한다는 점에서 [[Agent-Governance-Controls|에이전트 거버넌스 통제]]의 신원과 권한 원칙과 맞는다.
- **오래 걸리는 실행:** `@nestjs/ai/workflows`로 에이전트 실행을 `@nestjs/workflows` 위에 올리면 재시작을 견디고 사람의 승인을 기다릴 수 있다. 저장과 재실행 의미는 [[NestJS-Workflows|NestJS Workflows]]를 따른다.
- **테스트:** `@nestjs/ai/testing`의 `FakeModel`은 네트워크 없이 텍스트, 도구 호출, 객체, 오류를 정해진 대로 돌려준다.

## @nestjs/mcp: 기존 애플리케이션을 MCP 서버로 연다

- **전송:** 기존 Nest 애플리케이션(Express, Fastify, Node 어댑터)이 Streamable HTTP로 `/mcp` 엔드포인트를 연다. 일반 라우트처럼 전역 prefix와 미들웨어가 적용된다. 무상태로 동작해 로드 밸런서 뒤에서 확장할 수 있고, 독립 애플리케이션 컨텍스트로 stdio 서버도 띄운다.
- **프로토콜 버전:** 2026-07-28 개정판과 2025년 개정판 클라이언트를 함께 받는다.
- **인증:** OAuth 2.1 리소스 서버로 동작하며 보호 리소스 메타데이터, `WWW-Authenticate` 응답, 도구별 scope, 직접 만든 토큰 검증기를 지원한다. 일반 MCP 서버의 자격 증명과 요청 검증 경계는 [[MCP-Security-Boundaries|MCP 보안 경계]]에서 다룬다.
- **테스트:** 메모리 안의 테스트 클라이언트를 제공한다.

## 도입 점검

- 에이전트 함수와 MCP 도구가 일반 API와 같은 guard와 인가 규칙을 거치는가? 도구 전용 우회 경로를 만들지 않는다.
- 상태를 바꾸는 도구에 승인과 되돌리기 경로가 있는가? 오래 걸리는 실행은 workflows로 옮겨 재시작과 승인 대기를 견디게 한다.
- 모델 호출의 타임아웃, 재시도, 대체 모델과 예산을 기본값에 맡기지 않고 업무별로 정했는가?
- 0.x 버전 고정과 업그레이드 시 변경 기록 확인 절차가 있는가?

## 출처

- [nestjs/ai README — GitHub](https://github.com/nestjs/ai) — 2026-11-09 README 대조, npm 첫 공개 2026-11-05, 최신 0.0.2(2026-11-06 UTC)
- [nestjs/mcp README — GitHub](https://github.com/nestjs/mcp) — 2026-11-09 README 대조, npm 첫 공개 2026-11-04, 최신 0.0.4(2026-11-06 UTC)
- [NestJS, AI Overview](https://docs.nestjs.com/ai/overview) — 2026-11-09 페이지 존재 확인
- [NestJS, MCP Overview](https://docs.nestjs.com/mcp/overview) — 2026-11-09 페이지 존재 확인
- [NestJS v12 이후 신규 공식 패키지 소개 — LinkedIn 게시글](https://www.linkedin.com/posts/catsmiaow_nestjs-v12-%EB%A6%B4%EB%A6%AC%EC%8A%A4-%EC%9D%B4%ED%9B%84-%EC%8B%A0%EA%B7%9C-%EC%B6%94%EA%B0%80%EB%90%9C-%EA%B3%B5%EC%8B%9D-%ED%8C%A8%ED%82%A4%EC%A7%80%EB%93%A4-%EC%9D%B8%EC%A6%9D-%EB%A9%94%EC%9D%BC-share-7525467941916684289-1aP1/) — 정리의 계기. 로그인 벽으로 본문은 읽지 못해 위 공식 저장소로 대조했다

## 관련 문서

- [[NestJS-Workflows|NestJS Workflows]]
- [[NestJS-Resilience|NestJS Resilience]]
- [[NestJS-Authentication|NestJS 인증]]
- [[NestJS-Authorization|NestJS 인가]]
- [[MCP|MCP]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]
