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

## 관련 문서

- [[Athena]], [[Redshift]], [[EMR]]
- [[Kinesis|Data Streams와 Firehose]]
- [[SageMaker-Catalog-Discovery|업무 메타데이터와 데이터 탐색]]

## 출처

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
