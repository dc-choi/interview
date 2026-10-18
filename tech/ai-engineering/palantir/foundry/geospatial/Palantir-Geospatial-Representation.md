---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 지리 데이터의 좌표와 표현 계약

Raster는 영상/고도처럼 격자 셀에 값을 담고 vector는 점/선/다각형을 담는다. 시간과 위치를 함께 다루면 geotemporal data다. 두 데이터가 같은 장소를 나타내도 CRS가 다르면 지도에서 맞지 않는다. Foundry map은 WGS84 좌표를 기대하고 화면은 Web Mercator로 투영한다.

투영은 shape/area/distance/direction에 왜곡을 일으킨다. EPSG:4326으로 표시 좌표를 통일하는 것과 거리/면적 계산에 적합한 지역 투영을 고르는 것은 별개다. 원본 CRS를 모르는 상태에서 숫자에 EPSG 코드만 붙여 정합을 해결하지 않는다.

Geotemporal sync는 관측을 전용 DB에 색인하고 GTSR은 객체가 해당 series를 가리키는 참조다. 같은 series의 모든 observation은 같은 integration에 들어가며 ID는 그 sync 안에서 유일하다. 최신 위치와 경로 조회를 위해 entity identity와 날짜별 운행 identity를 구분한다.

구형 types_of_geospatial_data 주소는 정확성 미검증 중국어 기계 번역으로 복구했으며 raster/vector/시간 분류만 설명한다. 새 영어 types-of-geospatial-and-geotemporal-data는 sync/GTSR/observation까지 정의하므로 구형 번역을 최신 기능 명세로 확대하지 않는다.

## 출처

- [Palantir, geospatial](https://www.palantir.com/docs/foundry/geospatial)
- [Palantir, coordinate-reference-systems-and-projections](https://www.palantir.com/docs/foundry/geospatial/coordinate-reference-systems-and-projections)
- [Palantir, coordinate_reference_systems_and_projections](https://www.palantir.com/docs/foundry/geospatial/coordinate_reference_systems_and_projections)
- [Palantir, overview](https://www.palantir.com/docs/foundry/geospatial/overview)
- [Palantir, types-of-geospatial-and-geotemporal-data](https://www.palantir.com/docs/foundry/geospatial/types-of-geospatial-and-geotemporal-data)
- [Palantir, types_of_geospatial_data](https://palantir.com/docs/zh/foundry/geospatial/types_of_geospatial_data/)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
