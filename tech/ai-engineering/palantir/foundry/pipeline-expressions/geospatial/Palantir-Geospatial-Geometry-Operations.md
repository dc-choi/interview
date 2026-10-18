---
tags: [palantir, foundry, pipeline-builder, geometry, geospatial]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 도형 준비와 공간 연산"]
---

# Pipeline Builder 도형 준비와 공간 연산

공간 연산은 Geometry의 형태만 바꾸는 작업이 아니다. 좌표 기준계, 경계 포함 여부, 도형 차원과 null 처리에 따라 결과의 의미가 달라진다. 아래는 2026-10-16 공개 expression 계약이며 실제 Pipeline에서 실행하지 않았다.

## 파싱, 유효성 검사와 준비

Is valid GeoJSON의 true는 Ontology 색인 가능성을 보장하지 않는다. Prepare geometry는 polygon을 닫고 중복 점을 제거하며 downstream에서 쓸 수 있도록 변환한다. 폭이 180도를 넘는 anti-meridian 횡단 도형은 양쪽의 여러 요소로 나눌 수 있다.

Prepare는 원본 형태를 보존하는 연산도 아니다. 예시에는 자기 교차 polygon의 분할, 한 점으로 축소된 line, 단일 요소만 남은 multi-geometry의 단순화와 Feature의 geometry 추출이 있다. Attribute, 요소 수와 geometry type을 보존해야 하면 원본을 따로 유지한다.

Simple 모드는 변환 실패에 null, With errors 모드는 `ok`/`error`를 반환한다. 혼합 좌표 차원, 범위 밖 좌표, 부족한 점과 빈 ring 같은 오류를 구별할 수 있다. 일부 예시 자체가 잘려 있고 범위 밖 경도를 처리하는 예시도 있어, 임의의 좌표 wrapping 정책을 이 문서만으로 일반화하지 않는다.

Geometry standardize는 right-hand rule과 동등 도형 비교를 위한 정규화다. LineString을 반전할 수도 있다. 따라서 표준화 뒤 N번째 점, 경로 시작점이나 단면 buffer의 좌우가 원래와 같다고 가정하지 않는다. Prepare와 standardize의 출력 순서를 같은 계약으로 취급하지 않는다.

## 도형 생성과 순서

| 연산 | 데이터 계약 |
|---|---|
| Create linestring | 점 배열에서 생성. 빈 배열, 한 점과 null 요소를 포함한 예시는 null |
| Ordered GeoPoint rows | 그룹별 ascending 순서로 연결. 같은 정렬값은 순서가 임의적이고 점/정렬값이 null인 행은 무시 |
| LineString to polygon | 닫힌 LineString과 충분한 점이 필요. 닫히지 않거나 다른 type이면 null |
| Geodesic line | 두 점 사이 선을 중간 점으로 근사. Number of steps 기본값은 24 |
| Ellipse | WGS 84 타원체 표면의 polygon 근사. 반장축과 반단축의 거리 단위, 각도 단위와 점 개수를 구분 |
| Range fan | 거리와 각도 범위의 polygon 근사. Haversine 거리와 WGS 84 geodesic 측면을 구분 |

일반 linestring이나 geodesic line도 anti-meridian을 넘으면 MultiLineString으로 나오는 예시가 있다. 함수 이름만으로 단일 LineString을 강제하지 않는다. Range fan은 180도를 넘으면서 anti-meridian도 횡단하는 경우, 최대 반지름이 지구 반둘레를 넘는 경우를 지원하지 않는다.

Nth point는 단일 LineString에서 1부터 세고 -1은 마지막 점이다. Polygon의 Nth chain은 1이 외곽 ring, 그보다 큰 값이 내부 ring이다. 두 함수 모두 0이나 범위 초과, 맞지 않는 geometry type과 null을 구분하며 실패 시 null을 반환한다. Multi나 Collection을 단일 도형으로 자동 해석하지 않는다.

## 경계와 집합 연산

Contains는 polygon 경계 위의 점과 선을 내부에 포함된 것으로 보지 않는다. Intersects는 교집합의 존재 여부이며, Intersection은 겹치는 도형 자체를 반환한다. Polygon끼리 접한 결과가 LineString이 되거나 겹치지 않은 결과가 빈 좌표의 geometry가 될 수 있다.

Difference는 A에서 B와 겹치는 부분을 제외한다. Symmetric difference는 어느 한쪽에만 속하는 부분, Union은 두 도형의 합집합이다. 배열 unary union과 그룹별 union도 있지만 입력 단위와 실행 엔진이 다르다. 결과는 MultiPolygon이나 서로 다른 차원을 포함한 GeometryCollection일 수 있다.

빈 geometry, null과 geometry type이 맞지 않음은 같은 상태가 아니다. Filter by geometry type은 행을 삭제하지 않고 허용하지 않은 값을 null로 만든다. Collection 안에 허용한 선이 있어도 Collection 자체를 허용하지 않으면 null인 예시가 있다. 내부 요소를 분리하려면 explode-to-array를 사용한다.

Line dissolve는 불필요한 node를 줄이고 연결 가능한 선을 잇는다. 연결 판단은 Z를 무시하지만 결과 vertex의 Z는 대응하는 입력 점에서 유지한다. 고도가 다른 선도 수평 좌표 때문에 합쳐질 수 있다는 점을 고려한다.

Convex hull은 도형을 포함하는 최소 볼록 외곽, envelope는 X/Y 최소와 최대를 포함하는 축 정렬 사각형이다. Lat/lon bounding box는 같은 종류의 경계를 구조체로 돌려준다. Envelope/bounding-box의 배열과 그룹 예시는 잘못된 geometry를 무시한다. 이것이 다른 모든 연산의 오류 정책이라는 뜻은 아니다.

## 계산 모델과 단위를 선택한다

| 연산 | 기준과 단위 |
|---|---|
| Area | 구면 근사의 제곱미터, 선과 점은 0 |
| Perimeter | 구면 근사의 미터, 선과 점은 0 |
| Geometry length | 구면 근사의 선/MultiLineString 길이 미터, polygon과 점은 0 |
| Geometry shortest distance | 구면 근사의 대권 최단거리 미터, 겹치면 0 |
| Haversine | 두 GeoPoint 거리 미터 |
| Bearing | 구면 근사, 진북 기준 시계 방향 도 |
| Destination point | 거리 미터와 course 도, 기본 대권 경로 또는 등각항로 선택 |
| Line interpolation | 구면상의 최단 경로, 전체 길이의 0~1 비율 |

Polygon 둘레가 필요할 때 length를 사용하면 0이 나올 수 있다. Shortest distance는 꼭짓점끼리의 최소 거리만 계산하는 것이 아니며 선이나 polygon 변 내부의 점이 최단점일 수 있다. 보간의 0과 1은 시작과 끝을 의미하지만 부동소수점 오차가 있는 예시를 그대로 수치 일치 보장으로 바꾸지 않는다.

Centroid는 구면 근사이며 혼합 차원의 Collection에서 가장 높은 차원의 요소만 기여한다. 좌표를 32-bit floating point 정밀도로 반올림한다는 제한도 있다. Simplify는 미터 tolerance 안의 점을 줄이고 작은 loop를 없앨 수 있으며 좌표 소수 자릿수 기본값은 6이다. 표현을 줄이는 과정에서 작은 구역이 사라지거나 결과가 null이 될 수 있다.

## 투영 연산과 Z 차원

Buffer, translate, rotate와 affine은 지정한 CRS에서 연산하고 WGS 84로 돌아온다. Buffer distance와 offset은 그 CRS의 단위다. EPSG:4326에서 숫자 1을 이동하는 것과 미터 기반 투영에서 숫자 1을 이동하는 것을 같게 취급하지 않는다.

Buffer는 Z를 버린다. 점과 선의 0 이하 buffer는 null이며 polygon의 양면 음수 buffer는 축소다. 단면 buffer는 양수 거리의 선에만 적용하고 진행 방향의 좌우를 따른다. 원호 분할을 늘리면 도형 복잡도와 계산 비용도 늘어난다.

3D affine은 2D 입력의 Z를 0으로 놓고 3D 결과를 만든다. Translate는 Z offset을 지정해야 2D 입력을 3D로 만든다. Set Z는 기존 Z를 덮어쓰지만 null Z를 주면 2D를 반환하는 예시가 있다. 좌표 차원 유지가 필요하면 연산별로 확인한다.

## 엔진과 공개 예시의 한계

Set/구조 연산 다수와 simplify, translate, affine은 Batch/Faster/Streaming이다. Area, perimeter, length, shortest distance, centroid, buffer, envelope, prepare, 일반/geodesic line 생성과 보간은 Batch/Streaming이다. Ordered rows와 grouped union/bounding box는 Batch, grouped envelope는 Batch/Faster다. Rotate 2d는 Streaming만 지원한다.

동일한 이름 계열이라도 지원 엔진이 같지 않다. 공개 예시에는 `...`로 생략한 좌표, 일부 잘못된 JSON 표기와 반대 인자를 설명하는 문구도 있다. 개념과 선언 타입을 대조하되 예시를 완전한 실행 fixture로 간주하지 않는다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`normalizeGeometryV2`는 Geometry 단일 출력으로 선언되어 있으며 V3의 With errors 구조를 제공한다고 쓰지 않는다. 중국어 V2도 polygon 닫기/중복 제거, 반자오선 분할과 차원 축소를 설명한다. 범위 밖 좌표는 null이라는 본문과 일부 잘린 wrapping 예시가 함께 있으므로 모든 범위 밖 좌표가 정규화된다고 추정하지 않는다.

## 출처

- [Palantir, normalizeGeometryV2 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/normalizeGeometryV2/)

- [Palantir, Prepare geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/normalizeGeometryV4)
- [Palantir, Is valid GeoJSON](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidGeoJsonV1)
- [Palantir, Geometry standardize](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryStandardizeV1)
- [Palantir, Create linestring geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeoLineStringV1)
- [Palantir, Create simple geometries from ordered rows of GeoPoints](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeometryFromOrderedGeoPointRowsV1)
- [Palantir, Create geodesic line string](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeodesicLineStringV1)
- [Palantir, Create ellipse geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeoEllipseGeometryV1)
- [Palantir, Create range fan geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeoRangeFanGeometryV1)
- [Palantir, Nth point in linestring](https://www.palantir.com/docs/foundry/pb-functions-expression/linestringPointNV1)
- [Palantir, Nth chain in polygon](https://www.palantir.com/docs/foundry/pb-functions-expression/getNthChainFromPolygonV1)
- [Palantir, Convert linestring to polygon](https://www.palantir.com/docs/foundry/pb-functions-expression/linestringToPolygonV1)
- [Palantir, Geometry contains](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryContainsV1)
- [Palantir, Geometry intersection](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryIntersectionV1)
- [Palantir, Geometries have intersection](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryIntersectsV1)
- [Palantir, Geometry difference](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryDifferenceV1)
- [Palantir, Geometry symmetric difference](https://www.palantir.com/docs/foundry/pb-functions-expression/geometrySymmetricDifferenceV1)
- [Palantir, Geometry union](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryUnionV1)
- [Palantir, Geometry array line dissolve](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryArrayLineDissolveV1)
- [Palantir, Filter by geometry type](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryFilterV1)
- [Palantir, Geometry array union](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryArrayUnionV1)
- [Palantir, Geometry explode to array](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryExplodeToArrayV1)
- [Palantir, Get the convex hull of a geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryConvexHullV1)
- [Palantir, Get geometry envelope](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryEnvelopeV1)
- [Palantir, Get lat/long bounding box struct](https://www.palantir.com/docs/foundry/pb-functions-expression/latLonBoundingBoxV1)
- [Palantir, Grouped geometry envelope](https://www.palantir.com/docs/foundry/pb-functions-expression/groupedGeometryEnvelopeV1)
- [Palantir, Grouped geometry union](https://www.palantir.com/docs/foundry/pb-functions-expression/groupedGeometryUnionV1)
- [Palantir, Grouped latitude/longitude bounding box](https://www.palantir.com/docs/foundry/pb-functions-expression/groupedLatLonBoundingBoxV1)
- [Palantir, Area](https://www.palantir.com/docs/foundry/pb-functions-expression/areaV1)
- [Palantir, Perimeter](https://www.palantir.com/docs/foundry/pb-functions-expression/perimeterV1)
- [Palantir, Geometry length](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryLengthV1)
- [Palantir, Geometry shortest distance](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryShortestDistanceV1)
- [Palantir, Calculate haversine distance](https://www.palantir.com/docs/foundry/pb-functions-expression/haversineV1)
- [Palantir, Get bearing from start point to end point](https://www.palantir.com/docs/foundry/pb-functions-expression/getBearingV1)
- [Palantir, Calculate destination point](https://www.palantir.com/docs/foundry/pb-functions-expression/inverseHaversineV1)
- [Palantir, Interpolate geo point along linestring](https://www.palantir.com/docs/foundry/pb-functions-expression/interpolateGeoPointAlongLinestringV1)
- [Palantir, Geometry centroid](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryCentroidV1)
- [Palantir, Simplify geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/simplifyGeometryV1)
- [Palantir, Geometry buffer](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryBufferV1)
- [Palantir, Geometry rotate 2d](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryRotate2dV1)
- [Palantir, Geometry translate expression](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryTranslateV1)
- [Palantir, Geometry 3d affine transformation](https://www.palantir.com/docs/foundry/pb-functions-expression/geometry3dAffineTransformationV1)
- [Palantir, Geometry set z-coordinate](https://www.palantir.com/docs/foundry/pb-functions-expression/geometrySetZCoordinateV1)

## 관련 문서

- [[Palantir-Geospatial-Coordinates-and-Formats|입력 좌표, CRS와 형식 변환]]
- [[Palantir-Geospatial-Spatial-Indexing|공간 후보와 정확한 도형 판정]]
- [[Palantir-Pipeline-Expressions|Expression별 타입과 지원 엔진]]
