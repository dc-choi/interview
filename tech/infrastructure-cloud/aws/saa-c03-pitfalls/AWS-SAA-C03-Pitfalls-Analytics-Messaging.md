---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, analytics, messaging]
status: done
category: "Infrastructure - AWS"
aliases: ["분석과 메시징 함정", "SAA-C03 Pitfalls Analytics Messaging"]
---

# AWS SAA-C03 빈출 함정 — 분석과 메시징

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

## 분석

### Athena, Glue, EMR

- **Athena**
  - 과금: **스캔한 데이터 TB당 $5**. 컬럼나와 압축으로 절감
  - 권장 파일 형식: **Parquet, ORC**(컬럼나) > Avro, JSON, CSV
  - 파티셔닝 필수 (s3://bucket/year=/month=/day=)
  - **Federated Query**: Lambda 커넥터로 온프레 DB, 기타 DB 쿼리
- **Glue**
  - **Crawler**: 스키마 자동 추론 → **Data Catalog**(Athena, Spectrum, EMR 공용)
  - **Job Bookmarks**: 처리한 데이터 추적, 중복 처리 방지
  - **Glue Studio**(시각 ETL), **DataBrew**(노코드 변환)
  - Spark 기반. 서버리스 = 인프라 관리 없음
- **EMR**
  - **Master / Core / Task** 노드. Task는 **Spot 권장**(저렴)
  - **EMR Serverless**: 클러스터 관리 없음
  - Glue보다 더 깊은 커스터마이즈 가능 (Hadoop, HBase, Presto, Flink)

### Kinesis

- **Data Streams** vs **Firehose** vs **Video Streams** vs **Data Analytics(Flink)**
  | 서비스 | 보존 | 용도 |
  |---|---|---|
  | Data Streams | 1-365일 | 실시간, 재처리 |
  | Firehose | 보존 X (즉시 전송) | S3, Redshift, OpenSearch 적재 |
  | Video Streams | 1시간-10년 | 비디오 분석 |
  | Data Analytics | - | SQL, Flink 분석 |
- **샤드 처리량**: 인 1MB/s, 1000레코드, 아웃 2MB/s. **Enhanced Fan-out**: 소비자당 2MB/s(여러 컨슈머)
- **리샤딩**: 분할, 병합. **샤드 수는 마법 숫자 아님** — 핫 파티션 키가 더 중요
- **Producer**: KPL(배치, 집계), KCL(소비자 라이브러리, DDB로 체크포인트)
- **Firehose 버퍼링**: 크기(1-128MB), 시간(60-900초). 무서버
- **Firehose는 실시간 아님** — 최소 60초 버퍼링. 진짜 실시간 → Data Streams

---

## 메시징과 통합

### SQS, SNS, EventBridge, MQ

- **SQS Standard** vs **FIFO**
  | 항목 | Standard | FIFO |
  |---|---|---|
  | 순서 | 최선 노력 | 그룹 내 보장 |
  | 중복 | 가능 (적어도 1회) | 중복 제거(5분) |
  | 처리량 | 무제한 | 3000/s(배치) 또는 300/s |
  | 이름 | 무관 | `.fifo` 접미사 필수 |
- **Visibility Timeout** 기본 30초, 최대 12시간. 너무 짧으면 중복 처리, 길면 실패 메시지 묶임
- **Long Polling**(0-20초): 빈 응답 줄여 비용 절감. 기본은 short polling
- **메시지 보존**: 1분~14일 (기본 4일)
- **DLQ**: maxReceiveCount 초과 시 이동. **DLQ도 같은 종류**(Standard↔Standard, FIFO↔FIFO)
- **SQS Delay Queue**: 0-15분 지연. 메시지별 지연은 **DelaySeconds**(파라미터)
- **SNS Fan-out**: SNS → 다수 SQS. **둘 다 FIFO 가능**(2020년 후)
- **SNS 필터 정책**: 구독자별 메시지 속성 매칭
- **EventBridge** vs **CloudWatch Events**: EventBridge가 후속(슈퍼셋). 시험에서는 EventBridge로 답
- **EventBridge Scheduler**: 1분~연 단위 cron. **Lambda 호출 한도 15분 초과** 시나리오 → Scheduler + Lambda는 안 됨(Step Functions, Fargate)
- **EventBridge 스키마 레지스트리**: 이벤트 스키마 자동 추론
- **Amazon MQ** vs **SQS/SNS**: AMQP/MQTT/STOMP 표준 프로토콜 → MQ. **MQ는 확장성 제한** — 신규 시스템은 SQS/SNS
- **SWF** vs **Step Functions**: 신규는 Step Functions. SWF는 레거시(데몬, 시그널 필요)
- **AppSync**: GraphQL 매니지드. Pipeline Resolver로 다단계 데이터 소스

## 관련 문서

[[Athena]], [[Glue]], [[EMR]], [[OpenSearch-Service|OpenSearch]], [[QuickSight]], [[Lake-Formation]], [[Kinesis]], [[SQS]], [[SNS]], [[Amazon-MQ]], [[EventBridge]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
