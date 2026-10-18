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

### 작은 파일의 읽기 그룹과 저장 파일 병합은 다르다

부분 검증(2026-10-16): S3 입력을 읽는 DynamicFrame의 파일 그룹화 옵션을 공식 문서와 대조했다. `groupFiles: inPartition`은 같은 S3 데이터 파티션 안의 파일을 묶어 각 ETL task가 하나의 메모리 파티션으로 읽도록 한다. S3에 저장된 원본 파일을 물리적으로 합치는 작업은 아니다.

- 입력 파일이 50,000개를 넘으면 Glue가 그룹화를 자동 활성화한다. 이 설명은 지원 형식의 DynamicFrame 읽기에 적용하며 모든 Spark 읽기로 확대하지 않는다.
- `groupSize`는 그룹의 목표 크기를 byte로 지정하는 선택값이다. 생략하면 Glue가 클러스터의 CPU core 활용과 task 및 메모리 파티션 수 감소를 고려해 정한다.
- 지원 형식은 `csv`, `ion`, `grokLog`, `json`, `xml`이며 `avro`, `parquet`, `orc`에는 이 옵션을 지원하지 않는다. 출력 형식이 아니라 그룹화할 입력 형식으로 확인한다.

운영 점검 제안: 같은 입력으로 driver 메모리, task 수와 실행 시간을 비교한다. 출력 파일 크기와 개수는 쓰기 단계에서 별도로 확인하며, 그룹 크기를 키우면 항상 빨라진다고 가정하지 않는다. 실제 성능은 시험하지 않았고 기존 런타임과 연결 절의 검증 기준일은 유지한다.

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

### SSL 연결과 인증서 검증 실패

2026-10-13 공식 연결 속성 문서 확인 기준. 네트워크 경로와 DB 인증이 맞아도 SSL 설정 때문에 JDBC 연결이 실패할 수 있다. `Require SSL connection`을 선택한 JDBC 연결에서는 Glue가 인증서와 호스트 이름을 검증하며, SSL로 연결하지 못하면 해당 작업이나 Crawler가 실패한다.

- DB가 요구하는 SSL 설정과 연결의 호스트 이름을 먼저 대조한다. 포트에 도달했다는 사실만으로 인증서 검증까지 통과한 것은 아니다.
- 사용자 지정 루트 인증서가 필요하면 `Custom JDBC certificate in S3`에 인증서 위치를 지정한다. 형식은 X.509 인증서의 PEM 형식이며, 이 필드가 비어 있으면 기본 인증서를 사용한다.
- `Skip certificate validation`은 사용자 지정 인증서의 검증을 건너뛰는 옵션이다. 검증을 켜면 Glue는 서명 알고리즘과 공개 키 알고리즘을 확인하고, 실패 시 해당 연결을 쓰는 ETL 작업이나 Crawler가 실패한다.

연결 성공만을 목표로 인증서 검증을 끄는 대신 신뢰할 루트 인증서와 호스트 일치 조건을 확인하는 절차를 권한다. 이 보강은 SSL 연결 속성에 한정하며 앞 절들의 검증 기준일은 유지한다.

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

## 로그 양을 줄이기 전에 런타임과 출력 경로를 확인한다

부분 검증(2026-10-13): 공식 로깅 가이드, 작업 파라미터와 PySpark API를 대조했다. Glue 4.0 이하의 continuous logging과 Glue 5.0의 실시간 로깅은 구분한다. 아래 5.0 설명을 다른 런타임 버전에 확인 없이 확대하지 않는다.

- **Glue 4.0 이하:** continuous logging의 `--enable-continuous-log-filter=true`는 Spark driver/executor와 Hadoop YARN heartbeat의 불필요한 메시지를 줄이는 표준 필터다. `false`는 필터를 적용하지 않는다.
- **Glue 5.0:** 모든 작업에 실시간 로깅 기능이 있다. 기본적으로 시스템, Spark daemon과 Glue Logger 로그는 `/aws-glue/jobs/error`, 사용자 stdout/stderr는 `/aws-glue/jobs/output`으로 간다. 그룹 이름의 `error`를 오류 수준 메시지만 있다는 뜻으로 읽지 않는다.
- **Spark 로그 수준:** `sc.setLogLevel("WARN")`처럼 `SparkContext.setLogLevel`로 조정한다. 유효 수준은 `ALL`, `DEBUG`, `ERROR`, `FATAL`, `INFO`, `OFF`, `TRACE`, `WARN`이다. Spark 로그 설정 변경만으로 사용자 stdout/stderr의 출력량까지 줄었다고 판단하지 않는다.

운영 점검 제안: 동일한 대표 입력으로 변경 전후 로그 양과 실패 진단 가능성을 비교한다. 업무 로그는 별도로 출력 수준을 정하고, 그룹의 보존 기간도 확인한다. 로그가 사라졌다면 필터 효과뿐 아니라 전송 권한과 경로 오류를 점검한다. 로그 절감과 진단 정보 유실을 같은 성과로 계산하지 않는다. 이 절 외 기존 내용의 검증 기준일은 유지한다.

## BigQuery 수집의 연결 권한과 재처리 경계

부분 검증(2026-10-13): 공식 BigQuery 연결과 Job Bookmarks 문서를 대조했다. Glue for Spark는 Glue 4.0 이상에서 BigQuery 테이블 읽기와 쓰기를 지원한다. 외부 클라우드의 데이터를 S3 분석 영역으로 모으는 경우에도 연결 생성과 반복 실행의 정합성은 따로 설계한다.

- **연결과 권한:** GCP 자격 증명을 연결한 Secrets Manager secret과 Google BigQuery 유형의 Glue connection을 준비한다. Glue 실행 역할의 secret 읽기 권한과 GCP 서비스 계정의 BigQuery 작업 권한은 별개다. 작업의 Additional network connection에도 연결을 지정한다.
- **읽기 방식:** 테이블 읽기는 `sourceType: table`과 `table`을, 쿼리 읽기는 `sourceType: query`와 `query`를 사용한다. 공식 쿼리 예제는 `viewsEnabled`와 `materializationDataset`, 해당 데이터셋에 테이블을 만들 권한도 요구한다.
- **프로젝트 구분:** `parentProject`는 과금에 사용할 프로젝트다. 테이블이 있는 프로젝트와 별도로 확인한다.
- **북마크의 한계:** Job Bookmarks의 공식 지원 목록은 JDBC, Relationalize와 일부 S3 소스다. BigQuery 연결에 JDBC의 증분 처리 규칙을 그대로 적용하지 않는다. 지원 소스에서도 기본 설정은 `Disable`이며, bookmark reset이나 rewind는 기존 대상 파일을 지우지 않는다.

반복 수집 설계 예시: 조회할 날짜 구간과 완료 기준을 명시하고, 실패한 구간을 다시 처리했을 때 S3 결과가 중복되지 않도록 출력 경로와 교체 또는 중복 제거 방식을 정한다. 연결 성공이나 Crawler의 스키마 발견만으로 재처리 안전성이 검증된 것은 아니다. 앞 절들의 검증 기준일은 유지한다.

## CDC 적재와 Iceberg의 현재 상태 반영을 나눈다

부분 검증(2026-10-14): AWS의 CDC 기반 Glue/Iceberg 구현 자료, Apache Iceberg의 Spark 쓰기 문서와 Firehose 문서를 대조했다. CDC 이벤트를 S3에 쌓는 일과 분석 테이블에 변경을 반영하는 일은 별개다.

- **원본과 현재 상태:** insert, update와 delete 이벤트를 보관하는 수집 영역과 현재 행 상태를 조회하는 Iceberg 테이블을 구분한다. Glue 변환에서 키와 변경 연산을 해석하고 `MERGE INTO`로 대상에 반영한다. Parquet 변환이나 Crawler 실행만으로 이 작업이 끝나지 않는다.
- **병합 입력:** Iceberg의 Spark `MERGE INTO`에서는 여러 소스 레코드가 같은 대상 행을 갱신하려 하면 오류가 발생한다. 최신 상태 테이블을 만들 때는 키별 변경 순서를 정하고 병합 전에 입력을 정리한다. 설계 시 변경 순서가 같은 이벤트와 삭제의 처리 규칙도 명시한다.
- **재처리 검증 제안:** 같은 변경 묶음을 두 번 처리하고, 늦게 도착한 이전 변경과 삭제 이후의 오래된 갱신을 넣어 최종 행이 기대한 상태인지 검사한다. 한 번의 병합 성공을 전체 파이프라인의 중복, 순서와 재실행 안전성으로 확대하지 않는다.
- **적재 도구 선택:** 현재 Amazon Data Firehose는 Iceberg 테이블로 스트리밍 데이터를 전달하고 insert, update와 delete를 적용할 수 있다. Iceberg 적재를 위해 Glue가 반드시 필요하다는 전제를 두지 않는다. 조인과 업무 변환, 변경 순서 처리 등 요구사항을 각 도구의 지원 범위와 대조한다.

이 절은 데이터 반영 경계에 대한 보강이다. 실제 파이프라인이나 장애 복구는 실행하지 않았으며, 기존 런타임과 연결 관련 절의 검증 기준일은 유지한다.

## 관련 문서

- [[Athena]], [[Redshift]], [[EMR]]
- [[Kinesis|Data Streams와 Firehose]]
- [[SageMaker-Catalog-Discovery|업무 메타데이터와 데이터 탐색]]

## 출처

- [AWS Glue, Reading input files in larger groups](https://docs.aws.amazon.com/glue/latest/dg/grouping-input-files.html)
- [Implement a CDC-based UPSERT in a data lake using Apache Iceberg and AWS Glue — AWS Big Data Blog](https://aws.amazon.com/blogs/big-data/implement-a-cdc-based-upsert-in-a-data-lake-using-apache-iceberg-and-aws-glue/)
- [Apache Iceberg, Spark Writes](https://iceberg.apache.org/docs/latest/spark-writes/)
- [Amazon Data Firehose, Deliver data to Apache Iceberg Tables with Amazon Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/apache-iceberg-destination.html)
- [AWS Glue, BigQuery connections](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-connect-bigquery-home.html)
- [AWS Glue, Tracking processed data using job bookmarks](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html)
- [AWS Glue, Logging for AWS Glue jobs](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuous-logging.html)
- [AWS Glue, Enabling continuous logging for AWS Glue 4.0 and earlier jobs](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuous-logging-enable.html)
- [AWS Glue, Using job parameters in AWS Glue jobs](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html)
- [Apache Spark, pyspark.SparkContext.setLogLevel](https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.SparkContext.setLogLevel.html)
- [AWS Glue, AWS Glue connection properties](https://docs.aws.amazon.com/glue/latest/dg/connection-properties.html)
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
