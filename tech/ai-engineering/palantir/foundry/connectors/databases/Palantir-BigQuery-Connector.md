---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# BigQuery 동기화, export와 virtual 계산

BigQuery source의 project ID는 다른 프로젝트의 데이터를 읽더라도 관련 data/compute 비용이 청구될 프로젝트다. read session user, dataset Data Viewer, view/custom query의 Job User, export/temp의 Data Editor와 GCS staging Object Admin을 실제 작업에 맞춰 나눈다.

## sync와 query

service-account JSON/PKCS8 또는 OIDC를 사용하며 instance 인증은 적절한 agent에서만 되고 virtual table에는 적용되지 않는다. sync의 Avro 경로는 BIGNUMERIC/TIME을 지원하지 않는다. export는 MAP/STRUCT/ARRAY 제약을 따로 확인한다.

custom SELECT/WITH의 20GB 초과 결과나 view에는 temporary dataset 설정이 필요하다. temporary dataset의 region이 job 위치를 결정하므로 모든 입력과 맞춘다. worker disk 600GB 언급을 BigQuery 전체의 보편적인 한도로 해석하지 않는다.

incremental은 `@value`보다 큰 조건, 오름차순 정렬과 `@limit`를 사용한다. 문서의 incremental type 목록에는 일반 sync에서 제외한 BIGNUMERIC/TIME도 있으므로 목록만으로 실제 sync가 된다고 결론 내리지 않는다.

## export 경로와 보존

대량 export는 GCS staging 경로를 검토하며 별도 최소 권한 bucket을 둔다. API export의 수백만 행 예시는 throughput 보장이나 SLA가 아니다. API 경로는 임시 데이터를 output 주변에 만들 수 있으므로 격리 조건을 확인한다.

SNAPSHOT은 대상 테이블을 삭제하고 재생성해 추가 ACL/공유 제한이 사라질 수 있다. 문서는 API-exported table에 BigQuery row/column permission을 적용하지 말 것을 경고한다. Hive partition도 API export 경로에서 지원한다고 가정하지 않는다.

legacy task는 Parquet 입력, 최초 SNAPSHOT 이후 REQUIRE_INCREMENTAL의 append/schema 일치를 확인한다. 현행 table export와 legacy task의 설정을 섞지 않는다.

## virtual table

table/view/materialized view 입력, table 출력과 bulk/automatic 등록을 지원한다. incremental은 append 원본, Time Travel/Change History 조건을 따르며 UPDATE/DELETE 추적을 일반 지원으로 간주하지 않는다. 변경 메타데이터는 `_CHANGE_TYPE`, `_CHANGE_TIMESTAMP`다.

unparameterized BIGNUMERIC를 Spark 38/18로 맞추는 선택은 정밀도 손실을 일으킬 수 있고 범위를 넘는 parameterized 형식은 별도 제한이다. predicate pushdown과 같은 source의 Python full federation을 구별한다.

gRPC 최대 메시지는 단일 최대 행만이 아니라 한 메시지에 모인 여러 행 기준이다. stale view schema는 원본 view refresh/recreate 진단을 확인한다.

## 출처

- [Palantir, bigquery](https://www.palantir.com/docs/foundry/available-connectors/bigquery)

## 관련 문서

- [[Palantir-Connector-Contracts]]
