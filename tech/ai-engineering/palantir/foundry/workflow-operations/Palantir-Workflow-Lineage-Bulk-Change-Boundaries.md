---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workflow Lineage 일괄 변경과 승인 경계"]
---

# Workflow Lineage 일괄 변경과 승인 경계

## 기능마다 다른 적용 경로

Function-backed Action upgrade는 새 branch, 선택한 branch, Main 직접 적용 경로를 가진다. Action log가 있는 Action의 새 Function이 새 object type을 편집하면 Ontology Manager에서 upgrade해야 한다. Workshop/automation upgrade의 all-or-nothing과 partial은 개별 리소스의 breaking change 처리 방식이며 모든 외부 변경을 원자적으로 묶는 계약이 아니다.

Function version을 지정하지 않으면 repository의 최신 version을 선택한다. 성공/기존 최신/breaking/error 상태와 개별 실패 결과를 확인해야 하며 일괄 요청 성공만으로 전부 적용됐다고 보고하지 않는다. Automation은 upgrade 중 ownership 인수 옵션이 있다. Workshop Function/custom widget upgrade와 publish는 별도 단계이며 최신 code와 최신 published version은 다를 수 있다.

Action submission criteria 일괄 변경은 source Action의 기준을 복사하며 Main에 proposal 없이 바로 적용할 수 있다. Ontology role grant도 원문상 즉시 적용하고 되돌리기 불가능하다고 설명한다. 정책을 시각화하는 것과 변경하는 것을 구분한다.

AIP Logic bulk model replacement는 graph에 올라온 직접 consumer 중 편집 가능한 node만 대상으로 한다. Palantir-provided 모델만 지원하고 source/target 중 registered model이 있으면 비활성화된다. 변경은 proposal/review 없이 직접 적용하며 graph refresh는 지연될 수 있다. 이 bulk Logic 변경을 모든 branch 지원 기능과 동등하게 보지 않는다.

## 삭제 설명의 차이

Branching 문서는 branch/Main의 삭제 경로를 설명하지만 refactor 문서는 object/action bulk delete 시 연결 link type을 포함한 proposal을 생성하고 Ontology Manager에서 merge한다고 설명한다. 두 원문을 단일한 무조건 직접 삭제 또는 항상 proposal 계약으로 통합하지 않는다. 실제 실행 전 현재 branch/리소스/UI의 적용 경로를 확인해야 한다.

Compass bulk move는 eligible/skipped 목록과 사유를 제공한다. Marketplace sidebar는 local store만 검색하며 package overlap/누락 input을 분석한다. 그림에 나타난 package 경계가 자동 배포나 권한 승인을 의미하지 않는다. 실제 upgrade, publish, role grant, 삭제와 이동은 수행하지 않았다.

## 출처

- [Palantir workflow-lineage, workflow-lineage](https://www.palantir.com/docs/foundry/workflow-lineage)
- [Palantir workflow-lineage, aip-usage-observability](https://www.palantir.com/docs/foundry/workflow-lineage/aip-usage-observability)
- [Palantir workflow-lineage, branching-workflow-lineage](https://www.palantir.com/docs/foundry/workflow-lineage/branching-workflow-lineage)
- [Palantir workflow-lineage, getting-started](https://www.palantir.com/docs/foundry/workflow-lineage/getting-started)
- [Palantir workflow-lineage, keyboard-shortcuts](https://www.palantir.com/docs/foundry/workflow-lineage/keyboard-shortcuts)
- [Palantir workflow-lineage, manage-security](https://www.palantir.com/docs/foundry/workflow-lineage/manage-security)
- [Palantir workflow-lineage, overview](https://www.palantir.com/docs/foundry/workflow-lineage/overview)
- [Palantir workflow-lineage, refactor-and-understand-workflows](https://www.palantir.com/docs/foundry/workflow-lineage/refactor-and-understand-workflows)

## 관련 문서

- [[Palantir-Workflow-Operations]]
