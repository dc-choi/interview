---
tags: [palantir, foundry, rules]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Rules workflow의 입력, 승인과 실행

Foundry Rules는 조건과 변환을 묶은 business rule을 dataset/object에 적용한다. Rule Editor의 Submit changes는 proposal을 생성하고 승인 Action이 활성 rule을 바꾼다. 승인만으로 출력 dataset이 갱신되지는 않는다. rule writeback/materialization과 rule output을 모두 build하거나 schedule로 연결해야 결과가 최신 규칙을 반영한다.

Workflow deployment는 선택한 Space/Ontology에 project, backing datasets, Rule/Proposal object type, Actions와 Workshop application을 만든다. rule editor group은 생성/수정/삭제 proposal과 승인 submission criteria의 초기값이다. workflow resource 권한이 configuration 수정/이동/삭제를 제어한다.

최소 하나의 input과 하나 이상의 column을 가진 output이 필요하다. input은 dataset/object이고 허용 link도 owner가 선택한다. RV-backed object는 직접 input으로 쓸 수 없어 RV backing dataset을 alternate backing dataset으로 지정한다. 이는 해당 alternate dataset에서 평가한다는 뜻이며 RV의 사용자별 필터와 동일하다고 가정하지 않는다. multiple data sources, multiple materializations 또는 edit-only property object type은 지원하지 않는다.

Logic board는 앞 board의 row/column을 받아 filter, expression, aggregate, join 등을 적용한다. Preview는 단계 결과를 확인한다. 각 output은 schema가 정해진 dataset이며 같은 output을 쓰는 모든 rule의 결과 row를 담는다. 서로 다른 schema는 output을 나누거나 optional field로 모델링한다. generated pipeline은 input backing datasets와 rules writeback을 읽고 결과 및 rule status를 쓴다.

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/foundry-rules/overview).

## 출처

- [Palantir, foundry-rules](https://www.palantir.com/docs/foundry/foundry-rules)
- [Palantir, author-and-run-a-rule](https://www.palantir.com/docs/foundry/foundry-rules/author-and-run-a-rule)
- [Palantir, configure-workflow](https://www.palantir.com/docs/foundry/foundry-rules/configure-workflow)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/foundry-rules/core-concepts)
- [Palantir, deploy-foundry-rules](https://www.palantir.com/docs/foundry/foundry-rules/deploy-foundry-rules)
- [Palantir, deploy-workflow](https://www.palantir.com/docs/foundry/foundry-rules/deploy-workflow)
- [Palantir, foundry-rules-workflow-configuration](https://www.palantir.com/docs/foundry/foundry-rules/foundry-rules-workflow-configuration)
- [Palantir, rule-logic](https://www.palantir.com/docs/foundry/foundry-rules/rule-logic)
- [Palantir, workshop-application](https://www.palantir.com/docs/foundry/foundry-rules/workshop-application)

## 관련 문서

- [[Palantir-Rules-Governance-and-Outputs]]
- [[Palantir-Rules-Legacy-and-Migration]]
