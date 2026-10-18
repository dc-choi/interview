---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vertex 시간, scenario와 이미지 좌표"]
---

# Vertex 시간, scenario와 이미지 좌표

## 다른 시간 제어

Event object는 시작/끝 timestamp가 있고 time series는 시각별 측정값이다. Event badge는 event가 진행 중인 시간에 표시되고 intent type class가 색을 정한다. Threshold, 데이터 최신성 경고와 실제 업무 심각도는 각각 설정된 의미다.

Selected time은 readout의 시점, time window는 chart 범위, timeline filter는 해당하지 않는 node를 흐리게 표시하는 제어다. 이 표시를 underlying object 권한이나 dataset 삭제로 해석하지 않는다. Missing-data warning은 선택시각과 가장 가까운 관측 간 거리의 설정값이다. Poll interval은 갱신 확인 주기이며 관측시각이나 지연 SLA가 아니다.

URL time은 UNIX milliseconds 또는 ISO 날짜/시각이다. Selected time만 주면 기본 window를 그 중심에 두고, start/end만 주면 selected time은 start가 된다. Object 추가/function 실행용 URL parameter는 create 경로에 한정되고 time parameter는 기존 graph에도 적용된다.

## 모델 계산은 가정의 결과다

Scenario는 Action/override와 모델을 사용해 비교 결과를 계산한다. Baseline은 선택한 모델을 Action/override 없이 실행한 비교 기준이며 실제 관측값의 별칭이 아니다. 입력 범위와 graph-only scope, smoothing 기간(분)을 명시해 해석한다. 완료 checkmark는 계산 완료이며 예측 정확성이나 최적성의 입증이 아니다.

직접 model 선택/configuration/run과 model chaining은 sunset로 표시된다. 현재 권장 경로는 model을 Function으로 감싸 function-backed Action으로 소비하는 방식이다. Sunset을 이미 미지원/즉시 제거라고 바꾸지 않는다. 개요의 chaining 소개와 수명주기 경고를 함께 읽는다.

## 이미지 참조와 annotation

Media layer는 media reference가 있는 object와 linked annotation object를 구분한다. 기본 image reference는 Ontology capability로 고르거나 첫 reference를 사용한다. Annotation coordinate property는 image pixel-space bounding box이며 세계 좌표, CAD model 좌표와 다르다. 문서가 구체적 직렬화/원점/끝점 포함 여부까지 보장하지 않아 추정하지 않았다.

그린 영역을 저장하려면 create/edit Action의 parameter와 좌표 property mapping이 필요하다. 이동/resize가 자동 영속 변경을 보장하지 않는다. 예제의 특정 도면 대신 일반 이미지 좌표와 데이터 무결성 계약만 정리했다. 실제 graph, model simulation과 annotation 저장은 수행하지 않았다.

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
