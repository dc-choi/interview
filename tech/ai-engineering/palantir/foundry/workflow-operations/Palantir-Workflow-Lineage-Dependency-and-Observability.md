---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workflow Lineage 의존성과 관측 범위"]
---

# Workflow Lineage 의존성과 관측 범위

## Graph가 보여 주는 범위

Workflow Lineage는 이전 이름 Workflow Builder를 사용했던 의존성 분석 도구다. Object/Action/Function/interface/Workshop/model/AIP 관련 리소스와 property provenance를 연결하며 Data Lineage의 전체 원천 데이터 pipeline을 대체하지 않는다. Workshop과 third-party application의 자동 확장은 약800 node에서 멈출 수 있어 표시된 graph를 완전한 목록으로 보지 않는다.

Property usage 수는 선택 문맥의 Function/Action/linkage/application 의존성을 뜻한다. Object link/input line은 기본 숨겨질 수 있고 node 선택에 따라 나타난다. Trashed filter는 graph와 연결을 숨기며 실제 리소스를 삭제하지 않는다. Folder 추가는 지원하는 리소스를 대상으로 하며 폴더의 모든 파일을 뜻하지 않는다. AI FDE 진입점은 현재 chat context의 리소스를 사용한다.

다른 ontology의 node를 함께 볼 수 있지만 한 번에 하나만 선택하며 object/action 기능이 제한된다. 예를 들어 Function-backed Action 일괄 변경은 선택한 ontology에 한정된다. 회색 node와 경고를 권한 부재/데이터 없음으로 곧바로 해석하지 않는다.

## 관측 수치와 보안

Successful/Attempted/Rate-limited 실행 수는 같은 지표가 아니다. Token log/debugger와 usage attribution도 구분한다. Function 지연 통계와 최근 사용량의 기간, 가중 집계 방식이 다르므로 단순 평균으로 재계산하지 않는다. Workshop 색상은 최근4주의 view/edit 사용량이며 weekly panel의 total views와 unique users도 다르다.

Ontology definition 접근과 data/execution 접근, 일반 resource role을 별도로 표시한다. View as와 Action submission debug는 정책 충족 여부를 분석하며 자격을 부여하지 않는다. Node가 보이거나 type을 읽을 수 있다는 사실로 object data 읽기/Action 제출을 보장하지 않는다.

Presentation frame은 graph 배치/색/zoom을 저장하고 side/bottom panel은 포함하지 않는다. 기존 frame은 직접 편집하는 대신 새 frame으로 대체하며 branch에서는 frame 순서 변경이 불가능하다. 저장된 화면은 현재 실행 상태나 전체 의존성의 불변 증거가 아니다.

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
