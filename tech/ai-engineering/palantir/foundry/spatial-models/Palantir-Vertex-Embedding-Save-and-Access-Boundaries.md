---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vertex embedding과 저장, 접근 경계"]
---

# Vertex embedding과 저장, 접근 경계

## Workshop binding

Input은 graph/template/diagram resource이며 variable mode는 graph, graph pointer 또는 graph template RID를 담은 string variable을 받는다. Template의 Override graph RID는 parameter로 새 graph를 생성하는 대신 저장한 graph를 연다. Parameter 변화 시 append 옵션은 기존 graph에 객체를 더하므로 매번 전체 재생성과 다르다. Refresh key 변화는 complete reload다. 이 절의 widget 설정은 2026-10-26 현재 embed 문서 기준이다.

Template parameter는 parameter마다 Workshop variable로 넣는다. Object type parameter에는 object set variable을, 나머지 parameter에는 type에 맞는 값을 준다. 필요한 object type을 모두 담은 object set variable 하나로 넣던 이전 방식은 Use legacy input object set으로 남아 있지만 권장되지 않는다. Non-object parameter가 없고 object type마다 object parameter가 하나인 template에서만 동작하기 때문이다. 여러 subgraph가 있는 graph나 diagram은 보여줄 subgraph의 객체를 하나라도 담은 object set variable로 그 subgraph를 고른다.

Load data from scenario를 켜면 widget은 base ontology 대신 scenario로 resource를 읽는다. Scenario의 편집은 병합 전까지 base ontology에 반영되지 않는 격리된 sandbox 편집이므로, 이때 graph의 값을 base 데이터의 현재 상태로 보고하지 않는다. Regenerate graph after applying or switching scenarios를 켜면 scenario가 수정되거나 전환될 때마다 graph를 다시 생성한다. Graph 안에서 실행한 Action이 scenario와 main 중 어디에 쓰이는지는 embed 문서가 밝히지 않으므로, 읽기와 쓰기 context의 연결은 [[Palantir-Ontology-Scenario-Contracts|Scenario의 격리, 수명과 병합 계약]] 기준으로 확인한다.

독립 Vertex 화면에서 template parameter를 바꿔 다시 실행하는 경로는 별도로 확인한다. 공식 GIF의 재실행 확인창은 현재 graph를 비운다고 경고한다. 기존 탐색을 보존해야 하면 저장 여부를 확인하고, 이 동작을 Workshop의 선택적 append 설정과 혼동하지 않는다. (2026-10-18 [공식 template 사용 GIF](https://www.palantir.com/docs/resources/foundry/vertex/template-usage.gif)의 확인창 확인)

선택 object set과 현재 subgraph의 object set은 다르다. Zoom to object set은 input이 바뀔 때마다 지정한 객체가 보이도록 viewport를 옮기고, Add objects to subgraph는 다른 widget이 넘긴 객체를 현재 subgraph에 더한다. Action success 이벤트는 underlying Action 실행 성공 뒤 발생한다. Available actions(All, Some, None)와 read-only UI 설정은 사용자의 backend 권한을 부여하거나 제거하는 증거가 아니다. Read-only는 graph 추가/재배치/toolbar를 제한하며 histogram 탐색은 가능하다. Widget에서는 Interface의 histogram panel을 켠 경우에만 그 panel이 보인다.

Time binding은 Date/Timestamp를 구분한다. Selected time의 기본값은 graph를 불러온 시각이며, Default 옵션은 variable과 동기화하지 않는다는 뜻이다. 기본 time window는 Control Panel에서 설정한다. Time selection과 time window는 timeline/time selection/series panel 중 하나가 활성화되어야 쓸 수 있다. 다중 subgraph가 있으면 navigation menu는 Enable subgraph navigation menu 설정과 관계없이 항상 나타난다. PNG export는 embedded resource의 frontend export 권한도 필요하다. 필수 input이 비어 template을 실행할 수 없을 때 대화상자에 보여줄 문구(Incomplete inputs message)를 정할 수 있다. Enable transition to Vertex application을 켜면 현재 graph 상태 그대로 Vertex 앱을 여는 버튼이 생긴다.

## 두 종류의 저장

Graph save는 resource와 현재 state를 저장하고 object에 RID를 연결하는 Action은 별도 단계다. Widget의 저장 설정(2026-10-26 embed 문서 기준)에서 새 graph의 기본 이름은 고정 문자열이나 string variable로, 기본 저장 위치는 folder 선택, 고정 folder RID 또는 folder RID나 경로를 담은 variable로 정한다. Show save dialog가 None이면 대화상자 없이 그 기본 이름과 위치로 저장되고, Resource dialog면 사용자가 이름과 위치를 고른다. Save as versioned graph를 켜면 unversioned였던 graph도 versioned graph로 저장해 autosave와 version history를 쓸 수 있다. On create new graph는 Workshop event나 Action을 실행한다. Action에는 saved graph RID, name과 현재 user ID를 special input으로 제공하며 Action의 필수 parameter에는 모두 default 값을 설정해야 한다. 저장된 graph를 객체의 Resource RID-formatted 문자열 property로 연결하면 Override RID로 재개할 수 있다.

Template 안의 saved style과 Workshop에서 임시 수정한 style은 다르다. Widget exploration 변경을 template 수정으로 보고하지 않는다. Versioning 활성화 뒤 save는 새 version이며 과거 version은 read-only, Revert는 과거 내용을 새 version으로 만든다. Duplicate는 원 graph와 별도 resource다.

## 공유와 규모의 한계

Graph 공유는 참조 object/time series의 접근을 추가로 부여하지 않는다. 접근이 없거나 데이터가 삭제된 경우 세부값 없이 graph의 구조/shape는 보일 수 있다고 명시된다. Graph structure 자체의 공개 범위도 검토해야 한다.

관리자는 search object count, Search Around 최대 객체/ungrouped node 수와 template depth를 설정한다. 자동 grouping이 발생한 graph를 모든 객체가 독립 node로 보이는 전체 결과라고 간주하지 않는다. Diagram beta와 time-series 가용성도 enrollment에 의존한다. 실제 공유 권한/표시와 load limit은 시험하지 않았다.

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
- [Palantir ontology, overview-ontology-scenario](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario/)

## 관련 문서

- [[Palantir-Spatial-Models]]
- [[Palantir-Ontology-Scenario-Contracts|Scenario의 격리, 수명과 병합 계약]]
