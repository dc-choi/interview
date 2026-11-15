---
tags: [database, postgresql, aurora, aws, data-lake, iceberg, parquet, duckdb]
status: done
verified_at: 2026-11-15
category: "Data & Storage - RDB"
aliases: ["Aurora PostgreSQL Lake Query", "aurora_analytics", "Aurora 분석 확장", "Aurora에서 Iceberg와 Parquet 조회"]
---

# Aurora PostgreSQL의 데이터 레이크 직접 조회 (aurora_analytics)

운영 DB에는 최근 데이터만 두고 과거 이력과 외부 데이터는 S3의 Parquet나 Iceberg로 내리는 구성에서, 둘을 함께 보려면 보통 레이크 데이터를 운영 DB로 다시 넣는 reverse ETL이나 별도 쿼리 엔진이 필요하다. 이 파이프라인이 조용히 멈추면 멈춘 기간만큼 누락된 데이터로 조회 결과가 계산될 수 있다. Aurora PostgreSQL의 `aurora_analytics` 확장은 PostgreSQL 안에 DuckDB를 내장해, 같은 DB endpoint에서 S3의 Parquet와 Iceberg를 foreign table로 읽고 로컬 테이블과 조인하게 한다. 데이터를 복사하지 않으므로 적재 파이프라인의 고장 지점이 줄어드는 대신, 분석 쿼리가 운영 인스턴스의 CPU, 메모리와 로컬 스토리지를 함께 쓴다.

아래 내용은 2026-11-15에 대조한 AWS 공식 문서 기준이다.

## 지원 범위

- 2026-09-30 GA. Aurora PostgreSQL 17.11 이상과 18.6 이상(Aurora Serverless v2 포함), 모든 AWS 상용 리전과 GovCloud(US)에서 쓸 수 있다.
- 확장 자체에 추가 요금은 없고, 쿼리가 쓰는 Aurora 컴퓨트와 S3 요청 비용을 낸다.
- 데이터 원본은 S3의 Parquet와 Iceberg, S3 Tables, AWS Glue Data Catalog다. 외부 Iceberg REST Catalog는 Glue Data Catalog를 통한 federation으로 연결한다.
- foreign table은 읽기 전용이다. `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `COPY FROM`은 지원하지 않는다. 레이크 데이터를 Aurora 테이블로 옮길 때는 `CREATE TABLE AS SELECT`, `INSERT INTO ... SELECT`, `MERGE INTO`를 쓴다.

## 동작 원리

PostgreSQL은 foreign table이 포함된 쿼리의 실행을 같은 서버 프로세스에 내장된 DuckDB(컬럼 지향 분석 엔진)에 넘긴다. 별도 클러스터나 서비스가 없고, foreign table은 스키마와 위치 메타데이터만 저장한다.

- S3 접근은 DB 클러스터에 연결한 IAM role로 하고 필요한 byte range만 읽는다.
- Parquet와 Iceberg의 통계로 predicate pushdown과 column pruning을 해서 row group과 파일을 건너뛴다. foreign table과 로컬 테이블의 조인을 포함한 쿼리 계획 전체를 분석 엔진으로 내릴 수 있다.
- 로컬 테이블과의 조인은 한 프로세스 안에서 실행되어 세션의 커밋 전 쓰기도 본다.
- Iceberg는 최신 snapshot, snapshot ID, 특정 시점을 골라 조회한다. `timestamp` 값(`now`, `yesterday` 같은 키워드 포함)은 테이블을 만들 때 한 번 해석되며 쿼리마다 다시 계산되지 않는다.
- S3 읽기 캐시는 인스턴스의 로컬 저장소에 두고 그 인스턴스의 모든 세션이 공유한다. 로컬 NVMe가 있는 클래스(예: `db.r8gd`)는 NVMe를, EBS 전용 클래스(예: `db.r8g`, `db.r8i`)는 인스턴스의 EBS 기반 로컬 스토리지(`FreeLocalStorage`로 확인)를 PostgreSQL의 다른 로컬 I/O와 함께 쓴다. AWS는 foreign table을 조회하는 운영 워크로드에 로컬 NVMe 클래스를 권한다. 캐시는 재시작이나 failover 때 비워진다.

컬럼 저장과 벡터화 실행이 왜 이런 분석에 빠른지는 [[Columnar-Storage-and-Vectorized-Execution|컬럼 저장과 벡터화 실행]]을, Iceberg 같은 테이블 포맷은 [[Data-Lake-Table-Formats|데이터 레이크 테이블 포맷]]을 본다.

## 설정 순서

1. S3(필요하면 Glue, S3 Tables, KMS) 읽기 권한을 가진 IAM role을 만들고 `aws rds add-role-to-db-cluster --feature-name AuroraAnalytics`로 클러스터에 연결한다.
2. 사용자 지정 클러스터 파라미터 그룹에서 `aurora_analytics.enabled`를 켠다. 기본값은 꺼져 있다. 이 파라미터는 재부팅 없이 적용되지만, 클러스터에 다른 파라미터 그룹을 새로 연결하면 재부팅이 필요하다.
3. 데이터베이스마다 `CREATE EXTENSION aurora_analytics;`를 실행한다. `rds_superuser`이거나 위임된 확장 권한이 필요하며 DB 소유자라는 것만으로는 부족하다. 확장은 foreign data wrapper와 `aurora_analytics_server` foreign server를 만든다.
4. foreign table을 만든다. 컬럼 목록을 비우면 이름과 타입을 원본에서 추론한다.

```sql
CREATE FOREIGN TABLE ft_orders ()
  SERVER aurora_analytics_server
  OPTIONS (location 's3://example-bucket/orders/', format 'parquet', region 'us-east-1');
```

IAM 최소 권한은 원본에 따라 다르다. 단일 파일은 `s3:GetObject`, 디렉터리나 glob은 `s3:ListBucket`이 더 필요하다. Iceberg는 manifest가 정확한 파일 경로를 주므로 `ListBucket`이 필요 없다. SSE-KMS로 암호화된 데이터는 `kms:Decrypt`가 필요하다. private subnet의 클러스터는 S3 Gateway endpoint로 연결하고, Glue Data Catalog를 쓰면 Glue Interface endpoint를 더한다. Troubleshooting과 Global Database 문서는 IAM role 자격 증명 조회용 STS Interface endpoint도 함께 적는다(Prerequisites에는 없다). NAT gateway도 되지만 데이터 처리 요금이 붙는다. Gateway endpoint는 리전 단위라 다른 리전의 S3를 읽으려면 NAT나 Transit Gateway 같은 별도 경로가 필요하다.

Glue나 S3 Tables 카탈로그는 `IMPORT FOREIGN SCHEMA`로 여러 테이블을 한 번에 만들 수 있으며, 이때 `glue:GetTables`나 `s3tables:ListTables` 권한이 추가로 필요하다. 한 테이블이라도 실패하면 전체가 롤백된다. 원본 스키마가 바뀌면 `aurora_analytics_refresh_foreign_table`로 맞춘다.

## 제약

- 타입: `STRUCT`, `MAP`, `LIST`, `GEOMETRY`, `GEOGRAPHY`는 추론하지 못하며, 컬럼 목록을 비운 `CREATE FOREIGN TABLE`은 기본으로 오류를 낸다. `aurora_analytics.skip_unsupported_columns`(기본 false)를 켜면 건너뛰고, struct, map과 중첩 list 컬럼은 `json`이나 `varchar`로 직접 선언할 수 있다. foreign table 컬럼으로 쓸 수 없는 타입의 예는 `JSONB`, `SERIAL`, 배열, 네트워크, range, 기하 타입, `XML`, `ENUM`, `MONEY`이고 `VARCHAR(n)` 같은 길이 제한도 지원하지 않는다. `NUMERIC`은 정밀도 1~38을 명시하고, 시간 계열 타입은 정밀도 6만 지원한다.
- 컬럼 이름: 추론한 이름은 63자까지이고, 대소문자만 다른 이름은 거부된다. 추론한 원본 컬럼 이름은 `aurora_analytics.lowercase_unquoted_column_name`(기본 true)에 따라 소문자가 되고(`OrderDate`는 `orderdate`), false면 대소문자를 유지해 큰따옴표로 불러야 한다.
- 제약 조건: `NOT NULL`, `CHECK`, `DEFAULT`는 저장만 되고 강제되지 않는다. 잠금 절은 받아들이지만 외부 데이터에 행 잠금을 걸지 않는다.
- collation: foreign table 컬럼은 `C`와 `ICU`만 지원한다. 식에 libc collation을 쓰면 pushdown이 줄 수 있다.
- 리전: 클러스터와 다른 리전의 데이터를 읽을 수 있지만(네트워크 경로는 위 설정 참고) 한 쿼리가 읽는 S3 데이터는 모두 같은 리전에 있어야 한다. Multi-Region Access Point는 위치로 쓸 수 없다. Global Database에서 switchover해도 foreign table은 원래 리전의 S3를 읽는다.

## 운영 판단: 분석이 OLTP를 해치지 않게

분석 엔진은 인스턴스 자원을 운영 워크로드와 나눠 쓴다. 이 점이 별도 쿼리 엔진이나 웨어하우스로 보내는 구성과의 가장 큰 차이다.

- **메모리**: `aurora_analytics.query_mem`이 쿼리당 상한이고 기본값은 인스턴스 메모리에서 정해진다. 상한은 인스턴스 메모리에서 `shared_buffers`(기본 약 3분의 2)를 뺀 범위이며 foreign table 데이터 읽기는 `shared_buffers`를 쓰지 않는다. 다만 로컬 카탈로그와 로컬 테이블 조인은 다른 쿼리처럼 버퍼를 쓴다. AWS 설정 문서는 동시 세션 수와 `query_mem`의 곱을 인스턴스 메모리의 약 30% 이내로 두라고 안내한다. worker thread 수는 메모리 예산에서 자동으로 정해지고 사용자가 설정하지 않는다.
- **spill**: 메모리를 넘으면 중간 결과를 로컬 저장소에 내리며 읽기 캐시와 공간을 나눈다. 많이 내리면 `No space left on device`가 나거나 로컬 I/O 경합으로 PostgreSQL 작업에 간접 영향을 준다.
- **OOM 구분**: `HINT`가 붙은 Out of Memory는 `query_mem`이 부족한 것이라 재시도로 해결되지 않는다. `DETAIL`이 붙은 것은 인스턴스 전체 메모리 압박이라 재시도가 통하는 경우가 많다.
- **CPU와 연결**: `Extension:AuroraAnalyticsExecute` wait event는 연산과 S3 읽기 시간을 함께 담으므로(S3 전용 wait event는 없다) 캐시가 차갑기만 해도 커진다. `CPUUtilization`이 계속 높으면서 이 이벤트가 AAS를 지배할 때 분석이 CPU를 차지한 것으로 보고 동시성을 줄이거나 vCPU를 늘린다. 긴 쿼리는 `statement_timeout`으로 제한하고, `DatabaseConnections`가 급증하는 연결 폭주에는 RDS Proxy 같은 pooling을 쓴다.
- **전용 reader**: AWS는 분석 비중이 큰 워크로드에 전용 reader 인스턴스를 권한다. 그 reader는 `shared_buffers`를 낮추고 `query_mem`을 올릴 수 있다(로컬 테이블 조인의 버퍼 사용과 교환이 된다는 점은 해석). promotion tier 15로 failover 우선순위를 가장 낮추지만, 다른 인스턴스가 없으면 그래도 승격될 수 있다. 클러스터 reader endpoint가 아니라 인스턴스 endpoint나 custom endpoint로 접속한다. 단, reader의 긴 쿼리는 writer의 dead tuple 정리를 붙잡고 복제 충돌로 쿼리가 취소되거나 reader가 재시작될 수 있으므로 `statement_timeout`을 두고 `oldest_reader_feedback_xid_age`를 본다.
- **Serverless v2**: 무거운 분석 쿼리가 동시에 몰리면 인스턴스의 scale up 속도를 넘을 수 있다.
- **캐시 신선도**: 캐시는 보이는 Iceberg snapshot을 바꾸지 않는다. 같은 경로의 Parquet 파일을 덮어쓰면 열려 있던 연결이 잠시 이전 데이터를 읽을 수 있고 재접속하면 풀린다.

## 언제 쓰는가

| 상황 | 판단 |
| --- | --- |
| 운영 데이터와 레이크의 과거 이력, 참조 데이터를 가끔 조인해 조사하거나 보고 | 적합하다. IAM, 파라미터와 네트워크 설정을 마친 뒤에는 reverse ETL 없이 같은 endpoint에서 SQL로 조회한다 |
| 레이크 데이터 일부를 주기적으로 운영 테이블에 반영 | `INSERT INTO ... SELECT`나 `MERGE INTO`로 적재 단계를 SQL로 대신할 수 있다 |
| 대량 분석이 상시로 돌고 동시성이 높음 | 전용 reader로 격리하거나, 운영 DB와 분리된 쿼리 엔진이나 웨어하우스를 검토한다([[Query-Engine-Execution\|쿼리 엔진]], [[OLTP-vs-OLAP\|OLTP와 OLAP]]) |
| 레이크에 쓰기가 필요 | 지원하지 않는다. foreign table은 읽기 전용이다 |

## 체크포인트

- 엔진 버전(17.11, 18.6 이상), 파라미터, IAM role 연결과 VPC endpoint 중 무엇이 빠졌는지 오류 문구로 구분한다.
- 무거운 상시 분석은 전용 reader로 격리한다. 적재(`CREATE TABLE AS SELECT`, `INSERT INTO ... SELECT`, `MERGE INTO`)와 같은 트랜잭션의 커밋 전 쓰기를 함께 보는 조인은 writer에서 돌므로 `statement_timeout`과 `query_mem`으로 제한한다.
- 추론된 타입과 대소문자 규칙, 강제되지 않는 제약 조건을 확인하고 결과를 해석한다.
- 데이터 복사가 없다는 것은 파이프라인 고장을 줄일 뿐 원본 레이크의 갱신 누락까지 막지는 않는다.

## 출처

- [Aurora PostgreSQL now supports querying of Apache Iceberg and Parquet data — AWS](https://aws.amazon.com/about-aws/whats-new/2026/09/aurora-postgresql-query-apache-iceberg-and-parquet/) — 2026-09-30 GA, 지원 버전과 리전, 추가 요금 없음, 지원 원본.
- [AWS, Amazon Aurora User Guide, Querying Apache Iceberg and Parquet data directly in Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/query-iceberg-and-parquet-data.html) — Serverless v2 포함, 컴퓨트와 S3 요청 과금, 적재 문법.
- [AWS, Amazon Aurora User Guide, How it works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-how-it-works.html) — 내장 DuckDB, pushdown, 로컬 테이블 조인, 읽기 캐시와 spill.
- [AWS, Amazon Aurora User Guide, Prerequisites](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-prerequisites.html) — IAM 최소 권한, VPC endpoint, 활성화 파라미터.
- [AWS, Amazon Aurora User Guide, Getting started](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-getting-started.html) — 확장 설치 권한, foreign server, 스키마 추론.
- [AWS, Amazon Aurora User Guide, Working with foreign tables](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-foreign-tables.html) — 테이블 옵션, 읽기 전용, 비강제 제약, `IMPORT FOREIGN SCHEMA`.
- [AWS, Amazon Aurora User Guide, Limitations](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-limitations.html) — 지원하지 않는 타입, collation, 리전 제약, Serverless v2.
- [AWS, Amazon Aurora User Guide, Resource management](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-resource-management.html) — `query_mem`, 캐시 위치와 신선도.
- [AWS, Amazon Aurora User Guide, Data formats and type mapping](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-type-mapping.html) — 추론 타입, 지원하지 않는 타입과 정밀도 제약.
- [AWS, Amazon Aurora User Guide, Using a dedicated reader instance for analytics](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-dedicated-reader.html) — 전용 reader 구성, promotion tier, 버퍼 사용과 복제 충돌 위험.
- [AWS, Amazon Aurora User Guide, Choosing the right DB instance class](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-instance-class.html) — 로컬 NVMe와 EBS 전용 클래스의 캐시와 spill 위치.
- [AWS, Amazon Aurora User Guide, Configuration parameters](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-configuration-parameters.html) — `skip_unsupported_columns`, `lowercase_unquoted_column_name`, 동시 세션 메모리 30% 기준.
- [AWS, Amazon Aurora User Guide, Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-monitoring.html) — `Extension:AuroraAnalyticsExecute`가 연산과 S3 읽기를 함께 포함.
- [AWS, Amazon Aurora User Guide, Using foreign tables with Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-global-database.html) — STS endpoint, 리전 간 네트워크 경로.
- [AWS, Amazon Aurora User Guide, Troubleshooting](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-analytics-troubleshooting.html) — 오류 문구별 원인, OOM 구분, Global Database.

## 관련 문서

- [[PostgreSQL-Extensions|PostgreSQL 확장 생태계]]
- [[Data-Lake-Table-Formats|데이터 레이크 테이블 포맷]]
- [[Columnar-Storage-and-Vectorized-Execution|컬럼 저장과 벡터화 실행]]
- [[Query-Engine-Execution|쿼리 엔진]]
- [[OLTP-vs-OLAP|OLTP와 OLAP]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
