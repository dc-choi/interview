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

Graph template은 object/non-object parameter, 탐색과 style/layout을 저장한다. 일반 graph는 현재 탐색 상태이며 embedded graph를 수정해도 원 template은 바뀌지 않는다. Marketplace 제품은 Vertex graph template의 기능을 지원하지만 V1으로 저장한 Search Around와 intersection object를 쓰는 Search Around는 패키징할 수 없다(2026-11-09 대조). V1 Search Around는 V2에서 다시 저장한 뒤 패키징한다.

## Saved Search Around V1과 V2

2026-11-09 Saved Search Around V1, V2와 Marketplace 문서를 대조한 절이다. 다른 절의 검증 날짜는 frontmatter 기준을 유지한다.

Search Around 패널은 여러 단계의 link 탐색과 filter를 묶어 새 graph를 만드는 도구다. V1에서는 같은 object type의 객체 하나 이상을 시작 집합으로 골라 link를 선택한다. 단계 연결과 filter의 역전파는 위 절과 같다. 패널은 단계마다 찾은 객체 수를 보여 주고, **Add to graph**를 눌러야 graph가 생성되며 복잡한 탐색은 생성이 더 오래 걸릴 수 있다.

재사용을 위해 parameter를 정의할 수 있다. Parameter는 이름, 설명과 기본값을 가지며 기본값은 Search Around를 불러올 때마다 적용된다. 같은 자료형의 filter 필드에만 연결할 수 있고 값을 바꾸면 그 parameter를 쓰는 모든 filter가 함께 바뀐다. V1의 저장 대화상자는 이름과 위치를 받고, 저장한 Search Around는 다른 graph나 graph template에서 쓰는 resource가 된다. 불러온 뒤에는 graph에서 시작 객체를 골라야 하며 알맞은 type의 객체만 고를 수 있다. 따라서 재사용 단위는 특정 시작 객체가 아니라 탐색 정의로 읽힌다(해석). 저장 대화상자에서 시작 object type을 지정하는 기능은 V2 문서에만 있다.

V2가 켜진 enrollment에서는 V2 패널이 V1을 대체하고 단계마다 여러 object type, wildcard 단계, 반복 단계와 object-backed link type을 지원한다. 패널에서 **Any Object Type** 단계를 추가할 수 있으면 V2다. Enrollment가 V2로 바뀐 뒤에도 V1에서 저장한 Search Around는 계속 쓸 수 있고, graph와 template은 V2에서 명시적으로 다시 저장하기 전까지 V1 버전을 실행한다. 다시 저장하는 이전은 손실이 생길 수 있다. 불러오지 못한 filter는 저장 시 빠지며 이전 경고가 그 filter를 알려 준다. Filter가 빠지면 결과가 넓어질 수 있으므로 경고를 확인한 뒤 저장한다. V1은 범위 filter의 최소와 최대가 뒤바뀌면 자동으로 맞바꿨지만 V2는 그러지 않아 결과가 비므로, 이전 뒤 범위 filter의 순서도 점검한다. 문서나 교육 자료를 볼 때는 화면이 어느 버전인지 먼저 확인한다.

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
- [Palantir vertex, saved-search-around-v1](https://www.palantir.com/docs/foundry/vertex/saved-search-around-v1)
- [Palantir vertex, saved-search-around-v2](https://www.palantir.com/docs/foundry/vertex/saved-search-around-v2)
- [Palantir vertex, scenarios-getting-started](https://www.palantir.com/docs/foundry/vertex/scenarios-getting-started)
- [Palantir vertex, scenarios-options](https://www.palantir.com/docs/foundry/vertex/scenarios-options)
- [Palantir vertex, scenarios-overview](https://www.palantir.com/docs/foundry/vertex/scenarios-overview)
- [Palantir vertex, timeline](https://www.palantir.com/docs/foundry/vertex/timeline)
- [Palantir vertex, use-time-selection](https://www.palantir.com/docs/foundry/vertex/use-time-selection)
- [Palantir vertex, vertex-settings-control-panel](https://www.palantir.com/docs/foundry/vertex/vertex-settings-control-panel)

## 관련 문서

- [[Palantir-Spatial-Models]]
