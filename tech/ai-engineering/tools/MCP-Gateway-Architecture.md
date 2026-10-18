---
tags: [ai, mcp, gateway, authorization]
status: done
verified_at: 2026-10-16
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

## 적용 시 검증할 조건

- 호출자의 권한과 백엔드 자격 증명을 연결하고 권한을 넓히지 않는가.
- Registry 변경과 Proxy 반영 사이의 지연, 장애와 오래된 설정을 어떻게 처리하는가.
- 자동 발견한 API의 부수효과, 민감 필드와 소유권을 검토하는가.
- 응답 필터가 업무에 필요한 정보를 지우거나 민감 정보를 놓치는 경우를 시험하는가.
- 게이트웨이 장애와 제한이 전체 도구 호출에 미치는 영향을 관찰하는가.

공식 설계 설명을 대조했으며 Uber 내부 구현, 처리 성능과 정책 효과를 재현하지 않았다.

## 출처

- [Designing MCP Gateway: Uber's MCP Management Platform — Uber Engineering](https://www.uber.com/us/en/blog/designing-mcp-gateway/)
- 사용자 제공 GeekNews 발췌: 2026-10-12 「MCP Gateway - 기존 API를 MCP 도구로 통합하는 Uber의 플랫폼 설계」.

## 관련 문서

- [[MCP|MCP]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
