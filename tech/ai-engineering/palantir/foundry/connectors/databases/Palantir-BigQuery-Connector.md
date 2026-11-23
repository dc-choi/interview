---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
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

## 외부 코드

복잡한 조회나 갱신은 external transform에서 `google-cloud-bigquery` client를 직접 쓴다. 2026-11-24 확인한 문서의 읽기와 쓰기 예제는 `@external_systems`로 source를 받고 `@transform.using`(lightweight transform 권장 문법, transforms 3.68.0 이상과 Code Repositories의 `transformsLangPythonPluginVersion` 1.978.0 이상)과 `LightweightInput`/`LightweightOutput`을 쓴다. source의 `get_secret("jsonCredentials")`를 JSON으로 읽어 `bigquery.Client.from_service_account_info`에 넘기므로 JSON 형식 service account key를 쓰는 source를 전제로 한다(예제 해석). PKCS8 key, OIDC나 instance 인증 source에는 예제를 그대로 쓸 수 없고, secret 이름은 transform의 source 패널에서 확인한다. 결과는 반환하지 않고 polars DataFrame으로 바꿔 `output.write_table`로 쓴다.

- 읽기: 입력 dataset에서 만든 목록과 기준값을 `ArrayQueryParameter`, `ScalarQueryParameter`로 넘기고 `IN UNNEST(@...)` 조건으로 조회한다. 값을 SQL 문자열에 이어 붙이지 않는다.
- 쓰기: 고정 이름의 임시 테이블(`temp_update_tracking`)을 지운 뒤 `load_table_from_json`(load job)으로 입력 행을 올리고, `MERGE`로 대상 테이블의 일치 행만 갱신한 다음 임시 테이블을 지우고 갱신된 행을 다시 조회해 output에 남긴다.

다음은 예제 코드를 읽은 해석이며 Palantir 문서의 경고는 아니다. 임시 테이블 이름이 고정이라 같은 dataset에서 동시에 실행하면 서로의 데이터를 지울 수 있다. 예제에는 예외 처리가 없고 마지막 정리도 선택 단계로 표시돼 있어, 중간에 실패하면 다음 실행의 첫 삭제 전까지 임시 테이블이 남는다. BigQuery 쓰기와 Foundry output 쓰기는 구조상 하나의 트랜잭션이 아니므로 MERGE 뒤 build가 실패하면 외부 테이블만 바뀐 상태가 될 수 있다. 실행별 고유 임시 이름과 `try/finally` 정리를 따로 두고, MERGE 뒤 실패했을 때 재실행해도 같은 결과가 되는지 확인한다. 2026-10-20 수집본의 pandas 예제(`@lightweight`, `transform_pandas`, `load_table_from_dataframe`, DataFrame 반환)와 섞지 않으며, 3.68.0 미만 저장소는 legacy `@lightweight`와 `@transform` 조합을 쓸 수 있다.

## 출처

- [Palantir, bigquery](https://www.palantir.com/docs/foundry/available-connectors/bigquery)
- [Palantir, lightweight-api-evolution](https://www.palantir.com/docs/foundry/transforms-python/lightweight-api-evolution)
- [Google Cloud, BigQuery Python Client](https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Python-Transform-Definition-and-Resources]]
- [[Palantir-Source-Identity-and-Code]]
