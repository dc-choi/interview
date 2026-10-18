---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir MCP 탐색과 환경별 도구 계약"]
---

# Palantir MCP 탐색과 환경별 도구 계약

## 탐색은 노출을 바꾼다

Palantir MCP는 기본으로 search_tools만 초기 목록에 보이고 작업에 필요한 도구를 순차적으로 노출한다. 이름/분류/curated keyword의 로컬 ranking이며 검색 자체에 추가 모델/네트워크 호출은 필요하지 않다. 검색 결과는 설명, input schema와 메타데이터를 포함하고 목록 변경 시 tools/list_changed를 알린다.

발견한 도구는 세션 동안 보이며 새 세션에서 초기화된다. 이는 실행 허가의 경계가 아니다. 환경과 설정이 허용한 도구는 발견 전에도 서버에서 호출 가능하며 disabled tool, 입력 검증과 resource 권한은 계속 적용된다. Client가 동적 목록을 갱신하지 않으면 --no-tool-search 또는 환경변수 false로 허용 catalog를 처음부터 로드할 수 있다. CLI flag가 환경변수보다 우선한다.

## Local과 workspace는 다른 catalog다

Available tools의 Yes는 해당 환경의 가용성이다. Named repository/workspace는 그 종류에서만 활성화됨을 뜻하며 System prompt는 context가 자동 포함된다는 뜻이지 도구 호출 가능을 뜻하지 않는다.

- Schema 조회, dataset SQL, file 목록, health check 관리 등은 양 환경에 표시된다. Dataset build는 workspace에서 Python transforms 범위이며 commit/push가 선행한다.
- Project 생성/검색/이동, object query/aggregation/semantic search, 외부 REST source와 webhook 관리 등은 현재 목록에서 local 전용이다. Resource move는 같은 project 안에서만 지원한다.
- Workspace declared data scope 조회는 Jupyter/RStudio 전용이며 OSDK scope를 열거하지 않는다.
- Compute module 실행 도구는 FUNCTION mode만 지원한다. Start/stop 같은 lifecycle 제어와 조회 도구를 동일한 read-only 작업으로 취급하지 않는다.
- Media metadata는 내용 파일을 반환하지 않는다. Allowed input schema 제거는 기존 media item을 지우지 않는다.
- publish_function은 clean working tree에서 release Git 명령을 준비한다. 명령 반환만으로 발행이 끝나는 것이 아니며 실제 tag push와 CI 완료가 필요하다.

## 문맥과 검증

Repository context와 SDK 버전별 예제, 전체 documentation page, 요약 bundle과 검색 snippet은 서로 다른 근거다. 문서 검색은 AIP를 요구한다. Snippet 검색 성공이나 preview 성공은 전체 build, 데이터 품질과 실제 배포의 검증을 대신하지 않는다. 실제 MCP 설치나 tool 실행은 수행하지 않았다.

## 출처

- [Palantir palantir-mcp, palantir-mcp](https://www.palantir.com/docs/foundry/palantir-mcp)
- [Palantir palantir-mcp, available-tools](https://www.palantir.com/docs/foundry/palantir-mcp/available-tools)
- [Palantir palantir-mcp, example-mcp-workflows](https://www.palantir.com/docs/foundry/palantir-mcp/example-mcp-workflows)
- [Palantir palantir-mcp, getting-started](https://www.palantir.com/docs/foundry/palantir-mcp/getting-started)
- [Palantir palantir-mcp, installation](https://www.palantir.com/docs/foundry/palantir-mcp/installation)
- [Palantir palantir-mcp, overview](https://www.palantir.com/docs/foundry/palantir-mcp/overview)
- [Palantir palantir-mcp, security](https://www.palantir.com/docs/foundry/palantir-mcp/security)
- [Palantir palantir-mcp, tool-search](https://www.palantir.com/docs/foundry/palantir-mcp/tool-search)

## 관련 문서

- [[Palantir-Developer-Tools]]
