---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Action 도구 설명과 Adaptive Card 연결

Ontology Manager의 Agent tool description은 Action을 언제, 어떤 parameter로 호출하는지 agent에게 설명한다. project ID를 먼저 찾는 순서나 필수 업무 조건을 명시할 수 있지만 설명문은 서버의 authorization/validation을 대신하지 않는다.

get-or-create 예제 skill은 project/title로 검색한 뒤 없으면 create Action을 호출한다. 이는 순차 workflow 예제이며 동시에 두 agent가 검색 후 생성하는 경쟁을 막는 원자적 uniqueness 보장은 아니다. 첫 match만 고르는 규칙도 업무상 유일성을 보장하지 않는다.

## 응답을 카드로 표시

Copilot/Teams Adaptive Card는 OMCP response의 schema와 native JSON 형태를 바탕으로 만든다. VS Code 예제는 MCP HTTP URL과 환경변수 bearer를 연결하고 Accept에 JSON/text-event-stream을 지정한다. 실제 token을 설정 파일이나 source control에 넣지 않는다.

`capabilities.response_semantics.data_path`와 `static_template.file`을 tool definition에 연결한다. 예제 path는 `$`, template은 `adaptiveCards/<toolName>.json`이다. response_semantics를 function 바로 아래에 놓지 않고 capabilities 아래에 둔다.

예제 skill은 response sample을 보고 `{value:[...]}`면 `${value}`, flat array면 `${$root}`, 단일 object면 field binding을 사용한다. JSON을 string 안에 다시 직렬화하면 template binding이 안 되므로 native object/array를 반환하도록 고친다.

Card v1.5의 wrap, nullable `$when`, numeric format, status conditional을 적용한다. 해당 예제 template 언어에서 array `.length`나 일반 날짜/struct/window function을 지원한다고 가정하지 않는다. `.data.json`은 preview sample이며 실제 tool response contract와 대조한다.

Action.OpenUrlDialog는 사용자가 별도 dialog로 이동하는 UI 경로다. 카드가 보였다는 사실과 Action의 성공/데이터 저장을 분리한다. 공개 skill 예제의 minimal/sample tool 호출은 read인지 write인지 먼저 확인한 뒤 사용한다.

## 출처

- [Palantir, mcp-tools-and-agent-configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)

## 관련 문서

- [[Palantir-Ontology-MCP]]
- [[Palantir-OMCP-Authentication]]
