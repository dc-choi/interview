---
tags: [palantir, foundry, api, dataset, schema, batch]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Dataset Schema API"]
---

# Dataset schema 버전과 테이블 export

Dataset schema는 파일을 테이블로 읽기 위한 구조 계약이다. raw 파일의 업로드, schema 등록과 특정 schema 버전/transaction의 테이블 읽기는 별도 작업이다. Streams의 fields/dataType schema와 이 API의 fieldSchemaList를 같은 입력 객체로 재사용하지 않는다.

## Schema의 두 버전 축

GET `/api/v2/datasets/{datasetRid}/getSchema`는 branchName, endTransactionRid와 versionId를 선택한다. endTransactionRid를 생략하면 최신 committed 시점을, versionId를 생략하면 최신 schema version을 사용한다. 응답은 branchName, endTransactionRid, schema와 versionId를 반환한다.

transaction의 데이터 시점과 schema의 버전 식별자는 다른 값이다. 같은 이름을 가진 branch의 OPEN 참조를 최신 committed schema의 시점으로 자동 변환하지 않는다. 잘못된 인자 조합은 InvalidParameterCombination이 될 수 있다.

GetSchemaBatch는 POST `/api/v2/datasets/getSchemaBatch`이며 최대 1,000개 element를 받는다. 각 element는 datasetRid와 선택적 branchName/endTransactionRid/versionId를 담는다. 응답은 dataset RID별 schema map이다. 부재/접근 불가 dataset은 응답에서 생략되므로 요청 수와 결과 수가 반드시 같다고 가정하지 않는다.

## Field schema의 구조

schema의 fieldSchemaList에는 필수 type과 nullable, 선택적 name/customMetadata를 가진 field가 들어간다. nested field에는 name이 없을 수 있다.

| 타입/설정 | 관련 field |
|---|---|
| ARRAY | arraySubtype |
| MAP | mapKeyType, mapValueType |
| STRUCT | subSchemas |
| DECIMAL | precision, scale |
| 사용자 정의 타입 | Spark UserDefinedType subclass의 canonical class name |

primitive type은 ARRAY/BINARY/BOOLEAN/BYTE/DATE/DECIMAL/DOUBLE/FLOAT/INTEGER/LONG/MAP/SHORT/STRING/STRUCT/TIMESTAMP enum으로 표현된다. nested object마다 실제 타입에 적용되는 field만 사용한다. customMetadata는 description이나 Foundry archetype 같은 사용자 metadata다.

## Schema 쓰기

PUT `/api/v2/datasets/{datasetRid}/putSchema`는 필수 schema와 선택적 branchName/endTransactionRid/dataframeReader를 받는다. reader는 기본 PARQUET이고 AVRO/CSV/DATASOURCE도 enum에 있다. OAuth2 scope는 `api:datasets-write`이며 성공 응답은 적용된 schema version/transaction 문맥을 포함한다.

데이터 파일이 schema와 일치해야 한다는 계약과 schema의 형태를 서버가 받아들였다는 사실을 구분한다. 업로드 없이 schema만 바꾸거나 파일을 먼저 올린 경우에도 다음 실제 읽기 결과를 확인해야 한다. 이것은 명세의 파일/schema 대응 조건에서 도출한 연동 점검이다.

SchemaNotFound는 schema 부재나 접근 불가를 포함한다. DatasetViewNotFound는 유효한 파일 view 부재로, transaction/파일이 아직 없거나 잘못된 branch/권한일 수 있다. InvalidSchema와 작업별 PermissionDenied도 별도로 처리한다.

## CSV/Arrow 테이블 읽기

GET `/api/v2/datasets/{datasetRid}/readTable`은 필수 format ARROW/CSV와 선택적 columns, rowLimit, branch/transaction 범위를 받는다. 응답은 binary content stream이다. row 순서는 비결정적이므로 rowLimit을 안정적인 상위 N개나 페이지 cursor로 해석하지 않는다.

확인일 error 설명은 Parquet가 아닌 저장 형식에 100만 row 제한이 있고 Parquet에는 이 row 제한이 없다고 명시한다. 이는 timeout, 다운로드 크기와 처리 자원 등 다른 제한이 모두 사라진다는 뜻은 아니다. virtual View를 이 endpoint로 읽는 기능은 미지원으로 명시된다.

ReadTableRowLimitExceeded, ReadTableTimeout, ReadTableError, ColumnTypesNotSupported와 DatasetReadNotSupported를 나누어 처리한다. 기본 scope는 `api:datasets-read`다.

공식 네 endpoint의 전체 schema를 대조했으며 실제 schema 변경, batch의 권한 필터와 CSV/Arrow export는 시험하지 않았다.

## 출처

- [Palantir, Get Dataset Schema](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset-schema)
- [Palantir, Get Schema Datasets Batch](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-schema-datasets-batch)
- [Palantir, Put Dataset Schema](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/put-dataset-schema)
- [Palantir, Read Table Dataset](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/read-table-dataset)

## 관련 문서

- [[Palantir-Data-APIs]]
- [[Palantir-Dataset-V2-API]]
- [[Palantir-Python-Dataset-IO]]
