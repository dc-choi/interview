---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop Map geometry, scale과 legacy 차이"]
---

# Workshop Map geometry, scale과 legacy 차이

현행 Map은 WebGL/MapboxGL 기반 desktop용이고 legacy는 WebGL이 없으면 Leaflet fallback과 mobile compatibility를 제공한다. Mobile overview의 Map 미지원은 현행 Map에 한정해 읽는다. Legacy는 지원이 남아 있지만 신규 기능 개발이 없는 lifecycle이다.

## Geometry와 데이터

현행 Map은 base/object/overlay layer, local configuration 또는 imported template를 사용한다. Selected objects, drawn/selected shape와 viewport bounds는 bidirectional variable이다. GeoJSON feature/geometry collection output을 구분하고 antimeridian polygon split 설정을 확인한다. Shape 그리기는 화면 state이며 실제 Ontology write는 별도 Action이다.

Geometry loading과 scale에 따라 보이는 object가 달라질 수 있다. Geoshape는 자동 load되어 비용이 크다. Units는 map setting 또는 organization default를 따르므로 화면 숫자만 보고 meter라고 추정하지 않는다. Timestamp/Date time selection, playback numeric milliseconds와 timezone 표시도 서로 다른 값이다.

## Legacy 경계

Point/non-aggregated layer는 최대10,000objects, page당1,000을 설명한다. Aggregated cluster/choropleth와 개별 object 표시는 다른 scale/selection 의미다. Boundary feature ID와 object region ID가 정확히 맞아야 하며 label/name equality가 아니다. GeoJSON은 작은 단순 boundary, vector tile은 더 복잡한 boundary에 적합한 선택이다.

Static layer는 object data가 없어도 표시할 수 있지만 dynamic filter 대상이 아니다. Region ID가 있어야 hover/selection이 가능하고 선택과 object mapping은 별도 설정이다. Choropleth viewport filtering은 region centroid 같은 geopoint가 필요해 polygon intersection 전체와 같지 않을 수 있다.

Legacy function aggregate는 location/region ID→value, non-aggregate는 object→value map이다. 원문은 TSv1만 문서화하며 aggregate의 TSv2 equivalent는 확인되지 않았다. 예제의 await 누락, bucket object를 분모로 나누는 코드와 missing/zero handling은 그대로 실행 보장으로 복사하지 않는다. H3 resolution/page/bucket count와 region set 완전성을 함께 확인한다.

Autozoom/viewport filter, initial hidden/group/z-index는 표현 상태이며 access control이 아니다. Legacy time-stepper는 time predicate를 output하고 layer가 그 filter를 소비해야 실제 데이터가 제한된다. Historical/projected label은 데이터의 관측/예측 출처까지 입증하지 않는다. 실제 Map은 실행하지 않았다.

## 출처

- [Palantir Workshop, widgets-map](https://www.palantir.com/docs/foundry/workshop/widgets-map)
- [Palantir Workshop, widgets-map-legacy](https://www.palantir.com/docs/foundry/workshop/widgets-map-legacy)

## 관련 문서

- [[Palantir-Workshop]]
