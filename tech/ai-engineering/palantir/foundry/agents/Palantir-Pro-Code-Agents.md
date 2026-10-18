---
tags: [palantir, agent, osdk, mcp, asynchronous]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry Pro-code agents"]
---

# Foundry Pro-code agent의 실행과 배포 계약

Pro-code agent는 Code Repository의 custom agent logic을 asynchronous Foundry function으로 배포하는 경로다. Claude Agent SDK, OpenAI Agents SDK와 Google ADK template을 제공하며 OSDK, Ontology MCP와 Palantir MCP를 사용한다. 확인일 기준 beta이며 실제 agent 생성, 권한과 장애를 시험한 기록은 아니다.

## Template plumbing과 업무 logic을 분리한다

`agent/index.ts`에 argument schema와 `runAgent`, `systemPrompt.ts`에 지침, `customTools.ts`에 tool을 둔다. Shared tooling/build script는 template 계층에 있고 custom MCP 설정은 별도 agent 파일로 두면 upgrade 충돌을 줄일 수 있다.

SDK별 loop는 Claude의 query, OpenAI의 Agent/run, Google의 Agent/InMemoryRunner로 다르다. 비동기 MCP configuration helper를 await한 뒤 해당 SDK 타입으로 등록한다. OpenAI MCP server와 Google toolset은 연결 lifecycle을 정리해야 한다. Google template의 FoundryGemini는 Foundry model proxy를 사용하므로 별도 Google API key가 필요하지 않다.

Palantir MCP는 기본 tool search로 필요한 도구를 발견하고 전체 permitted catalog 초기 로드는 별도 선택이다. Prompt와 tool 목록을 바꿨다는 사실만으로 서버의 자원 제한이 바뀌는 것은 아니다.

## Ontology binding과 SDK scope를 함께 관리한다

생성 때 필수 Ontology 선택과 agent API name을 정한다. SDK에 object/action/query function을 넣으면 같은 자원으로 OMCP도 생성돼 model의 tools에 노출된다. SDK 추가를 타입 생성만으로 보지 않고 tool 노출 변화로 검토한다.

Template의 scoped credentials는 OSDK/OMCP/PMCP URL과 header를 runtime에 제공해 client ID/secret/token을 코드에 넣지 않게 한다. 실효 범위는 Ontology binding과 underlying client의 application restrictions에 따른다. 관리형 credential이 존재한다고 모든 Ontology 자원을 쓸 수 있는 것은 아니다.

PMCP/Python Transforms MCP의 frontdoor host는 agent credential로 Control Panel에서 해석한다. Marketplace로 다른 enrollment에 설치했을 때도 대상 host를 찾고, 실패하면 생성 때 기록된 host로 fallback한다. `fallbackHost` override는 이 fallback을 바꾸므로 배포 대상과 오류 경로를 함께 확인한다.

## 결과는 함수 반환값이 아니라 객체에서 읽는다

Agent function은 asynchronous `Void`이며 synchronous 5분 실행 한도를 그대로 적용하지 않는다. 이것을 무제한 실행 보장으로 해석하지 않는다. Query function으로 호출할 수 없고 streaming/batch invocation도 지원하지 않는다.

Automate의 function effect가 권장 호출 경로이며 trigger user 또는 automation service user로 실행한다. Workshop/OSDK/Action에서도 asynchronous function effect 또는 agent를 호출하는 TypeScript Ontology edit function wrapper로 연결한다. Transcript/result를 객체에 써 두고 소비자가 다시 읽는다. AIP Evals도 이 결과 경로를 평가해야 한다.

Argument는 `AgentArguments` schema와 같은 key의 JSON으로 전달한다. 객체 전체 대신 primary key를 받고 agent 안에서 권한을 적용해 다시 조회한다. Local start에는 inline/file JSON 인자를 제공하고 build 성공 뒤 commit/tag로 publish한다. Main의 일반 publish는 UI 또는 Git tag를 지원하지만 global branch에는 다른 절차가 필요하다.

## Global branch가 모든 도구를 격리하지 않는다

Template OSDK client와 OMCP는 global branch의 데이터 read/write 문맥을 받지만 schema는 main 기준이다. Branch에만 만든 타입이 생성 SDK나 도구에 나타난다고 가정하지 않는다. 별도로 만든 client는 explicit branch 설정이 필요하고 Action target은 같은 branch에 먼저 색인한다.

**Platform API와 Palantir MCP는 global branch-aware가 아니다.** PMCP로 branch resource를 조사/수정하는 사용을 금지한 공식 경계를 따른다. Ontology의 branch data 격리를 일반 플랫폼 조작까지 확대하지 않는다.

Branch publish는 repository UI의 Tag version에서 stable target을 선택해야 하며 직접 Git tag를 만들지 않는다. UI가 branched prerelease를 만들고 같은 target을 재발행하면 branch 소비자는 최신 prerelease를 쓴다. 다른 branch/main에서는 사용할 수 없다. Proposal merge 때 선택 stable target을 main에 발행하므로 main에서 target이 아직 비어 있는지 확인한다. 다른 branch에 publish된 동안 API name/Ontology binding을 변경하지 않는다.

## External source와 로그도 별도 계약이다

Source는 network egress와 container credential file을 제공한다. `/app/var/run/source_credentials.json`은 source API name/secret API name 구조이며 resolve 실패 때 `{}`일 수 있다. Atomic replacement되므로 오래 cache하지 말고 필요 시 다시 읽는다. 이 source 연결 경로는 CBAC-enabled 환경에 미지원이다.

Local log는 terminal에, published log는 Workflow Lineage에 남는다. Single-source 검색은 call chain 첫 source executor에서 시작한다. Cloud global search는 producing resource를 골라 다른 executor에서 호출된 function log도 검색할 수 있다. 구체적인 검색 범위는 [[Palantir-AIP-Observability]], 접근과 markings 경계는 [[Palantir-Logs-and-Usage-Governance]]에서 확인한다.

## 적용 패턴과 검증 기준

Ontology change→agent→객체 결과, build event→PMCP 조사/코드 수정→review, legacy code 객체→OSDK/OMCP 이해→PMCP 자원 생성 같은 패턴을 구성할 수 있다. 이는 공식 사용 예시이며 정확한 migration이나 자동 수정의 안전성이 검증됐다는 뜻은 아니다. 최소 데이터/tool, 실제 실행 주체, branch 문맥, 사람이 검토할 결과와 정상/거부/재시도 경로를 먼저 정한다.

## 출처

- [Palantir, Pro-code agents](https://www.palantir.com/docs/foundry/agents/overview)
- [Palantir, Pro-code agent templates](https://www.palantir.com/docs/foundry/agents/agent-templates)
- [Palantir, Build a pro-code agent](https://www.palantir.com/docs/foundry/agents/create-agent)
- [Palantir, Publish and call a pro-code agent](https://www.palantir.com/docs/foundry/agents/publish-and-call)
- [Palantir, Scoped permissions](https://www.palantir.com/docs/foundry/agents/scoped-permissions)
- [Palantir, Develop agents on a global branch](https://www.palantir.com/docs/foundry/agents/branching)
- [Palantir, Connect agents to external systems](https://www.palantir.com/docs/foundry/agents/sources)
- [Palantir, Build a pro-code agent with Continue](https://www.palantir.com/docs/foundry/agents/build-agent-continue)
- [Palantir, Use cases for pro-code agents](https://www.palantir.com/docs/foundry/agents/use-cases)

## 관련 문서

- [[Palantir-SDK-and-Agent-Tools|OSDK와 MCP의 자원 노출]]
- [[Palantir-Actions-and-Functions|서버 실행과 인가]]
- [[Palantir-Action-External-Effects|Branch의 외부 효과]]
- [[Palantir-AI-FDE-and-Skills|대화형 개발 에이전트]]
