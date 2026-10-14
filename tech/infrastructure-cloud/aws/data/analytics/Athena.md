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

### BI 도구의 그룹과 Athena 실행 권한을 맞춘다

부분 검증(2026-10-14): 팀별 BI 데이터 소스에 workgroup을 지정해도 그 설정만으로 다른 workgroup 사용을 막지는 못한다. 실제 실행 역할의 IAM 정책에서 허용할 workgroup ARN을 제한하고, BI 도구가 보내는 workgroup과 일치하는지 확인한다(운영 점검 제안).

`Override client-side settings`를 켜면 해당 workgroup의 결과 위치, 암호화 등의 설정이 콘솔, API, JDBC/ODBC 클라이언트 설정보다 우선한다. 변경 전에는 기존 결과 버킷을 읽는 자동화의 의존성을 확인한다. 이 옵션과 쿼리당 스캔 한도는 서로 다른 제어다. 실제 BI 연결 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

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

## 예약 쿼리의 시작과 완료를 구분한다

부분 검증(2026-10-14): EventBridge가 Lambda를 호출하고 Lambda가 `StartQueryExecution`을 요청하는 방식으로 정기 조회를 구성할 수 있다. Lambda가 요청을 성공적으로 반환한 것과 Athena SQL이 끝난 것은 별개다.

- **시간 기준:** 기존 EventBridge scheduled rule은 UTC 기준이다. 신규 구성에는 AWS가 권장하는 EventBridge Scheduler를 검토한다. Scheduler의 cron은 지정한 시간대를 사용할 수 있으므로, 매일 한국 시각 06시 실행은 `cron(0 6 * * ? *)`와 `Asia/Seoul`을 함께 지정하는 예로 표현한다. 두 방식의 시간대 설정을 혼동하지 않는다.
- **완료 확인:** 반환된 `QueryExecutionId`로 `GetQueryExecution`의 상태를 추적한다. `QUEUED`와 `RUNNING`은 완료가 아니며, 후속 처리는 `SUCCEEDED`, `FAILED`, `CANCELLED`를 구분한다. 성공 상태 뒤에도 업무상 필요한 결과를 별도로 확인한다(운영 점검 제안).
- **중복 요청:** 같은 `ClientRequestToken`으로 같은 요청을 재전송하면 새 쿼리를 만들지 않고 같은 실행 ID를 반환한다. 매일 실행할 서로 다른 회차에 고정 토큰을 재사용하지 않는다. 예약 회차별 토큰을 보존해 해당 회차의 재시도에만 재사용하는 방식은 설계 선택이다. SQL 등 요청 파라미터가 바뀌면 같은 토큰 요청은 오류가 된다.
- **실행 경계:** workgroup, 데이터베이스와 결과 위치를 명시하고 실행 역할의 데이터 접근 권한을 확인한다. Workgroup의 강제 설정이 클라이언트 결과 위치를 덮어쓸 수 있으므로, 코드에 적은 S3 경로만으로 실제 출력 위치를 단정하지 않는다.

이는 공식 문서로 대조한 운영 설계이며 실제 예약 작업과 쿼리를 실행한 검증은 아니다. 기존 절 전체의 검증일은 유지한다.

## API 사용량 집계와 CTAS 재실행의 경계

부분 검증(2026-10-14): API Gateway의 REST API 액세스 로그는 Firehose로 보낼 수 있다. Firehose의 S3 적재 결과를 Athena로 조회하면 운영 DB에서 원본 요청을 반복 집계하는 경로를 분리할 수 있다. 이것만으로 집계의 완전성이나 청구 정확성이 보장됐다고 보지는 않는다.

- **수집 설정:** REST API의 stage에서 Firehose를 액세스 로그 대상으로 선택하며 스트림 이름은 `amazon-apigateway-`로 시작해야 한다. 액세스 로그 목적지로 CloudWatch와 Firehose를 동시에 켤 수는 없다. 이 제약을 실행 로그 설정이나 다른 API 유형으로 확대하지 않는다.
- **집계 계약:** 요청 시각, 테넌트, 기능과 결과 상태를 구분하고 실패 요청과 재시도를 사용량에 포함할지 먼저 정한다. 시간별 집계라면 늦게 도착한 로그의 재집계 범위와 중복 판별 기준도 정한다(설계 제안).
- **CTAS 출력:** 일반 Hive 외부 테이블을 만드는 CTAS의 `external_location`은 비어 있어야 하며 기존 객체를 덮어쓰지 않는다. 외부 테이블의 `DROP TABLE`은 S3 데이터를 남기므로 같은 작업을 다시 시작할 때도 출력 경로를 따로 확인한다. 이 삭제 동작을 관리형 Iceberg 테이블에 적용하지 않는다.
- **실패와 재실행:** 실패하거나 취소한 CTAS와 `INSERT INTO`는 부분 파일을 남길 수 있다. manifest로 파일을 확인하되 급작스러운 실패에는 manifest가 없을 수도 있어 실제 경로도 점검한다. 실행별 출력 경로를 분리하고 완료한 결과만 집계 대상으로 선택하는 방식을 검토한다(설계 제안).
- **결과 저장:** 시간별 합계를 운영 DB에 저장하면 그 쓰기와 조회 부하는 남는다. 같은 구간을 다시 계산할 때 합계가 중복 가산되지 않도록 대체 또는 멱등 갱신 규칙을 정하고, 알려진 요청과 대조한다(설계 제안).

비용은 변환과 집계 쿼리의 스캔량, 저장과 전달 비용을 함께 비교한다. 특정 자료의 압축률이나 비용 배수를 일반 보장값으로 쓰지 않는다. 실제 파이프라인을 실행한 검증은 아니며 기존 절 전체의 검증일은 유지한다.

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

## 쿼리 자원 부족은 실행 계획에서 좁힌다

2026-10-10 AWS 공식 문서 대조 기준이다. `Query exhausted resources at this scale factor`가 나면 조인과 윈도 함수의 메모리 사용부터 확인한다. 스캔량을 줄이는 조치와 연산 중 유지하는 데이터를 줄이는 조치를 구분한다.

1. **계획 확인:** `EXPLAIN`으로 조인 순서와 파티션 필터를 확인한다. 데이터를 스캔하지 않지만 Glue 메타데이터 조회 비용은 생길 수 있다. `EXPLAIN ANALYZE`는 실제 쿼리를 실행하므로 스캔 비용과 대상 SQL의 쓰기 효과를 고려한다.
2. **조인 크기와 편향:** 등가 조건의 분산 해시 조인은 작은 관계를 오른쪽 build side에 두는 것을 출발점으로 삼고 실제 계획을 확인한다. 전체 build 데이터가 작아도 특정 키가 한 노드에 몰리면 실패할 수 있다. Disk spill도 실패 방지를 보장하지 않는다.
3. **윈도 범위:** 큰 윈도는 메모리 부족을 일으킬 수 있다. 처리 범위를 줄이거나 결과 의미가 같은 집계로 바꾼다. 전역 상위 N개만 필요하면 `ORDER BY`와 `LIMIT`을 검토하되 그룹별 순위와 혼동하지 않는다.
4. **파티션 경계:** Partition projection은 설정한 규칙으로 파티션 값과 위치를 계산한다. 기존 S3 파일을 물리적으로 나누는 기능이 아니다. 실제 저장 경로, projection 설정과 쿼리의 파티션 조건을 함께 확인한다.

변경 전후에는 같은 입력 범위에서 결과와 스캔량, 실행 시간을 대조한다(운영 점검 제안). 조인 중복이나 순위의 의미를 바꾸면서 성공한 쿼리를 동등한 최적화로 처리하지 않는다. 이 절만 추가 대조했으며 실제 AWS 계정에서 실행한 결과는 아니다.

## 조회가 성공했는데 결과가 0건일 때

2026-10-13 AWS 공식 문서 기준, S3 외부 테이블의 0건 결과는 데이터 부재와 읽을 경로의 불일치를 구분해 진단한다.

1. **실제 객체와 LOCATION:** 테이블 위치는 끝에 `/`가 있는 S3 접두사로 지정한다. 개별 파일, wildcard와 접두사 내부의 빈 경로 `//`를 사용하지 않는다. 읽으려는 객체가 그 위치에 있는지 먼저 대조한다.
2. **파일과 스키마:** `_`나 `.`로 시작하는 파일은 숨김 파일로 취급된다. Glue crawler의 exclude pattern은 Athena의 읽기 제외 규칙이 아니므로, 서로 다른 스키마의 파일을 제외 설정만 믿고 같은 위치에 섞지 않는다.
3. **카탈로그 기반 파티션:** 새 Hive 호환 파티션은 `MSCK REPAIR TABLE`로 등록할 수 있다. 비호환 경로는 `ALTER TABLE ADD PARTITION`을 사용한다. `MSCK`는 사라진 파티션을 삭제하지 않으며 대소문자가 섞인 객체 경로에서는 등록하지 못할 수 있다.
4. **Projection 기반 파티션:** 활성화하면 Athena는 해당 테이블의 Glue 파티션 메타데이터를 무시한다. 계산한 S3 위치와 실제 객체, 설정한 범위와 조회 값을 대조한다. 존재하지 않는 위치나 범위 밖 값은 오류 없이 0건을 반환할 수 있다. 기본 Hive 형태와 다른 경로는 `storage.location.template`으로 지정한다.

점검할 때는 이미 존재하는 객체 한 개의 파티션 값으로 조회 범위를 좁힌다. `SHOW PARTITIONS`에 projection으로만 계산한 파티션이 보이지 않는 것은 데이터 부재의 증거가 아니다. 이 절은 문서 대조와 진단 절차이며 AWS 계정에서 실행한 검증 결과는 아니다.

## HIVE_BAD_DATA는 원본 값과 읽기 스키마를 대조한다

2026-10-13 AWS 공식 문서 대조 기준. `HIVE_BAD_DATA`는 테이블 타입과 원본 값이 맞지 않거나 같은 필드에 서로 다른 타입이 섞일 때 발생할 수 있다. 오류에 나온 필드와 실제 S3 객체, 테이블 정의와 SerDe를 함께 확인한다.

- **정수와 소수 혼합:** 정수 컬럼에 소수가 섞이면 원본의 의미와 필요한 정밀도를 먼저 정한다. 쿼리를 통과시키려고 소수부를 버리는 변환을 정답으로 취급하지 않는다.
- **숫자 범위:** Athena의 `INT`는 32비트, `BIGINT`는 64비트 부호 있는 정수다. `DECIMAL(p,s)`는 전체 자릿수와 소수부 자릿수를 나누므로 실제 값이 두 조건에 들어가는지 확인한다.
- **CSV 날짜 형식:** `OpenCSVSerDe`의 `DATE`는 1970-01-01 이후 일수, `TIMESTAMP`는 밀리초 단위 UNIX epoch를 읽는다. 일반 날짜 문자열을 그대로 받는다고 가정하지 않는다. 다른 형식은 `STRING`으로 읽고 쿼리에서 명시적으로 변환하는 방식을 검토한다. 이 규칙을 다른 SerDe나 Parquet에 일괄 적용하지 않는다.

수정 뒤에는 문제가 난 값, 경계값과 정상값을 함께 조회해 값의 보존과 NULL 여부를 비교한다(운영 점검 제안). 실행 성공과 값의 정확성은 별도로 확인한다. 이 절은 문서 대조이며 실제 데이터로 실행한 결과가 아니므로 문서 전체의 기존 검증일은 유지한다.

## Iceberg 테이블의 CDC 병합

부분 검증(2026-10-14): Athena의 Iceberg와 `MERGE INTO` 공식 문서를 대조했다. 아래는 분석 테이블의 변경 반영이며, 애플리케이션용 OLTP 데이터베이스를 대체한다는 뜻은 아니다.

- **지원 조건:** `MERGE INTO`는 Athena engine version 3의 Iceberg 테이블에서 조건별 삽입, 수정과 삭제를 하나의 트랜잭션으로 실행한다. 일반 S3 외부 테이블에 같은 기능이 적용된다고 가정하지 않는다.
- **중복과 순서:** 대상 행 하나가 여러 source 행과 매칭되면 오류가 난다. CDC 입력을 병합하기 전에 키별 변경 순서와 중복 처리 규칙을 정한다. 전체 행의 최종 상태를 만드는 파이프라인이라면 원천의 순서 정보로 최종 변경을 고르는 방식이 후보지만, 부분 변경 이벤트를 무조건 마지막 한 건으로 줄이면 앞선 변경을 잃을 수 있다(설계 점검).
- **삭제와 삽입:** source 행마다 처음 매칭되는 `WHEN` 절만 실행된다. 삭제 이벤트가 대상과 매칭되지 않을 때 일반 `WHEN NOT MATCHED` 삽입 절로 들어가지 않도록 이벤트 종류를 조건에 반영한다(설계 점검).
- **쓰기 방식:** Athena의 `UPDATE`, `MERGE INTO`, `DELETE FROM`은 positional delete를 사용하는 merge-on-read 방식이다. copy-on-write 테이블 속성을 설정해도 Athena는 이를 무시하고 merge-on-read를 사용한다.
- **다른 엔진과의 공유:** Athena는 Glue catalog 기반 Iceberg 테이블과 Glue optimistic locking을 지원한다. 다른 잠금 구현을 사용하는 writer와 섞으면 트랜잭션과 데이터 정합성을 해칠 수 있으므로 writer별 catalog와 잠금 설정을 확인한다.

실제 CDC 파이프라인과 AWS 쿼리를 실행한 검증은 아니다. 기존 절 전체의 검증일은 유지한다.

## 시험 체크포인트

- **S3 데이터를 SQL로 즉시 분석, 인프라 관리 없이** → **Athena**.
- **Athena 비용, 성능 최적화 3대장**: **컬럼 포맷(Parquet/ORC) + 압축 + 파티셔닝**.
- **VPC Flow Logs / ALB Logs / CloudTrail 로그를 가장 쉽게 분석** → **S3 + Athena**.
- **Athena의 메타데이터 저장소** = **Glue Data Catalog**.
- **여러 데이터 소스(RDS, DynamoDB 등)를 하나의 SQL로 조회** → **Athena Federated Query** (Lambda Connector).
- **사용자/팀별 데이터 스캔 한도, 결과 위치 분리** → **Workgroup**.
- **실패 쿼리는 무료, 취소 쿼리는 취소 시점까지 과금**.
- Athena는 **OLAP, ad-hoc 분석용**이다. Iceberg 변경에는 트랜잭션을 지원하지만 짧은 응답이 필요한 애플리케이션용 OLTP 저장소와는 용도가 다르다.

## 출처

- [How do I schedule an Amazon Athena query? — AWS re:Post Knowledge Center](https://repost.aws/knowledge-center/schedule-query-athena)
- [Amazon Athena, StartQueryExecution](https://docs.aws.amazon.com/athena/latest/APIReference/API_StartQueryExecution.html)
- [Amazon Athena, GetQueryExecution](https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryExecution.html)
- [Amazon Athena, QueryExecutionStatus](https://docs.aws.amazon.com/athena/latest/APIReference/API_QueryExecutionStatus.html)
- [Amazon EventBridge, Creating a scheduled rule (legacy)](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Amazon EventBridge Scheduler, Schedule types](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)
- [Amazon Athena, Configure access to workgroups and tags](https://docs.aws.amazon.com/athena/latest/ug/workgroups-access.html)
- [Amazon Athena, Override client-side settings](https://docs.aws.amazon.com/athena/latest/ug/workgroups-settings-override.html)
- [Amazon API Gateway, Log REST API calls to Amazon Data Firehose in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-logging-to-kinesis.html)
- [Amazon Athena, Considerations and limitations for CTAS queries](https://docs.aws.amazon.com/athena/latest/ug/ctas-considerations-limitations.html)
- [Amazon Athena, DROP TABLE](https://docs.aws.amazon.com/athena/latest/ug/drop-table.html)
- [Amazon Athena, DROP TABLE for Iceberg](https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg-drop-table.html)
- [Amazon Data Firehose, Configure destination settings](https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html)
- [Amazon Athena, MERGE INTO](https://docs.aws.amazon.com/athena/latest/ug/merge-into-statement.html)
- [Amazon Athena, Update Iceberg table data](https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg-updating-iceberg-table-data.html)
- [Amazon Athena, Query Apache Iceberg tables](https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg.html)
- [Amazon Athena, Data types in Amazon Athena](https://docs.aws.amazon.com/athena/latest/ug/data-types.html)
- [Amazon Athena, Open CSV SerDe for processing CSV](https://docs.aws.amazon.com/athena/latest/ug/csv-serde.html)
- [Amazon Athena, Specify a table location in Amazon S3](https://docs.aws.amazon.com/athena/latest/ug/tables-location-format.html)
- [Amazon Athena, Troubleshoot issues in Athena](https://docs.aws.amazon.com/athena/latest/ug/troubleshooting-athena.html)
- [Amazon Athena, MSCK REPAIR TABLE](https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html)
- [Amazon Athena, Optimize queries](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-query-optimization-techniques.html)
- [Amazon Athena, Using EXPLAIN and EXPLAIN ANALYZE in Athena](https://docs.aws.amazon.com/athena/latest/ug/athena-explain-statement.html)
- [Amazon Athena, Use partition projection with Amazon Athena](https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html)
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
