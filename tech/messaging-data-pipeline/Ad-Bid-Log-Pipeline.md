---
tags: [data-pipeline, adtech, rtb, openrtb, data-lake, kinesis, firehose, athena, s3]
status: done
verified_at: 2026-10-14
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Ad Bid Log Pipeline", "광고 입찰 로그 파이프라인", "RTB 로그 데이터 레이크"]
---

# 광고 입찰 로그 파이프라인

실시간 입찰(RTB)에서 거래소는 경매할 노출 지면을 담은 입찰 요청을 입찰자에게 보내고, 입찰자는 정해진 시간 안에 응답한다. 같은 요청과 응답, 낙찰과 과금 통지는 입찰 전략과 정산 분석에 쓰는 로그가 된다. 응답 경로는 시간 한도가, 로그 분석 경로는 완전성과 조회 비용이 핵심이라 두 경로의 요구를 섞지 않는 데서 설계가 시작된다.

## 응답 경로와 분석 경로를 나눈다

| 경로 | 지켜야 할 것 | 설계 기준 |
|---|---|---|
| 입찰 응답 | 거래소가 정한 응답 시간 | 로그 기록이 응답을 기다리게 하지 않고 비동기로 넘긴다 |
| 로그 수집 | 대량 유입을 잃지 않고 받기 | 입찰 서버의 파일 생성과 업로드 부담을 덜고 버퍼와 재시도를 둔다 |
| 분석과 집계 | 스캔 비용과 조회 유연성 | 열 지향 형식, 파티션과 공유 카탈로그로 조회 엔진을 고를 수 있게 한다 |

OpenRTB 2.6 기준 `tmax`는 거래소가 인터넷 지연을 포함해 입찰을 받아 주는 최대 시간(밀리초)이다. 응답 예산은 업계 공통 숫자로 정하지 않고 거래소별 요청의 `tmax`에서 출발한다. 입찰하지 않을 때는 HTTP 204 빈 응답을 보내거나, 사유를 알리려면 `nbr` 코드가 담긴 `BidResponse`를 보낸다.

## 무엇을 기록하고 어떻게 잇는가

OpenRTB 2.6의 객체 정의를 기준으로 로그의 연결 키와 지표 경계를 정한다.

- **요청:** `BidRequest.id`는 거래소가 부여하며 이후 응답을 추적하는 고유 ID다. `imp`는 경매에 나온 노출 지면 배열이고, `device`에는 제조사, 모델, OS, 화면의 물리 픽셀 크기(`w`, `h`), 광고 식별자(`ifa`)와 광고 추적 제한 신호(`lmt`)가 들어갈 수 있다.
- **응답:** `BidResponse.id`는 응답 대상인 입찰 요청의 ID다. 요청 로그와 응답 로그를 이 값으로 잇는다.
- **통지:** 낙찰 통지 URL(`nurl`) 호출은 광고가 전달, 노출되거나 과금 대상이 됐다는 뜻이 아니다. 과금 시점은 거래소 정책에 따른 `burl`, 패찰은 `lurl`로 따로 온다. 낙찰 수와 과금 노출 수를 같은 지표로 합치지 않는다.
- **식별 정보:** `ifa`는 해시하지 않은 광고 식별자이고 `lmt`가 1이면 상업 지침에 따라 추적을 제한해야 한다. 이런 필드의 보존 기간, 접근 권한과 다른 국가 리전으로 옮겨도 되는지를 원본 로그 설계 단계에서 정한다(설계 점검).

## 수집 경로를 고른다

| 방식 | 얻는 것 | 운영 부담 |
|---|---|---|
| 서버가 파일을 만들어 S3에 업로드 | 구성이 단순하다 | 입찰 서버의 CPU, 디스크와 네트워크를 쓴다. 파일 크기와 업로드 재시도를 직접 관리한다 |
| Kinesis Data Streams와 KCL 소비자 | 보존 기간 안의 재처리, 여러 소비자 | 소비자 애플리케이션 인스턴스를 직접 실행하고 늘린다. KCL은 DynamoDB lease table로 shard 할당과 checkpoint를 관리하며 그 테이블 비용이 따로 든다 |
| Amazon Data Firehose | 소비 애플리케이션을 작성하거나 자원을 관리하지 않고 S3 등에 전달 | 버퍼 힌트가 파일 크기와 지연을 정한다. 전달 중복은 [[Log-Pipeline#중복과 순서를 전제로 설계한다|로그 파이프라인의 중복 처리]]를 따른다 |
| Kinesis Data Streams의 data delivery | 소비 애플리케이션 없이 스트림을 S3 일반 버킷(원본 형식)이나 S3 Tables의 Iceberg 테이블로 전달하고, shard 안에서는 정확히 한 번 전달한다 | On-Demand 용량 모드만 지원하고 데이터 신선도는 5~15분 범위에서 정한다. 대상은 스트림과 같은 리전이어야 한다 |

- Firehose의 S3 버퍼 힌트는 크기 1~128 MiB(기본 5), 간격 0~900초(기본 300)다. 힌트라서 Firehose가 더 적합하다고 판단하면 다른 값을 쓸 수 있다. API 문서는 평소 10초 동안 들어오는 양보다 큰 크기를 권장한다.
- 재처리나 여러 소비자가 필요하면 Kinesis Data Streams에 보존하고, Firehose가 그 스트림을 읽어 S3로 전달하게 구성할 수 있다. Firehose 레코드 하나는 1,000 KB까지다.
- Firehose의 Parquet, ORC 변환은 JSON 입력만 받는다. CSV는 Lambda 변환으로 JSON을 만든 뒤 변환하며 스키마는 Glue Data Catalog에 둔다. 상세는 [[Log-Pipeline#객체 저장소 경로에서 적재와 카탈로그를 구분한다|적재와 카탈로그의 구분]]을 따른다.

## 스트리밍 테이블의 정리 작업과 집계 날짜

2026-10-22 Apache Iceberg 1.12.0과 Spark 4.2.0 공식 문서 부분 대조 기준이다. Kafka에서 받아 Spark로 Iceberg에 적재하는 경로를 선택한다면, 데이터 도착뿐 아니라 테이블 유지보수와 지표의 날짜 경계도 설계한다.

| 작업 | 목적과 주의점 |
| --- | --- |
| 작은 파일 병합 | `rewrite_data_files`로 작은 파일을 합쳐 파일 열기와 메타데이터 부담을 줄인다. 모든 쓰기 직후 실행하는 것을 보편 규칙으로 삼지 않고 파일 수, 크기와 조회 지연으로 주기를 정한다(운영 제안) |
| 스냅샷 만료 | 오래된 스냅샷과 더 이상 필요하지 않은 파일을 정리한다. 만료된 스냅샷은 time travel에 사용할 수 없으므로 재계산과 복구에 필요한 이력 기간을 먼저 정한다 |
| 고아 파일 정리 | 실패한 작업 등이 남긴 테이블 메타데이터의 미참조 파일을 정리한다. 보존 간격이 쓰기 완료 예상 시간보다 짧으면 진행 중인 파일을 지워 테이블이 손상될 수 있다 |

짧은 스트리밍 커밋 간격은 데이터 파일, manifest와 snapshot을 빠르게 늘린다. Iceberg 문서는 최소 1분의 trigger interval을 권장하며 필요하면 늘리도록 안내한다. 이는 제품의 운영 권고이며 모든 실시간 파이프라인에 적용되는 지연 하한은 아니다. 신선도 목표와 유지보수 비용을 함께 비교한다.

Spark의 `SET TIME ZONE`은 현재 세션의 시간대를 설정하며 지역 기반 ID를 지원한다. `LOCAL`은 Java `user.timezone`, 환경 변수 `TZ`, 시스템 시간대 순서로 결정된다. 모든 환경의 기본값을 UTC라고 가정하지 않는다.

설계 예시: 같은 순간인 `2026-10-22 00:30 Asia/Seoul`과 `2026-10-21 15:30 UTC`는 날짜가 다르다. 원본 시각, 일 집계 기준 시간대와 날짜 파생 규칙을 계약으로 두고, 자정 전후 이벤트가 어느 날짜의 광고비와 전환 수에 들어가는지 검증한다. 실제 Spark 실행 시험은 하지 않았으며 기존 AWS 경로의 검증일은 유지한다.

## 리전 사이로 옮길 때

- **복제 시간:** S3 복제는 비동기다. 공식 비교표는 RTC 없는 CRR을 24~48시간 이내 복제(SLA 미적용)로 표기한다. RTC를 켜면 15분 안에 복제된 비율에 월간 SLA가 붙고(99.9% 미만이면 서비스 크레딧), 15분을 넘긴 객체를 `OperationMissedThreshold` 이벤트와 복제 지표로 확인할 수 있다. 요청률 지침이나 기본 1 Gbps 복제 전송 할당량을 넘는 동안에는 RTC SLA가 적용되지 않는다.
- **복제 비용:** 대상 저장 클래스의 저장, 원본 저장, 복제 PUT 요청이 과금되고 CRR은 대상 리전으로 나가는 전송 요금이 더해진다. RTC는 별도 전송 요금과 지표 요금이 있다.
- **직접 쓰기:** 생산 리전에서 분석 리전 버킷으로 바로 쓰면 복제본과 복제 대기가 사라진다. 다른 리전의 서비스에 접근하는 전송 요금은 그대로 남고, 업로드 지연과 실패 재시도는 생산 쪽이 맡는다(설계 판단).
- **분석 리전 선택:** 필요한 서비스와 기능의 제공 여부는 리전마다 다르고 서비스 목록은 매일 갱신된다. Redshift 클러스터 비용도 리전, 노드 유형, 노드 수와 예약 여부에 따라 달라진다. 원본의 식별 정보를 그 리전으로 옮길 수 있는지도 함께 확인한다.

## 저장 형식과 조회 엔진

- **열 지향 변환:** Parquet와 ORC는 필요한 열만 읽고 같은 열을 모아 압축하며, 파일의 최솟값과 최댓값 메타데이터로 불필요한 구간을 건너뛴다. 시간 열로 정렬해 두면 짧은 시간 범위 조회의 건너뛰기가 잘 된다. 변환은 Glue ETL, Athena CTAS, EMR 클러스터의 배치 작업, Firehose 변환 중 입력 형식과 처리 주기에 맞춰 고른다.
- **압축한 텍스트:** CSV를 압축하면 대부분의 형식에서 파일 하나를 여러 작업자가 나눠 읽지 못한다. 파일 수가 병렬도의 상한이 되므로 파일 수와 크기의 균형을 잡는다. Athena의 스캔량 과금은 압축을 풀기 전 바이트를 기준으로 한다.
- **작은 파일:** 작은 파일이 많으면 목록 조회와 파일별 처리 오버헤드가 커지고 S3 요청률을 넘어 `SlowDown` 오류가 날 수 있다. 쓰기 전에 버퍼를 늘리거나, Glue ETL로 병합하거나, 파티션 키를 줄인다. 열 지향 파일이 너무 작으면 형식의 이점보다 오버헤드가 크며 Parquet row group 기본값은 128 MB다.
- **공유 카탈로그:** Redshift Spectrum은 Glue Data Catalog의 데이터베이스를 `CREATE EXTERNAL SCHEMA`로 등록해 Athena가 쓰는 외부 테이블을 함께 조회한다. 조회 엔진을 바꿔도 테이블 정의를 다시 만들지 않는다. 엔진별 차이는 [[Athena#Athena vs Redshift Spectrum|Athena와 Spectrum 비교]]를 따른다.
- **웨어하우스 저장 한도:** DC2는 데이터를 노드 로컬에 두므로 저장 공간을 늘리려면 노드를 더한다. RG와 RA3는 관리형 스토리지로 컴퓨팅과 저장을 따로 늘리고 사용한 저장량만 낸다. DS2는 더 이상 제공되지 않는다. 오래된 원본을 S3에 두고 외부 테이블로 읽는 방식과 함께 비교한다.

## 비용 통제

- **원본 정리:** 변환 결과의 건수와 필수 열을 원본과 대조한 뒤 원본 CSV에 만료 규칙을 건다. 재처리할 수 있어야 하는 기간 동안은 원본을 남긴다(설계 점검).
- **저장 클래스:** 2026-07-16부터 Lifecycle로 생성 당일부터 Standard-IA와 One Zone-IA로 전환할 수 있다. IA에는 최소 보관 30일, 최소 과금 크기 128 KB와 GB당 조회 요금이 있으므로 전환 뒤에도 자주 스캔하는 파티션은 조회 요금이 절감액을 넘을 수 있다. 접근 패턴이 불확실하면 Intelligent-Tiering을 비교한다. 30일 연속 접근하지 않은 객체를 Infrequent Access 계층으로 옮기고 조회 요금은 없지만 객체별 모니터링 요금이 있으며, 128 KB 미만 객체는 자동 계층화 대상이 아니다. 선택형 아카이브 계층을 켜면 그 계층의 객체는 복원한 뒤 읽는다. 계층별 판단은 [[Storage-Tiering|스토리지 계층화]]를 따른다.
- **반복 쿼리:** Athena의 query result reuse는 같은 workgroup에서 쿼리 문자열, 데이터베이스와 카탈로그, 결과 설정이 일치하고 최대 수명(기본 60분, 최대 7일)이 지나지 않은 이전 결과를 실행 없이 돌려준다. 원본 변경을 확인하지 않으므로 최신성이 중요한 리포트에는 수명을 짧게 둔다. managed query results, 행과 열 단위 권한이 걸린 테이블, `rand()` 같은 비결정적 함수는 대상이 아니다.
- **결과 다시 읽기:** 이미 끝난 실행의 결과만 필요하면 `GetQueryResults`로 실행 ID의 결과를 읽는다. 이 호출은 쿼리를 다시 실행하지 않는다. 결과 위치의 S3 `GetObject` 권한이 있으면 이 API를 거부해도 결과를 읽을 수 있으므로 결과 버킷 권한도 함께 제한한다.

## 매체별 전달 경로를 나눌 때

설치나 전환 결과를 여러 광고 매체에 서로 다른 형식으로 보내야 하면 매체별 함수로 나눠 한 매체의 요구 변경이 다른 매체로 번지지 않게 할 수 있다.

- S3 이벤트 알림은 같은 이벤트 유형에 대해 prefix와 suffix 조합이 겹치는 규칙을 저장하지 못한다. prefix가 겹쳐도 suffix가 겹치지 않으면 허용되며, 필터 없는 규칙은 모든 prefix, suffix와 겹친다.
- 한 객체를 여러 매체 함수가 처리해야 하면 매체별 prefix로 나눠 쓰거나, 버킷의 EventBridge 전송을 켜고 규칙으로 여러 대상에 보낸다. 중복과 순서 처리는 [[S3-Features-Management|S3 이벤트 알림]]과 [[Idempotent-Consumer|멱등 소비자]]를 따른다.

## 사례: 모바일 DSP의 입찰 로그 분석 구조 전환

2018년에 공개된 AWS Korea 발표 영상에서 IGAWorks가 소개한 모바일 DSP의 입찰 요청 로그 분석 구조다. 수치와 구성은 발표 시점의 사례이며 현재 배포 상태를 확인한 것은 아니다.

| 단계 | 구성 | 드러난 한계와 결과 |
|---|---|---|
| 초기 | 도쿄 리전 입찰 서버가 로그를 CSV로 S3에 저장하고 CRR로 버지니아 리전에 복제한 뒤 Redshift COPY로 적재 | 일 2억 건 즈음부터 복제 지연과 미복제가 생겼다. 같은 데이터를 두 리전에 보관했고 COPY 시간이 늘었으며 저장 공간만 필요해도 클러스터를 늘려야 했다 |
| 전환 | CRR을 없애고 분석 리전으로 바로 전송했다. Kinesis Data Streams를 도입했다가 KCL 소비자 확장 관리 부담으로 Firehose로 바꿨다. 오래된 데이터를 지우고 하루 한 번 EMR로 CSV를 Parquet로 바꿔 Athena와 Redshift Spectrum이 같은 카탈로그로 조회했다 | 발표 시점 일 60억 건, CSV 하루 약 3.6 TB가 Parquet 약 340 GB로 줄었다. 변환 클러스터는 17대였고 1시간 목표를 기준으로 필요하면 노드를 늘렸다 |
| 계획 | 작은 CSV 병합, 변환 작업을 Glue로 옮기는 검토, 처리한 CSV 삭제, 1주 뒤 Parquet의 IA 전환, Athena 결과 재사용 | 현재 공식 기능으로 적용할 때는 위 비용 통제 절의 조건을 확인한다 |

압축 효과는 데이터 형태에 따라 달라 이 사례의 약 10분의 1을 일반 기대값으로 쓰지 않는다. 발표에서 설명한 저장 공간 문제는 저장을 늘리려면 클러스터를 키워야 하는 구조에서 생겼으므로, 지금 적용할 때는 위 웨어하우스 저장 한도의 선택지를 다시 비교한다. 수집 단계도 지금은 Kinesis Data Streams의 data delivery 같은 관리형 전달을 함께 비교한다.

## 체크포인트

- 로그 수집이 실패하거나 늦어져도 입찰 응답 시간이 영향을 받지 않는가
- 요청, 응답, 낙찰, 과금과 패찰 기록을 요청 ID로 이을 수 있는가
- 수집 지연, 변환 완료 시각과 조회 가능 시각을 따로 측정하는가
- 일 처리량이 늘어도 하루 단위 변환이 다음 실행 전에 끝나는가
- 원본을 지우기 전에 변환 결과를 원본과 대조하는가

## 출처

- [Apache Iceberg 1.12.0, Maintenance](https://iceberg.apache.org/docs/latest/maintenance/)
- [Apache Iceberg 1.12.0, Structured Streaming](https://iceberg.apache.org/docs/latest/spark-structured-streaming/)
- [Apache Spark 4.2.0, SET TIME ZONE](https://spark.apache.org/docs/latest/sql-ref-syntax-aux-conf-mgmt-set-timezone.html)
- [애드테크 플랫폼을 위한 AWS 도입 및 운영 — Amazon Web Services Korea](https://www.youtube.com/watch?v=UKx3zaf579E)
- [IAB Tech Lab, OpenRTB API Specification Version 2.6](https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md)
- [Amazon S3, Replicating objects within and across Regions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
- [Amazon S3, Meeting compliance requirements with S3 Replication Time Control](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html)
- [Amazon S3, Replication Time Control Service Level Agreement](https://aws.amazon.com/s3/sla-rtc/)
- [Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Overview of Data Transfer Costs for Common Architectures — AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/)
- [AWS, List of AWS Services Available by Region](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)
- [Amazon Data Firehose, What is Amazon Data Firehose?](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html)
- [Amazon Data Firehose, BufferingHints](https://docs.aws.amazon.com/firehose/latest/APIReference/API_BufferingHints.html)
- [Amazon Data Firehose, Convert input data format in Amazon Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html)
- [Amazon Kinesis Data Streams, Terminology and concepts](https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html)
- [Amazon Kinesis Data Streams, KCL 1.x and 2.x information](https://docs.aws.amazon.com/streams/latest/dev/shared-throughput-kcl-consumers.html)
- [Amazon Kinesis Data Streams, Streaming tables and S3 delivery for Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/data-delivery.html)
- [Amazon Athena, Optimize data](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html)
- [Amazon Athena, Reuse query results in Athena](https://docs.aws.amazon.com/athena/latest/ug/reusing-query-results.html)
- [Amazon Athena, GetQueryResults](https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryResults.html)
- [Amazon Redshift, External schemas in Amazon Redshift Spectrum](https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-external-schemas.html)
- [Amazon Redshift, Amazon Redshift provisioned clusters](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html)
- [Amazon S3 removes 30-day minimum for transitions to S3 Standard-IA and S3 One Zone-IA — AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/07/s3-removes-30-day-transitions-standard-ia-one-zone-ia/)
- [Amazon S3, Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [Amazon S3, Configuring event notifications using object key name filtering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html)
- [Amazon S3, Using EventBridge](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html)

## 관련 문서

- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]
- [[Kinesis|Amazon Kinesis]]
- [[Athena|Amazon Athena]]
- [[Redshift|Amazon Redshift]]
- [[EMR|Amazon EMR]]
- [[Glue|AWS Glue]]
- [[Storage-Tiering|스토리지 계층화]]
- [[S3-Features-Management|S3 기능과 데이터 관리]]
- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[Realtime-Tracking-Analytics|실시간 추적 데이터 파이프라인]]
