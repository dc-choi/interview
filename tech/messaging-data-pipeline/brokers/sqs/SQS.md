---
tags: [messaging, aws, sqs, decoupling, saa-c03]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SQS", "Amazon SQS", "Simple Queue Service"]
---

# Amazon SQS (Simple Queue Service)

AWS 관리형 메시지 큐 서비스. 분산 시스템 간 비동기 통신의 가장 기본적인 빌딩 블록. **Polling 기반**의 Queue 모델로, AWS Decoupling 서비스 3종(SQS=Queue / SNS=Pub-Sub / Kinesis=Real-time Streaming) 중 가장 단순한 모델. 2006년 출시된 AWS 초창기 서비스.

## 목차

- [[SQS-Lambda-ESM|SQS → Lambda 폴링 (ESM 스케일링, 가짜 DLQ, concurrency)]]
- [[SQS-Consumer-Lambda-vs-ECS|컨슈머 선택: Lambda vs ECS 워커]]

## Decoupling — 왜 필요한가

생산자와 소비자의 처리 스펙(처리 속도와 가용성)이 다르면 직접 동기 통신 시 메시지가 유실될 수 있다. 사이에 Queue를 두면:
- 생산자는 소비자 가용성과 무관하게 메시지를 큐에 적재
- 소비자는 자기 속도로 Pull → 백프레셔 흡수
- 한쪽 장애가 다른 쪽으로 전파되지 않음 (시간, 공간 분리)

## Standard vs FIFO

| 항목 | Standard | FIFO |
|------|----------|------|
| 처리량 | 거의 무제한 | 기본은 API action 300 TPS, 배치 시 3,000 messages/s. High throughput FIFO는 리전별 한도가 더 높으므로 Service Quotas 확인 |
| 순서 보장 | Best-effort (보장 안 됨) | MessageGroupId 단위 엄격한 FIFO |
| 메시지 전달 | At-least-once (중복 가능) | 5분 deduplication window 안의 중복 enqueue 제거. 소비자 처리 자체는 실패, 재시도 때문에 멱등성이 필요 |
| 큐 이름 | 제한 없음 | `.fifo` 접미사 필수 |
| 적합 | 대부분의 비동기 작업 | 순서가 중요한 작업 (결제, 상태 변경) |

## 메시지 생명주기

```
Producer → Send → [큐에 분산 저장]
                     ↓
Consumer ← Receive ← [Visibility Timeout 시작]
                     ↓
              Process → Delete (성공 시)
                     ↓
              Visibility Timeout 만료 → 다시 visible (실패 시)
                     ↓
              maxReceiveCount 초과 → DLQ로 이동
```

## Visibility Timeout

- 메시지 수신 시 시작, 이 시간 동안 다른 Consumer에게 보이지 않음
- 기본: **30초**, 최대: **12시간**
- 시간 내 Delete하지 않으면 다시 visible → 다른 Consumer가 재처리
- `ChangeMessageVisibility` API로 처리 중 타임아웃 연장 가능 (하트비트 패턴). 이때 `VisibilityTimeout`은 **호출 시점 기준으로 새로 설정**된다 (수신 시점 누적이 아님)
- 설정 기준: 처리 평균 시간의 **6배** 정도. 너무 짧으면 정상 처리 중 재노출(불필요한 중복), 너무 길면 실패 후 재처리까지 대기가 김
- **in-flight 한도 함정**: 처리 중 메시지가 한도(Standard 약 120,000, FIFO 약 20,000)에 차면 큐에 메시지가 있어도 `ReceiveMessage`가 빈 응답을 준다. Consumer가 느리거나 멈춰 삭제가 밀릴 때 발생 — 장애 디버깅에서 놓치기 쉬움

## Long Polling vs Short Polling

| 항목 | Short Polling | Long Polling |
|------|---------------|--------------|
| WaitTimeSeconds | 0 (기본값) | 1~20초 |
| 동작 | 서버 일부만 조회, 즉시 응답 | 모든 서버 조회, 메시지 있을 때까지 대기 |
| 빈 응답 | 자주 발생 | 거의 없음 |
| 비용 | 높음 (불필요한 API 호출) | 낮음 |

- **Long Polling 권장**. 빈 응답을 줄여 비용 절감 + 메시지 수신 지연 감소

## DLQ (Dead Letter Queue)

### Redrive Policy
- `maxReceiveCount` 설정: N번 수신 후에도 Delete되지 않으면 DLQ로 이동 → **poison pill(무조건 실패하는 메시지) 격리**로 큐 막힘 방지. 보통 **3~5**로 시작 (너무 낮으면 일시 오류에도 멀쩡한 메시지가 DLQ로, 너무 높으면 poison pill 과다 재시도)
- Source Queue와 DLQ는 같은 계정과 같은 리전이어야 함
- Standard Queue의 DLQ는 Standard, FIFO의 DLQ는 FIFO

### Redrive (재처리)
- DLQ의 메시지를 원래 소스 큐로 되돌리는 기능 (콘솔 Start DLQ redrive 또는 `StartMessageMoveTask` API — 과거엔 직접 코드로 옮겨야 했음)
- 디버깅 후 수정된 로직으로 재처리할 때 활용

### 보존 기간 주의
- Standard Queue: DLQ 이동 시 **원래 enqueue 타임스탬프 유지** → DLQ 보존 기간을 소스 큐보다 길게 설정 필수
- FIFO Queue: DLQ 이동 시 타임스탬프가 리셋됨

## FIFO 중복 제거

- **5분 중복 제거 간격**: 같은 ID로 5분 내 재전송하면 무시
- 두 가지 방식:
  1. **MessageDeduplicationId**: 직접 고유 ID 지정
  2. **Content-based deduplication**: 메시지 본문의 SHA-256 해시로 자동 판단
- **MessageGroupId**: 같은 그룹 내에서만 순서 보장, 다른 그룹은 병렬 처리. 즉 **순서의 단위이자 병렬성의 단위** — 전체를 엄격히 순서 보장하려 그룹 하나만 쓰면 병렬성 0으로 느려지고, 엔티티별(주문 ID 등)로 쪼개면 엔티티 간 병렬 + 엔티티 내 순서가 정답
- **Head-of-line blocking**: 한 그룹의 앞 메시지가 막히면 같은 그룹 뒤 메시지가 전부 대기 → 그룹을 잘게 쪼개는 또 하나의 이유 (Lambda FIFO 폴링 동시성도 활성 그룹 수에 묶임, [[SQS-Lambda-ESM]])

## 소비자 패턴

### 멱등성 (모든 컨슈머의 전제)
Standard 큐의 at-least-once는 버그가 아니라 설계다 — 내구성을 위해 메시지를 여러 서버에 분산 복제하고, Receive 시 그 서버들을 샘플링하다 Delete 전파가 덜 된 서버가 메시지를 또 내주면 중복이 생긴다. 따라서 컨슈머는 **무조건 멱등**해야 한다. 비즈니스 키에 unique 제약을 걸고 INSERT 실패를 잡거나(또는 Redis `SET key val NX EX`), 같은 메시지가 두 번 와도 결과가 한 번과 같게 만든다 (→ [[Idempotency-Key]]).

### Lambda Event Source Mapping
- Lambda가 SQS를 직접 폴링 (별도 폴링 코드 불필요)
- 처리 성공 시 자동 삭제, 실패 시 다시 visible
- `ReportBatchItemFailures`로 실패한 메시지만 재처리 가능 (Partial Batch Response)
- 적합: 단순 처리, 15분 이내 완료되는 작업
- 폴러 스케일링, throttling발 가짜 DLQ 함정, max vs reserved concurrency, Provisioned Mode는 → [[SQS-Lambda-ESM|SQS → Lambda 폴링 (ESM)]]

### ECS 워커 폴링
- Long Polling으로 직접 폴링 구현
- 도메인 로직(Prisma, NestJS 등) 재사용 가능
- DB 커넥션 풀 유지 가능 (Lambda와 달리 cold start 없음)
- 적합: 장시간 처리, 단일 코드베이스 유지가 중요할 때
- 축별 트레이드오프와 NestJS 워커 골격(graceful shutdown)은 → [[SQS-Consumer-Lambda-vs-ECS|컨슈머 선택: Lambda vs ECS]]

### 오토스케일링 기준
- 핵심 메트릭: `ApproximateNumberOfMessagesVisible` / 현재 인스턴스 수 = **Backlog per Instance**
- Target Tracking Policy로 인스턴스당 백로그 목표값 설정
- `ApproximateAgeOfOldestMessage`로 처리 지연 감지 알림도 설정

## 운영

| 항목 | 값 |
|------|-----|
| 메시지 크기 | 최대 **1 MiB**. 더 큰 payload는 S3 + Extended Client Library 패턴 |
| 보존 기간 | 기본 4일, 최대 14일 |
| 배치 | Send/Receive/Delete 각 최대 **10개** (부분 실패 가능 → 응답 `Failed[]` 확인 필수) |
| In-flight 제한 | Standard: 120,000개, FIFO: 20,000개 |

### 주요 CloudWatch 메트릭

| 메트릭 | 용도 |
|--------|------|
| `ApproximateNumberOfMessagesVisible` | 큐 백로그, 오토스케일링 기준 |
| `ApproximateNumberOfMessagesNotVisible` | 처리 중(in-flight) 상태 파악 |
| `ApproximateAgeOfOldestMessage` | 처리 지연 감지 |
| `NumberOfEmptyReceives` | 폴링 빈도 튜닝 (비용 최적화) |

### 비용
- **Free Tier**: 매월 100만 요청 무료
- Standard: ~$0.40 / 100만 요청
- FIFO: ~$0.50 / 100만 요청
- 64KB 단위로 청구 (1 MiB 메시지 = 16건)
- 같은 리전 내 AWS 서비스 간 데이터 전송 무료

## 보안, 암호화

| 계층 | 수단 |
|------|------|
| **전송 중(in-transit)** | HTTPS API — 모든 요청이 TLS로 암호화 |
| **저장 시(at-rest)** | KMS Key로 큐 메시지 SSE 암호화 (SSE-SQS 또는 SSE-KMS) |
| **접근 제어** | IAM Policy로 SQS API 호출 권한 통제, Queue Policy(Resource-based)로 cross-account 허용 |

## 시험 체크포인트 (SAA-C03)

- AWS Decoupling 3종 = SQS(Queue) / SNS(Pub-Sub) / Kinesis(Real-time Streaming) — 모델 차이로 구분
- **Polling 기반** vs SNS의 **Push 기반** 대비
- Standard: 무제한 처리량 + at-least-once + 순서 미보장 / FIFO: MessageGroupId 단위 순서 + deduplication window + 처리량은 일반 FIFO와 High throughput FIFO 한도 구분
- 메시지 크기 1 MiB, 보존 4~14일(기본 4일), 가시성 타임아웃 기본 30초에서 최대 12시간
- 처리 지연 시 `ChangeMessageVisibility`로 가시성 연장 → 중복 소비 방지
- Long Polling 최대 20초 — 빈 응답, API 호출 비용 감소
- DLQ 보존 기간은 소스 큐보다 길게 (Standard는 enqueue 타임스탬프 유지)
- KMS로 저장 시 암호화, HTTPS로 전송 중 암호화, IAM Policy로 API 접근 통제

## 출처
- [채널톡 — AWS SQS 도입기](https://channel.io/ko/blog/tech-backend-aws-sqs-introduction)
- [SK DEVOCEAN — SQS 연재 (소개, Terraform, Spring JMS, Spring Cloud)](https://devocean.sk.com/experts/techBoardDetail.do?ID=163294)
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[EventBridge|EventBridge]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Idempotency-Key|멱등성 키]]
- [[Idempotent-Consumer|멱등 컨슈머 (at-least-once 중복 처리 방어)]]
