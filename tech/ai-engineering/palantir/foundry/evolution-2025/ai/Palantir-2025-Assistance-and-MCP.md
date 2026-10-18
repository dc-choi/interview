---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 개발 보조, AIP Analyst와 MCP의 권한 경계

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Context를 제공하는 경로

- 1월 Code Repositories의 inline AIP Assist 베타는 선택 코드 Explain/Find bugs/Ask와 snippet/file/repository attachment를 제공했다. 편집기 설정에서 끌 수 있으며 코드 생성의 정확성을 보장하지 않는다.
- 1월 Workshop의 Send to AIP Assist 이벤트는 기본 agent와 static/dynamic prompt를 선택하게 했다. agent의 custom content를 먼저 구성해야 하고 사용자가 sidebar에서 다른 agent를 선택할 수도 있다.
- 2월 Assist multi-chat 발표는 저장 chat을 7일 유지한다고 설명했다. 세션 보존과 영구 감사 기록은 다르다.
- 3월 speech-to-text는 입력창이 비어 있을 때 microphone을 표시하고 전사 결과를 입력창에 넣었다. 한국어 등 다국어 입력이며 자동 질의 제출과 동일하지 않다.
- 3월 VS Code Workspaces의 Continue 베타는 Python transforms SDK/dataset metadata와 TypeScript OSDK의 object/property/link/action/imported Function 문맥을 제공했다.
- 7월 Palantir MCP는 Compass/schema/SQL, 로컬 Ontology와 TypeScript OSDK 개발을 지원했다. 10월에는 SDK 정의 조회, SDK version 생성, repo 연결, media/derived property/aggregation와 platform endpoint discovery 등이 확대됐다. npm 공개 배포 공지와 실제 enrollment 권한은 별개다.

## Agent가 접근하는 실행 환경

- 11월 Jupyter/RStudio AIP agent 실험 기능은 AIP 활성화가 필요하며 file/code/package/terminal tool을 제공했다. 종료나 restart 뒤 chat이 유지되지 않는 조건이 있어 필요한 산출물을 먼저 동기화해야 했다.
- 11월 AI FDE 베타는 현재 사용자의 권한과 선택 context/tool 범위에서 동작했다. Ontology 변경에는 Branching이 연결됐다.
- AIP Analyst 베타는 접근 가능한 Ontology를 scoped object group으로 검색/필터/semantic search/aggregation/SQL/Vega에서 사용했다. 중간 graph를 확인, fork하고 수동 모드로 전환하거나 Notepad context/resource를 가져올 수 있었다.
- 10월 Flow Capture는 click screenshot/audio/transcription/image를 편집/검열해 Markdown, Walkthrough, Notepad, ZIP/PDF로 내보내는 흐름을 소개했다. description은 10월 20일 주 beta, long description은 11월 3일 주라고 적어 시점이 상충한다.

## 재사용 원칙

도구가 파일을 읽고 terminal을 실행하는 권한과 agent 답변의 신뢰도를 분리한다. Context-aware attachment, MCP endpoint discovery, Analyst 접근 객체는 모두 실제 resource 권한을 다시 확인한다. 자동 초안, 코드와 그래프는 실행 및 평가 근거와 함께 검토한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [November 18, 2025, AIP Analyst: Intuitive chat-based ontology exploration — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#8360d392-f312-4145-9fca-ec63873b5271)
- [November 18, 2025, Introducing AI FDE, the AI forward deployed engineer — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#6662b736-ef90-4932-bf88-6103cd3e1d73)
- [October 23, 2025, Record workflows and automatically generate documentation with Flow Capture — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#72f9c4d6-9a5b-4a6a-b7af-055eb2e99ec3)
- [January 21, 2025, Code Repositories now offers inline code assistance and improved access to AIP Assist features [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#e3f8de6d-4003-4453-ba9d-fe466b625271)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Ontology-MCP]]
