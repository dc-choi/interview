---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
---

# Ontology MCP의 도구와 데이터 접근 경계

Ontology MCP(OMCP)는 Developer Console 애플리케이션이 노출한 Object, Action과 Query Function을 외부 MCP client가 호출하게 한다. 2026-10-25 sample architecture 문서 기준 Object type은 SQL tool로 읽고, 각 Action은 별도 tool로 미리 정의된 데이터 변경을 실행하며, Query Function은 개별 tool로 읽기/계산 로직을 제공한다. 같은 날 MCP Inspector 디버깅 문서 기준 Tools 목록에는 application restrictions에 구성한 resource가 search tool, action tool, query tool 등으로 나타나므로, 실제 노출 형태는 대상 앱의 Tools 목록에서 확인한다.

Palantir MCP(PMCP)는 OSDK application, dataset, transform과 Ontology 개발을 다루는 개발자 같은 Ontology builder용이며 운영 데이터 상호작용이 아닌 개발 workflow에 초점을 둔다. 2026-10-25 Ontology MCP Overview 기준 PMCP의 도구는 70개가 넘고, PMCP는 Ontology 구조를 바꿀 수 있지만 실제 Ontology 데이터는 쓰지 못한다. 같은 날 Available tools 문서 기준 도구 목록은 Compass, Dataset, Ontology, Object set, OSDK, Code Repository, Global Branching 등 여러 범주에 걸치며, object type, link type, action type을 만들거나 고치고 지우는 도구는 그중 Ontology 범주에 속하고 지정한 branch에서 동작한다. Object set 범주에는 local development용 조회와 집계 도구가 있으므로 쓰기 불가를 읽기 불가로 읽지 않는다. 목록에 Action 실행이나 object 직접 편집 도구는 없지만 새 dataset 생성 도구와 Python transforms repository의 build_datasets 도구는 있다. 보안 문서는 기존 dataset의 갱신과 삭제를 허용하지 않는다고 하지만 build_datasets로 기존 transform 출력을 다시 빌드하는 경우와의 관계는 설명하지 않으므로, build로 다시 계산되는 backing dataset이 Ontology 값에 미치는 영향은 대상 branch와 권한을 포함해 따로 확인한다(적용 해석). Branch, proposal과 기존 dataset 갱신 제한은 [[Palantir-MCP-Data-Governance-and-Proposals|Palantir MCP 데이터 경계와 변경 제안]]에서 다룬다.

OMCP는 Ontology consumer, 즉 object를 읽고 데이터를 query하며 미리 정의된 Action으로 Ontology 데이터를 쓰는 외부 AI agent용이다. MCP로 노출할 Ontology resource(object type, action type, query function 등)의 범위와 agent가 실행할 수 있는 Action은 application restrictions로 제한한다. OMCP의 Ontology 데이터 write와 PMCP의 Ontology 구조 변경을 구분한다. OMCP의 predefined Action도 허용한 업무 변경을 실제 실행하므로 단순 조회 도구로 취급하지 않는다.

## 활성화와 발견

Developer Console에서 application restrictions를 구성하고 MCP 페이지의 enable을 켠 뒤 client별 connection details를 사용한다. 활성화한 application은 Ontology resource를 MCP tool로 노출한다. MCP Hub의 Ontology MCP 탭에서 enrollment의 서버를 찾고 해당 app 설정으로 이동할 수 있다. 2026-10-25 기준 OMCP는 MCP의 prompts와 resources 기능을 지원하지 않으므로 MCP Inspector의 Prompts와 Resources 탭은 빈 목록을 보인다.

AIP 밖의 외부 LLM/client에 연결하면 Foundry 데이터가 그 client에 제공된다. application restrictions, 사용자/service-user permission과 조직의 외부 전송 정책을 적용한다. 읽기 시 row/column 제어가 response 이후의 데이터 사용까지 자동 통제하는 것으로 간주하지 않는다.

## 사용 구조

desktop assistant는 사용자의 공유 업무 데이터와 Action을 이용한다. 외부 agent framework로 만든 agent나 Foundry 안 compute module로 호스팅한 agent도 같은 Developer Console 앱의 OMCP 서버에 연결할 수 있다. headless workflow는 Ontology를 상태/추적 계층으로 삼을 수 있고, 2026-10-25 example workflows 문서 기준 agent가 OMCP로 수행한 action은 Ontology에 기록되어 무인 작업의 auditability를 제공한다. 다만 결정 맥락을 남기는 Action log는 action type별로 켜야 하고 성공한 제출만 기록한다. 실패한 제출은 Action metrics가 action type별 최근 30일 건수와 실패 유형(security submission criteria 미통과는 Authentication failure)으로 집계하고 Run history에서 개별 실행의 성공과 실패를 볼 수 있지만 두 화면 모두 조회 기간이 정해져 있고 Run history의 기간은 문서마다 다르게 적혀 있으므로(2026-10-26 기준 Action metrics 문서는 Run history를 최근 7일, Run history 문서는 최근 30일로 적는다), 기간을 넘겨 보존할 시도별 기록과 Foundry에 제출되기 전 client에서 거부된 호출은 client 쪽 실행 로그로 따로 남긴다([[Palantir-Action-Observability-and-Recovery|Action 관측과 복구]]). 이 기록이 agent의 올바른 판단이나 전체 end-to-end 성공을 보장하지는 않는다.

Foundry 안 orchestration agent가 외부 MCP server를 호출하는 outbound 경로와 외부 client가 OMCP로 들어오는 inbound 경로를 구별한다. AIP Logic/chatbot을 Function으로 저장해 MCP tool로 노출하면 agent를 다른 agent가 호출하는 구성이 가능하다. 각 tool의 권한과 실제 부작용을 별도로 제한한다.

같은 Ontology에 연결한 agent라도 호출 가능한 도구와 변경 결과를 각각 확인한다. DevCon 4 시연의 프로젝트 삭제 요청에서 Copilot은 삭제 도구가 없다고 응답한다. 발표자의 삭제 설명만으로 실행 성공을 확정할 수 없다. 이어지는 여러 framework의 결과 요약도 생성한 프로젝트와 작업 수가 서로 다르다. 동일한 MCP 계약이 동일한 판단과 변경 결과를 보장하는 것은 아니며, 실행 전 상태와 도구 결과, 대상 객체의 변경을 함께 대조해야 한다. (2026-10-18 [삭제 요청 화면 13분 37초](https://www.youtube.com/watch?v=QMKRMEuCoaU&t=817s), [framework별 요약 화면 16분 21초](https://www.youtube.com/watch?v=QMKRMEuCoaU&t=981s) 확인)

## 출처

- [Palantir, ontology-mcp](https://www.palantir.com/docs/foundry/ontology-mcp)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/ontology-mcp/getting-started)
- [Palantir, example-mcp-workflows](https://www.palantir.com/docs/foundry/ontology-mcp/example-mcp-workflows)
- [Palantir, sample-architecture](https://www.palantir.com/docs/foundry/ontology-mcp/sample-architecture)
- [Palantir, debugging-with-mcp-inspector](https://www.palantir.com/docs/foundry/ontology-mcp/debugging-with-mcp-inspector)
- [Palantir, available-tools](https://www.palantir.com/docs/foundry/palantir-mcp/available-tools)
- [Palantir, action-log](https://www.palantir.com/docs/foundry/action-types/action-log)
- [Palantir, action-metrics](https://www.palantir.com/docs/foundry/action-types/action-metrics)
- [Palantir, security](https://www.palantir.com/docs/foundry/palantir-mcp/security)
- [Palantir, run-history](https://www.palantir.com/docs/foundry/aip-observability/run-history)

## 관련 문서

- [[Palantir-Ontology-MCP]]
- [[Palantir-OMCP-Authentication]]
- [[Palantir-OSDK-Contracts]]
- [[Palantir-MCP-Data-Governance-and-Proposals|Palantir MCP 데이터 경계와 변경 제안]]
- [[Palantir-Action-Observability-and-Recovery|Action 관측과 복구]]
