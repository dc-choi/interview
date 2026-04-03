---
tags: [messaging, reliability, pattern]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Transactional Outbox", "Outbox Pattern", "트랜잭셔널 아웃박스"]
---

# Transactional Outbox Pattern

DB 쓰기와 메시지 발행을 **원자적으로 보장**하는 패턴. 이벤트 기반 아키텍처에서 생산자 측 신뢰성을 확보하는 핵심 패턴이다.

## 문제: Dual Write Problem

DB와 메시지 큐는 서로 다른 시스템이므로 하나의 트랜잭션으로 묶을 수 없다.

```
발주 API:
  1) DB에 발주 저장     ← 성공
  2) EventBridge에 이벤트 발행  ← 여기서 crash하면?
```

- 1)은 성공했지만 2)가 실행되지 않음 → 이벤트 유실 → 후속 처리(수주, 알림)가 영원히 실행되지 않음
- 반대로 2)를 먼저 하면, 이벤트는 발행됐는데 DB 저장이 실패할 수 있음

## 해결: Outbox 테이블

```
[하나의 DB 트랜잭션]
  1) 비즈니스 데이터 INSERT (발주 테이블)
  2) outbox 테이블에 이벤트 INSERT  ← 같은 트랜잭션이므로 원자적

[별도 Relay 프로세스]
  3) outbox 테이블 폴링 (WHERE processed_at IS NULL)
  4) 메시지 큐(EventBridge/SQS/Pub/Sub)에 발행
  5) 발행 성공 시 processed_at 마킹
```

### 왜 되는가
- 비즈니스 데이터와 이벤트 기록이 **같은 DB 트랜잭션** → 둘 다 성공하거나 둘 다 실패
- Relay가 crash해도 outbox에 레코드가 남아 있으므로 재시작 후 재발행
- at-least-once 발행 보장 → 소비자 측 [[Idempotency-Key|멱등성]]과 짝을 이루어 end-to-end 신뢰성

### Outbox 테이블 설계

```sql
CREATE TABLE outbox (
  id              BIGSERIAL PRIMARY KEY,
  aggregate_type  VARCHAR(50),    -- 'ORDER'
  aggregate_id    VARCHAR(50),    -- 발주 ID
  event_type      VARCHAR(100),   -- 'ORDER_CREATED'
  payload         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ NULL  -- NULL이면 미발행
);
```

## Relay 구현 방식

| 방식 | 장점 | 단점 | 적합한 규모 |
|------|------|------|------------|
| **Polling** | 구현 단순, 별도 인프라 불필요 | 폴링 간격만큼 지연 | 월 수십만 건 이하 |
| **CDC (Change Data Capture)** | 실시간, 지연 최소 | Debezium+Kafka Connect 등 인프라 복잡도 | 대규모 이벤트 처리 |

### Polling 방식
- 주기적으로 `WHERE processed_at IS NULL` 조회 → 발행 → 마킹
- NestJS `@Cron('*/5 * * * * *')`로 5초 간격 구현 가능
- 단일 코드베이스에서 바로 구현할 수 있어 소규모 팀에 적합

### CDC 방식
- Debezium이 DB WAL(Write-Ahead Log)을 읽어 outbox 테이블 변경을 감지
- 변경 즉시 Kafka로 발행 → 거의 실시간
- 애플리케이션 코드 수정 없이 동작하지만 인프라 운영 부담 증가

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key|멱등성 키]]
- [[Messaging-Patterns|메시징 패턴]]
- [[MQ-Kafka|Kafka]]
