---
tags: [database, query-engine, trino, duckdb, lakehouse, olap]
status: done
verified_at: 2026-11-09
category: "데이터&저장소(Data&Storage)"
aliases: ["Query Engine", "쿼리 엔진", "Trino와 DuckDB", "Ad Hoc Query Engine"]
---

# 쿼리 엔진: SQL이 읽기, 이동과 계산이 되는 과정

쿼리 엔진은 SQL을 실행 계획으로 바꾸고, 필요한 데이터를 읽어 조인하고 집계해 결과를 만드는 프로그램이다. 레이크에 Parquet나 Iceberg로 데이터를 저장했다고 분석이 저절로 되지는 않는다. 카탈로그와 테이블 형식은 어떤 파일이 테이블인지 찾게 돕고, 실제 계산은 엔진이 한다.

같은 SQL도 데이터가 어디에 있는지, 몇 명이 몇 번 반복해서 조회하는지, 이미 쓰는 플랫폼이 무엇인지에 따라 맞는 엔진이 달라진다. 테이블 형식과 카탈로그는 [[Data-Lake-Table-Formats|데이터 레이크의 테이블 형식]], 저장과 계산의 역할 지도는 [[Data-Infrastructure-Layers|데이터 인프라의 계층과 계약]]에서 다룬다.

## SQL 한 줄 뒤의 실행 계획

광고로 들어온 고객이 어떤 상품군을 주문했는지 묻는 SQL을 예로 든다. 방문과 주문은 레이크에, 상품 분류는 운영 DB에 있다고 가정한다. 이름의 앞부분은 Trino처럼 데이터 소스별 카탈로그를 붙이는 표기를 빌렸다.

```sql
SELECT p.category, count(*) AS orders
FROM lake.web.visits v
JOIN lake.shop.orders o ON o.customer_id = v.customer_id
JOIN mysql.shop.products p ON p.product_id = o.product_id
WHERE v.campaign = 'keyboard-ad'
  AND v.visited_at >= DATE '2026-05-01'
GROUP BY p.category;
```

SQL은 원하는 답을 적고, 엔진은 그 답을 만들 순서를 정한다. 옵티마이저와 실행 계획의 일반 용어는 [[SQL-Tuning-Terminology|SQL 튜닝 용어]]를 따른다.

1. **해석과 계획**: 어떤 테이블을 먼저 읽고, 조건을 어디서 적용하며, 어떤 방식으로 조인하고 집계할지 정한다.
2. **읽을 양 줄이기**: 필요한 열만 읽고, 기간 조건으로 해당하지 않는 파일과 파일 일부를 건너뛴다. 이 예에서는 배송 주소 같은 열과 기간 밖의 방문 기록을 읽을 필요가 없다.
3. **조인과 이동**: 같은 고객 번호의 방문과 주문이 한 작업자에서 만나야 한다. 데이터가 여러 서버에 나뉘어 있으면 중간 결과를 서버 사이로 옮긴다.
4. **집계와 결과**: 상품군별로 묶어 최종 결과를 만든다.

비용은 결국 얼마나 읽고, 얼마나 계산하고, 얼마나 옮기는지에서 나온다. 서버를 더 붙이는 선택은 이 일을 나누는 방법이며, 읽고 옮길 양 자체를 줄이는 계획 개선과는 다른 수단이다.

## 분산 엔진의 실행 단위

Trino 문서(484 기준)는 분산 실행을 다음 단위로 설명한다.

| 단위 | 역할 |
|---|---|
| Coordinator | SQL을 해석하고 계획하며 worker를 관리한다. 클라이언트는 여기에 SQL을 보낸다. |
| Worker | task를 실행하고 데이터를 처리한다. connector에서 데이터를 가져오고 worker끼리 중간 데이터를 주고받는다. |
| Connector와 catalog | connector는 데이터베이스 드라이버처럼 Trino를 데이터 소스에 연결한다. catalog는 데이터 소스 하나에 접근하는 설정 묶음이다. |
| Stage, task와 split | coordinator는 분산 계획을 stage의 트리로 만든다. stage는 여러 worker의 task로 실행되고, task는 큰 데이터의 일부인 split을 처리한다. |
| Exchange | stage 사이에서 Trino 노드 간 데이터를 옮긴다. |

여러 catalog를 한 SQL에서 조인하는 연합 쿼리는 데이터를 미리 한곳에 복사하지 않아도 된다. 그렇다고 이동이 사라지지는 않는다. 조회하는 동안 네트워크를 쓰고 원본 DB에도 부하가 생긴다. 운영 DB를 직접 연결할 때는 [[OLTP-vs-OLAP#분석 연산의 격리와 확장|분석 연산의 격리]]를 함께 검토한다.

### Pushdown은 connector마다 다르다

Trino는 처리의 일부를 데이터 소스에 맡길 수 있다. 조건으로 행을 거르는 predicate pushdown, 필요한 열만 읽는 projection pushdown, `ROW` 안의 필드만 읽는 dereference pushdown, 집계와 조인, `LIMIT`, `ORDER BY`와 `LIMIT`을 합친 top-N pushdown이 있다. 지원 여부는 connector와 원본 시스템마다 다르며, 조인 pushdown은 모든 조인 조건을 넘길 수 있고 두 테이블이 같은 catalog에 있을 때만 가능하다.

확인은 `EXPLAIN`으로 한다. 넘긴 연산은 Trino의 별도 연산자로 보이지 않는다. 예를 들어 집계가 넘어가면 `Aggregate` 연산자 대신 connector의 `TableScan` 안에 나타나고, `TopN`이나 `Join` 연산자가 계획에 남아 있으면 그 일은 Trino가 직접 한다.

## 상황별 엔진 선택

| 상황 | 검토할 엔진 | 공식 문서로 확인한 구조 | 함께 볼 비용 |
|---|---|---|---|
| 받은 Parquet나 CSV를 내 프로그램에서 바로 분석 | DuckDB | 별도 DBMS 서버 없이 호스트 프로세스 안에서 실행되는 분석용 엔진, 열 단위 벡터화 실행 | 한 프로세스의 CPU와 메모리, 여러 사용자가 동시에 쓰는 구성은 별도 검토 |
| 레이크와 다른 DB의 데이터를 한 SQL로 조회 | Trino | connector와 catalog, coordinator와 worker의 분산 실행 | 원본 DB 부하, 네트워크 이동, connector별 pushdown 차이 |
| 같은 연결과 집계를 여러 사람이 반복 조회 | Dremio | 공유 뷰, Reflections | 사전 계산 사본의 저장, 갱신 주기와 신선도 |
| 스키마를 미리 정의하지 않은 JSON 탐색 | Apache Drill | JSON, Parquet 같은 자기 기술형 데이터를 Hive metastore 정의 없이 조회 | 반복 분석이 되면 테이블로 정리할지 판단 |
| 이미 쓰는 Hadoop과 Hive 환경의 대화형 SQL | Apache Impala | Hive Metastore의 테이블 정보 사용, 클러스터에서 query fragment를 병렬 실행, MapReduce를 거치지 않음 | 기존 Hadoop 환경에 대한 의존 |

선택은 제품 이름보다 데이터의 위치, 기존 플랫폼과 반복 여부에서 출발한다.

### DuckDB의 부분 읽기

DuckDB 2.0 문서 기준, Parquet를 읽을 때 쿼리에 필요한 열만 읽는다. 조건은 Parquet reader로 내려가며, 파일에 zonemap이 있으면 파일의 일부를 건너뛴다. 여러 파일은 glob이나 파일 목록으로 한 번에 읽는다.

```sql
SELECT * FROM 'orders/*.parquet';
SELECT * FROM read_parquet(['visits/*.parquet', 'visits_backfill/*.parquet']);
```

[[DuckLake|DuckLake]]처럼 테이블 상태를 관리하는 카탈로그를 붙이면 파일을 직접 읽는 분석에서 관리되는 테이블을 읽는 분석으로 넓어진다.

### Dremio Reflections는 사전 계산된 사본이다

Dremio 26.x 문서 기준, Reflection은 원본 데이터나 쿼리 결과의 사전 계산되고 최적화된 사본이다. 원본과 같은 행 수에서 일부 열만 남기는 raw, 합계와 개수 같은 집계를 미리 만드는 aggregation, 외부 시스템의 사전 계산 테이블을 가리키는 external 유형 등이 있다. 사용자는 Reflection을 직접 지정하지 않으며, Dremio가 쿼리를 다시 써서 Reflection을 쓰는 계획과 원본을 읽는 계획 중 비용이 낮은 쪽을 고른다. External Reflection의 데이터는 Dremio가 갱신하지 않으므로 신선도 책임이 외부 시스템에 남는다.

## 같은 테이블을 여러 엔진이 읽을 때

Spark로 정리한 Iceberg 주문 테이블을 Trino와 Snowflake가 함께 읽으면 엔진마다 사본을 옮기는 부담이 줄어든다. 다만 읽을 수 있다는 사실과 모든 엔진이 같은 기능으로 쓸 수 있다는 사실은 다르다.

2026-11-09 Snowflake 문서 기준, Snowflake를 catalog로 쓰는 Iceberg 테이블은 Snowflake 안에서 읽기와 쓰기를 모두 지원하지만, 외부 catalog 통합을 쓰는 테이블은 제한된 플랫폼 지원을 받는다. 외부 엔진은 Horizon Catalog의 Iceberg REST 엔드포인트를 거쳐 Snowflake가 관리하는 Iceberg 테이블(v2, v3)을 읽고 쓸 수 있다(쓰기는 2026-05-26 GA). 다만 CTAS, equality delete, 공유 테이블과 동적 테이블 쓰기 등은 지원하지 않는다. 같은 문서의 제3자 클라이언트의 데이터와 메타데이터 접근 항목에는 append, delete와 upsert를 할 수 없다는 제한도 함께 적혀 있다. 엔진 조합을 정할 때 테이블마다 쓰기 주체와 catalog를 하나로 정하고, 엔진과 쓰기 경로별 지원 범위를 확인한다.

## 운영 점검

- `EXPLAIN`으로 pushdown과 조인 방식을 확인하고, 실행 통계로 실제 읽은 양을 본다.
- 조인 키의 분포와 stage 사이 이동량을 확인한다.
- 연합 쿼리가 원본 DB의 운영 트래픽과 겹치지 않는지 본다.
- 사전 계산 결과를 쓴다면 갱신 주기와 허용 지연을 정한다.
- 엔진, connector와 테이블 형식의 버전 조합을 함께 기록한다.

## 사례: Presto에서 Trino로

Trino 블로그의 경위 설명에 따르면 Presto는 2012년 Facebook 데이터 인프라 팀에서 Hadoop 데이터 웨어하우스의 대화형 분석을 위해 만들어졌다. 창시자들은 2018년 Facebook을 떠나 2019년 1월 독립 재단을 세워 프로젝트(PrestoSQL)를 이어 갔다. Facebook은 같은 해 Linux Foundation에 Presto Foundation을 만들고 상표를 출원했으며, 2020년 12월 PrestoSQL은 Trino로 이름을 바꿨다. 이름이 비슷한 두 계열의 문서와 connector 지원은 따로 확인한다.

## 학습 범위

2026-11-05 공개된 GeekCast 시즌2 EP04의 10분 57초 영상에서 사람이 단 한국어 자막 216구간을 2026-11-09 확보해 전체를 읽었다. 실행 계획의 흐름, 연합 쿼리, Presto와 Trino의 관계, Dremio, Drill, Impala와 DuckDB의 쓰임새, 같은 Iceberg 테이블의 다중 엔진 조회를 학습했다. 엔진 구조와 기능은 위 공식 문서로 대조했고, 화면에만 나온 SQL과 도표는 확인하지 않았다. 엔진을 설치해 실행하거나 성능을 비교하지 않았다. 다음 편 예고인 수집과 변환, 6편의 실시간 분석과 9편의 머신러닝은 추가 학습 후보이며, 문서 정리를 학습 완료로 처리하지 않는다.

## 출처

- [GeekCast, 최신 데이터 인프라 이해하기 시즌2, EP04 쿼리 엔진은 어떻게 동작할까? Trino와 DuckDB 이해하기](https://www.youtube.com/watch?v=6z7kymKqhAo) — 2026-11-05 공개, 2026-11-09 한국어 수동 자막 전체 확인
- [쿼리 엔진은 어떻게 동작할까? Trino와 DuckDB 이해하기 — GeekCast](https://news.hada.io/geekcast/data-infra-s2-ep04)
- [Trino, Trino concepts](https://trino.io/docs/current/overview/concepts.html) — Trino 484 문서
- [Trino, Pushdown](https://trino.io/docs/current/optimizer/pushdown.html)
- [We're rebranding PrestoSQL as Trino — Trino blog, Martin Traverso, Dain Sundstrom, David Phillips](https://trino.io/blog/2020/12/27/announcing-trino.html)
- [Dremio, Accelerate Queries](https://docs.dremio.com/current/acceleration/) — 26.x 문서
- [Apache Drill, Drill Introduction](https://drill.apache.org/docs/drill-introduction/)
- [Apache Impala, Introducing Apache Impala](https://impala.apache.org/docs/build/html/topics/impala_intro.html)
- [Apache Impala, Overview](https://impala.apache.org/overview.html) — MapReduce를 거치지 않는 분산 쿼리 엔진
- [DuckDB, Why DuckDB](https://duckdb.org/why_duckdb)
- [DuckDB, Reading and Writing Parquet Files](https://duckdb.org/docs/2.0/data/parquet/overview.html)
- [Snowflake, Apache Iceberg tables](https://docs.snowflake.com/en/user-guide/tables-iceberg)
- [Apache Iceberg tables: Write support by using an external query engine (General availability) — Snowflake](https://docs.snowflake.com/en/release-notes/2026/other/2026-05-26-tables-iceberg-query-using-external-query-engine-snowflake-horizon-writes-ga) — 2026-05-26 릴리스 노트

## 관련 문서

- [[Data-Infrastructure-Layers|데이터 인프라의 계층과 계약]]
- [[Data-Lake-Table-Formats|데이터 레이크의 테이블 형식]]
- [[DuckLake|DuckLake]]
- [[OLTP-vs-OLAP|OLTP vs OLAP]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어]]
