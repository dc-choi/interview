---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Contour 지도 계층과 선택의 의미

지도는 base map과 point/cluster/choropleth/line overlay로 구성한다. WebGL이 없으면 Leaflet 경로를 사용하며 Workshop의 static layer를 동일하게 지원하지 않는다. Layer의 source는 current set, 다른 path 또는 dataset으로 구분한다.

필터는 current set layer에만 적용되고 여러 선택은 OR로 합쳐진다. Point는 좌표, Mapbox choropleth는 region ID, point-to-point line은 양 끝 좌표로 필터하며 각 layer의 개별 선택은 최대 30개다. Cluster와 GeoJSON choropleth/line은 필터를 지원하지 않는다.

원/다각형은 current set의 point layer에 필터를 만들지만 그린 line은 표시 전용이다. 원은 great-circle 거리 근사이며 측량 정확도 보장이 아니다. Antimeridian을 가로지르는 polygon filter는 두 부분으로 나뉠 수 있다.

공식 point/radius 필터 예시 화면에는 첫 1,000개 point만 표시해 일부 데이터가 보이지 않을 수 있다는 경고가 있다. 지도에 보이는 점과 필터가 평가하는 데이터 범위를 구분하고, 표시되지 않은 점이 원본에도 없다고 판단하지 않는다. 이 화면의 수치를 모든 layer의 고정 한도로 일반화하지 않는다. (2026-10-18 [공식 예시 화면](https://www.palantir.com/docs/resources/foundry/contour/map_filtering_example.png) 확인)

Cluster는 지리적 근접성을 집계한다. Count/sum 같은 가산 집계는 zoom에 따라 supercluster로 합칠 수 있지만 평균을 같은 방식으로 단순 합하지 않는다. Mapbox boundary는 별도 설치와 feature ID 매핑, worldview를 요구한다. GeoJSON은 custom geometry를 표시하지만 Mapbox와 같은 aggregate/selection 계약이 아니다. Tooltip/색상/legend 숨김은 데이터 권한이 아니다.

## 출처

- [Palantir, boards-map](https://www.palantir.com/docs/foundry/contour/boards-map)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
