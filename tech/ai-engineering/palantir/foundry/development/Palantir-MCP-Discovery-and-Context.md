---
tags: [palantir, mcp, tool-search, context]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir MCP 도구 발견과 context"]
---

# Palantir MCP의 도구 발견과 context

Palantir MCP는 플랫폼 개발 도구, Ontology MCP는 앱의 업무 resource를 외부 agent에 노출하는 경로다. 도구 정의의 context 최적화와 실제 실행 권한을 구분한다. 아래 tool search 계약은 2026년 6월 도입 공지 기준이다.

## Lazy discovery는 도구를 필요할 때 활성화한다

Tool search를 켜면 시작에 `search_tools` 하나만 노출하고 task 설명을 받은 뒤 tool name/category/curated keyword로 local ranking해 관련 tool을 활성화한다. 검색 자체에 별도 model call/network round trip을 추가하지 않는 방식이다.

활성화한 tool은 session 끝까지 목록과 context에 남는다. 작업이 바뀌었다고 이미 로드한 정의가 자동 제거되는 것은 아니다. Server reconnect는 목록을 `search_tools`로 reset한다. Search result의 순위가 현재 작업에 필요한 도구를 빠짐없이 포함한다는 보장과도 구분한다.

## Client의 dynamic list 지원을 확인한다

Client가 `tools/list_changed` 뒤 도구 목록을 갱신해야 새 tool을 볼 수 있다. 당시 Continue는 이 이유로 tool search를 사용하지 않았다. MCP 연결 성공만으로 dynamic activation 지원까지 확인한 것은 아니다.

기본은 전체 목록이며 `--tool-search` 또는 `PALANTIR_MCP_TOOL_SEARCH=true`로 opt-in한다. Flag는 MCP 등록 명령 자체가 아니라 server 실행 인자에 전달한다. Server 환경의 token/proxy/CA 설정과 command 인자를 구분하며 비밀값을 공유 설정/로그에 복제하지 않는다.

## Context 축소와 실행 안전은 별도다

도구가 늦게 나타나도 원래 사용자/API permission과 Action 조건을 통과해야 한다. 목록이 작다는 이유로 쓰기 capability가 없다고 판단하지 않는다. Model이 선택한 도구, 실제 mutation과 branch/preview/check 결과를 각각 검토한다.

## 출처

- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)

## 관련 문서

- [[Palantir-SDK-and-Agent-Tools|OSDK, OMCP와 개발 MCP]]
- [[Palantir-AI-FDE-and-Skills|문맥과 도구 승인]]
- [[MCP-Security-Boundaries|MCP의 신뢰 경계]]
