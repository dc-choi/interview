---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vertex 그래프 생성과 함수 반환 계약"]
---

# Vertex 그래프 생성과 함수 반환 계약

## 참조와 그래프의 의미

Vertex는 Ontology object/link를 그래프와 도표로 탐색하고 modeled condition을 비교한다. 그래프에 관계를 그리는 것과 실제 인과관계가 검증된 것은 다르다. Search Around의 다음 단계는 이전 결과 집합에서 시작하며 하류 filter가 연결된 시작 집합도 줄일 수 있다.

Graph template은 object/non-object parameter, 탐색과 style/layout을 저장한다. 일반 graph는 현재 탐색 상태이며 embedded graph를 수정해도 원 template은 바뀌지 않는다. Marketplace template은 saved Search Around를 제외한 기능을 지원한다고 명시된다.

## Search Around function

발견에는 정확한 IGraphSearchAroundResultV1 이름/구조와 객체 입력이 필요하다. UI 실행은 추가 literal parameter를 지원하지만 URL 실행은 objectRid/objectSetRid와 function RID의 조합이다. 최신 published function을 사용하며 repository의 object/link와 backing dataset import가 필요할 수 있다.

- directEdges는 source/target object RID와 선택적 linkTypeRid다. Intermediate edge는 중간 object RID와 양쪽 link RID를 추가한다.
- 같은 양 끝의 intermediate object는 edge로 묶일 수 있지만 이미 graph에 있거나 입력으로 받은 객체는 독립 node로 남는다.
- orphanObjectRids는 edge에 등장하지 않는 독립 객체다. objectRidsToGroup의 그룹이 RID를 공유하면 그룹을 합친다.
- Direction은 NONE/FORWARD/REVERSE, 생략 시 FORWARD다. 실제 linkTypeRid로 생성된 link에는 이 override가 적용되지 않는다.
- Layout override는 앱에서 직접 실행할 때만 적용하고 template 생성에는 적용되지 않는다.

Derived-property 함수는 object set 하나만 입력으로 받고 객체→primitive 또는 primitive-field custom type의 map을 반환한다. TSv1 FunctionsMap과 TSv2 Record<ObjectSpecifier,...>의 identity 형태를 구분한다. 단일 객체마다 호출하는 형태를 쓰지 않는 성능 전제가 있다. 예제의 0분모와 syntax 오류를 해결된 코드라고 복사하지 않았다.

## 시각적 그룹과 원본

Grouping, link merging, histogram filter와 edge arrow는 그래프의 표현이다. Link 기본 화살표와 primary/undirectional/bidirectional type class 또는 graph별 reverse/hide를 실제 데이터 흐름의 보장으로 해석하지 않는다. Cartesian layout은 viewport에 좌표를 정규화하므로 물리 거리 좌표가 아니다. Saved selection은 겹칠 수 있고 border 색은 첫3개만 보여 준다.

## 출처

- [Palantir vertex, vertex](https://www.palantir.com/docs/foundry/vertex)
- [Palantir vertex, chained-models](https://www.palantir.com/docs/foundry/vertex/chained-models)
- [Palantir vertex, configure-events](https://www.palantir.com/docs/foundry/vertex/configure-events)
- [Palantir vertex, configure-thresholds](https://www.palantir.com/docs/foundry/vertex/configure-thresholds)
- [Palantir vertex, derive-property-functions](https://www.palantir.com/docs/foundry/vertex/derive-property-functions)
- [Palantir vertex, embed-graph-workshop](https://www.palantir.com/docs/foundry/vertex/embed-graph-workshop)
- [Palantir vertex, events-overview](https://www.palantir.com/docs/foundry/vertex/events-overview)
- [Palantir vertex, example-use-cases](https://www.palantir.com/docs/foundry/vertex/example-use-cases)
- [Palantir vertex, explore-object-relationships](https://www.palantir.com/docs/foundry/vertex/explore-object-relationships)
- [Palantir vertex, explore-related-events](https://www.palantir.com/docs/foundry/vertex/explore-related-events)
- [Palantir vertex, explore-time-series](https://www.palantir.com/docs/foundry/vertex/explore-time-series)
- [Palantir vertex, generate-graph-apps](https://www.palantir.com/docs/foundry/vertex/generate-graph-apps)
- [Palantir vertex, generate-graph-functions](https://www.palantir.com/docs/foundry/vertex/generate-graph-functions)
- [Palantir vertex, graphs-display-options](https://www.palantir.com/docs/foundry/vertex/graphs-display-options)
- [Palantir vertex, graphs-explore](https://www.palantir.com/docs/foundry/vertex/graphs-explore)
- [Palantir vertex, graphs-template](https://www.palantir.com/docs/foundry/vertex/graphs-template)
- [Palantir vertex, link-merging](https://www.palantir.com/docs/foundry/vertex/link-merging)
- [Palantir vertex, marketplace-vertex](https://www.palantir.com/docs/foundry/vertex/marketplace-vertex)
- [Palantir vertex, media-layers](https://www.palantir.com/docs/foundry/vertex/media-layers)
- [Palantir vertex, overview](https://www.palantir.com/docs/foundry/vertex/overview)
- [Palantir vertex, read-only-mode](https://www.palantir.com/docs/foundry/vertex/read-only-mode)
- [Palantir vertex, save-share](https://www.palantir.com/docs/foundry/vertex/save-share)
- [Palantir vertex, scenarios-getting-started](https://www.palantir.com/docs/foundry/vertex/scenarios-getting-started)
- [Palantir vertex, scenarios-options](https://www.palantir.com/docs/foundry/vertex/scenarios-options)
- [Palantir vertex, scenarios-overview](https://www.palantir.com/docs/foundry/vertex/scenarios-overview)
- [Palantir vertex, timeline](https://www.palantir.com/docs/foundry/vertex/timeline)
- [Palantir vertex, use-time-selection](https://www.palantir.com/docs/foundry/vertex/use-time-selection)
- [Palantir vertex, vertex-settings-control-panel](https://www.palantir.com/docs/foundry/vertex/vertex-settings-control-panel)

## 관련 문서

- [[Palantir-Spatial-Models]]
