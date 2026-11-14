---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["Vertex 시간, scenario와 이미지 좌표"]
---

# Vertex 시간, scenario와 이미지 좌표

## 사용 사례별 기능 조합

Vertex 공식 사용 사례는 네 가지 기능 조합으로 읽는다. What-if 분석은 Foundry에 게시한 모델, 예측이나 business logic으로 결정과 사건의 영향을 비교하는 scenario다. 예지 정비는 장비, 센서 값과 정비 이력을 Ontology로 연결한 뒤 온도나 진동 time series를 정비 event와 비교하고, 게시한 모델의 고장 위험 예측과 정비 scenario 비교를 더한다. 탐색형 조사는 관심 객체에서 link를 따라 graph를 넓히고 다단계 Search Around와 filter, Function 기반 graph 생성으로 경로를 좁힌 뒤 graph를 저장해 공유한다. 공정 흐름 diagramming(beta, enrollment에서 꺼져 있을 수 있고 관리자가 Control Panel의 Vertex 설정에서 켠다. 세부는 [[Palantir-Vertex-Graph-Generation-and-Function-Shapes#시각적 그룹과 원본|graph 생성과 diagram]])은 object-backed system graph나 production diagram에 미리 모델링한 관계로 물질 흐름과 event를 그리고 속성, metric이나 measure로 스타일을 입힌다. 문서의 예시 화면은 가상 데이터라 실제 성능이나 효과의 근거로 쓰지 않는다.

## 다른 시간 제어

Event object는 시작/끝 timestamp가 있고 time series는 시각별 측정값이다. Event badge는 event가 진행 중인 시간에 표시되고 intent type class가 색을 정한다. Threshold, 데이터 최신성 경고와 실제 업무 심각도는 각각 설정된 의미다.

2026-11-14 events 개요와 event 설정 문서를 대조한 내용이다. Event로 쓰려면 object type에 시작과 끝을 기록하는 timestamp property가 있어야 하고, Ontology Manager의 Capabilities 탭에서 Event toggle을 켜 Event start time과 Event end time을 지정한다(Description과 Linked object는 선택). 이 지정은 primary key를 event 식별자로 쓰는 event metadata로 저장되고, Vertex는 이를 legacy type class(`timeseries.event_start_time` 등)보다 우선한다. Event metadata가 없는 object type은 legacy type class를 계속 쓸 수 있으며 기존 설정을 지울 필요는 없다.

- Event 시간 filter는 시작과 끝 property가 모두 지정되어야 동작한다. 개별 event의 끝 값이 비어 있으면 filter는 그 event를 open-ended로 다룬다.
- 끝 값이 빈 event와 끝 property를 지정하지 않은 object type은 다르다. 진행 중 event를 표현하려면 끝 property를 지정해 두고 값만 비운다(설계 제안).
- 색(intent)은 `vertex` kind의 `event_intent.warning`(주황), `danger`(빨강), `primary`(파랑), `success`(초록) type class로 정하며 보통 primary key property에 둔다. 공식 문서는 이 type class로 색과 심각도(severity)를 함께 정한다고 설명하며 별도 심각도 필드는 없다. 따라서 색을 업무 심각도 판정의 근거로 삼으려면 type class 부여 규칙을 따로 정해 둔다(설계 제안).

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
