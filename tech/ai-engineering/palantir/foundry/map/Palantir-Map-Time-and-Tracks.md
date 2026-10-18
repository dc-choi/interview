---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 선택 시각, event geometry와 track 보간

Map은 selected time, time range와 filtered time window를 구분한다. timeline을 접거나 숨겨도 시간 설정은 style과 표시에 계속 영향을 준다. View latest는 cursor를 현재 시각으로 이동하고 polling interval에 맞춰 data를 다시 읽는다. 실제 source latency를 없애지는 않는다.

## Event와 timeline geometry

Ontology event는 start/end를 설정해 자동 timeline layer와 canvas time-opacity를 제공한다. timeline geometry는 map에서 timestamp 1개 또는 start/end 2개로 추가한다. 여러 geometry/shape/color를 설정할 수 있지만 canvas opacity를 직접 바꾸지는 않는다.

geometry를 추가하면 event의 기본 timeline 모양을 덮고 원래 event time은 canvas style에 남는다. linked event는 selected time이 기간 안이면 active다. active count를 label에 보이거나 event 기간으로 zoom하고 object를 추가할 수 있다. geometry의 모든 필수 time property가 설정되어야 표시된다.

## Track

linear는 관측 사이를 보간하고 last known은 이전 관측 위치를 쓴다. max time gap을 넘으면 no data로 취급하고 line도 연결하지 않는다. line은 경로를 연결하고 breadcrumb는 정확히 기록된 위치를 보인다. 보간 위치가 실제 측정점과 같다고 주장하지 않는다.

breadcrumb timeline은 time range와 viewport에 따라 보이며 화면 밖 위치는 faded 표시한다. time-series property 값도 selected time의 값이다. time range가 data를 포함하지 않으면 style/track이 안 보일 수 있어 Zoom to fit과 object timestamp를 확인한다.

## Playback과 이전 기능

timeline cursor는 time range 안에서 고르고 playback은 지정 speed로 time window 또는 filter 안에서 loop한다. Shift-drag/time filter는 비일치 object를 fade하지만 tile layer에는 적용되지 않는다. series의 timeline interaction은 Beta/enrollment 조건이다.

Time selection panel은 deprecated이며 timeline으로 옮겨졌다. Series panel은 planned-deprecation 표기가 남아 있지만 본문은 2026-01-31 이후 unavailable이라고 명시한다. 옛 예제의 Series panel을 현재 정상 경로로 복사하지 않고 timeline을 사용한다.

## 출처

- [Palantir, time-overview](https://www.palantir.com/docs/foundry/map/time-overview)
- [Palantir, time-selection](https://www.palantir.com/docs/foundry/map/time-selection)
- [Palantir, time-series](https://www.palantir.com/docs/foundry/map/time-series)
- [Palantir, timeline](https://www.palantir.com/docs/foundry/map/timeline)
- [Palantir, events](https://www.palantir.com/docs/foundry/map/events)
- [Palantir, visualize-timeline](https://www.palantir.com/docs/foundry/map/visualize-timeline)
- [Palantir, visualize-tracks](https://www.palantir.com/docs/foundry/map/visualize-tracks)
- [Palantir, series-panel](https://www.palantir.com/docs/foundry/map/series-panel)

## 관련 문서

- [[Palantir-Map-Loading-and-Geometry]]
- [[Palantir-Map-Styles-and-Aggregates]]
