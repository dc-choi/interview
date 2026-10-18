---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology MCP의 도구와 데이터 접근 경계

Ontology MCP(OMCP)는 Developer Console 애플리케이션이 노출한 Object, Action과 Query Function을 외부 MCP client가 호출하게 한다. Object type은 SQL tool로 읽고, 각 Action은 별도 tool로 미리 정의된 데이터 변경을 실행하며 Query Function은 읽기/계산 로직을 제공한다.

Palantir MCP(PMCP)는 Ontology type, dataset, transform 등 개발/구조 작업을 위한 도구다. OMCP의 업무 데이터 write와 PMCP의 type 변경을 구분한다. OMCP의 predefined Action도 허용한 업무 변경을 실제 실행하므로 단순 조회 도구로 취급하지 않는다.

## 활성화와 발견

Developer Console에서 application restrictions를 구성하고 MCP 페이지의 enable을 켠 뒤 client별 connection details를 사용한다. MCP Hub의 Ontology MCP 탭에서 enrollment의 서버를 찾고 해당 app 설정으로 이동할 수 있다. 현재 문서는 MCP tools를 지원하며 prompts/resources는 지원하지 않는다고 명시한다.

AIP 밖의 외부 LLM/client에 연결하면 Foundry 데이터가 그 client에 제공된다. application restrictions, 사용자/service-user permission과 조직의 외부 전송 정책을 적용한다. 읽기 시 row/column 제어가 response 이후의 데이터 사용까지 자동 통제하는 것으로 간주하지 않는다.

## 사용 구조

desktop assistant는 사용자의 공유 업무 데이터와 Action을 이용한다. 외부 agent framework나 compute module도 같은 OMCP endpoint를 사용할 수 있다. headless workflow는 Ontology를 상태/추적 계층으로 삼을 수 있지만 source의 auditability 설명이 agent의 올바른 판단이나 전체 end-to-end 성공을 보장하지는 않는다.

Foundry 안 orchestration agent가 외부 MCP server를 호출하는 outbound 경로와 외부 client가 OMCP로 들어오는 inbound 경로를 구별한다. AIP Logic/chatbot을 Function으로 저장해 MCP tool로 노출하면 agent를 다른 agent가 호출하는 구성이 가능하다. 각 tool의 권한과 실제 부작용을 별도로 제한한다.

같은 Ontology에 연결한 agent라도 호출 가능한 도구와 변경 결과를 각각 확인한다. DevCon 4 시연의 프로젝트 삭제 요청에서 Copilot은 삭제 도구가 없다고 응답한다. 발표자의 삭제 설명만으로 실행 성공을 확정할 수 없다. 이어지는 여러 framework의 결과 요약도 생성한 프로젝트와 작업 수가 서로 다르다. 동일한 MCP 계약이 동일한 판단과 변경 결과를 보장하는 것은 아니며, 실행 전 상태와 도구 결과, 대상 객체의 변경을 함께 대조해야 한다. (2026-10-18 [삭제 요청 화면 13분 37초](https://www.youtube.com/watch?v=QMKRMEuCoaU&t=817s), [framework별 요약 화면 16분 21초](https://www.youtube.com/watch?v=QMKRMEuCoaU&t=981s) 확인)

## 출처

- [Palantir, ontology-mcp](https://www.palantir.com/docs/foundry/ontology-mcp)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/ontology-mcp/getting-started)
- [Palantir, example-mcp-workflows](https://www.palantir.com/docs/foundry/ontology-mcp/example-mcp-workflows)
- [Palantir, sample-architecture](https://www.palantir.com/docs/foundry/ontology-mcp/sample-architecture)

## 관련 문서

- [[Palantir-Ontology-MCP]]
- [[Palantir-OMCP-Authentication]]
- [[Palantir-OSDK-Contracts]]
