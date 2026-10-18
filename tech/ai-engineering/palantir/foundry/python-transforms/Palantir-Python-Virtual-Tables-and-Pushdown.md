---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python virtual table과 외부 compute 계약"]
---

# Python virtual table과 외부 compute 계약

Virtual table은 Foundry resource reference와 외부 physical table locator를 연결한다. Foundry-native Spark는 여러 source와 dataset을 섞을 수 있다. Pushdown은 모든 input/output이 같은 호환 source의 virtual table이어야 하며 source system에서 실행한다. Lightweight decorator 형태를 쓰는 것과 local Polars/pandas가 external table을 직접 지원하는 것은 다르다.

## 등록, 권한과 locator

TableInput은 path/RID를, TableOutput은 Foundry 등록 path, source RID, source별 locator를 받는다. Checks가 virtual output을 만들면 source/location은 불변이고 나중에 바꾸면 Checks가 실패한다. 등록 뒤 간결하게 RID로 쓸 수 있다. Code import와 export controls, source egress policy 및 output source import가 필요하다. Legacy use_external_systems는 호환되지 않아 source-based external transform이나 transform 분리가 필요하다.

Locator는 BigQuery(project,dataset,table), Snowflake(database,schema,table), Databricks(catalog,schema,table,format,location), Delta(path), Files(path,format), Iceberg(table,warehouse_path)처럼 다르다. 같은 TableOutput class를 쓴다고 physical table semantics까지 같지는 않다.

## Compute mode

| Source pushdown | Runtime/API | 주요 조건 |
| --- | --- | --- |
| BigQuery | IbisInput.table / IbisOutput.write | BigQuery connection과 Ibis expression |
| Databricks | Databricks Connect, PySpark API | 기본 serverless 또는 cluster_id |
| Snowflake | Snowpark 또는 Snowpark Connect PySpark | source warehouse 또는 with_warehouse |

세 pushdown 경로 모두 @incremental 미지원이다. Source Spark/Connect의 지원 operator/UDF 범위는 Foundry Spark와 다를 수 있다. Native Spark JDBC read의 lowerBound/upperBound는 partition stride만 정하고 row filter가 아니므로 범위 밖 row도 반환한다. partitionColumn은 numeric/date/timestamp이고 numPartitions에 따라 parallel read한다.

## Databricks

Source 문서는 Connect16.4를 serverless 호환으로 권하고 classic compute는 cluster version과 맞추라고 한다. PyPI dependency이며 conda_recipe의 pip section을 사용한다. Managed Delta가 기본, location은 external Delta, format=iceberg는 managed Iceberg를 지정한다. API overview의 외부 Delta/managed Iceberg 두 유형 목록보다 상세 guide는 managed Delta까지 포함한다.

UDF dependency는 .with_dependencies로 remote worker 환경에 설치한다. Local myproject code가 worker에 없으면 ModuleNotFoundError가 생길 수 있어 inline/supporting-code packaging 경계를 확인한다. Source 예제의 여러 output 동일 Foundry path와 잘못된 함수 이름/누락 import를 valid registration으로 보장하지 않는다.

## Snowflake와 data movement

Snowpark DataFrame 연산은 외부 warehouse에서 실행하며 with_engine(pyspark)는 Spark Connect 경로다. to_pandas는 결과를 Foundry container로 옮겨 local compute/memory와 export boundary가 달라진다. 이를 완전한 no-data-movement pushdown으로 부르지 않는다.

예제의 도시/주/우편번호를 이어 SHA256하는 ANON_CODE는 코드 이름일 뿐 익명성을 증명하지 않는다. 입력 도메인이 작고 delimiter가 없으면 재식별/ambiguous concatenation 가능성을 검토한다. 이는 예제에서 도출한 조건부 보안 해석이며 외부 시스템 runtime은 실행하지 않았다.

## 출처

- [Palantir Python transforms, tables-api](https://www.palantir.com/docs/foundry/transforms-python/tables-api)
- [Palantir Python transforms, tables-bigquery](https://www.palantir.com/docs/foundry/transforms-python/tables-bigquery)
- [Palantir Python transforms, tables-compute-pushdown](https://www.palantir.com/docs/foundry/transforms-python/tables-compute-pushdown)
- [Palantir Python transforms, tables-databricks](https://www.palantir.com/docs/foundry/transforms-python/tables-databricks)
- [Palantir Python transforms, tables-overview](https://www.palantir.com/docs/foundry/transforms-python/tables-overview)
- [Palantir Python transforms, tables-snowflake](https://www.palantir.com/docs/foundry/transforms-python/tables-snowflake)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
