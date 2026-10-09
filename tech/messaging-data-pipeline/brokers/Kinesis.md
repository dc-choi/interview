---
tags: [messaging, aws, kinesis, streaming, decoupling, saa-c03]
status: done
verified_at: 2026-09-03
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kinesis", "Amazon Kinesis", "Kinesis Data Streams", "KDS", "Kinesis Firehose"]
---

# Amazon Kinesis

AWS 관리형 **실시간 데이터 스트리밍** 서비스군. 빠르게 생성되는 대규모 메시지, 로그, 이벤트를 수집, 저장, 변환, 분석한다. AWS Decoupling 3종(SQS=Queue / SNS=Pub-Sub / **Kinesis=Real-time Streaming**) 중 스트리밍 모델.

## 4가지 구성 서비스

| 서비스 | 역할 | 비고 |
|--------|------|------|
| **Kinesis Data Streams (KDS)** | 실시간 데이터 수집, 저장 | 시험 출제 핵심 |
| **Amazon Data Firehose** (구 Kinesis Data Firehose) | 캡처, 변환, 전송 (S3, Redshift, OpenSearch, Splunk 등) | 시험 출제 핵심 |
| **Amazon Managed Service for Apache Flink** (구 Kinesis Data Analytics) | Apache Flink 기반 스트림 처리 | 보조 |
| **Kinesis Video Streams** | 영상 스트리밍 수집, 저장 | 출제 빈도 낮음 |

SAA 자료에는 예전 이름인 Kinesis Data Firehose, Kinesis Data Analytics가 남아 있을 수 있다. 최신 명칭은 Amazon Data Firehose, Amazon Managed Service for Apache Flink다.

## Kinesis Data Streams (KDS)

생산자가 만든 대규모 실시간 데이터를 **수집, 저장**하여 소비자가 처리하게 한다. SQS와 다르게 데이터가 일정 기간 보존되어 **다수 소비자가 같은 데이터를 재읽기**할 수 있다.

### 핵심 용어

| 용어 | 의미 |
|------|------|
| **Data Record** | KDS에 저장되는 데이터의 단위 (Partition Key + Sequence Number + Data Blob) |
| **Shard** | 일정 수 이상의 Data Record가 모인 고유한 순서 — 처리량 단위 |
| **Data Stream** | 일련의 데이터 집합. Shard들이 모여 구성 |
| **Partition Key** | Shard별 데이터 그룹화 키. 같은 키는 같은 Shard로 → 순서 보장 |
| **Sequence Number** | 레코드가 Shard에 적재될 때 부여되는 고유 순서 번호 |

Data Record → Shard로 순서를 이루고 → Shard들이 모여 Data Stream.

### Shard 처리량 (시험 자주 나옴)

| 방향 | 한 Shard당 |
|------|-----------|
| 쓰기(Write) | **1 MB/s** 또는 **1,000 records/s** |
| 읽기(Read, 표준) | **2 MB/s** (소비자 공유) |
| 읽기(Enhanced Fan-out) | **소비자당 2 MB/s** (전용 처리량) |

처리량 부족 시 Shard 수를 늘려야 한다 (**Resharding** — Split/Merge).

### 보존 기간

- **기본 24시간**, 최대 **365일**까지 설정 가능
- 보존 기간 동안 같은 데이터를 **여러 소비자가 독립적으로 읽기/재처리** 가능 (Kafka와 동일한 모델)

## Producer, Consumer

### Producer
- AWS SDK / **KPL (Kinesis Producer Library)** — 배치, 재시도, 집계(Aggregation) 자동
- Kinesis Agent (로그 파일 수집)
- CloudWatch Logs Subscription, IoT 등

### Consumer
KDS에 적재된 데이터를 다음에서 수집/처리:
- **KCL (Kinesis Client Library)** — Shard별 리스 관리, 체크포인트 자동
- **AWS Lambda** (Event Source Mapping)
- **Amazon Data Firehose** (변환, 전송 파이프라인으로 위임)
- **Amazon Managed Service for Apache Flink**
- EC2 애플리케이션, EMR Cluster

대표 사용 예시: 다수 웹사이트의 **Click Stream Data** → KDS → Firehose → S3 (저장, 분석).

## KDS에서 S3 Tables로 직접 적재

2026-10-07 AWS 공식 문서 기준, **Streaming tables**는 KDS 레코드를 Amazon S3 Tables의 Apache Iceberg 테이블로 전달한다. Shard에서 읽은 데이터를 버퍼링하고 스키마 검증 후 Parquet로 변환해 inline compaction과 Iceberg commit을 수행한다. Athena 같은 엔진으로 결과를 조회할 수 있다.

| 설정 | 제약과 운영 의미 |
|---|---|
| 스키마 | AWS Glue Schema Registry 필수. 일반 JSON도 `GSRSchemaARN`으로 스키마를 지정하며, `GSR_JSON`은 레코드의 schema ID를 사용 |
| 대상 | Delivery마다 새 테이블을 생성. 기존 테이블로 전달 불가 |
| 신선도 | 최대 버퍼링 시간 300~900초, 기본 300초. 전체 조회 지연의 SLA로 해석하지 않음 |
| 오류 | S3 기반 DLQ 필수. 전체 원문이 아니라 레코드 식별자와 오류 문맥을 저장 |
| 배치 범위 | Source stream, S3 table bucket, Glue Schema Registry는 같은 계정과 리전에 위치 |
| 암호화 키 | Source stream을 AWS managed key로 암호화한 경우 delivery 생성 불가. 대상에서 SSE-KMS를 선택하면 customer managed key 필요 |

따라서 DLQ만 보관하면 원문을 재처리할 수 있다고 가정하지 않는다. 복구 설계에서는 원본 보존 기간과 식별자로 원문을 찾는 방법을 함께 검증한다. 별도 consumer 운영을 줄일 수 있어도 오류 대응 책임까지 사라지는 것은 아니다.

이 경로는 아래 Firehose 전송과 별개의 선택지다. 기존 Iceberg 테이블 사용 여부, 변환 요구와 목적지를 먼저 비교한다.

## Amazon Data Firehose

생산자 실시간 데이터를 **캡쳐, 변환하여 지정 대상으로 전송**하는 fully-managed ETL 파이프라인.

| 특징 | 내용 |
|------|------|
| **변환** | Lambda를 끼워 레코드 변환, 필터링 가능 |
| **전송 대상** | **S3, Redshift, OpenSearch, Splunk** + HTTP Endpoint, 서드파티(Datadog, New Relic) |
| **버퍼링** | 간격 0~900초, 크기 1~128MB. S3, Iceberg, Redshift, OpenSearch 기본값은 300초, 5MB이고 HTTP endpoint와 서드파티 대상의 기본 간격은 60초 |
| **샤드 관리** | 없음 (서버리스, 자동 스케일) |
| **데이터 보존** | 없음 (전송만, 재읽기 불가) |

KDS와 Firehose는 자주 함께 쓰인다: KDS로 수집, 재읽기 가능하게 보존 → Firehose로 S3 적재.

버퍼 간격을 0초로 설정하면 데이터를 수 초 내 전달한다. 60초 미만으로 설정한 S3 전송은 멀티파트 업로드를 사용하므로 S3 PUT 비용이 늘 수 있다.

### Iceberg에 CDC를 적재할 때의 갱신 계약

부분 검증(2026-10-09): 아래 내용은 Firehose의 Iceberg 대상 설정과 제한을 공식 문서로 대조했다. 앞선 KDS 직접 적재와는 별개의 경로다.

AWS 공개 예제는 MySQL 변경 데이터를 DMS와 KDS로 전달하고, Firehose의 Lambda 변환을 거쳐 S3의 Iceberg 테이블에 반영한다. 이 서비스 조합은 구현 예시이며 모든 CDC 파이프라인의 필수 구성은 아니다.

| 확인할 계약 | 동작과 실패 조건 |
|---|---|
| 작업 종류 | `insert`, `update`, `delete`를 구분한다. 작업을 생략하면 `insert`이며 동일한 레코드도 새 행으로 추가될 수 있다 |
| 대상 행 식별 | `UniqueKeys`를 설정하거나 Iceberg의 `identifier-field-ids`를 사용한다. 둘 다 없으면 update/delete 전달이 실패한다 |
| 갱신 의미 | `update` 대상 행이 없으면 삽입한다. 내부적으로 delete file과 insert를 사용하므로 S3 객체의 일부를 제자리 수정하는 것으로 설명하지 않는다 |
| 라우팅 | 단일 테이블 insert는 테이블 설정만으로 라우팅할 수 있다. update/delete는 JSONQuery 또는 Lambda로 레코드별 작업 정보를 전달한다 |
| 파일 유지보수 | 데이터 파일이 많아지면 읽기 성능에 영향을 준다. Glue 자동 compaction이나 Athena `OPTIMIZE` 같은 유지보수 방법을 별도로 검토한다 |

같은 테이블에 여러 Firehose stream을 동시에 쓰는 구성은 AWS가 권장하지 않는다. 낙관적 동시성 제어의 commit 충돌로 재시도할 수 있으며, 재시도 기간이 끝나면 데이터와 delete file의 S3 경로가 오류 prefix로 전달된다. 오류 기록을 성공 적재로 세지 않는다.

검증 제안: 대표 키의 삽입, 값 변경, 삭제와 존재하지 않는 키의 update를 각각 수행하고 최종 테이블을 조회한다. DMS의 처리 건수만으로 완료를 판정하지 않고, 목적지의 행 값과 오류 prefix를 함께 확인한다. 버퍼링 지연과 실제 전달 실패도 구분한다. 이는 문서 기반 점검안이며 AWS 계정에서 실행한 결과는 아니다.

## Amazon Managed Service for Apache Flink

실시간 스트림을 Apache Flink 기반으로 처리, 분석한다. 예전 Kinesis Data Analytics for SQL Applications는 중단되어 2026년 1월 27일부터 삭제 절차가 진행되므로 신규 설계에 쓰면 안 된다.

- Source: KDS, Amazon MSK 등 Flink source connector가 지원하는 스트림
- Sink: KDS, Firehose, S3 등 Flink sink connector가 지원하는 대상
- **Studio Notebook**으로 대화형 분석

## Kinesis vs Kafka vs SQS vs SNS

| 기준 | SQS | SNS | Kinesis Data Streams | Kafka |
|------|-----|-----|---------------------|-------|
| 모델 | Queue (Polling) | Pub-Sub (Push) | Real-time Streaming | Pub-Sub Streaming |
| 소비 후 메시지 | **Delete** (소비 후 제거) | Subscriber로 전송 후 종료 | **보존**(24h~365d), 다수 소비자 재읽기 | 보존(설정), 다수 컨슈머 재읽기 |
| 순서 보장 | Standard 미보장 / FIFO O | Standard 미보장 / FIFO O | **Partition Key 단위로 보장** | Partition 단위 보장 |
| 처리량 단위 | Standard 거의 무제한 / 일반 FIFO 기본 한도는 API 작업별 초당 300회, 최대 10개 배치 시 API 작업별 초당 3,000개 메시지 / 고처리량 FIFO는 리전별 API 할당량 | 리전별 quota(Standard) | **Shard 단위 1MB/s, 1,000 rec/s** | Partition 단위 |
| 운영 | 완전 관리형 | 완전 관리형 | 관리형 (Shard 직접 조정 또는 On-Demand) | 자체 운영 or MSK |
| 적합 | 작업 큐, decouple | Fan-out 알림 | 로그/클릭스트림/IoT 실시간 | 동일 + 더 큰 생태계 |

핵심 구분: **SQS는 소비 후 삭제, Kinesis는 보존 → 다수 소비자 재읽기**. 같은 이벤트를 여러 시스템이 각자 속도로 처리해야 하면 KDS, 한 워커가 처리하고 끝이면 SQS.

## 시험 체크포인트 (SAA-C03)

- AWS Decoupling 3종 = SQS(Queue) / SNS(Pub-Sub) / **Kinesis(Real-time Streaming)** 모델 차이
- Kinesis 계열 = **Data Streams, Data Firehose, Managed Service for Apache Flink, Video Streams**. 옛 시험 자료의 Data Analytics 명칭은 Flink 서비스로 읽기
- KDS 용어: Data Record / **Shard** / Data Stream / **Partition Key** / Sequence Number
- Shard 처리량: 쓰기 1MB/s, 1,000 rec/s, 읽기 2MB/s — 부족하면 Resharding
- 보존 기간: 기본 24시간, 최대 365일 — 다수 소비자 재읽기 가능
- Partition Key가 같으면 같은 Shard → 순서 보장
- Firehose는 **변환, 전송 전용**, 데이터 보존 X, 대상은 **S3, Redshift, OpenSearch, Splunk** 등
- KCL(Consumer Library) / KPL(Producer Library)
- 실시간 분석은 Managed Service for Apache Flink. 예전 Data Analytics SQL 앱은 신규 설계 금지
- "다수 소비자가 같은 스트림 재읽기" 요구사항 = SQS 아닌 **KDS** 선택
- "S3로 near real-time 적재" 요구사항 = **Firehose** (서버리스, 변환 가능)

## 출처
- [Amazon Data Firehose, Set up the Firehose stream](https://docs.aws.amazon.com/firehose/latest/dev/apache-iceberg-stream.html)
- [Amazon Data Firehose, Route incoming records to a single Iceberg table](https://docs.aws.amazon.com/firehose/latest/dev/apache-iceberg-format-input-record.html)
- [Amazon Data Firehose, Considerations and limitations](https://docs.aws.amazon.com/firehose/latest/dev/apache-iceberg-considerations.html)
- [Transactional Data Lake using Apache Iceberg with Amazon Data Firehose and DMS — AWS Samples](https://github.com/aws-samples/transactional-datalake-using-amazon-datafirehose-iceberg)
- [Amazon Kinesis Data Streams, Streaming tables](https://docs.aws.amazon.com/streams/latest/dev/data-delivery-st.html)
- [Amazon Kinesis Data Streams, How streaming table delivery works](https://docs.aws.amazon.com/streams/latest/dev/data-delivery-st-about.html)
- [AWS 공식 문서, Amazon SQS message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- [Amazon Kinesis Data Streams, Quotas and limits](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html)
- [Amazon Kinesis Data Streams, Change the data retention period](https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html)
- [Amazon Data Firehose, Configure settings](https://docs.aws.amazon.com/firehose/latest/dev/create-configure-backup.html)
- [Managed Service for Apache Flink, Add streaming data sources](https://docs.aws.amazon.com/managed-flink/latest/java/how-sources.html)
- [Managed Service for Apache Flink, Java examples](https://docs.aws.amazon.com/managed-flink/latest/java/examples-new-java.html)
- [Amazon Kinesis Data Analytics for SQL Applications, Discontinuation](https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[SQS|SQS]]
- [[SNS|SNS]]
- [[MQ-Kafka|Kafka]]
- [[Messaging-Broker-Comparison|브로커 비교]]
- [[Delivery-Semantics|전달 보장]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Fan-Out-Architecture|Fan-out 아키텍처]]
