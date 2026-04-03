---
tags: [messaging, aws, sqs]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SQS", "Amazon SQS", "Simple Queue Service"]
---

# Amazon SQS (Simple Queue Service)

AWS 관리형 메시지 큐 서비스. 분산 시스템 간 비동기 통신의 가장 기본적인 빌딩 블록.

## Standard vs FIFO

| 항목 | Standard | FIFO |
|------|----------|------|
| 처리량 | 거의 무제한 | 기본 300 TPS, 배치 시 3,000 TPS |
| 순서 보장 | Best-effort (보장 안 됨) | MessageGroupId 단위 엄격한 FIFO |
| 메시지 전달 | At-least-once (중복 가능) | Exactly-once processing (5분 내 중복 제거) |
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
- `ChangeMessageVisibility` API로 처리 중 타임아웃 연장 가능 (하트비트 패턴)
- 설정 기준: 처리 평균 시간의 **6배** 정도. 너무 짧으면 정상 처리 중 재노출(불필요한 중복), 너무 길면 실패 후 재처리까지 대기가 김

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
- `maxReceiveCount` 설정: N번 수신 후에도 Delete되지 않으면 DLQ로 이동
- Source Queue와 DLQ는 같은 계정·같은 리전이어야 함
- Standard Queue의 DLQ는 Standard, FIFO의 DLQ는 FIFO

### Redrive (재처리)
- DLQ의 메시지를 원래 소스 큐로 되돌리는 기능
- 디버깅 후 수정된 로직으로 재처리할 때 활용

### 보존 기간 주의
- Standard Queue: DLQ 이동 시 **원래 enqueue 타임스탬프 유지** → DLQ 보존 기간을 소스 큐보다 길게 설정 필수
- FIFO Queue: DLQ 이동 시 타임스탬프가 리셋됨

## FIFO 중복 제거

- **5분 중복 제거 간격**: 같은 ID로 5분 내 재전송하면 무시
- 두 가지 방식:
  1. **MessageDeduplicationId**: 직접 고유 ID 지정
  2. **Content-based deduplication**: 메시지 본문의 SHA-256 해시로 자동 판단
- **MessageGroupId**: 같은 그룹 내에서만 순서 보장, 다른 그룹은 병렬 처리 가능

## 소비자 패턴

### Lambda Event Source Mapping
- Lambda가 SQS를 직접 폴링 (별도 폴링 코드 불필요)
- 처리 성공 시 자동 삭제, 실패 시 다시 visible
- `ReportBatchItemFailures`로 실패한 메시지만 재처리 가능 (Partial Batch Response)
- 적합: 단순 처리, 15분 이내 완료되는 작업

### ECS 워커 폴링
- Long Polling으로 직접 폴링 구현
- 도메인 로직(Prisma, NestJS 등) 재사용 가능
- DB 커넥션 풀 유지 가능 (Lambda와 달리 cold start 없음)
- 적합: 장시간 처리, 단일 코드베이스 유지가 중요할 때

### 오토스케일링 기준
- 핵심 메트릭: `ApproximateNumberOfMessagesVisible` / 현재 인스턴스 수 = **Backlog per Instance**
- Target Tracking Policy로 인스턴스당 백로그 목표값 설정
- `ApproximateAgeOfOldestMessage`로 처리 지연 감지 알림도 설정

## 운영

| 항목 | 값 |
|------|-----|
| 메시지 크기 | 최대 **256KB** (대용량은 S3 + Extended Client Library) |
| 보존 기간 | 기본 4일, 최대 14일 |
| 배치 | Send/Receive/Delete 각 최대 **10개** |
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
- 64KB 단위로 청구 (256KB 메시지 = 4건)
- 같은 리전 내 AWS 서비스 간 데이터 전송 무료

## 관련 문서
- [[EventBridge|EventBridge]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Idempotency-Key|멱등성 키]]
