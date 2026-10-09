---
tags: [infrastructure, aws, glue, etl, serverless, data]
status: done
category: "Infrastructure - AWS"
aliases: ["Glue", "AWS Glue", "Glue Data Catalog"]
---

# AWS Glue

추출, 변환, 로드(**ETL**) 서비스 관리. 분석을 위해 데이터를 준비, 변환하는 데 유용한 **완전 서버리스** ETL.

## 핵심

- 서버리스 (인프라 관리 없음) — 사용한 만큼 과금
- Spark 기반이지만 인프라가 추상화됨
- 예: S3 버킷, Amazon RDS → (Extract) → **Glue ETL** → (Load) → Redshift Data Warehouse

## Glue Data Catalog

- 메타데이터 중앙 저장소 — 테이블, 열, 데이터 형식
- **Glue Crawler** 실행: S3, RDS, DynamoDB, JDBC 연결 데이터 소스를 스캔하여 스키마 자동 카탈로그
- **Athena, Redshift Spectrum, EMR**가 데이터, 스키마 검색 시 백그라운드에서 활용

## 부가 기능

- **Glue Job Bookmarks**: 새 ETL 작업 실행 시 이전 데이터 재처리 방지 (incremental)
- **Glue Elastic Views**: 2020년 preview 발표 뒤 2026-09-03 현재 Glue 기능 문서에서는 제공 기능으로 확인되지 않는다. 여러 엔진에서 공유할 뷰는 Glue Data Catalog view를 검토
- **Glue DataBrew**: 사전 빌드된 변환으로 GUI 기반 데이터 정리, 정규화
- **Glue Studio**: ETL 작업 생성, 실행, 모니터링 GUI

## 시험 빈출 포인트

- **서버리스 ETL** → Glue
- S3에 있는 데이터의 스키마 자동 발견 → Glue Crawler + Data Catalog
- Athena 쿼리의 테이블 메타데이터 → Glue Data Catalog
- ETL 작업의 증분 처리 → Glue Job Bookmarks
- GUI로 데이터 정리, 정규화 → Glue DataBrew

## Data Quality: 검사와 적재 차단을 나눈다

2026-10-07 공식 문서 확인 기준. AWS Glue Data Quality는 Data Catalog에 등록한 데이터의 검사와 ETL 작업 안의 검사를 제공한다. DQDL로 규칙을 정의하며, ETL에서는 `Evaluate Data Quality` 변환을 이용한다. 카탈로그에 스키마가 있다는 사실은 내용의 품질을 보장하지 않는다.

| 검사 | 확인하는 것 | 해석할 때 주의할 것 |
|---|---|---|
| `RowCount` | 데이터셋의 행 수 | 규칙이 실패해도 특정 오류 행을 지목하지 못한다 |
| `Completeness` | 열의 non-null 값 비율 | CSV 문자열의 빈 값은 빈 문자열로 읽혀 통과할 수 있다 |
| `DataFreshness` | 날짜 열의 값과 현재 시각의 차이 | 어떤 시각을 검사할지 정해야 하며, 수집 시각만으로 원문 최신성을 입증할 수 없다 |

품질 규칙을 추가해도 기본 실패 동작이 `None`이면 작업은 계속된다. 적재를 막아야 하면 `Fail job without loading to target data`처럼 실패 동작을 명시한다. 이 옵션은 Data Quality 변환 결과를 포함한 대상 적재도 막으므로, 실패 결과를 대상 테이블에 쓴다는 가정 없이 진단 기록의 보존 경로를 확인한다. 행 단위 결과가 `Passed`여도 `RowCount` 같은 데이터셋 수준 규칙은 실패할 수 있으므로 두 결과를 함께 본다.

AI 입력 파이프라인에 적용할 때는 품질 실패 후 색인이나 후속 작업이 실행되지 않는지 확인한다. 실패 결과와 알림을 남기고 복구 뒤 재처리하는 경로는 별도 설계 사항이다. Data Quality 도입만으로 데이터의 의미적 정확성이나 답변의 사실성이 보장되지는 않는다.

## 수집 로그를 분석 테이블로 만드는 경계

2026-10-07 공식 문서 확인 기준. Crawler는 저장소의 스키마를 추론해 Data Catalog 메타데이터를 만든다. 실제 데이터의 읽기, 변환과 적재는 ETL 작업이 수행한다. Crawler 실행을 중첩 JSON의 평탄화나 데이터 정제 완료로 취급하지 않는다.

아래는 로그 분석에 적용할 설계 예시다. 원본 로그와 분석용 데이터를 구분하고, 최종 테이블의 행 단위, 자료형과 버전 필드를 먼저 정한 뒤 필요한 변환을 역으로 설계한다. 이벤트 하나가 배열 원소별 여러 행으로 펼쳐지면 원본 이벤트 수와 결과 행 수의 관계도 정의한다.

| 경계 | 확인할 내용 |
|---|---|
| 수집 | `PutRecordBatch` 호출 성공에도 `FailedPutCount`가 0보다 클 수 있다. 요청 순서에 대응하는 `RequestResponses`로 실패 레코드를 식별한다 |
| 재시도 | 실패 가능 레코드만 다시 보내고 목적지에서 중복을 처리한다. 타임아웃은 쓰기 실패를 확정하지 않는다 |
| 포맷 변환 | Firehose의 JSON → Parquet/ORC 변환은 Glue Data Catalog 스키마를 사용한다. 스키마에 없는 속성은 변환 결과에서 빠질 수 있다 |
| 중첩 구조 | Firehose 변환에서 중첩 JSON을 보존하려면 대응하는 `STRUCT` 스키마가 필요하다. 평탄화된 분석 테이블이 필요하면 별도 변환을 설계한다 |

포맷 변경만 필요하고 입력이 지원 조건에 맞으면 Firehose 내장 변환을 검토할 수 있다. 조인, 업무 규칙이나 행 재구성이 필요하면 해당 변환을 ETL에 명시한다. 변환 완료 뒤 집계 전에 중복, 누락과 타입 오류를 확인하는 절차는 위 Data Quality와 연결한다.

## Glue 6.0 전환의 호환성 경계

2026-10-07 공식 마이그레이션 문서 확인 기준. Glue 6.0은 Spark 4.1.1, Scala 2.13.17과 Python 3.13을 사용한다. 새 런타임 선택과 기존 작업의 동작 검증은 별도다.

- Spark Declarative Pipelines는 선언한 테이블과 흐름으로 파이프라인을 구성한다. real-time mode는 stateless streaming을 대상으로 하므로 모든 상태 기반 스트리밍 작업의 대체재로 보지 않는다.
- Iceberg format v3는 VARIANT와 shredding 등을 지원하지만 v2로 되돌릴 수 없다. 현재 Glue 마이그레이션 문서는 Athena SQL이 v3 테이블을 읽지 못한다고 명시하므로, Athena와 공유할 테이블은 v2를 유지한다.
- Spark ANSI mode가 기본 활성화되어 overflow와 잘못된 cast가 오류로 드러날 수 있다. 기존 결과의 null 처리와 예외 처리를 비교한다.
- Scala 2.12용 JAR는 2.13에 맞춰 재컴파일해야 한다. Python 의존성과 custom JAR도 새 런타임에서 확인한다.
- EMRFS가 제거되고 S3A를 사용한다. Java AWS SDK v1도 제거됐으므로 기존 import와 관련 설정을 확인한다.

전환 검증에서는 대표 입력으로 결과 행 수, 자료형과 실패 동작을 비교하고 하위 쿼리 엔진에서도 읽어 본다. 특히 런타임 업그레이드와 Iceberg 테이블 형식 변경을 한 번의 가역적 설정 변경으로 취급하지 않는다.

## JDBC 연결 실패: 실행 서브넷, 권한과 인증을 나눠 본다

2026-10-09 공식 연결 및 VPC 문서 확인 기준이다. Glue는 연결에 지정한 VPC와 서브넷에 private IP를 가진 ENI를 만들고 연결의 보안 그룹을 적용한다. 개발자 PC에서 DB에 접속된다는 사실만으로 Glue의 연결 경로가 검증되지는 않는다.

1. **DB까지의 경로:** 연결의 호스트와 포트, 선택한 서브넷의 라우팅, Glue 보안 그룹의 outbound와 DB의 inbound를 확인한다. 점검 기준은 Glue ENI에서 데이터 저장소까지의 경로다.
2. **Spark 내부 통신:** driver와 executor 사이에는 양방향 통신이 필요하다. 연결에 사용하는 보안 그룹 중 하나에 자기 보안 그룹을 source로 하는 모든 TCP 포트 inbound 규칙을 둔다. 이는 인터넷 전체에 포트를 여는 규칙과 다르다. outbound를 제한했다면 내부 통신과 필요한 목적지 허용도 확인한다.
3. **서비스 접근 경로:** VPC 안에서 S3를 읽는 경로는 S3 VPC endpoint 구성을 확인한다. VPC 자원과 공개 인터넷을 함께 사용해야 할 때는 NAT 경로도 필요하다. Glue ENI에는 public IP가 없으므로 public subnet과 Internet Gateway만으로 인터넷 연결이 된다고 판단하지 않는다.
4. **권한과 DB 인증:** 연결 또는 secret의 사용자 이름과 비밀번호를 점검한다. Secrets Manager를 쓰면 Glue 실행 역할의 secret 조회 권한과 서비스까지의 네트워크 경로를 따로 확인한다. 네트워크 구성에 따라 Secrets Manager VPC endpoint가 필요할 수 있다.

NAT 추가를 모든 연결 실패의 해결책으로 삼지 않는다. 먼저 오류가 DB 도달, 서비스 접근, IAM 권한과 DB 인증 중 어디에서 발생했는지 좁히고, 변경 뒤 같은 연결 조건으로 다시 시험한다. 이 절은 연결 진단 범위의 보강이며 기존 런타임 전환 절의 검증 기준일은 유지한다.

## Zero-ETL도 동기화 상태와 데이터 준비를 확인한다

2026-10-09 AWS Glue 공식 문서 기준이다. DynamoDB를 소스로 하는 Glue zero-ETL 통합은 PITR 활성화와 테이블의 리소스 기반 접근 정책이 필요하다. Glue가 테이블을 조회하고 export를 만들며 export 상태를 확인할 권한을 준비한다. 파이프라인 코드 작성이 줄어도 소스 접근과 대상 데이터 검증은 남는다.

| 상태 또는 변경 | 의미와 운영 판단 |
|---|---|
| `ACTIVE` | 초기 전체 로드를 시작하는 상태다. 표시만으로 초기 데이터 적재 완료를 판정하지 않는다. 전체 로드 뒤 주기적인 CDC가 이어진다. |
| `SYNCING` | 입력 열의 자료형 변경을 감지하면 해당 테이블의 새 스냅샷을 요청한다. 기존 데이터와 같은 갱신 지연을 가정하지 않는다. |
| `NEEDS_ATTENTION` | 권한, 소스나 대상의 부재, 미지원 데이터 또는 시스템 오류를 확인한다. 공식 문서는 7일간 동기화를 재시도한 뒤 미해결이면 `FAILED`로 전환한다고 설명한다. |
| `FAILED` | 복구 가능한 일시 정지 상태가 아니다. 전송을 다시 시작하려면 통합을 삭제하고 재생성해야 한다. |

소스 열 이름 변경은 스키마 감지가 정확히 된다고 보장되지 않으며, 통합에 미치는 결과도 정의돼 있지 않다. 이름 변경을 자동 반영 가능한 변경으로 취급하지 않는다. 통합 삭제는 대상 Glue Data Catalog 데이터베이스와 S3의 실제 데이터를 자동 정리하지 않으므로, 재생성 전에 남은 데이터의 처리 방식을 정한다.

운영 검증에서는 소스 변경 시각과 대상 반영 시각, 대표 행의 값과 자료형을 함께 대조하는 절차를 권한다. `ACTIVE` 표시와 분석용 데이터의 준비 완료를 구분하기 위한 점검이며, zero-ETL이 모든 업무 변환이나 품질 검사를 대신한다는 뜻은 아니다. 이 절만 새로 대조했으며 앞 절들의 검증 기준일은 유지한다.

## 관련 문서

- [[Athena]], [[Redshift]], [[EMR]]
- [[Kinesis|Data Streams와 Firehose]]
- [[SageMaker-Catalog-Discovery|업무 메타데이터와 데이터 탐색]]

## 출처

- [AWS Glue, Configuring a source for a zero-ETL integration](https://docs.aws.amazon.com/glue/latest/dg/zero-etl-sources.html)
- [AWS Glue, Creating and managing integrations](https://docs.aws.amazon.com/glue/latest/dg/zero-etl-creating-managing.html)
- [AWS Glue, Limitations](https://docs.aws.amazon.com/glue/latest/dg/zero-etl-limitations.html)
- [AWS Glue, Troubleshooting connection issues in AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/troubleshooting-connection.html)
- [AWS Glue, Setting up network access to data stores](https://docs.aws.amazon.com/glue/latest/dg/start-connecting.html)
- [AWS Glue, Setting up Amazon VPC for JDBC connections to Amazon RDS data stores from AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/setup-vpc-for-glue-access.html)
- [AWS Glue, Migrating AWS Glue for Spark jobs to AWS Glue version 6.0](https://docs.aws.amazon.com/glue/latest/dg/migrating-version-60.html)
- [AWS Glue, Using crawlers to populate the Data Catalog](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html)
- [Amazon Data Firehose, PutRecordBatch](https://docs.aws.amazon.com/firehose/latest/APIReference/API_PutRecordBatch.html)
- [Amazon Data Firehose, Convert input data format](https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS, Announcing AWS Glue Elastic Views preview](https://aws.amazon.com/about-aws/whats-new/2020/12/announcing-aws-glue-elastic-view-preview/)
- [AWS Glue, Data Catalog views](https://docs.aws.amazon.com/glue/latest/dg/catalog-views.html)
- [AWS Glue, Data Quality](https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html)
- [AWS Glue, Evaluating data quality for ETL jobs in AWS Glue Studio](https://docs.aws.amazon.com/glue/latest/dg/tutorial-data-quality.html)
- [AWS Glue, Completeness](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types-Completeness.html)
- [AWS Glue, DataFreshness](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types-DataFreshness.html)
