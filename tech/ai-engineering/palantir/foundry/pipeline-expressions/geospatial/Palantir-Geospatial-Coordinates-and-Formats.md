---
tags: [palantir, foundry, pipeline-builder, geospatial, coordinates]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 좌표와 지리 형식 변환"]
---

# Pipeline Builder 좌표와 지리 형식 변환

지리 데이터 변환은 문자열 파싱, 좌표 기준계 변환과 Ontology 색인 준비를 구분해야 한다. 문자열을 읽을 수 있다는 사실만으로 좌표 범위나 downstream 색인 조건을 만족하지는 않는다. 아래는 2026-10-16 공개 expression 문서를 대조한 계약이며 실제 Pipeline 실행 결과는 아니다.

## 같은 위치의 세 가지 표현

| 표현 | 순서와 검증 |
|---|---|
| GeoPoint | `latitude`, `longitude` 필드가 있는 구조체 |
| GeoJSON Point | `coordinates: [longitude, latitude]` |
| Ontology GeoPoint | `latitude,longitude` 문자열 |

Create GeoPoint는 위도 -90~90, 경도 -180~180의 포함 범위를 검사하고 범위 초과, null과 NaN에 null을 반환한다. 반면 임의의 GeoJSON 파싱이나 다른 변환까지 같은 검증을 한다고 확대하지 않는다.

Ontology GeoPoint 변환 예시는 소수점 7자리 반올림을 보여 준다. 왕복 변환을 원래 좌표의 정밀도를 그대로 보존하는 인코딩으로 취급하지 않는다. Ontology GeoPoint validator는 공백을 허용하는 예시가 있고 범위와 두 값의 순서를 검사한다.

Geotemporal series reference는 series ID와 이를 포함하는 integration RID의 결합이다. Integration literal RID 또는 현재 pipeline sync target을 참조할 수 있다. Series ID의 빈 문자열은 reference를 만들지만 null은 null을 반환하는 예시가 있으므로 빈 값과 누락을 같게 처리하지 않는다. Reference 생성만으로 참조 대상 관측의 존재가 검증됐다고 보지 않는다.

## CRS 변환과 높이 기준

Create GeoPoint from coordinate system은 `EPSG:32618` 같은 `authority:id` literal과 원천 X/Y를 받아 WGS 84 위도와 경도로 변환한다. 미지원 투영이나 null 좌표는 null이다. 원천 X/Y가 미터인지 경위도인지 먼저 식별해야 한다.

ECEF 변환은 지구 중심 고정 Cartesian X/Y/Z를 WGS 84 geodesic coordinate로 바꾼다. 출력은 GeoPoint와 altitude이며 altitude는 타원체 위 높이다. 해발고도나 지표면 위 높이와 자동으로 같지 않다. 어느 좌표든 null이면 출력도 null이다.

WGS 84가 아닌 GeoJSON은 원천 CRS를 지정해 파싱하고 변환한다. 이미 WGS 84인 GeoJSON은 logical type cast가 더 적은 overhead를 갖는다고 설명한다. WKT 문자열과 WKB binary도 원천 CRS를 선택적으로 지정할 수 있고 잘못된 입력은 null이다. 예시에 보이는 WKB 문자열 표현을 보고 실제 입력 타입을 String으로 바꾸지 않는다.

## DMS와 격자 좌표는 형식 계약을 보존한다

DMS 파서는 여러 format을 순서대로 시도해 처음 맞는 format을 적용한다. 기본 format, 사용자 literal과 소수 초 자리수를 구분해야 한다. 출력 format 변환도 정해진 DMS 표현을 사용한다.

특히 DMS 파싱 예시에는 위도 123도 같은 범위 밖 결과가 있다. 파싱 성공을 유효한 지구상 위치로 확정하지 않고 Create GeoPoint나 범위 검증을 별도로 적용한다. 분, 초를 해석하는 format 변경은 단순 출력 모양 변경과 다르다.

MGRS 변환은 WGS 84와 격자 좌표 사이의 형식 변환이다. 출력은 공백으로 분리한 5자리 정밀도를 사용하고, validator는 한쪽 숫자만 있는 불완전한 문자열을 거부한다. 서로 다른 입력 정밀도나 부동소수점 때문에 문자열 왕복이 같다고 보장하지 않는다.

Angle unit 변환은 도, 분, 초, 라디안을 선택한다. 이는 거리 단위 변환이 아니다. 행별 값인 Expression과 설정값인 Literal/Enum도 구분한다.

## KML과 Geobuf에서 보존되는 내용

KML 단일 geometry 파서는 추출된 텍스트를 받으며 Document와 Folder를 포함하는 전체 KML 파일은 지원하지 않는다. 여러 도형과 문서 구조를 다루는 geometry list 파서와 구분한다. 둘 다 KML attribute를 무시하므로 이름, 스타일이나 고도 모드 같은 원본 의미가 모두 보존된다고 가정하지 않는다.

KML의 prepare 옵션을 끄면 범위 밖 좌표도 geometry로 나오는 예시가 있다. 옵션을 켜거나 downstream에서 prepare해 색인 실패를 확인한다. 단일 파서의 prepare는 행별 Boolean Expression, list 파서는 Boolean Literal로 선언돼 있다는 차이도 유지한다.

With errors 모드는 `ok`와 `error`를 반환한다. List 파서는 전체 파싱 결과뿐 아니라 각 geometry에도 결과 구조가 중첩된다. 바깥 error가 없다는 이유만으로 내부 요소가 모두 성공했다고 판단하지 않는다.

Geobuf encode는 좌표 차원과 보존 소수 자릿수를 선택할 수 있고 decode는 Geometry를 반환한다. 정밀도 제한이 있는 인코딩을 원본 숫자의 무손실 보존으로 간주하지 않는다.

## 지원 엔진과 확인 범위

GeoPoint, Ontology GeoPoint, DMS, MGRS, CRS 기반 GeoPoint, WKT/WKB, 비 WGS 84 GeoJSON, angle과 series reference 변환은 공개 표에서 Batch, Faster, Streaming을 지원한다. ECEF 변환, KML 파싱과 Geobuf decode는 Batch/Streaming이며 Geobuf encode는 Faster도 지원한다.

일부 공개 예시 자체에 `...`가 들어 있어 전체 좌표나 원본 KML을 복원할 수 없다. 공개 본문을 읽은 것과 예시를 완전한 입력으로 재현한 것을 구분한다. 지원 표도 모든 환경의 배포 버전과 실제 성능을 검증한 결과는 아니다.

## 출처

- [Palantir, Create GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/constructGeoPointV1)
- [Palantir, Convert to Ontology GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/createOntologyGeopointV1)
- [Palantir, Convert from Ontology GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/ontologyGeopointToGeopointV1)
- [Palantir, Is valid Ontology GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidOntologyGeopointV1)
- [Palantir, Create geotemporal series reference](https://www.palantir.com/docs/foundry/pb-functions-expression/constructGeotemporalSeriesReferenceV1)
- [Palantir, Create GeoPoint from coordinate system](https://www.palantir.com/docs/foundry/pb-functions-expression/createGeoPointFromCoordinateSystemV1)
- [Palantir, Convert geocentric coordinates to WGS 84 geodesic coordinates](https://www.palantir.com/docs/foundry/pb-functions-expression/GeocentricToGeodesicV1)
- [Palantir, Parse GeoJSON from a non-WGS 84 coordinate system](https://www.palantir.com/docs/foundry/pb-functions-expression/parseGeoJsonAsGeometryV1)
- [Palantir, Parse well known text as geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/parseWellKnownTextAsGeometryV1)
- [Palantir, Parse well known binary as geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/parseWellKnownBinaryAsGeometryV1)
- [Palantir, Convert DMS to GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/dmsToGeoPointV1)
- [Palantir, Convert GeoPoint to DMS](https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToDmsV1)
- [Palantir, Convert GeoPoint to MGRS](https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToMgrsV1)
- [Palantir, Convert MGRS to GeoPoint](https://www.palantir.com/docs/foundry/pb-functions-expression/mgrsToGeoPointV1)
- [Palantir, Is valid MGRS](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMgrsV1)
- [Palantir, Convert between angle units](https://www.palantir.com/docs/foundry/pb-functions-expression/convertAngleV1)
- [Palantir, Convert GeoPoint to geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/geoPointToGeometryV1)
- [Palantir, Parse KML string as geometry](https://www.palantir.com/docs/foundry/pb-functions-expression/parseKmlAsGeometryV1)
- [Palantir, Parse KML string as geometry list](https://www.palantir.com/docs/foundry/pb-functions-expression/parseKmlAsGeometryListV1)
- [Palantir, Encode GeoJSON as Geobuf](https://www.palantir.com/docs/foundry/pb-functions-expression/geometryToGeobufExpressionV1)
- [Palantir, Decode Geobuf as GeoJSON](https://www.palantir.com/docs/foundry/pb-functions-expression/geobufToGeometryExpressionV1)

## 관련 문서

- [[Palantir-Pipeline-Expressions|Pipeline Builder expression 계약]]
- [[Palantir-Geospatial-Geometry-Operations|도형 준비와 공간 연산]]
- [[Palantir-Geospatial-Spatial-Indexing|공간 격자와 후보 검색]]
