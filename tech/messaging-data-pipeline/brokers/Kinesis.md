---
tags: [messaging, aws, kinesis, streaming, decoupling, saa-c03]
status: done
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

## Amazon Data Firehose

생산자 실시간 데이터를 **캡쳐, 변환하여 지정 대상으로 전송**하는 fully-managed ETL 파이프라인.

| 특징 | 내용 |
|------|------|
| **변환** | Lambda를 끼워 레코드 변환, 필터링 가능 |
| **전송 대상** | **S3, Redshift, OpenSearch, Splunk** + HTTP Endpoint, 서드파티(Datadog, New Relic) |
| **버퍼링** | 시간(60s~) 또는 크기(1MB~) 기준으로 배치 후 flush — **near real-time** (보통 60초 지연) |
| **샤드 관리** | 없음 (서버리스, 자동 스케일) |
| **데이터 보존** | 없음 (전송만, 재읽기 불가) |

KDS와 Firehose는 자주 함께 쓰인다: KDS로 수집, 재읽기 가능하게 보존 → Firehose로 S3 적재.

## Amazon Managed Service for Apache Flink

실시간 스트림을 Apache Flink 기반으로 처리, 분석한다. 예전 Kinesis Data Analytics for SQL Applications는 중단되어 2026년 1월 27일부터 삭제 절차가 진행되므로 신규 설계에 쓰면 안 된다.

- Source: KDS, Firehose
- Sink: KDS, Firehose, Lambda 등 (다시 동일 소스로 보내 chain 가능)
- **Studio Notebook**으로 대화형 분석

## Kinesis vs Kafka vs SQS vs SNS

| 기준 | SQS | SNS | Kinesis Data Streams | Kafka |
|------|-----|-----|---------------------|-------|
| 모델 | Queue (Polling) | Pub-Sub (Push) | Real-time Streaming | Pub-Sub Streaming |
| 소비 후 메시지 | **Delete** (소비 후 제거) | Subscriber로 전송 후 종료 | **보존**(24h~365d), 다수 소비자 재읽기 | 보존(설정), 다수 컨슈머 재읽기 |
| 순서 보장 | Standard 미보장 / FIFO O | Standard 미보장 / FIFO O | **Partition Key 단위로 보장** | Partition 단위 보장 |
| 처리량 단위 | Standard 거의 무제한 / 일반 FIFO 파티션당 비배치 300 API TPS, 최대 10개 배치 시 초당 3,000개 메시지 / 고처리량 FIFO 리전별 API 할당량 | 리전별 quota(Standard) | **Shard 단위 1MB/s, 1,000 rec/s** | Partition 단위 |
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
- [Amazon SQS message quotas — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[SQS|SQS]]
- [[SNS|SNS]]
- [[MQ-Kafka|Kafka]]
- [[Messaging-Broker-Comparison|브로커 비교]]
- [[Delivery-Semantics|전달 보장]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Fan-Out-Architecture|Fan-out 아키텍처]]
