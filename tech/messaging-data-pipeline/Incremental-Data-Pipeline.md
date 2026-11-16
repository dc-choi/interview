---
tags: [data-pipeline, cdc, incremental, dbt, delta-lake, airflow, orchestration]
status: done
verified_at: 2026-11-16
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Incremental Data Pipeline", "증분 파이프라인", "증분 처리", "Change Data Feed", "CDC와 CDF"]
---

# 증분 파이프라인: 변경을 파생 결과까지 전달하기

변경을 가져오는 일과 그 변경이 분석 결과에 반영되는 일은 다르다. 원본 주문이 취소되어 레이크의 주문 테이블까지 고쳤어도, 그 주문으로 미리 계산해 저장한 분석용 테이블은 어제 상태로 남는다. 증분 파이프라인은 변경을 원본에서 레이크 테이블로, 다시 레이크 테이블에서 파생 테이블로 단계마다 이어서 전달하는 구성이다.

조회할 때마다 원본 테이블을 직접 읽어 계산하면 그때 읽은 상태가 결과에 반영된다. 계산 결과를 별도 테이블로 저장했을 때만 그 결과를 갱신하는 작업이 따로 필요하다. 수집과 변환의 기본 구분은 [[ELT-Platform|ELT 플랫폼]], 테이블 상태를 관리하는 형식은 [[Data-Lake-Table-Formats|데이터 레이크의 테이블 형식]]에서 다룬다.

## 변경이 지나가는 두 구간

| 구간 | 출발과 도착 | 변경을 읽는 수단 | 적용 방식 |
|---|---|---|---|
| 1 | 서비스 DB에서 레이크의 주문 테이블로 | CDC (Debezium, AWS DMS, Datastream, Zero-ETL 같은 관리형 복제) | 주문 번호로 기존 행을 찾아 수정하거나 삭제한다 |
| 2 | 레이크의 주문 테이블에서 분석용 파생 테이블로 | 테이블 형식의 변경분 읽기 (Delta Lake CDF, Hudi 증분 쿼리, Iceberg changelog view) | 영향받은 범위를 다시 계산해 정해 둔 키로 갱신한다 |

원본 그대로 보관한 데이터, 정리한 주문 테이블과 분석용 테이블은 서로 다른 결과물이다. 앞의 것이 바뀌면 뒤에서 무엇을 다시 만들어야 하는지를 알아야 한다.

## 구간 1: 원본의 변경을 테이블에 적용한다

- **기준점과 이후 변경**: 처음에 기준이 될 현재 내용을 가져오고 그 기준점 이후의 변경을 이어서 읽는다. 그 사이에 생긴 변경을 빠뜨리지 않는 것이 조건이다.
- **위치 기록**: 어디까지 가져왔는지 기록해야 연결이 끊긴 뒤 이어서 처리할 수 있다.
- **키로 적용**: 주문 취소는 주문 번호로 기존 행의 상태를 바꾼다. 새 주문처럼 한 줄 더 추가하지 않는다. 원본에서 실제로 지운 행은 삭제도 반영한다.
- **역할 분담**: Spark 같은 엔진이 변경을 계산하고 적용하며, Iceberg나 Delta Lake 같은 테이블 형식이 조회 때 읽을 새 상태를 관리한다.

CDC 도구의 동작과 운영은 [[CDC-Debezium-Concept|Debezium CDC]], [[DMS|AWS DMS]]와 [[Glue#CDC 적재와 Iceberg의 현재 상태 반영을 나눈다|CDC 적재와 Iceberg 상태 반영]]을 따른다.

## 구간 2: 영향받은 결과만 다시 만든다

가장 단순한 방법은 파생 테이블 전체를 다시 만드는 것이다. 데이터가 작거나 하루 한 번으로 충분하면 이 방법이 오히려 간단하다. 기록이 많이 쌓인 뒤 일부 주문이 바뀔 때마다 전체를 다시 가공하기 아까워질 때, 새로 들어오거나 바뀐 데이터와 그 영향을 받은 부분만 처리하는 증분 처리로 옮긴다.

기준은 생성 시각이 아니라 변경 시각이다. 지난달 주문이 오늘 취소됐을 때 오늘 생성된 주문만 읽으면 그 취소가 빠진다. 어떤 행이 오늘 바뀌었고 어떤 결과에 영향을 주는지를 본다. 상품 분류를 키보드에서 액세서리로 고치면 예전 분류와 새 분류의 집계가 모두 바뀌므로, 영향 범위는 바뀐 행의 이전 값과 이후 값을 함께 봐야 정해진다.

### 테이블이 변경분을 알려 주는 기능

테이블 전체를 다시 읽어 비교하지 않고 바뀐 행을 읽는 기능이다. 아래는 2026-11-16 각 공식 문서 대조 기준이다.

| 형식 | 기능 | 확인한 동작 |
|---|---|---|
| Delta Lake | Change Data Feed | 테이블 속성 `delta.enableChangeDataFeed = true`로 켠다. `_change_type`은 `insert`, `update_preimage`, `update_postimage`, `delete`다. 켠 뒤의 변경만 기록하며 이전 변경은 남지 않는다 |
| Apache Hudi (1.2.1 문서) | 증분 쿼리와 CDC 쿼리 | 증분 쿼리는 특정 커밋 시각 이후 바뀐 레코드의 최신 값을, CDC 쿼리는 기간 안의 모든 변경을 이전과 이후 값, 변경 연산과 함께 돌려준다 |
| Apache Iceberg (1.12.0 문서) | Spark의 `create_changelog_view` 프로시저 | 테이블의 변경을 담은 뷰를 만든다. `_change_type`은 `INSERT`, `DELETE`, `UPDATE_BEFORE`, `UPDATE_AFTER`다. 갱신 전후 값은 `compute_updates`가 참일 때만 계산되며, 이 옵션은 `identifier_columns`를 줬을 때만 기본값이 참이다. 그렇지 않으면 갱신이 삭제와 삽입 두 행으로 나온다([[Palantir-Iceberg-CDC-Semantics]]) |

```sql
ALTER TABLE orders SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

-- 버전 12부터 15까지 바뀐 행
SELECT * FROM table_changes('orders', 12, 15);
```

CDC는 서비스 DB의 변경을 레이크 테이블에 반영하고, CDF는 그 테이블의 변경을 읽어 파생 결과를 갱신한다. 이름이 비슷하지만 맡는 구간이 다르다.

## 가공 규칙과 실행 엔진을 나눈다

어떤 행을 골라 어느 결과를 어떤 키로 갱신할지가 가공 규칙이고, 그 계산을 실제로 하는 것은 엔진이다. dbt는 가공 규칙을 SQL 모델로 관리하며 계산은 연결한 웨어하우스나 엔진이 한다.

dbt 문서(2026-07-13 갱신본) 기준, 증분 모델은 첫 실행에서 원천의 모든 행을 변환해 테이블을 만들고 이후 실행에서는 필터로 지정한 행만 변환한다. 그 필터는 `is_incremental()` 매크로로 감싸며, 이 매크로는 대상 테이블이 이미 있고 `--full-refresh`를 주지 않았으며 모델이 `materialized='incremental'`일 때만 참이다. `unique_key`를 지정하면 새 행을 덧붙이는 대신 기존 행을 갱신한다. `--full-refresh`는 대상 테이블을 지우고 전체를 다시 만든다.

```sql
{{ config(materialized='incremental', unique_key='order_id') }}

select o.order_id, o.status, t.campaign, o.updated_at
from {{ ref('stg_orders') }} o
join {{ ref('int_order_first_touch') }} t on t.order_id = o.order_id
{% if is_incremental() %}
where o.updated_at >= (select coalesce(max(updated_at), '1900-01-01') from {{ this }})
{% endif %}
```

이 예시는 `int_order_first_touch`가 주문당 한 행이라는 전제에서만 `order_id`가 결과의 유일한 키다. 고객의 방문 기록처럼 여러 행인 테이블을 그대로 조인하면 주문 하나가 여러 행이 되어 키로 갱신한다는 전제가 깨진다. 필터의 `>=`와 `coalesce`는 직전 최댓값과 같은 시각에 뒤늦게 들어온 행과 대상 테이블이 비어 있는 경우를 놓치지 않기 위한 것이다. inner join이라 유입 정보가 아직 없는 주문은 결과에 들어가지 않으며, 나중에 도착해도 주문의 변경 시각이 필터보다 오래돼 계속 빠진다. 그 경우는 양쪽의 변경을 함께 보거나 최근 구간을 다시 계산한다.

변경 시각 필터는 수정된 행만 잡는다. 원본에서 지워진 행은 이 필터에 걸리지 않으므로 삭제 표시 컬럼이나 테이블의 변경분 읽기를 따로 쓴다(설계 점검).

같은 가공 단계에 놓이지만 맡는 일이 다른 도구들도 구분한다. Pandas는 표 데이터 가공, Dask는 표 작업의 병렬 처리, Ray는 Python 함수의 병렬 실행, Boto3는 AWS 저장소의 파일 접근이며, 기존 Hadoop 환경에서는 Hive SQL로 가공한다. Spark는 SQL이나 Python으로 쓴 가공을 여러 작업으로 나눠 실행한다([[Stream-and-Batch-Processing|스트림과 배치 처리]]).

## 실행 순서와 데이터 준비 상태

오케스트레이션 도구는 언제 어떤 순서로 실행할지를 맡는다. 입력을 준비한 뒤 연결 작업을 시작하고, 결과를 검사한 뒤 보고서가 읽게 한다.

- **Airflow** (3.4.0 문서): 시간 기준 외에 자산 갱신으로 Dag를 시작할 수 있다. 생산 태스크에 `outlets=[asset]`, 소비 Dag에 `schedule=[asset]`을 둔다. 태스크가 성공으로 끝났을 때만 자산을 갱신된 것으로 표시한다.
- **Dagster** (1.13.30 문서): 자산을 테이블, 파일, 저장된 모델 같은 영속 저장소의 객체로 정의하고, 자산 정의가 자신의 의존 관계를 안다.
- **Prefect** (v3 문서): Python 함수를 데이터 파이프라인으로 실행하는 오케스트레이션 엔진이며 성공, 실패와 재시도 상태를 추적한다.

모든 작업이 성공으로 표시돼도 같은 시점까지 데이터가 준비된 것은 아니다. 주문은 10시까지 반영됐는데 방문 기록은 9시 50분까지만 준비됐다면 그 사이의 연결은 빠져 있다. 주문이 갱신됐다는 알림만으로는 방문 기록의 준비 여부를 알 수 없으므로, 입력마다 어디까지 반영됐는지와 보고서가 어느 시점까지의 데이터를 보여 주는지를 함께 확인한다. 대시보드 집계와 학습용 데이터도 원본이 갱신됐다고 저절로 바뀌지 않는다.

## 재시도와 백필

- **재시도**: 변경을 저장한 뒤 응답을 받지 못해 같은 작업이 다시 실행될 수 있다. 오케스트레이터는 재시도를 맡고, 가공 코드는 다시 실행해도 같은 결과가 나오게 만든다. 행을 덧붙이지 않고 키로 갱신하는 것이 기본이다([[ELT-Platform#재실행과 데이터 품질을 별도로 검증한다|재실행과 품질 검증]], [[Idempotent-Consumer|멱등 처리]]).
- **백필**: 가공 규칙을 고쳐도 이미 만든 과거 결과는 바뀌지 않는다. 고친 코드로 과거 구간을 다시 처리한다. Airflow 3.4.0 문서는 백필을 Dag의 과거 날짜 실행을 만드는 것으로 정의하며 `airflow backfill create --dag-id <dag> --from-date <날짜> --to-date <날짜>`로 만든다. 운영 트래픽과의 자원 분리는 [[Backfill-Resource-Isolation|백필과 자원 격리]]를 따른다.

## 서비스에 맡길 수 있는 범위

복제 경로, 테이블 관리와 실행 환경을 관리형 서비스에 맡기는 선택지가 늘었다. 아래는 2026-11-16 각 공식 문서 대조 기준이다.

| 맡기는 일 | 예 | 확인한 범위 |
|---|---|---|
| 복제 경로 | Aurora의 Redshift zero-ETL 통합 | Aurora MySQL을 원천으로 지원한다. 처음에 데이터를 seeding하고 이후 변경은 binlog로 잡으며, 파이프라인을 AWS가 프로비저닝하고 관리한다 |
| 레이크 파일과 테이블 | Fivetran Managed Data Lake Service | 고객의 객체 저장소(S3, ADLS, GCS)에 Parquet로 쓰고 Iceberg 메타데이터를 만든다(Delta Lake는 선택). 기본 카탈로그도 Fivetran이 관리한다 |
| 수집, 가공과 작업 실행 | Databricks Lakeflow | Lakeflow Connect(수집), Lakeflow pipelines(배치와 스트리밍 파이프라인), Lakeflow Jobs(오케스트레이션과 모니터링), Lakeflow Designer(시각적 데이터 준비)로 구성된다 |
| Spark 실행 자원 | Amazon EMR Serverless | 클러스터를 구성하거나 운영하지 않으며, 작업에 필요한 자원을 서비스가 정해 확보하고 끝나면 반납한다([[EMR#EMR Serverless의 실행과 용량 경계\|EMR Serverless]]) |

맡길 수 있는 것은 경로와 실행 환경이다. 가져온 데이터를 어떻게 연결하고 가공할지, 어떤 키로 갱신할지는 여전히 직접 정한다. 관리형 복제도 동기화 상태와 데이터 준비를 따로 확인한다([[Glue#Zero-ETL도 동기화 상태와 데이터 준비를 확인한다|Zero-ETL의 준비 상태]]).

## 운영 점검

- 파생 테이블마다 입력 테이블과 갱신 키를 적어 두었는가?
- 증분 필터가 생성 시각이 아닌 변경 시각을 보고, 삭제를 따로 처리하는가?
- 같은 구간을 두 번 실행해도 행이 늘지 않는가?
- 보고서가 입력별 반영 시점 중 가장 늦은 것을 기준으로 표시되는가?
- 가공 규칙을 고친 뒤 다시 처리할 과거 구간과 방법이 정해져 있는가?
- 전체 재생성으로 충분한 크기인데 증분 처리를 먼저 들이지 않았는가?

## 확인 범위

2026-11-12 공개된 GeekCast 시즌2 EP05의 14분 57초 영상에서 사람이 단 한국어 자막 전체를 2026-11-16 읽었다. 두 구간의 구분, 증분 처리의 기준, 가공 규칙과 엔진의 분리, 준비 상태, 재시도와 백필의 흐름은 영상의 구성을 따랐고 제품 동작은 위 공식 문서로 대조했다. Iceberg의 changelog view는 영상에 없는 내용을 공식 문서에서 더했다. 화면에만 나온 도표와 코드는 확인하지 않았고, 예시 SQL은 문서의 문법에 맞춰 작성했으며 실행해 보지 않았다. Google Cloud, Microsoft와 Snowflake의 복제 자동화 기능, Airflow Sensor, Prefect의 재시도 설정은 대조하지 않았다. Pandas, Dask, Ray, Boto3와 Hive의 역할 설명도 영상 설명만 따랐다. Iceberg의 `compute_updates` 조건은 2026-11-16 Spark procedures 문서로 대조했다.

## 출처

- [GeekCast, 최신 데이터 인프라 이해하기 시즌2, EP05 데이터 수집과 변환: CDC, dbt, Spark로 변경 반영하기](https://www.youtube.com/watch?v=UqjTIXGc1S4) — 2026-11-12 공개, 2026-11-16 한국어 수동 자막 전체 확인
- [AWS, Aurora zero-ETL integrations](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/zero-etl.html)
- [Fivetran, Managed Data Lake Service](https://fivetran.com/docs/destinations/managed-data-lake-service)
- [Databricks, Data engineering with Databricks](https://docs.databricks.com/aws/en/data-engineering/) — 2026-11-05 갱신본
- [AWS, What is Amazon EMR Serverless?](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html)
- [Delta Lake, Change Data Feed](https://docs.delta.io/latest/delta-change-data-feed.html)
- [Apache Hudi, SQL Queries](https://hudi.apache.org/docs/sql_queries) — 1.2.1 문서
- [Apache Iceberg, Spark Procedures](https://iceberg.apache.org/docs/latest/spark-procedures/) — 1.12.0 문서
- [dbt, Incremental models](https://docs.getdbt.com/docs/build/incremental-models) — 2026-07-13 갱신본
- [Apache Airflow, Asset-Aware Scheduling](https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/asset-scheduling.html) — 3.4.0 문서
- [Apache Airflow, Backfill](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html) — 3.4.0 문서
- [Dagster, Assets](https://dagster.io/docs/guides/build/assets) — 1.13.30 문서
- [Prefect, Get started](https://www.prefect.io/docs/v3/get-started) — v3 문서
- [Google Cloud, Datastream overview](https://docs.cloud.google.com/datastream/docs/overview)

## 관련 문서

- [[ELT-Platform|ELT 플랫폼]]
- [[Data-Lake-Table-Formats|데이터 레이크의 테이블 형식]]
- [[Data-Infrastructure-Layers|데이터 인프라의 계층과 계약]]
- [[Query-Engine-Execution|쿼리 엔진]]
- [[CDC-Debezium-Concept|Debezium CDC]]
- [[DMS|AWS DMS]]
- [[Glue|AWS Glue]]
- [[EMR|Amazon EMR]]
- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[Backfill-Resource-Isolation|백필과 자원 격리]]
- [[Idempotent-Consumer|멱등 처리]]
