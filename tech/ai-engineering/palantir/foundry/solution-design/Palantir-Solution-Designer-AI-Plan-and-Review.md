---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP Architect 계획과 Critic 검토의 한계"]
---

# AIP Architect 계획과 Critic 검토의 한계

## 계획을 생성하는 입력

AIP Architect는 목표 artifact/제약, data source/갱신 주기/규모/특성, no-code/low-code/pro-code 선호를 바탕으로 concept graph와 implementation pattern을 제안한다. Summary를 수정하면 후속 제안이 바뀌며 사람의 diagram 수정도 후속 계획의 문맥이 된다. Preview pattern과 Insert into graph를 구분한다.

Ontology concept는 별도 prompt로 object/property/link type 모델을 graph에 생성한다. 이는 운영 Ontology 정의를 승인/배포했다는 뜻이 아니다. Save and Start Building은 Walkthrough로 구현 단계를 안내하며 실제 리소스 생성과 작동 검증을 대신하지 않는다.

선택 가능한 모델은 enrollment enablement/configuration/licensing/권한에 따라 달라진다. 원문의 GPT-5 추천은 확인한 문서의 제안이며 task별 품질/비용이나 현재 조직 모델 지원을 독립 검증한 결과가 아니다.

## 검토의 증거 수준

AIP Critic은 diagram 구조를 sourcing/processing/modeling/ontology/analytics/application/platform 등으로 분류해 대화하고 개선안과 phased implementation plan/effort estimate를 만든다. 입력 diagram과 설명에 나타나지 않은 실제 caller/data volume/permission/deployment failure를 자동 검증했다고 볼 수 없다.

Critic 대화는 diagram에 저장되어 reopen 시 복원된다. 생성된 PDF와 아키텍처 계획은 제안/검토 기록으로 보존하되 채택된 결정과 배포 완료를 별도로 남긴다. Vision 기반 image import는 vision-capable model 접근을 필요로 하고 생성된 node/edge는 사람의 대조가 필요하다. 실제 AI 호출이나 리소스 구축은 수행하지 않았다.

## 출처

- [Palantir solution-designer, solution-designer](https://www.palantir.com/docs/foundry/solution-designer)
- [Palantir solution-designer, aip-architect](https://www.palantir.com/docs/foundry/solution-designer/aip-architect)
- [Palantir solution-designer, aip-critic](https://www.palantir.com/docs/foundry/solution-designer/aip-critic)
- [Palantir solution-designer, diagrams](https://www.palantir.com/docs/foundry/solution-designer/diagrams)
- [Palantir solution-designer, firstDiagram](https://palantir.com/docs/kr/foundry/solution-designer/firstDiagram/)
- [Palantir solution-designer, navigation](https://www.palantir.com/docs/foundry/solution-designer/navigation)
- [Palantir solution-designer, overview](https://www.palantir.com/docs/foundry/solution-designer/overview)
- [Palantir solution-designer, troubleshooting](https://www.palantir.com/docs/foundry/solution-designer/troubleshooting)
- [Palantir solution-designer, tutorial-create-your-first-diagram](https://www.palantir.com/docs/foundry/solution-designer/tutorial-create-your-first-diagram)

## 관련 문서

- [[Palantir-Solution-Design]]
