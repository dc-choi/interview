---
tags: [palantir, foundry, adoption]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Program governance의 주기와 검토 산출물

Governance는 왜 use case가 필요한지, 어떤 데이터를 쓰고 누가 행동하며 결정을 어떻게 검토할지 정한다. 아래 주기는 공식 강제 요건이 아닌 조직별 조정 가능한 운영 예시다. 회의 수보다 명확한 owner와 의사결정 결과가 중요하다.

| 운영 과정 | 권장 주기, owner | 판단과 산출물 |
| --- | --- | --- |
| SteerCo | 분기, Head of Program | 전체 program의 전략/범위/비용, live/developing/prospective 가치와 사용자 변화, enterprise IT alignment |
| Development/roadmap | 월, Program Manager | 진행/다음 deliverable, business case 가치, plan 변경과 우선순위/위험 결정 |
| Standup | 일, Data Lead | 이전/다음 작업과 blocker,30분 이내 예시 |
| Sprint planning | 격주, Data Lead | 이전 완료, capacity/requirements/estimate와 다음 범위 |
| Project creation | 월, 초기 Head of Program→Head of Data Governance | 목적/source/권한 요구와 승인, group/role을 반영한 project 생성 |
| Project access | 상시, 같은 governance owner | 요청 승인/거부와 적절한 IdP/Foundry group 배정 |
| Data permissions | 상시, governance owner+Use Case Lead | dataset/pipeline 또는 record visibility 정책의 문서화/적용 |
| Support | 상시, Data Lead/Program Manager | 내부 triage, vendor 전달에 필요한 근거와 재발 방지 |
| Training | Phase2부터 상시, Education Expert | lineage/Ontology 문서, 실제 workflow tutorial와 역할별 교육 |

Project creation 권한을 중앙 governance에 제한하고 승인 portal/inbox로 표준화하는 예시를 제시한다. Project role은 개별 사용자 직접 grant보다 IdP와 연결한 지정 group을 권한다. access 요청 처리는 그룹 관리 위치에 따라 network IdP 또는 Foundry 계정을 조정한다.

Phase1/2 지원은 program team이 맡을 수 있고 이후 dedicated support를 둔다. 중앙 공식 교육만으로 조직의 use case별 lineage, Ontology, 실제 application 사용법을 대신하지 않는다. executive에게 필요한 정보/빈도와 Domain Lead/user가 요청을 전달하는 feedback loop를 별도로 합의한다.

## 출처

- [Palantir, governance-processes](https://www.palantir.com/docs/foundry/foundry-adoption/governance-processes)

## 관련 문서

- [[Palantir-Program-Ownership-and-Scaling]]
