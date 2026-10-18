---
tags: [palantir, foundry, pipeline-builder, geospatial, join]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 공간 조인 계약"]
---

# Pipeline Builder 공간 조인 계약

공간 join은 도형 겹침, 투영 좌표 거리와 가까운 이웃을 서로 다른 조건으로 사용한다. 같은 GeoJSON 입력이어도 null과 잘못된 도형의 행 보존 정책은 join마다 다르다. 아래는 2026-10-16 공식 transform 계약이며 실제 GIS 데이터로 실행하지 않았다.

## 겹침과 행 보존

Geo intersection inner/left join은 도형의 겹침뿐 아니라 경계가 닿는 경우도 포함한다. Null이나 invalid geometry는 매칭되지 않으며 left join 예시는 해당 왼쪽 행을 오른쪽 null로 보존한다. Inner에서는 매칭되지 않은 행이 빠진다.

Geo intersection left anti join은 오른쪽 어떤 도형과도 겹치지 않은 왼쪽 행을 남긴다. Null/invalid key를 non-intersecting으로 간주하므로 결과에 포함될 수 있다. Anti 결과를 지리적으로 바깥에 있다고 검증된 행 목록으로 해석하지 않는다. 위치를 판정할 수 없는 행도 섞여 있다.

별도의 Geometry intersection join은 열 이름이 양쪽에서 겹치면 안 되고 null key를 제거하며 invalid GeoJSON을 조용히 null로 바꾼다고 설명한다. 인자 타입은 join key 목록이지만 본문은 여러 key를 현재 지원하지 않는다고 명시한다. 목록 타입만 보고 다중 key 지원을 추정하지 않는다.

겹침 매칭도 한 왼쪽 도형이 여러 오른쪽 도형에 닿으면 여러 행을 만든다. 출력 열을 줄여도 매칭의 중복 조합은 남는다. 예시에서는 3D 도형이 수평 위치로 겹치는 결과가 있지만, 이를 모든 공간 join의 3D 거리 지원으로 확대하지 않는다.

## 거리의 단위는 투영이 결정한다

Geo distance inner/left join은 입력을 지정 CRS로 변환해 도형 거리를 비교한 뒤 WGS 84로 돌려준다. Left 계약은 지정 거리 이하를 매칭한다. 거리 literal의 단위는 CRS 단위다.

경위도 CRS에서 숫자 10을 쓰는 예시와 미터/피트 기반 투영의 숫자 10은 같은 실제 거리가 아니다. Expression의 haversine 미터 결과와 projected join의 threshold를 확인 없이 공유하지 않는다. Left는 null 위치를 미매칭 행으로 남기는 예시가 있다.

## Geometry KNN의 메모리와 후보 수

Geometry KNN은 base의 Geometry와 neighbors의 GeoPoint를 입력으로 받으며 선택한 CRS에서 가까운 k개의 점을 찾는다. Inner와 left가 나뉘고 left는 유효 후보가 없을 때 왼쪽 행과 오른쪽 null을 남기는 예시가 있다. Null base geometry도 left 예시에서는 보존한다.

이 join은 neighbors 전체가 driver와 executor 메모리에 들어가야 한다. 공개 문서의 3GB executor와 100만 점은 용량 가이드이며 행 폭, 추가 열과 실제 workload를 포함한 보장 수치가 아니다.

오른쪽 후보가 k보다 적으면 그 개수만 반환하는 예시가 있고, 중복 후보는 별도 행으로 남는다. 동일 거리 후보가 있는 예시는 정확히 k개를 선택하므로 일반 Numeric KNN의 동점 시 k 초과 정책을 가져오지 않는다. 같은 거리 중 어떤 행을 고르는지 안정성은 별도 검증해야 한다.

## 3D point distance의 적용 범위

GeoPoint-to-GeoPoint 3d distance inner join의 선언 입력은 Geometry 열이지만 도형은 Point여야 하고 다른 도형은 무시한다. `Use z-coordinate=false`는 Z를 무시하며 true는 3D 거리를 계산한다.

Z를 포함한 예시에서 Z가 없는 점이 매칭되지 않는 경우가 있다. 누락 높이를 0으로 채우는 정책을 임의로 추가하지 않는다. 높이의 기준과 수평 투영 단위가 일관되는지도 입력 측에서 확인해야 한다.

오른쪽 전체는 driver/executor 메모리에 들어가야 한다. 이 함수의 공개 가이드는 3GB에서 최대 400만 점 정도로, Geometry KNN의 100만 점과 다르다. 기능이 비슷해 보인다는 이유로 메모리 가이드를 공유하지 않는다.

## 엔진과 예시의 한계

| 변환 | 공개 지원 엔진 |
|---|---|
| Geo intersection inner/left | Batch, Streaming |
| Geo intersection left anti | Streaming |
| 별도 Geometry intersection join | Batch |
| Geo distance inner/left | Batch |
| Geometry KNN inner/left | Batch |
| Point-to-point 3D distance inner | Batch |

일부 예시는 WGS 84 범위 밖 숫자를 평면 도형처럼 사용한다. 이것이 downstream Ontology의 위경도 유효 범위까지 넓힌다는 뜻은 아니다. 공개 예시를 읽은 것과 유효 좌표, 운영 메모리, 동점과 지연을 실행 검증한 것을 구분한다.

## 출처

- [Palantir, Geo intersection inner join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionInnerJoinV1)
- [Palantir, Geo intersection left join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionLeftJoinV1)
- [Palantir, Geo intersection left anti join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionAntiJoinV1)
- [Palantir, Geometry intersection join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoIntersectionJoinV1)
- [Palantir, Geo distance inner join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoDistanceInnerJoinV1)
- [Palantir, Geo distance left join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoDistanceLeftJoinV1)
- [Palantir, Geometry knn inner join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoKnnInnerJoinV1)
- [Palantir, Geometry knn left join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoKnnLeftJoinV1)
- [Palantir, GeoPoint-to-GeoPoint 3d distance inner join](https://www.palantir.com/docs/foundry/pb-functions-transform/geoPointToPoint3dDistanceInnerJoinV1)

## 관련 문서

- [[Palantir-Geospatial-Coordinates-and-Formats|CRS, 좌표와 높이]]
- [[Palantir-Geospatial-Geometry-Operations|경계 판정과 도형 계산]]
- [[Palantir-Pipeline-Join-Contracts|일반 join의 cardinality와 동점]]
- [[Palantir-Pipeline-Transforms|변환 지도]]
