---
tags: [ai, mcp, gateway, authorization]
status: done
verified_at: 2026-11-02
category: "AI엔지니어링(AIEngineering)"
aliases: ["MCP Gateway Architecture", "Uber MCP Gateway"]
---

# MCP 게이트웨이의 발견, 실행과 권한 경계

MCP 게이트웨이는 도구를 발견하고 관리하는 제어 계층과 실제 요청을 전달하는 실행 계층을 모은다. 기존 HTTP, gRPC와 내부 RPC API를 MCP 도구로 제공하면 각 서비스가 같은 연동 코드를 다시 만들 필요를 줄일 수 있다.

## 제어 계층과 실행 계층

| 구성 | 책임 |
|---|---|
| Registry | 도구 스키마, 소유 팀, 활성화 여부와 변경 이력 |
| Crawler | API 정의와 네이티브 MCP 서버에서 후보 발견 |
| Proxy | MCP 요청을 대상 프로토콜로 변환하고 결과 반환 |
| 정책과 관측 | 호출자 권한, 도구별 제한, 응답 필터와 실행 기록 |

**발견된 도구와 공개할 도구를 분리**한다. 자동 생성한 설명과 스키마는 소유 팀이 검토하고 활성화한다. 호출 가능 상태로 바꾸거나 설명을 수정하는 변경도 리뷰와 롤백 경로를 둔다.

## Uber 사례의 범위

2026-10-16 대조한 Uber의 2026-10-01 기술 글은 800개 이상의 MCP 서버와 5,000개 이상의 도구 운영을 보고한다. MCP Registry가 제어 계층, Proxy Gateway가 실행 계층을 맡고 AutoCrawler로 API와 네이티브 도구를 발견한다. HTTP, gRPC와 TChannel을 변환하며 기존 백엔드의 수정을 줄이는 구조다.

도구 수준의 접근 제어와 응답의 개인정보 및 민감 정보 제거를 중앙에서 적용한다. 사람, 서비스와 에이전트의 호출 권한을 구분한다. 이는 Uber의 구현 사례이며 MCP 프로토콜 자체가 제공하는 보안 보장은 아니다.

## 도구 발견과 응답 크기를 따로 줄인다

도구 정의를 모두 미리 넣으면 호출 전부터 컨텍스트가 커진다. 도구 실행 뒤의 큰 응답은 별도로 줄여야 한다. Uber의 같은 설계 글을 2026-10-29에 다시 대조한 구현 예는 다음과 같다.

| 방식 | 줄이는 입력 | 동작 |
|---|---|---|
| Omni MCP | 미리 적재하는 도구 정의 | `discover_server`, `discover_tools`, `get_tool_schema`, `invoke_tool`으로 서버 탐색, 도구 선택, 스키마 조회와 호출을 나눈다 |
| Response Projection | 모델에 돌려주는 응답 필드 | 요청 스키마에 추가한 필드로 필요한 중첩 경로를 받고, 게이트웨이가 응답에서 해당 필드만 남긴다 |
| Code Mode | 모델이 직접 읽는 도구 출력 | `aifx mcp list`, `search`, `call`로 발견과 호출을 수행하고, 결과를 파일에 써 필요한 부분만 읽는다 |

세 방식은 Uber 게이트웨이의 확장이며 모든 MCP 서버의 공통 기능으로 가정하지 않는다. 응답 필드 선택은 권한 검사나 민감 정보 제거를 대신하지 않는다. 적용 시에는 선택한 필드가 업무 판단에 충분한지, 생략한 오류나 상태 정보 때문에 성공으로 오판하지 않는지 확인한다.

## 백엔드로 넘기는 요청 헤더

게이트웨이가 클라이언트 요청 헤더를 백엔드에 그대로 넘기면 클라이언트의 `authorization` 토큰이 그 토큰의 대상(audience)이 아닌 백엔드까지 간다. 신뢰 수준이 다른 백엔드를 한 게이트웨이에 묶을수록 전달 범위를 백엔드별로 정한다. token passthrough 금지는 [[MCP]]가 다룬다.

2026-11-02 대조한 Envoy v1.40.0의 MCP router 필터가 이 기본값을 바꾼 사례다. 이전에는 작은 고정 제외 목록을 뺀 모든 요청 헤더를 넘겼지만, 이제 백엔드별 `header_forwarding`이 없으면 router가 직접 만드는 헤더(`content-type`, `accept`, 세션 헤더 등) 외에 downstream이 제어하는 헤더를 넘기지 않으며 클라이언트의 `authorization`도 넘기지 않는다. 필요한 헤더는 `allowed_headers`로 열고, `disallowed_headers`는 `forward_all`보다 우선한다. `forward_all: true`는 그 백엔드에 이전 동작을 되살리므로 `authorization`을 `disallowed_headers`에 두지 않았다면 인증 헤더도 함께 넘어간다. 헤더 변경과 자격 증명 주입은 이 전달 정책 밖이라 백엔드가 요구하는 자격 증명은 따로 설계한다. 이 확장의 API는 work-in-progress로 표시돼 있고, 문서는 보안 수준이 확인되지 않은 확장이라 downstream과 upstream을 모두 신뢰하는 배포에서만 쓰라고 적는다. 문서만 대조했으며 설정을 실행해 확인하지 않았다. 업그레이드 점검 절차는 [[Envoy-Upgrade-Behavior-Changes|Envoy 업그레이드와 동작 변경 점검]]에 있다.

## 기존 API 게이트웨이 위에 얇게 올리는 방식

이미 인증, 호출량 제한, 서킷 브레이커와 API 등록 검수를 운영하는 API 게이트웨이가 있으면 MCP 게이트웨이를 그 위에 얇게 올리고 기존 자산을 툴 단위로 재사용할 수 있다. 아래는 네이버 커머스API 플랫폼이 판매자 AI 에이전트용 MCP 게이트웨이를 만든 2026 발표 기준의 설계이며, 발표 시점에 변환형 툴의 검수와 호출을 개발 환경에서 확인하고 운영 오픈을 앞둔 상태였다. 표의 효과 열은 발표가 밝힌 이유와 이 문서의 해석이 섞여 있다.

| 결정 | 방식 | 효과 |
| --- | --- | --- |
| 툴 두 종류 | API 변환형(OpenAPI 3 명세의 오퍼레이션 하나를 툴로 변환)과 툴 등록형(서비스가 운영하는 MCP 서버 주소 등록, `tools/list`로 툴 명세 수집) | 기존 API를 툴로 바꾸는 길과 이미 있는 MCP 서버를 묶는 길을 모두 둔다 |
| 툴별 라우트 | MCP 요청은 모두 같은 경로로 오고 대상은 JSON-RPC 본문에 있으므로(2026-07-28 개정은 `Mcp-Method`, `Mcp-Name` 헤더를 필수로 두어 헤더로도 라우팅할 수 있다. [[MCP-Security-Boundaries\|MCP 보안 경계]] 참고), Spring Cloud Gateway의 본문 predicate로 툴 이름을 읽어 툴마다 라우트 하나를 할당한다. 맞지 않는 요청(목록 조회, 서버 정보)은 마지막 기본 라우트로 모은다 | 기존 API가 쓰던 요청 크기 상한, 토큰 버킷 호출량 제한, 서킷 브레이커, 재시도 필터를 툴에 그대로 붙이고, 툴별 지표가 라우트 지표로 나온다 |
| 재시도 위치 | 연결 실패일 때만 서킷 브레이커 안쪽에서 재시도 | (해석) 요청이 뒷단에 닿지 않은 경우만 다시 보내 부수효과 중복을 피한다 |
| 오류 분리 | 변환형 MCP 서버가 게이트웨이 서버에 돌려줄 때 입력 스키마 불일치와 도메인 API의 4xx, 5xx 응답은 HTTP 200에 툴 실행 오류(`isError`)로 실어 에이전트가 고쳐 다시 부르게 하고, 연결 실패와 응답 시간 초과만 503, 504로 보낸다. 에이전트에게 가는 게이트웨이 오류는 JSON-RPC 오류 형식 하나로 바꾼다 | 서킷 브레이커가 에이전트의 인자 오류까지 실패로 세지 않게 한다. (해석) 대신 도메인 API의 5xx도 차단기 집계에서 빠진다 |
| 툴 이름과 버전 | 서비스 이름과 버전으로 이름을 지어 서비스가 달라도 겹치지 않게 한다. 호환되는 변경은 리비전만 올리고, API 새 버전은 새 툴로 등록해 검수를 처음부터 받는다 | (해석) 에이전트가 쓰던 툴의 계약이 검수 없이 바뀌지 않는다 |
| 변경 반영과 캐시 | 관리 도구가 변경 이벤트를 보내면 변환형 서버가 먼저 툴 명세를 다시 받고, 게이트웨이가 각 서버의 `tools/list`를 서버 단위로 캐시해 라우트와 함께 교체한다. 에이전트의 `tools/list`는 캐시로 답하고, 이벤트가 없어도 10분마다 다시 채운다. 조회에 실패하면 이전 값을 유지한다 | (해석) 목록 조회가 뒷단 부하가 되지 않게 하고, 반영 실패가 툴 소실로 번지지 않게 한다 |

OpenAPI 3과 MCP 툴 정의는 모양이 다르다. OpenAPI 3.1.0은 파라미터 위치가 path, query, header, cookie 넷이고(3.2.0은 querystring을 더해 다섯) 본문은 별도 `requestBody`이며 응답 스키마가 상태 코드마다 있지만, 툴 정의는 `inputSchema` 하나와 `outputSchema` 하나다. 발표의 변환기는 경로, 쿼리, 본문 입력을 객체 하나의 속성으로 모으고 `$ref` 참조는 풀어서 넣는다. 인증 컨텍스트 헤더는 변환형 서버의 전송 계층에서 꺼내 도메인 API 호출에 싣는다고 했으며, header와 cookie 파라미터의 변환 처리는 발표에서 확인하지 못했다. 툴 스키마로 옮길 수 없는 모양이면 서비스가 명세를 고쳐 다시 변환하게 한다. 손으로 맞춘 툴 스키마가 원본 API와 어긋나는 일을 피하는 선택으로 볼 수 있다. 변환형 서버는 호출 시 입력 스키마로 인자를 먼저 검증하고, 맞지 않으면 도메인 API를 부르지 않는다. 응답은 출력 스키마의 필드만 남긴다.

MCP 명세(2026-11-18 대조)는 알 수 없는 툴 같은 프로토콜 오류는 JSON-RPC 오류로, API 실패와 입력 검증 실패 같은 툴 실행 오류는 `isError: true`인 정상 결과로 돌려주도록 나눈다. 클라이언트는 툴 실행 오류를 모델에 제공해야 하고(SHOULD), 프로토콜 오류는 제공할 수 있지만(MAY) 복구로 이어질 가능성이 낮다고 적는다. 입력 검증 실패와 API 오류 응답을 `isError`로 돌리는 부분은 이 구분과 맞고, 연결 실패와 시간 초과를 503, 504로 보내는 것은 명세가 아니라 차단기 집계를 위한 발표의 선택이다. 2025-06-18 명세는 잘못된 인자를 두 쪽 예시에 모두 걸쳐 적어 모호했고, SEP-1303(Final)을 반영한 2025-11-25 개정이 입력 검증 실패를 툴 실행 오류로 정리했다. 2025-11-25 Tools 문서는 `CallToolRequest` 스키마 자체를 어긴 잘못된 요청은 여전히 프로토콜 오류로 두며, 2026-07-28 Tools도 같은 구분을 유지한다. 구현 전에 대상 명세 버전의 문구를 다시 확인한다.

같은 발표는 툴 등록 검수에 API 등록 검수 엔진을 그대로 쓴다. 이름과 스키마는 코드로 판정하는 결정적 규칙이, 설명이 에이전트가 쓰기에 충분한지는 LLM 판정이 보고, 운영자가 확인해야 툴이 릴리스되어 노출된다. 발견한 도구와 공개할 도구를 나누는 앞 절의 원칙을 검수 단계로 구현한 형태다.

## 적용 시 검증할 조건

- 호출자의 권한과 백엔드 자격 증명을 연결하고 권한을 넓히지 않는가.
- Registry 변경과 Proxy 반영 사이의 지연, 장애와 오래된 설정을 어떻게 처리하는가.
- 자동 발견한 API의 부수효과, 민감 필드와 소유권을 검토하는가.
- 응답 필터가 업무에 필요한 정보를 지우거나 민감 정보를 놓치는 경우를 시험하는가.
- 게이트웨이 장애와 제한이 전체 도구 호출에 미치는 영향을 관찰하는가.
- 백엔드별로 넘기는 요청 헤더를 허용 목록으로 제한하고, 업그레이드 뒤 백엔드가 실제로 받은 헤더를 요청으로 확인하는가.
- 에이전트가 고칠 수 있는 오류와 뒷단 장애를 응답 형태로 나눠 서킷 브레이커와 재시도가 장애만 세는가. 도메인 API의 5xx를 툴 실행 오류로 감싸면 차단기가 그 장애를 세지 않으므로 별도 지표로 감시하는가.

네이버 커머스API 사례는 발표 내용이며 구현과 운영 수치를 확인하지 않았다. Uber 사례는 공식 설계 설명을 대조했으며 Uber 내부 구현, 처리 성능과 정책 효과를 재현하지 않았다.

## 출처

- [Designing MCP Gateway: Uber's MCP Management Platform — Uber Engineering](https://www.uber.com/us/en/blog/designing-mcp-gateway/)
- [1.40.0 (October 13, 2026) — Envoy](https://www.envoyproxy.io/docs/envoy/v1.40.0/version_history/v1.40/v1.40.0)
- [Envoy, MCP Multiplexer/Demultiplexer (proto)](https://www.envoyproxy.io/docs/envoy/v1.40.0/api-v3/extensions/filters/http/mcp_router/v3/mcp_router.proto)
- [검수도 답변도 호출도 AI가? 커머스API의 2026 — NAVER D2](https://www.youtube.com/watch?v=-jiSMqYOHKA) — NAVER Engineering Day 10th 발표, 음성 전사 기반
- [Model Context Protocol, Tools (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — Error Handling
- [Model Context Protocol, Tools (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) — Error Handling
- [Model Context Protocol, Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) — 헤더 미러링
- [Model Context Protocol, SEP-1303 Input Validation Errors as Tool Execution Errors](https://modelcontextprotocol.io/seps/1303-input-validation-errors-as-tool-execution-errors)
- [Model Context Protocol, Tools (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [Key Changes (2025-11-25) — Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [OpenAPI Specification v3.1.0](https://spec.openapis.org/oas/v3.1.0.html) — Parameter Locations
- [OpenAPI Specification v3.2.0](https://spec.openapis.org/oas/v3.2.0.html) — Parameter Locations

## 관련 문서

- [[MCP|MCP]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[Envoy-Upgrade-Behavior-Changes|Envoy 업그레이드와 동작 변경 점검]]
