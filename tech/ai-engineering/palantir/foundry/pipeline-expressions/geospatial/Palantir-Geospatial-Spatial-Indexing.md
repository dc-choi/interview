---
tags: [palantir, foundry, pipeline-builder, h3, geohash, geospatial]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder H3, Geohash와 XZ 색인"]
---

# Pipeline Builder H3, Geohash와 XZ 색인

공간 색인은 위치나 도형을 검색 가능한 격자 또는 순서 값으로 요약한다. 셀, 셀 중심과 원래 관측점은 다르며 격자 후보 일치를 정확한 도형 관계로 확정하지 않는다. 아래는 2026-10-16 공식 expression 계약이며 실제 Pipeline 실행은 시험하지 않았다.

## H3 해상도와 부모/자식

Get H3 index는 GeoPoint를 0~15의 해상도 셀로 바꾼다. H3 to GeoPoint는 그 셀의 중심을 반환하므로 원래 입력점의 역변환이 아니다. H3 to geometry는 셀 polygon을 반환한다.

부모 해상도는 입력 셀보다 같거나 거칠어야 하고 자식 해상도는 같거나 세밀해야 한다. 같은 해상도는 자기 자신을 반환하는 예시가 있다. 범위를 벗어난 해상도와 잘못된 셀은 null을 반환한다. Is valid H3 index는 문자열 형식 검증이므로 실제 관측의 정확성을 증명하지 않는다.

Neighbors의 예시에는 이웃이 6개인 셀과 5개인 셀이 있다. 고정 길이 6 배열로 처리하지 않는다. H3 buffer의 `k`는 미터가 아닌 셀 개수 기준 거리이고 0 이상이어야 한다. 같은 k라도 실제 물리적 거리와 같다고 가정하지 않는다.

## Geometry cover의 포함 의미

| Cover type | Polygon과의 관계 |
|---|---|
| CENTROID | 셀 중심이 polygon에 포함 |
| INNER | 셀 전체가 polygon 안에 포함 |
| OUTER | Polygon을 덮는 셀 집합 |

낮은 해상도에서 CENTROID나 INNER가 빈 배열이고 OUTER는 여러 셀인 예시가 있다. 빈 결과를 원래 polygon의 부재로 해석하지 않는다. 경계 근처의 작은 좌표 차이가 선택 셀을 바꾸기도 한다.

공개 계약은 예상 셀 개수가 700만을 넘으면 null을 반환한다. 넓은 영역에 높은 해상도를 사용한 null을 데이터가 없다는 결과로 바꾸지 않는다. 이 expression은 polygon뿐 아니라 선과 점도 입력으로 선언하지만 cover의 세 가지 의미는 polygon 기준으로 설명한다.

빈 좌표의 구조에 따라 null과 빈 배열이 다른 예시도 있다. 잘못된 geometry, 결과가 빈 집합인 경우와 계산 크기 제한을 구별해 남긴다.

## Compact와 uncompact의 보존 조건

Compact는 가능한 셀을 부모 셀로 줄여 혼합 해상도 집합을 만든다. 같은 해상도 입력이었다면 inverse uncompact로 같은 셀 집합을 돌려받는다고 보장한다. 입력 해상도가 섞인 경우까지 같은 보장을 확대하지 않는다.

Uncompact는 지정 해상도로 확장하며 입력의 모든 셀 해상도가 목표 이하이어야 한다. 하나라도 더 세밀하거나 잘못된 셀이면 null이다. 두 연산 모두 출력을 오름차순으로 정렬하고 중복 셀을 제거하는 예시가 있다. 원래 배열 순서와 중복 수는 보존 대상이 아니다.

## Geohash와 XZ는 다른 요약이다

Geohash는 점을 포함하는 base32 문자열이고 precision은 출력 문자 수다. H3의 0~15 해상도 숫자와 같은 설정이 아니다. Is valid Geohash는 잘못된 문자열과 null에 false를 반환한다. 지원하지 않는 precision의 동작은 이 예시들만으로 전 범위를 확정하지 않는다.

XZ curve는 LatLonBoundingBox의 경도를 X, 위도를 Y에 대응시켜 Long을 반환한다. 사전 설정은 150km, 10km, 1km 수준이며 높은 해상도는 query 비용을 늘리고 false positive를 줄인다고 설명한다. 모든 false positive를 없애는 정확 판정은 아니다.

따라서 격자나 곡선 값으로 후보를 줄인 뒤 필요한 정확 관계를 원본 geometry와 비교하는 접근이 가능하다. 이는 표현의 손실과 false positive 계약에서 도출한 설계 판단이며 특정 Pipeline 실행 계획을 검증한 결과는 아니다.

H3와 Geohash 함수는 공개 표에서 Batch/Faster/Streaming을 지원한다. XZ encode는 Batch/Streaming이다. 셀 배열과 polygon 예시 일부가 `...`로 잘려 있어 전체 집합을 재현한 증거로 쓰지 않는다.

## 출처

- [Palantir, Get H3 index](https://www.palantir.com/docs/foundry/pb-functions-expression/h3IndexExpressionV1)
- [Palantir, H3 cell to children](https://www.palantir.com/docs/foundry/pb-functions-expression/h3CellToChildrenV1)
- [Palantir, H3 cell to parent](https://www.palantir.com/docs/foundry/pb-functions-expression/h3CellToParentV1)
- [Palantir, Get neighbors of an H3 index](https://www.palantir.com/docs/foundry/pb-functions-expression/h3NeighborsV1)
- [Palantir, Convert H3 index to GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/h3ToGeoPointV1)
- [Palantir, H3 to geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/h3ToGeometryV1)
- [Palantir, Buffer H3 indices](https://www.palantir.com/docs/foundry/pb-functions-expression/h3BufferV1)
- [Palantir, Get H3 indices covering a geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/polygonToH3V1)
- [Palantir, Compact a set of H3 indices](https://www.palantir.com/docs/foundry/pb-functions-expression/compactH3SetV1)
- [Palantir, Uncompact a set of H3 indices](https://www.palantir.com/docs/foundry/pb-functions-expression/uncompactH3SetV1)
- [Palantir, Is valid H3 index](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidH3IndexV1)
- [Palantir, Convert GeoPoint to Geohash](https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToGeohashV1)
- [Palantir, Is valid Geohash](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidGeohashV1)
- [Palantir, Get XZ curve index of an envelope](https://www.palantir.com/docs/foundry/pb-functions-expression/xzCurveEncodeV1)

## 관련 문서

- [[Palantir-Geospatial-Coordinates-and-Formats|좌표 표현과 정밀도]]
- [[Palantir-Geospatial-Geometry-Operations|도형 계산과 경계 판정]]
- [[Palantir-Pipeline-Expressions|타입과 지원 엔진]]
