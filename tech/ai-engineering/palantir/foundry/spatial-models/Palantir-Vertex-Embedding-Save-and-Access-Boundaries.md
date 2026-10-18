---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vertex embedding과 저장, 접근 경계"]
---

# Vertex embedding과 저장, 접근 경계

## Workshop binding

Input은 graph/template/diagram resource이며 variable mode는 RID를 받는다. Template의 Override graph RID는 parameter로 새 graph를 생성하는 대신 저장한 graph를 연다. Parameter 변화 시 append 옵션은 기존 graph에 객체를 더하므로 매번 전체 재생성과 다르다. Refresh key 변화는 complete reload다.

독립 Vertex 화면에서 template parameter를 바꿔 다시 실행하는 경로는 별도로 확인한다. 공식 GIF의 재실행 확인창은 현재 graph를 비운다고 경고한다. 기존 탐색을 보존해야 하면 저장 여부를 확인하고, 이 동작을 Workshop의 선택적 append 설정과 혼동하지 않는다. (2026-10-18 [공식 template 사용 GIF](https://www.palantir.com/docs/resources/foundry/vertex/template-usage.gif)의 확인창 확인)

선택 object set과 현재 subgraph의 object set은 다르다. Action success 이벤트는 underlying Action 실행 성공 뒤 발생한다. Available actions와 read-only UI 설정은 사용자의 backend 권한을 부여하거나 제거하는 증거가 아니다. Read-only는 graph 추가/재배치/toolbar를 제한하며 histogram 탐색은 가능하다.

Time binding은 Date/Timestamp를 구분한다. Time selection은 timeline/time/series panel 중 하나가 활성화되어야 쓸 수 있다. 다중 subgraph가 있으면 navigation menu를 숨기는 설정과 별개로 나타날 수 있다. PNG export는 embedded resource의 frontend export 권한도 필요하다.

## 두 종류의 저장

Graph save는 resource와 현재 state를 저장하고 object에 RID를 연결하는 Action은 별도 단계다. On create new graph는 RID/name/user ID를 special input으로 제공하며 추가 필수 parameter default를 준비해야 한다. 저장된 graph를 객체의 Resource RID-formatted 문자열 property로 연결하면 Override RID로 재개할 수 있다.

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

## 관련 문서

- [[Palantir-Spatial-Models]]
