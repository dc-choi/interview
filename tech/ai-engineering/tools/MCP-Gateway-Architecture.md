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

## 적용 시 검증할 조건

- 호출자의 권한과 백엔드 자격 증명을 연결하고 권한을 넓히지 않는가.
- Registry 변경과 Proxy 반영 사이의 지연, 장애와 오래된 설정을 어떻게 처리하는가.
- 자동 발견한 API의 부수효과, 민감 필드와 소유권을 검토하는가.
- 응답 필터가 업무에 필요한 정보를 지우거나 민감 정보를 놓치는 경우를 시험하는가.
- 게이트웨이 장애와 제한이 전체 도구 호출에 미치는 영향을 관찰하는가.
- 백엔드별로 넘기는 요청 헤더를 허용 목록으로 제한하고, 업그레이드 뒤 백엔드가 실제로 받은 헤더를 요청으로 확인하는가.

공식 설계 설명을 대조했으며 Uber 내부 구현, 처리 성능과 정책 효과를 재현하지 않았다.

## 출처

- [Designing MCP Gateway: Uber's MCP Management Platform — Uber Engineering](https://www.uber.com/us/en/blog/designing-mcp-gateway/)
- [1.40.0 (October 13, 2026) — Envoy](https://www.envoyproxy.io/docs/envoy/v1.40.0/version_history/v1.40/v1.40.0)
- [Envoy, MCP Multiplexer/Demultiplexer (proto)](https://www.envoyproxy.io/docs/envoy/v1.40.0/api-v3/extensions/filters/http/mcp_router/v3/mcp_router.proto)

## 관련 문서

- [[MCP|MCP]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[Envoy-Upgrade-Behavior-Changes|Envoy 업그레이드와 동작 변경 점검]]
