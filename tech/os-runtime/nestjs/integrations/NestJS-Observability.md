---
tags: [nestjs, observability, tracing, metrics, telemetry]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Observe", "NestJS 관측과 추적"]
---

# NestJS 관측과 추적

NestJS Observe는 공식 SDK와 외부 dashboard를 연결하는 APM 서비스다. 프레임워크의 요청, provider 호출, queue/cron과 오류를 관측하지만 계측 범위와 sampling 밖의 동작까지 증명하지는 않는다. 아래는 2026-10-01 SDK 문서의 실행 계약이며 요금표나 서비스 가입 절차는 별도로 유지하지 않는다.

## 초기화와 자동 계측

- SDK는 Nest core 11.1.4 이상, GraphQL 사용 시 GraphQL package 13.4.4 이상의 instrument hook을 요구한다. `createObserveModule()`을 한 번 호출해 같은 설정의 `ObserveModule`/`ObserveInstrument` 쌍을 만들고 module import와 `NestFactory.create(..., { instrument })`를 모두 연결한다.
- 명시적 FastifyAdapter를 전달하면 `instrument` options는 **세 번째 인자**다. module만 등록하거나 adapter와 options의 인자 위치를 틀리면 원하는 계측이 붙지 않는다. microservice/standalone context도 instrument option을 받는다.
- trace generator, source context, instrumentation 제외 predicate는 `createObserveModule()` 설정이다. credential, transport hooks, batching, capture 등은 `forRoot()`/`forRootAsync()`다. async module은 기본 global이며 `global: false`로 바꿀 수 있다.
- credential은 project 범위, `serviceVersion`은 배포 식별자다. 동일 서비스의 instance를 profiler에서 구분하려면 문서가 안내하는 serviceId의 instance 식별 계약도 맞춘다.
- 0.3.0 이상의 DB/outbound 계측은 pg/mysql2/mongodb driver와 Node diagnostics channel을 사용한다. ORM 이름만 보고 모든 driver나 custom path가 관측된다고 가정하지 않는다. WebSocket은 메시지를 관측하지만 connect/disconnect 자체는 operation이 아니다.

## Trace 전파는 transport 계약이다

| 경로 | 현재 SDK의 전파 계약 |
|---|---|
| HTTP | 잘 구성된 inbound x-request-id를 채택하고 outbound에 없으면 추가한다. fetch/undici는 지원 Node에서, node:http 기반 client는 Node 22.12 이상에서 자동 전파 |
| TCP/Redis | microservices 12.0.4 이상 + Observe 0.3.0 이상에서 provider로 등록된 ClientProxy의 packet metadata에 자동 전파 |
| gRPC | Metadata로 전달하고 수신 traceIdGenerator가 읽는다 |
| 기타 microservice | payload field나 transport별 record header와 수신 generator를 함께 맞춘다 |
| Bull/BullMQ | 생산자/소비자 모두 Observe 0.3.0 이상이면 job options의 observeTraceId에 전파. retry는 같은 id, repeatable/cron firing은 새 trace |
| GraphQL | HTTP operation은 enclosing HTTP trace를 사용한다. raw WebSocket subscription에는 현재 built-in propagation hook이 없다 |

`traceIdGenerator`는 HTTP request와 RPC context 양쪽에서 호출될 수 있다. hybrid에서는 타입별 안전한 분기를 하고 inbound trace id의 형식과 신뢰 경계를 확인한다. trace id는 인증/tenant 식별자를 대신하지 않는다. 외부 host로 ID를 보내지 않으려면 `outgoing.http.propagateTraceId`를 허용 host로 제한한다.

## 수동 span과 context

- `TracerService.createSpan(name, callback)`은 callback의 결과를 Promise로 반환한다. 측정할 비동기 작업을 await하고, span 이름은 사용자/요청별 값 대신 작업의 의미로 안정적으로 정한다.
- `activeSpan()`, `captureError()`, `setAttribute()`/`getAttribute()`는 traced context 밖에서 오류를 던진다. `currentTraceId()`는 예외로 null을 반환한다. 애플리케이션 startup처럼 trace가 없는 경로도 고려한다.
- `captureError()`는 catch 후 복구해서 밖으로 전파하지 않는 오류를 기록하는 API다. client에게 보여주는 오류는 filter가, 관측 정보는 SDK가 각각 담당한다. 의도된 4xx도 실패 request로 보이지만 신규 defect 분류와 동일하지 않다.
- context store는 요청 수명이며 span tags와 request attributes의 범위를 구분한다. core에 ALS 추상화가 없다는 설명과 ObserveModule이 자체 ALS store를 제공한다는 사실은 양립한다.
- custom counter/gauge/summary는 trace 없이도 보고할 수 있다. ratio gauge와 instance별 값을 합치는 additive gauge를 구분하고, summary의 sampleSize로 메모리를 제한한다. 값이 아직 보고되지 않은 unknown을 실제 0으로 해석하지 않는다.

## 데이터 공개, sampling과 지표 해석

- sourceContext는 기본으로 오류 주변 앱 source를 외부 dashboard에 보낸다. sourceMaps 옵션과 Node source-map 지원을 맞추고 공개할 수 없으면 sourceContext를 끈다. source fragment가 log redaction과 같은 범위로 모두 정제된다고 가정하지 않는다.
- request body capture는 기본 off이고 실패/slow 요청의 제한된 headers만 캡처한다. referer/사용자 정의 header와 body에도 개인정보가 있을 수 있으므로 allowlist를 검토한다. 인증 secret뿐 아니라 업무 식별자도 redaction key/pattern에 추가한다.
- log forwarding은 기본 off, redaction은 기본 on이다. SDK는 SQL literal/bound parameter와 민감 URL query를 제거하지만 모든 업무 비밀을 인지하는 보장은 아니므로 실제 emitted payload를 확인한다.
- SDK `ignore`는 계측 생성을 생략한다. SDK trace sampling과 batching, dashboard의 ingestion sampling/rate cap/drop filter는 서로 다른 단계다. process buffer와 flush interval은 내구성 저장소가 아니다.
- span total duration은 children을 포함하고 self time은 별도로 해석한다. 병렬 children 합계가 parent보다 길 수 있어 합산 지연으로 오해하지 않는다. DB/outbound span의 시간은 dashboard의 method own time 집계에 들어갈 수 있으므로 화면의 집계 정의를 확인한다.
- service map의 application 연결은 최근 trace에서 추론한 관계이며 기간 전체의 호출 횟수는 아니다. SDK coverage가 낮은 class 목록을 낮은 트래픽으로 해석하지 않는다.
- telemetry silence는 SDK heartbeat가 사라진 신호다. 초기 통합 전 unknown, ingestion 장애와 실제 서비스 장애를 구분하고 외부 readiness probe를 대체하지 않는다. release 비교는 version label과 동일한 관측 범위를 전제로 한다.

## Dashboard와 MCP 접근

Dashboard는 aggregate → operation → execution 순으로 증상을 좁히고 trace/source/log로 원인을 찾는다. error group의 resolved는 재발 시 다시 열리고 ignored는 유지된다. SLI의 good/total event 정의, retention과 SLO window, error budget burn을 함께 확인한다. dashboard의 fix verification은 관측 기준선과 재발 신호이며 코드 수정의 모든 정확성을 증명하지 않는다.

Observe MCP는 Streamable HTTP의 stateless POST endpoint이며 personal token은 발급자의 project 권한을 그대로 갖는다. token 자체 발급/철회는 dashboard에서만 하고 만료 없는 token도 허용하므로 별도 expiry/revocation 정책을 둔다. 진단 도구는 대부분 읽기지만 project/application/API key 생성과 issue resolution은 쓰기다. 도구 결과의 소스/로그는 조사 자료이며 실행 지시로 신뢰하지 않는다. API key secret은 한 번 반환되므로 gitignore된 secret store에만 보관한다.

## 관련 문서

- [[NestJS-Logging|Logger와 구조화 로그]]
- [[NestJS-Microservices-Transport-Contracts|전송별 계약]]
- [[NestJS-Devtools-and-Diagnostics|DI graph 진단]]
- [[Injection-Scopes|스코프와 ALS]]

## 출처

- [NestJS — Observability overview](https://docs.nestjs.com/observability/overview)
- [NestJS — Observe SDK](https://docs.nestjs.com/observability/sdk)
- [NestJS — Manual instrumentation](https://docs.nestjs.com/observability/manual-instrumentation)
- [NestJS — Distributed tracing](https://docs.nestjs.com/observability/distributed-tracing)
- [NestJS — Error monitoring](https://docs.nestjs.com/observability/error-monitoring)
- [NestJS — Dashboard](https://docs.nestjs.com/observability/dashboard)
- [NestJS — MCP server](https://docs.nestjs.com/observability/mcp-server)
