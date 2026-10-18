---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 MCP의 노출, 인증과 Chatbot 호환성

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 두 MCP의 역할

Palantir MCP는 IDE/agent가 플랫폼 개발 작업을 수행하는 tool catalog이고 Ontology MCP는 Developer Console 앱의 object/action/query Function을 외부 MCP client에 노출하는 서버다. 각각 6월 22일 주와 6월 16일 주 GA로 공지됐다.

- Ontology MCP는 Foundry OAuth 2.0 사용자 권한으로 각 호출을 실행한다. application scope와 permission으로 노출 resource를 제한하고 외부 client 제공이 조직 정책에 맞는지 확인한다.
- 3월 Microsoft Copilot Studio 통합은 Backend 앱과 User's permissions, confidential client authorization-code grant 및 사용자 대신 token을 발급하는 service user 경로를 요구했다. Adaptive Card의 response_semantics와 Action.OpenUrlDialog로 Teams/Copilot/Outlook 표현을 연결한다.
- 5월 MCP Hub는 서버 목록/설정과 Developer Console 이동을 제공했다. per-tool 상세/toggle/description 설정, Developer Console 없는 pro-code 지원은 당시 향후 기능이었다.
- 6월 30일 tool search는 opt-in이다. --tool-search 또는 PALANTIR_MCP_TOOL_SEARCH=true를 설정하면 시작 시 search_tools만 노출하고 이름/category/curated keyword를 로컬 검색해 관련 tool을 활성화한다. 추가 모델 호출이나 network round trip 없이 ranking한다.
- 활성 tool은 세션 끝까지 남고 reconnect하면 초기화된다. client가 tools/list_changed를 처리해야 동적 tool이 보인다. Continue는 이 방식의 tool search를 사용하지 않았다. CLI flag는 MCP client 명령 옵션이 아니라 서버 인자의 -- 뒤에 둔다.

## Agent 이름 변경과 legacy 제거는 다른 변화

4월 22일 공지는 4월 27일 주 AIP Agent Studio→AIP Chatbot Studio, Agent→Chatbot, Workshop widget 이름 변경을 알렸다. 기능은 유지되고 **AIP Agent API endpoint 명명은 하위 호환을 위해 유지**한다.

4월 9일 별도 공지는 legacy mode의 AIP Agent widget(former AIP Interactive)을 5월 1일 제거한다고 알렸다. legacy는 2025년 1월부터 deprecated였고 최신 지원 모델도 GPT-4o/Claude 3 Haiku 수준이었다. Legacy 탭의 Upgrade 또는 새 Chatbot 구성으로 옮겨야 한다. 제품 rename만 보고 legacy 삭제가 없다고 추정하지 않는다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [June 30, 2026, Palantir MCP now supports tool search to cut startup token usage — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#de054c7a-2e03-45cd-9f6b-a8f3b986f5a6)
- [May 21, 2026, Discover and manage Ontology MCP servers in MCP Hub — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1c0d79fd-1f6c-4c22-a27f-e25f4021898f)
- [April 9, 2026, Migrate from legacy mode of the AIP Agent widget to Agent Studio — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#96fe4b72-cd8c-47a8-9130-bb0a8d208dc3)
- [March 26, 2026, Integrate Foundry with Microsoft Teams using Ontology MCP — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#987d2b52-76ff-4a7c-bed6-c069eef3f883)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
- [[Palantir-Ontology-MCP]]
