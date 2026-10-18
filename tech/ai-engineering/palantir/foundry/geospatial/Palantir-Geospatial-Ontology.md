---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Geometry property와 경계 데이터 연결

Geopoint는 WGS84 latitude,longitude 문자열 또는 geohash를 받는다. Geohash는 사각형의 왼쪽 아래 점으로 변환하므로 중심점으로 해석하면 위치가 달라진다. Geoshape는 RFC7946 Geometry 문자열이며 LineString/Polygon/MultiLineString/MultiPolygon/MultiPoint/Point를 허용하지만 단일 Point에는 geopoint를 사용한다. Feature/FeatureCollection/GeometryCollection은 허용하지 않는다. GeoJSON 좌표 순서와 geopoint 문자열 순서를 구분한다.

Polygon은 닫힌 ring, 외곽 반시계 winding과 자기 교차 없음 조건을 만족해야 한다. 두 property 모두 공간 검색 색인을 제공한다. 지도는 Map/Workshop 외에 Slate/Quiver/Object Explorer/Contour에서도 소비한다. External layer를 데이터 적재 없이 연결하는 기능에는 별도 설정이 필요하다.

## Mapbox Boundaries

Marketplace의 v4 boundary definition을 설치한 뒤 metadata와 업무 데이터를 join해 mapbox_id를 넣는다. 표시할 worldview와 boundary type/level까지 선택해야 올바른 영역을 그린다. 설치 project는 처음 사용자만 접근하며 편집이 기본 잠겨 있어 소비 분석/pipeline을 다른 project에 두는 것이 안전한 업그레이드 경로다.

Minor 업데이트와 major 별도 product를 구분한다. v3 feature_id에서 v4 mapbox_id로 mapping table을 join하거나 metadata에서 다시 매핑한다. Breaking boundary 변경은 수동 검토하고 downstream field/type/level 설정도 함께 바꾼다. 이름만 같은 지역을 ID가 같다고 가정하지 않는다.

기존 geospatial-tools는 더 이상 적극 개발/유지하지 않으며 공식 권장은 Pipeline Builder다. 구형 library 문서를 현재 권장 아키텍처로 사용하지 않는다.

## 출처

- [Palantir, ontology](https://www.palantir.com/docs/foundry/geospatial/ontology)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
