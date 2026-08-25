---
tags: [infrastructure, aws, athena, serverless, sql, s3, analytics, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Athena", "Amazon Athena", "AWS Athena", "Serverless SQL"]
verified_at: 2026-08-25
---

# Amazon Athena — S3 데이터에 대한 서버리스 SQL 쿼리

S3에 저장된 데이터를 **별도 적재 없이 표준 SQL로 직접 쿼리**하는 서버리스 분석 서비스. 쿼리 엔진 버전은 Workgroup별로 관리되며, Athena engine version 3은 Trino를 기반으로 한다. 기본 카탈로그는 Glue Data Catalog다.

## 핵심 특징

- **서버리스**: 쿼리 인프라 프로비저닝은 불필요하다. 다만 IAM, Workgroup, 카탈로그와 S3 결과 수명 주기는 운영해야 한다.
- **S3 데이터를 그대로 쿼리**: 별도 로드, ETL 없음. 데이터는 S3에 두고, 스키마만 정의.
- **표준 SQL (Presto/Trino)**: ANSI SQL 호환. 조인, 윈도 함수, CTE 등 지원.
- **지원 포맷**: CSV, JSON, ORC, Parquet, Avro, TSV, 정규식 기반 로그 등.
- **QuickSight 통합**: Athena 쿼리 결과를 BI 대시보드, 리포트로 시각화.
- **Federated Query (연합 쿼리)**: S3 외의 관계형, 비관계형, 사용자 정의 소스를 connector로 조회한다. connector 유형에 따라 Glue connection을 사용하며, 일부 connector만 계정 내 Lambda가 필요하다.

## 사용 흐름

1. **S3에 데이터 저장** (가급적 Parquet/ORC, 파티셔닝, 압축 적용).
2. **테이블 정의**: Glue Data Catalog에 외부 테이블 등록 (또는 Athena DDL `CREATE EXTERNAL TABLE`).
3. **쿼리 실행**: 콘솔, JDBC/ODBC, API로 SQL 실행.
4. **결과 저장**: Workgroup에서 Athena managed results 또는 사용자 소유 S3 버킷을 선택한다. managed results는 24시간 뒤 자동 삭제되고, S3 방식은 직접 권한과 수명 주기를 관리한다.

## Glue Data Catalog 연계

- Athena의 **메타데이터 저장소는 Glue Data Catalog**.
- Glue Crawler가 S3를 스캔해 스키마, 파티션을 자동 추론 → 카탈로그에 테이블 생성.
- 같은 카탈로그를 EMR, Redshift Spectrum 등 다른 서비스와 공유 가능 (단일 데이터 정의).

## 요금 책정과 절감

- **On-demand SQL**: 쿼리가 스캔한 **데이터 양(TB당)** 기준. 결과 크기, 실행 시간이 아닌 **스캔량**이 핵심.
- **Capacity Reservations**: Workgroup에 예약한 DPU와 사용 시간 기준으로 과금한다. 같은 계정에서 on-demand와 함께 사용할 수 있다.
- **부가 비용**: 결과와 원본의 S3 저장, 요청, 전송, Glue Data Catalog, federated connector의 Lambda는 별도 과금될 수 있다.
- **On-demand 실패 쿼리**: 무료. **취소 쿼리**: 취소 시점까지 스캔한 양에 대해 과금.
- 스캔량을 줄이는 3대 최적화 (시험 자주 출제):

### 1. 컬럼 기반 포맷 (Parquet / ORC)

- 분석 쿼리는 보통 일부 컬럼만 사용 → 컬럼 포맷은 필요한 컬럼만 읽어 **스캔량 대폭 감소**.
- CSV/JSON → Parquet 변환만으로도 비용, 성능 모두 개선.
- AWS Glue ETL Job, CTAS(Create Table As Select)로 변환 가능.

### 2. 데이터 압축

- gzip, Snappy, LZ4 등으로 S3 객체 압축 → S3 스토리지 비용 + Athena 스캔량 동시 절감.
- Parquet 자체가 내부 압축을 포함하므로 Parquet + Snappy 조합 권장.

### 3. 파티셔닝 (Partitioning)

- `s3://bucket/logs/year=2026/month=05/day=15/...` 식으로 디렉터리를 컬럼 값별로 분리.
- `WHERE year=2026 AND month=05` 조건이면 해당 파티션만 스캔 → 스캔량 1/N로 감소.
- `MSCK REPAIR TABLE` 또는 Glue Crawler로 파티션 메타데이터 갱신.
- **Partition Projection**: 메타스토어 조회 없이 파티션을 계산식으로 추론 → 카탈로그 호출 비용, 지연 감소.

## Workgroup

- 사용자, 팀 단위로 쿼리, 과금, 결과 위치를 분리하는 논리적 단위.
- **Workgroup별 제어**: 쿼리당 스캔 한도, Workgroup 누적 스캔 알림, 결과 저장 S3 경로, CloudWatch 메트릭, 암호화 설정.
- 쿼리당 한도를 넘으면 해당 쿼리가 취소된다. Workgroup 누적 임계값은 SNS 알림을 보내지만 실행 중인 쿼리를 자동 취소하지 않으므로, 필요하면 알림을 받아 Workgroup을 비활성화하는 별도 자동화를 둔다.

## Athena vs Redshift Spectrum

| 항목 | Athena | Redshift Spectrum |
|---|---|---|
| 운영 모델 | 서버리스, 단독 실행 | Redshift 클러스터 필요 (확장 기능) |
| 사용 시점 | Ad-hoc, 로그 탐색, 데이터 레이크 분석 | Redshift 내부 테이블과 S3 데이터를 함께 조인 |
| 메타스토어 | Glue Data Catalog | Glue Data Catalog (공통) |
| 과금 | On-demand는 스캔량, Capacity Reservations는 DPU 사용 시간 | 클러스터 비용 + Spectrum 스캔량 |
| 결정 기준 | DW 없이 S3만 분석 | 이미 Redshift 운영 중 + 일부 데이터만 S3 |

## Athena vs Redshift

| 항목 | Athena | Redshift |
|---|---|---|
| 데이터 위치 | S3 (그대로) | 클러스터 내부 컬럼 스토리지 |
| 쿼리 성능 | S3 I/O에 의존, ad-hoc 적합 | MPP로 일관된 저지연, BI 백엔드 적합 |
| 데이터 규모 | TB~PB | 수십 TB~PB |
| 운영 부담 | 쿼리 인프라 프로비저닝 없음 | 클러스터 사이징, 튜닝 필요 |

## 활용 패턴

- **VPC Flow Logs / ALB Access Logs / CloudTrail 로그 분석**: S3에 적재 → Athena 즉시 분석. 대표 시험 시나리오.
- **데이터 레이크 쿼리**: S3 데이터 레이크 + Lake Formation 권한 + Athena로 셀프 서비스 분석.
- **Federated Query**: 운영 RDS + 로그 S3를 한 SQL로 조인.
- **CTAS / INSERT INTO**: SQL만으로 데이터 변환 파이프라인 구성 가능.

## 시험 체크포인트

- **S3 데이터를 SQL로 즉시 분석, 인프라 관리 없이** → **Athena**.
- **Athena 비용, 성능 최적화 3대장**: **컬럼 포맷(Parquet/ORC) + 압축 + 파티셔닝**.
- **VPC Flow Logs / ALB Logs / CloudTrail 로그를 가장 쉽게 분석** → **S3 + Athena**.
- **Athena의 메타데이터 저장소** = **Glue Data Catalog**.
- **여러 데이터 소스(RDS, DynamoDB 등)를 하나의 SQL로 조회** → **Athena Federated Query** (Lambda Connector).
- **사용자/팀별 데이터 스캔 한도, 결과 위치 분리** → **Workgroup**.
- **실패 쿼리는 무료, 취소 쿼리는 취소 시점까지 과금**.
- Athena는 **OLAP, ad-hoc 분석용**. 트랜잭션, 짧은 응답이 필요하면 부적합.

## 출처

- [Amazon Athena, Athena engine versioning](https://docs.aws.amazon.com/athena/latest/ug/engine-versions.html)
- [Amazon Athena, Use Amazon Athena Federated Query](https://docs.aws.amazon.com/athena/latest/ug/federated-queries.html)
- [Amazon Athena, Configure per-query and per-workgroup data usage controls](https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html)
- [Amazon Athena, Optimize data](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html)
- [Amazon Athena, Work with query results and recent queries](https://docs.aws.amazon.com/athena/latest/ug/querying.html)
- [Amazon Athena, Manage query processing capacity](https://docs.aws.amazon.com/athena/latest/ug/capacity-management.html)
- [Amazon Athena Pricing](https://aws.amazon.com/athena/pricing/)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[Redshift]]
- [[S3]]
- [[AWS-Lambda]]
- [[Kinesis]]
