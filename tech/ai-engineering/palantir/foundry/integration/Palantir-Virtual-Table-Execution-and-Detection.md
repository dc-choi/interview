---
tags: [palantir, virtual-tables, pushdown, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Virtual table 실행과 변경 감지"]
---

# Virtual table 실행과 변경 감지

Virtual table은 external source connection과 table locator를 가진 pointer다. 원본을 먼저 Foundry dataset으로 복제하지 않고 읽거나 지원 경로에서 외부 table에 output을 쓴다. 권한/lineage는 Foundry resource로 관리하지만 원본과 downstream materialization은 서로 다른 저장/갱신 경계다.

Managed Iceberg는 Foundry catalog가 관리하고 virtual Iceberg는 외부 catalog의 table을 가리킨다. Table format은 file 구성/column/history 규약이며 catalog는 table의 존재와 storage 위치를 찾는다. Iceberg라는 이름만으로 원본 table과 모든 execution mode의 read/write 지원을 동일시하지 않는다.

## Source, table type과 engine별 capability

BigQuery/Snowflake/Databricks와 S3/ADLS/GCS 등의 지원 source가 있지만 capability는 조합별로 다르다. 예를 들어 Databricks managed Delta/view는 read-only이고 external Delta/managed Iceberg는 write 경로가 있으며, Snowflake managed Iceberg는 다른 Snowflake table과 Foundry single-node 지원이 다르다.

2026-10-16 matrix 기준 native pushdown은 BigQuery Python Ibis, Databricks PySpark/Pipeline Builder, Snowflake Snowpark/Pipeline Builder 경로로 나뉜다. Object-store Parquet/Avro/CSV/Delta의 표는 read/write capability와 Foundry Python/Pipeline Builder compute 지원 칸을 다르게 표시한다. 상단 format/지원 표와도 범위 차이가 있으므로 source 문서/actual table type 없이 일괄 사용 가능하다고 결론 내리지 않는다.

Iceberg catalog도 source별이다. S3는 Glue/Object Storage/Polaris, ADLS는 Object Storage/Polaris, GCS는 Lakehouse/Object Storage, Snowflake는 Horizon, Databricks는 Unity 경로를 확인한다. S3/ADLS에서 Unity는 legacy이며 Databricks source가 권장된다.

Virtual input은 Contour 분석, Ontology backing, Lineage, supported transforms/Workspaces에 사용할 수 있다. Contour Save as dataset, Pipeline Builder streaming/faster build는 지원 범위 밖이다. Python은 새 virtual output을 생성할 수 있고 SQL/Java는 기존 virtual output 쓰기 경로를 지원한다. Single-node virtual output의 expectation on_error=FAIL은 지원하지 않지만 input/managed Iceberg/Spark와는 다르다.

## Registration과 actual source table의 수명

Manual/bulk 등록은 source table을 선택하고 Foundry resource 이름/위치를 정한다. Foundry 이름 변경이 external table 이름을 바꾸지는 않는다. 지원 source의 auto-registration은 managed Project를 만들고 source hierarchy를 주기적으로 반영한다. 사용자가 그 Project에 resource를 임의 생성/수정할 수 없으며 다른 Project로 reference한다.

Source table을 삭제해도 auto-registered resource는 자동 삭제되지 않아 읽을 data가 없을 수 있다. Databricks tag filter는 TABLE_TAGS 중 지정 tag 하나 이상과 일치한 table만 등록한다. 등록된 resource 존재를 원본 data 존재나 성공적인 query 증거로 취급하지 않는다.

## Update detection과 incremental은 별개다

External에서 관리하는 input에 downstream resource가 생긴 뒤 polling update detection을 켤 수 있다. Versioned Delta/Iceberg면 source version 변화를 비교하고 non-versioned면 poll마다 잠재 update로 처리해 불필요한 build를 만들 수 있다. Foundry pipeline이 만든 virtual output은 build 정보로 update를 추적하므로 같은 input detection이 필요하지 않다.

Detection은 언제 trigger할지만 정한다. Snapshot/incremental 실행은 별도 지원이며 virtual incremental은 append-only와 source의 Change Data Feed/Incremental Reads 조건을 따른다. Versioning 지원이 곧 arbitrary update/delete incremental 지원은 아니다. Non-versioned source는 snapshot을 사용한다.

Object backing table이 외부에서 바뀌면 detection과 reindex 경로를 켜야 한다. Direct table query가 원본의 현재 data를 읽는 것과 이미 materialized된 object/dataset이 항상 최신이라는 것은 다르다. Source versioning 지원은 Foundry dataset의 branch/history 기능을 동일하게 제공한다는 뜻도 아니다.

## Network와 export 권한

Virtual table은 Foundry worker/direct egress를 요구한다. Agent worker/agent proxy/bucket endpoint egress는 지원하지 않고 self-service private link도 일반적으로 지원하지 않는다. Palantir가 구성한 private link 예외는 별도 확인한다.

Code Repository에서 source import/export control을 허용해야 한다. Source credentials와 egress가 consuming job에 제공되어 다른 Foundry input도 외부로 보낼 수 있기 때문이다. Legacy use_external_systems와 호환되지 않으므로 source-based transform으로 바꾸거나 job을 나눈다.

## 선택 기준

Virtual table은 중복 storage를 줄이고 지원 query를 source로 pushdown할 수 있지만 interactive latency와 반복 source compute가 늘 수 있다. Source outage/credentials/egress가 read availability에 직접 영향을 준다. Downstream dataset/object는 여전히 data를 Foundry에 저장할 수 있으므로 zero-copy를 전체 시스템의 무복제로 확대하지 않는다. Workflow마다 sync/materialization과 비교한다.

## 출처

- [Palantir, Virtual tables](https://www.palantir.com/docs/foundry/data-integration/virtual-tables)
- [Palantir, Iceberg tables](https://www.palantir.com/docs/foundry/data-integration/iceberg-tables)

## 관련 문서

- [[Palantir-External-Transform-and-Function-Boundaries|Source export control]]
- [[Palantir-Iceberg-Catalog-and-Transactions|Managed Iceberg catalog]]
- [[Palantir-Dataset-Preview-and-Parsing|Table details와 query]]
