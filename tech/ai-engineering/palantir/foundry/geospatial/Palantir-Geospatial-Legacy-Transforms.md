---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Legacy 공간 함수의 의미와 이관 경계

geospatial-tools는 legacy이며 신규 작업은 Pipeline Builder 공간 기능을 우선한다. 기존 저장소를 읽을 때는 GEOSPARK profile, Sedona jar와 최상단 @geospatial decorator가 Spark spatial binding을 구성한다는 의존을 확인한다. 원문 jar 예시는 sedona-spark-shaded-3.5_2.13:1.7.1, geotools-wrapper:1.7.0-28.5다. 현 runtime 호환 검증을 대신하지 않는다.

## 파싱과 정규화

clean_geometry는 입력 CRS/geometry format/좌표 순서를 받아 유효 geometry와 EPSG:4326으로 정규화한다. lat_long_to_geometry는 두 column을 합친다. 원문의 geohash라는 이름에는 latitude,longitude 문자열도 섞여 있으므로 실제 base32 geohash와 구분한다.

GeoJSON parser는 batch_size 기본100000의 stream 처리를 제공하며 driver 부족 시 줄인다. Shapefile은 .shp/.shx/.dbf 등 동반 파일, GDB는 .gdb.zip과 선택 layer, KML/KMZ는 해당 glob을 사용한다. KML drop_invalid_layers=True는 빈/파싱 불가 layer를 조용히 버리므로 누락 허용 여부를 정한다.

## 함수 의미

buffer/simplify는 meter 단위 중간 metric CRS를 사용하고 출력 CRS는 유지한다. distance는 Euclidean meter, length는 길이/둘레 meter, area는 제곱 meter다. 기본 EPSG:3395가 모든 지역의 최적 투영은 아니다. convex hull, bounding box/circle, centroid, start/end point는 각각 요약 geometry를 만든다.

intersection/union/difference/symmetric_difference와 contains/intersects는 연산 방향과 결과형을 구분한다. agg_union/agg_intersection/agg_bounding_box는 group 전체, subdivide_explode는 복잡한 shape를 나눠 component마다 row를 늘린다. 분할 후 원래 객체 집계가 중복되지 않도록 한다.

## Join 계약

spatial_join은 교차, distance_join은 거리, knn_join은 오른쪽 k-nearest를 왼쪽 join한다. H3 resolution은 문서상 최적화만 바꾸며 결과 정확도 조절값이 아니다. Sedona에 resolution을 주거나 H3에 left/right_partitions를 주면 오류다. PK 생략 시 자동 생성되지만 downstream identity와 같다고 가정하지 않는다.

Geopandas join은 left/right/inner와 intersects/contains/within을 지원하고 대규모에는 Spark join을 권한다. toPandas는 driver 메모리 부담이다. 공식 Spark join 예제의 df1/df2 인자와 df 호출 불일치, simplify tolerance 문자열 등은 그대로 실행하기 전 고쳐야 한다. 여기서는 library 실행을 검증하지 않았다.

## 출처

- [Palantir, vector-data-in-transforms](https://www.palantir.com/docs/foundry/geospatial/vector-data-in-transforms)
- [Palantir, vector_data_in_transforms](https://www.palantir.com/docs/foundry/geospatial/vector_data_in_transforms)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
