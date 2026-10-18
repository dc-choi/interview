---
tags: [palantir, data-lineage, permissions, markings]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Data Lineage 탐색과 접근 검사"]
---

# Data Lineage 탐색과 접근 검사

Data Lineage는 dataset/source/artifact/Ontology entity의 연결을 표시하고 data/logic/history/health를 조사하는 graph다. 현재 화면의 node 집합과 모든 resource의 전체 계보를 구분한다. Parent/descendant, 두 node 사이 경로와 common ancestors를 명시적으로 확장하고 node count를 보며 탐색 범위를 조절한다.

## 화면에 있는 범위에서만 비교한다

Search/browse로 resource를 넣고 single selection에서 properties, multiple selection에서 histogram을 본다. Frequent columns/folder paths/last modified는 선택 node의 분포다. 같은 이름의 column이 있다고 동일 의미나 실제 column-level 변환 관계가 증명되지는 않는다. 필요한 dataset을 graph에 추가하지 않으면 histogram에도 포함되지 않는다.

Node는 source/dataset/object type/artifact를 구분하며 dataset dashed border는 unstructured, sync/object-definition/open-issue/trash badge는 별도 속성이다. Related artifacts는 직접 연결된 분석/application을 찾고 기본적으로 deleted/autosaved를 제외할 수 있다. 목록을 모든 소비자/모든 사용자의 완전한 usage graph로 단정하지 않는다.

Data preview는 문서 기준 첫 300 row이며 표본이다. Code helper는 code-backed resource의 logic을 조사하며 uploaded/writeback dataset에는 코드가 없을 수 있다. Fusion은 sheet 같은 원 authoring app으로 이동한다. Code helper의 수정 가능성과 실제 build/publish 권한도 구분한다.

## Coloring은 metric과 시간 범위를 가진다

Build status와 Health는 grouped node에서 가장 심각한 상태를 표시한다. Out-of-date with parent는 direct parent 변경 미반영, with ancestor는 direct parent와는 맞지만 더 위쪽 변경이 남은 경우다. Data update와 JobSpec logic update를 따로 확인한다.

Time last built/Build duration은 성공 build 기준, user views는 최근 4주 기준이다. Row count가 없으면 계산이 필요할 수 있다. Storage/Compute coloring은 virtual storage 또는 pushdown engine을 구분한다. Missing/Unavailable은 권한이나 지원 resource 제한일 수 있어 데이터/코드 부재의 확정 증거가 아니다.

## Resource role과 data access는 다르다

Permissions의 Resource access는 Viewer/Editor 같은 resource role을 보여주고 Data access는 dataset lineage가 더하는 제약을 보여준다. Contour analysis Editor라도 underlying data 접근이 없을 수 있다. View as로 사용자의 graph node 접근을 확인하되 이 검사는 모든 runtime workflow 성공을 실행해 검증한 것은 아니다.

Marking simulation은 마지막 finalized dataset build를 기반으로 하며 아직 확정되지 않은 변화를 반영하지 않는다. 직접 dataset에 붙인 Marking의 적용/제거는 모의할 수 있지만 inherited/parent Project Marking 제거는 이 UI에서 simulation할 수 없다.

Access affected/unaffected와 No visible transactions를 구분한다. 후자는 미build 또는 transaction 열람 불가일 수 있다. 다른 input에서 같은 Marking이 오거나 code의 stop_propagating이 있으면 결과가 달라질 수 있으므로 모든 parent와 code를 읽는다. Simulation을 실행했다는 사실이 실제 Marking 변경 또는 재계산 완료를 의미하지 않는다.

## 저장과 공유

Saved graph는 graph configuration/branch context를 보존한다. Quick share link는 같은 organization에 read-only graph를 공유하는 경로이며 cross-organization은 양쪽이 접근 가능한 shared Project에 저장한다. Graph link 공유가 underlying resource/data 권한을 자동 부여하지 않는다. SVG export는 정적인 화면 기록이며 live state/권한 검사의 대체가 아니다.

## 출처

- [Palantir, Data Lineage](https://www.palantir.com/docs/foundry/data-lineage)
- [Palantir, Navigation](https://www.palantir.com/docs/foundry/data-lineage/navigation)
- [Palantir, Graph elements reference](https://www.palantir.com/docs/foundry/data-lineage/elements-reference)
- [Palantir, Explore lineage](https://www.palantir.com/docs/foundry/data-lineage/explore-lineage)
- [Palantir, Explore artifacts and ontology entities](https://www.palantir.com/docs/foundry/data-lineage/explore-artifacts)
- [Palantir, Preview and logic](https://www.palantir.com/docs/foundry/data-lineage/dataset-preview-logic)
- [Palantir, Find a column](https://www.palantir.com/docs/foundry/data-lineage/find-column)
- [Palantir, Node coloring](https://www.palantir.com/docs/foundry/data-lineage/node-coloring)
- [Palantir, Check resource permissions](https://www.palantir.com/docs/foundry/data-lineage/check-permissions)
- [Palantir, See impact of Marking changes](https://www.palantir.com/docs/foundry/data-lineage/see-impact-marking-changes)
- [Palantir, Save and share a graph](https://www.palantir.com/docs/foundry/data-lineage/save-share-graph)
- [Palantir, Data Lineage questions](https://www.palantir.com/docs/foundry/data-lineage/faq)

## 관련 문서

- [[Palantir-Lineage-Branches-and-Builds|Branch와 graph]]
- [[Palantir-Pipeline-Markings-and-Declassification|Marking propagation]]
