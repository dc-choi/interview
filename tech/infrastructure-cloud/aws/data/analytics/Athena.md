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

## CloudTrail 로그의 파티션과 호출 주체 추적

2026-10-07 AWS 공식 문서 기준, CloudTrail Event history는 계정과 리전별 최근 90일의 관리 이벤트만 제공한다. 데이터 이벤트 조회나 장기 조사는 사전에 수집한 Trail의 S3 로그 등 별도 기록이 필요하다. Athena는 기록되지 않은 과거 이벤트를 복원하지 않는다.

- **테이블 경로**: AWS의 partition projection 예시는 단일 계정과 리전의 `AWSLogs/<account-id>/CloudTrail/<region>/` 아래 날짜 경로를 대상으로 한다. 조직 Trail 등 경로가 다른 로그는 실제 저장 구조에 맞춰 `LOCATION`과 `storage.location.template`을 설정한다.
- **파티션 범위**: 예제의 `timestamp`는 `yyyy/MM/dd` 형식의 날짜 파티션이고 `eventtime`은 이벤트 발생 시각이다. 두 필드를 구분하고 날짜 파티션 조건으로 스캔 범위를 줄인 뒤 사건 시각으로 좁힌다. Projection은 경로를 계산하므로 새 날짜마다 `ALTER TABLE ADD PARTITION`을 실행할 필요가 없다.
- **호출 주체**: `useridentity.type`, `arn`, `accesskeyid`와 `sessioncontext.sessionissuer`를 함께 본다. `AssumedRole`의 session issuer는 사용한 역할 정보이며 실제 사람의 신원을 단독으로 증명하지 않는다. `accessKeyId`는 누락되거나 빈 값일 수 있다.
- **세션 연결**: 기록이 있으면 `AssumeRole` 응답의 임시 access key ID와 후속 이벤트의 `userIdentity.accessKeyId`를 연결한다. IAM 공식 문서는 해당 STS 호출의 `responseElements`에서 `secretAccessKey`를 제외한다고 명시한다. 호출 계정과 대상 계정의 이벤트를 구분해 조사한다.
- **결과 판정**: `eventname`만 보고 리소스 생성이나 데이터 유출이 성공했다고 단정하지 않는다. `errorcode`, 응답과 관련 리소스 상태를 대조하고, 조회 결과가 없으면 수집 설정과 보존 기간, 파티션 경로부터 확인한다(조사 원칙).

## S3 서버 액세스 로그의 경로와 날짜 조건

2026-10-09 AWS 공식 문서 기준, S3 버킷으로 직접 전달한 서버 액세스 로그는 `RegexSerDe`를 사용하는 외부 테이블로 분석할 수 있다. S3에 저장됐다는 이유만으로 CloudTrail이나 ALB 로그의 스키마를 재사용하지 않는다.

- **읽을 위치**: 테이블의 `LOCATION`은 요청 대상 버킷이 아니라 로그가 도착하는 버킷과 접두사다. 날짜 기반 형식이면 계정, 리전, 원본 버킷과 날짜까지 실제 객체 경로에 맞춘다.
- **파티션 관리**: 공식 날짜 기반 예시는 `yyyy/MM/dd` 문자열 파티션과 `storage.location.template`을 사용한다. Partition projection을 쓰면 날짜별 카탈로그 등록을 생략할 수 있다. Crawler를 모든 구성의 필수 단계로 두지 않는다.
- **날짜의 의미**: 로그 경로의 날짜가 이벤트 발생일인지 전달일인지 확인한다. 지연 전달된 기록은 두 날짜가 다를 수 있다. Hive 테이블에서는 파티션 조건과 `requestdatetime` 조건을 함께 넣어 스캔 범위와 실제 사건 시간 범위를 각각 제한한다.
- **결과 해석**: 서버 액세스 로그는 best effort라 지연, 누락과 중복이 가능하다. 결과 0건을 접근이 없었다는 증거로 보지 않는다. AWS는 S3 요청 식별에 CloudTrail 데이터 이벤트 사용을 권장하므로, 조사 목적에 맞는 수집 여부와 보존 범위도 확인한다.

운영 검증에서는 알려진 요청의 로그 한 건을 원본 객체와 조회 결과에서 대조하고, 날짜 조건을 넣었을 때 스캔량이 줄어드는지 확인한다. 이는 적용 점검 제안이며 실제 AWS 계정에서 쿼리를 실행한 결과는 아니다.

## SageMaker Unified Studio와 Power BI의 ODBC 연결

Athena ODBC 드라이버는 SageMaker Unified Studio 프로젝트를 통한 연결을 지원한다. 2026-10-07 확인한 릴리스 노트에서는 `SageMakerBrowserIdc`와 `SageMakerIam` 지원이 2.2.0.0에 추가됐다. 실제 배포 버전은 이후 인증과 메타데이터 조회 수정 사항까지 확인해 선택한다.

| 사용 경로 | 인증과 확인 사항 |
|---|---|
| 분석가의 Power BI Desktop | `SageMakerBrowserIdc`가 브라우저에서 IAM Identity Center 로그인을 진행하고 프로젝트 환경용 임시 자격 증명을 얻음 |
| EC2의 Power BI 게이트웨이 | `SageMakerIam`과 인스턴스 역할을 사용하는 공식 구성 예시. 역할의 연결 서비스 권한, 도메인 등록과 프로젝트 멤버십을 별도로 확인 |

프로젝트의 연결 정보에서 리전, workgroup, 도메인과 프로젝트 식별자를 확인한다. Desktop에서 성공한 연결만으로 Power BI Service의 조회나 예약 새로 고침을 검증했다고 보지 않는다. DSN 방식에서는 게이트웨이에도 같은 이름의 System DSN을 만들고, 드라이버와 인증 설정을 확인한 뒤 Service의 연결에 매핑한다.

공식 게이트웨이 예시의 Power BI 인증 선택값 `Anonymous`는 Athena 데이터를 익명 공개한다는 의미가 아니다. 그 구성에서는 ODBC 드라이버가 IAM 역할로 AWS 인증을 수행한다. 실제 사용자의 로그인, 게이트웨이 실행 역할과 조회 데이터 권한을 구분해 점검한다.

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

- [Amazon S3, Using Amazon S3 server access logs to identify requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-s3-access-logs-to-identify-requests.html)
- [Amazon S3, Logging requests with server access logging](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html)
- [Amazon Athena, Work with timestamp data](https://docs.aws.amazon.com/athena/latest/ug/data-types-timestamps.html)
- [Amazon S3 audit logging, Part 1: Analyzing server access logs with Amazon Athena for performance insights — AWS](https://aws.amazon.com/blogs/storage/amazon-s3-audit-logging-part-1-analyzing-server-access-logs-with-amazon-athena-for-performance-insights/)
- [Amazon Athena, SageMaker Browser IDC](https://docs.aws.amazon.com/athena/latest/ug/odbc-v2-driver-sagemaker-idc.html)
- [Amazon Athena, SageMaker IAM](https://docs.aws.amazon.com/athena/latest/ug/odbc-v2-driver-sagemaker-iam.html)
- [Amazon Athena ODBC 2.x release notes — AWS](https://docs.aws.amazon.com/athena/latest/ug/odbc-v2-driver-release-notes.html)
- [Connect Amazon SageMaker Unified Studio to Microsoft Power BI – Part 1: IAM Identity Center (IDC)-based domains — AWS](https://aws.amazon.com/blogs/big-data/connect-amazon-sagemaker-unified-studio-to-microsoft-power-bi-part-1-iam-identity-center-idc-based-domains/)
- [Amazon Athena, Athena engine versioning](https://docs.aws.amazon.com/athena/latest/ug/engine-versions.html)
- [Amazon Athena, Use Amazon Athena Federated Query](https://docs.aws.amazon.com/athena/latest/ug/federated-queries.html)
- [Amazon Athena, Configure per-query and per-workgroup data usage controls](https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html)
- [Amazon Athena, Optimize data](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html)
- [Amazon Athena, Work with query results and recent queries](https://docs.aws.amazon.com/athena/latest/ug/querying.html)
- [Amazon Athena, Manage query processing capacity](https://docs.aws.amazon.com/athena/latest/ug/capacity-management.html)
- [Amazon Athena Pricing](https://aws.amazon.com/athena/pricing/)
- [Amazon Athena, Create the table for CloudTrail logs in Athena using partition projection](https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table-partition-projection.html)
- [AWS CloudTrail, Working with CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html)
- [AWS CloudTrail, CloudTrail userIdentity element](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html)
- [AWS IAM, Logging IAM and AWS STS API calls with AWS CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[Redshift]]
- [[S3]]
- [[AWS-Lambda]]
- [[Kinesis]]
- [[CloudTrail-Config|CloudTrail과 Config]]
