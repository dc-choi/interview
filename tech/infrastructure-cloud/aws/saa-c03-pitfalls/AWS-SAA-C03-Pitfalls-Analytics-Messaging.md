---
tags: [infrastructure, aws, saa-c03, certification, pitfalls, analytics, messaging]
status: done
category: "Infrastructure - AWS"
aliases: ["분석과 메시징 함정", "SAA-C03 Pitfalls Analytics Messaging"]
verified_at: 2026-07-21
---

# AWS SAA-C03 빈출 함정 — 분석과 메시징

> 상위 TOC: [[AWS-SAA-C03-Pitfalls]] | 자매: [[AWS-SAA-C03-Exam-Summary]]

## 분석

### Athena, Glue, EMR

- **Athena**
  - SQL 쿼리는 일반적으로 스캔한 데이터 양을 기준으로 과금하지만 단가와 최소 과금 단위는 리전, 용량 예약, 데이터 소스에 따라 확인한다. 컬럼형 포맷과 압축으로 스캔량을 줄일 수 있다.
  - 권장 파일 형식: **Parquet, ORC** 같은 컬럼형 포맷. Avro, JSON, CSV도 요구에 따라 사용
  - 반복 쿼리의 스캔 범위를 줄일 수 있으면 파티셔닝을 적용한다. 모든 테이블의 필수 조건은 아니다.
  - **Federated Query**: Lambda 커넥터로 온프레 DB, 기타 DB 쿼리
- **Glue**
  - **Crawler**: 스키마 자동 추론 → **Data Catalog**(Athena, Spectrum, EMR 공용)
  - **Job Bookmarks**: 처리한 데이터 추적, 중복 처리 방지
  - **Glue Studio**(시각 ETL), **DataBrew**(노코드 변환)
  - Spark 기반. 서버리스 = 인프라 관리 없음
- **EMR**
  - **Primary / Core / Task** 노드. 재실행 가능한 Task 부하는 Spot을 검토할 수 있지만 중단을 견디지 못하면 On-Demand를 사용한다.
  - **EMR Serverless**: 클러스터 관리 없음
  - Glue보다 더 깊은 커스터마이즈 가능 (Hadoop, HBase, Presto, Flink)

### Kinesis

- **Data Streams** vs **Data Firehose** vs **Video Streams** vs **Managed Service for Apache Flink**
  | 서비스 | 보존 | 용도 |
  |---|---|---|
  | Data Streams | 1-365일 | 실시간, 재처리 |
  | Data Firehose | 보존 X (버퍼 후 전송) | S3, Redshift, OpenSearch 적재 |
  | Video Streams | 1시간-10년 | 비디오 분석 |
  | Managed Service for Apache Flink | - | Flink 기반 스트림 처리 |
- **샤드 처리량**: 인 1MB/s, 1000레코드, 아웃 2MB/s. **Enhanced Fan-out**: 소비자당 2MB/s(여러 컨슈머)
- **리샤딩**: 분할, 병합. **샤드 수는 마법 숫자 아님** — 핫 파티션 키가 더 중요
- **Producer**: KPL(배치, 집계), KCL(소비자 라이브러리, DDB로 체크포인트)
- **Firehose 버퍼링 힌트**: API의 일반 범위는 크기 1~128 MiB, 시간 0~900초이며 기본값은 5 MiB, 300초다. 실제 허용값과 동작은 대상별로 다르고 힌트와 정확히 일치하지 않을 수 있다.
- **Firehose는 관리형 전달 서비스**로 대상과 버퍼 설정에 따라 지연이 생긴다. 레코드 단위의 낮은 지연 처리와 직접 소비가 필요하면 Data Streams를 검토한다.

---

## 메시징과 통합

### SQS, SNS, EventBridge, MQ

- **SQS Standard** vs **FIFO**
  | 항목 | Standard | FIFO |
  |---|---|---|
  | 순서 | 최선 노력 | 그룹 내 보장 |
  | 중복 | 가능 (적어도 1회) | 중복 제거(5분) |
  | 처리량 | 매우 높은 처리량을 지원하지만 in-flight, API와 계정, 리전 할당량 적용 | FIFO 처리량은 모드, 리전, 파티션과 배치 여부에 따라 현재 할당량 확인 |
  | 이름 | 무관 | `.fifo` 접미사 필수 |
- **Visibility Timeout** 기본 30초, 최대 12시간. 너무 짧으면 중복 처리, 길면 실패 메시지 묶임
- **Long Polling**(0-20초): 빈 응답 줄여 비용 절감. 기본은 short polling
- **메시지 보존**: 1분~14일 (기본 4일)
- **DLQ**: maxReceiveCount 초과 시 이동. **DLQ도 같은 종류**(Standard↔Standard, FIFO↔FIFO)
- **SQS Delay Queue**: 0-15분 지연. 메시지별 지연은 **DelaySeconds**(파라미터)
- **SNS Fan-out**: SNS → 다수 SQS. **둘 다 FIFO 가능**(2020년 후)
- **SNS 필터 정책**: 구독자별 메시지 속성 매칭
- **EventBridge** vs **CloudWatch Events**: EventBridge가 후속(슈퍼셋). 시험에서는 EventBridge로 답
- **EventBridge Scheduler**: cron, rate, 일회성 일정으로 대상을 호출한다. 한 번의 작업이 Lambda 실행 제한을 넘으면 Step Functions로 작업을 나누거나 Fargate, Batch 같은 장기 실행 컴퓨팅을 사용한다. Step Functions가 한 Lambda 호출의 실행 제한을 늘리지는 않는다.
- **EventBridge 스키마 레지스트리**: 이벤트 스키마 자동 추론
- **Amazon MQ** vs **SQS/SNS**: 기존 브로커 프로토콜과 클라이언트 호환이 필요하면 엔진별 지원 프로토콜을 확인해 MQ를 검토한다. AWS 네이티브 큐와 팬아웃이면 SQS, SNS가 단순할 수 있다.
- **SWF** vs **Step Functions**: 새 워크플로에는 관리형 상태 머신인 Step Functions를 우선 비교하되, 기존 SWF 호환성과 장기 실행 활동 요구가 있으면 별도로 판단한다.
- **AppSync**: GraphQL 매니지드. Pipeline Resolver로 다단계 데이터 소스

## 관련 문서

[[Athena]], [[Glue]], [[EMR]], [[OpenSearch-Service|OpenSearch]], [[QuickSight]], [[Lake-Formation]], [[Kinesis]], [[SQS]], [[SNS]], [[Amazon-MQ]], [[EventBridge]]

## 출처

- [Amazon Data Firehose BufferingHints](https://docs.aws.amazon.com/firehose/latest/APIReference/API_BufferingHints.html)
- [Amazon SQS 할당량](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
