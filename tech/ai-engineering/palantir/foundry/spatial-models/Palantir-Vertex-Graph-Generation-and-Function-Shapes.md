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

### V2의 계획과 실행

V2는 두 단계로 동작한다. 경로 계획은 Ontology의 object type과 link type만으로 정의를 구체적인 query path 목록으로 바꾸고, 실행 전에 그 목록을 확인할 수 있다. 실행은 path를 하나씩 돌리며 path마다 시작점에서 한 단계씩 연결을 따라가며 기록하고(search forward), 마지막 단계부터 결과에 닿지 않는 객체를 지운 뒤(prune backward), 살아남은 경로의 link만 graph에 더한다. 뒤 단계의 filter가 앞 단계 결과를 줄이는 이유가 이 역방향 가지치기다. 결과는 path가 끝날 때마다 graph에 들어간다.

- 모든 query path는 start block의 객체에서 end block의 객체로 간다. Start block은 graph에서 현재 선택한 객체이며 여러 type을 섞을 수 있고, 맨 아래 단계가 end block이다. 양 끝을 아는 질문은 두 block을 먼저 정하고 사이 단계를 채운다.
- 단계는 object type, 방향을 고른 link type 또는 둘 다로 제한한다. Filter는 같은 단계의 다른 object type을 제한하지 않는다. Intersection objects는 object type 단계를 미리 정한 객체 집합으로 제한해 A에서 B를 거치는 경로 같은 질문에 쓴다.
- Step loop는 한 단계를 정한 횟수까지 반복하며 Any Object Type 단계이거나 자기 자신과 link가 있는 type이어야 결과가 나온다. Section loop는 여러 단계 묶음을 반복하며 section의 마지막 단계 type과 section의 첫 단계 type 사이에 link가 있어야 한다. Skip loop는 뒤 단계를 건너뛰는 path를 더한다. 공식 문서의 연결 항공편 예제(한 type씩인 Flight, Airport 단계와 마지막 단계로의 skip)에서는 최대 5회 반복 section이 비행 1회부터 5회까지 다섯 개의 path로 계획됐다. Path 수는 단계마다 고른 object type, link type과 skip에 따라 달라지므로 Any Object Type이나 여러 type을 쓰면 훨씬 많아질 수 있다.
- Parameter type은 String, Number, Boolean, Date, Timestamp이고 필수 여부를 지정할 수 있다. 값은 graph나 template 실행 시점에 넣을 수 있으며 Workshop에 embed한 graph는 Workshop variable로 값을 줄 수 있다.

기본 한도는 다음과 같고 enrollment마다 다를 수 있다. 대부분의 한도는 실패 대신 부분 결과와 경고를 돌려주므로, 경고가 보이면 결과를 전체로 읽지 말고 filter나 intersection objects를 더하거나 반복 횟수를 줄이거나 실행 전에 계획에서 긴 query path를 뺀다.

| 구분 | 한도 | 기본값 | 도달 시 |
| --- | --- | --- | --- |
| 계획 | 단계 수, loop 수 | 각 100 | 계획 실패 |
| 계획 | 탐색 깊이 | 50 hop | 그때까지 찾은 path만 반환 |
| 계획 | 전체 단계에서 탐색한 object type | 10,000 | 그때까지 찾은 path만 반환 |
| 계획 | 시작 object type별 query path | 500 | 가장 짧은 500개 반환 |
| 실행 | 단계당 반환 객체 | 50,000 | 단계 결과 잘림 |
| 실행 | 단계당 link를 불러올 객체 | 50,000 | 초과 객체의 link를 불러오지 않음 |
| 실행 | 단계당 불러오는 link | 1,000,000 | 잘림 |

계획 한도는 찾은 객체 수가 아니라 정의의 모양에 달려 있고, 무제한 반복 loop도 깊이와 path 한도에 묶인다. 실행 한도는 path의 단계마다 적용되므로 path가 여러 개면 graph에 더해지는 전체 객체 수는 단계 한도를 넘을 수 있다.

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

Diagramming(2026-11-09 대조 기준 beta, enrollment에서 꺼져 있을 수 있고 관리자가 Control Panel의 Vertex 설정에서 켠다. 쓸 수 있는 도구는 enrollment 설정과 graph 편집 권한에 따라 다름)은 편집 가능한 graph에 도형, 텍스트, note, 자유 그리기와 수동 edge를 더한다. 자유 주석은 graph에 속하며 Ontology 객체가 필요 없다. 수동 edge는 graph 안의 연결일 뿐 Ontology link를 만들지 않으므로 객체를 바꾸지 않고 과정을 설명할 때 쓴다. 반면 action-backed edge 도구가 설정되어 있으면 action 권한이 있는 사용자가 연결된 action을 실행할 수 있고 이는 Ontology 데이터를 바꿀 수 있으니 입력을 확인한 뒤 제출한다. 그린 요소와 스타일은 graph를 저장해야 남고 저장에는 graph resource의 저장 또는 편집 권한이 필요하며, 다른 앱에 embed된 graph는 host 앱이 편집과 저장을 막을 수 있다.

## 출처

- [Palantir vertex, vertex](https://www.palantir.com/docs/foundry/vertex)
- [Palantir vertex, chained-models](https://www.palantir.com/docs/foundry/vertex/chained-models)
- [Palantir vertex, configure-events](https://www.palantir.com/docs/foundry/vertex/configure-events)
- [Palantir vertex, configure-thresholds](https://www.palantir.com/docs/foundry/vertex/configure-thresholds)
- [Palantir vertex, derive-property-functions](https://www.palantir.com/docs/foundry/vertex/derive-property-functions)
- [Palantir vertex, diagrams](https://www.palantir.com/docs/foundry/vertex/diagrams)
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
