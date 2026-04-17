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

## 3계층 이벤트 전파 구조

실무에서는 이벤트를 **수명·범위가 다른 3개 층**으로 분리하는 경우가 많다.

| 계층 | 수명 | 수단 | 용도 |
|---|---|---|---|
| **Application Event** | 트랜잭션 내·프로세스 내 | Spring `ApplicationEvent`·`@TransactionalEventListener` | 도메인 내 비관심사 분리 (감사 로그·메트릭) |
| **Internal Event** | 서비스 내부 | Outbox → SNS·SQS·Kafka | 한 컨텍스트 내 비동기 처리 |
| **External Event** | 서비스 간 공개 | Outbox → Kafka (일반화된 스키마) | 다른 서비스·팀에 공개 |

분리의 이유:
- **스키마 안정성**: 외부 이벤트는 한 번 공개하면 바꾸기 어려움 → 내부에서만 쓸 정보가 외부로 새지 않게 경계
- **성능·비용 분리**: 모든 이벤트를 외부 브로커로 내보내면 비용·지연 증가
- **Backward Compatibility**: 외부 이벤트는 의도적으로 **안정된 추상 형태**로 정의

## 이벤트 설계 — 목적이 아닌 사실을 발행

이벤트 이름은 **"무엇을 해달라"** (명령)가 아니라 **"무엇이 일어났다"** (사실)가 되어야 한다.

- 나쁜 예: `FamilyAccountUnlinkCommand` ("가족계정 해제해줘") — 발행자가 구독자의 행동을 지시
- 좋은 예: `IdentityVerificationRevoked` ("본인인증이 해제됐다") — 사실만 알리고, 구독자가 각자 대응 결정

사실 기반 이벤트는 **새 구독자가 추가될 때 발행자 수정 불필요** → 느슨한 결합 유지.

## Zero Payload 전략 — 순서 문제의 실용 해법

분산 환경에서 이벤트는 **순서가 뒤바뀌어 도착**할 수 있다 (네트워크 재시도·파티션 리밸런싱). 순서를 완전히 보장하기 어렵다면:

- 이벤트 페이로드에 **전체 상태를 담지 않고 식별자만** 싣는다
- Consumer는 식별자로 **Source of Truth를 다시 조회** → 항상 최신 상태
- 스키마 변경에도 유연 (페이로드가 최소하므로 호환성 이슈 감소)

트레이드오프: 조회 1회 추가. 하지만 **순서 보장·스키마 안정성**이 그만한 가치.

## Event Store

Outbox 테이블을 단순 발행 대기열이 아닌 **모든 이벤트의 영구 저장소**로 확장하면 추가 이점.

- 발행 실패 시 배치로 재발행
- 엔티티 활동 추적 (감사·분석)
- 과거 이벤트 리플레이로 새 Read Model 구축 (CQRS 보조)
- 기록 테이블 통합 → DB 스키마 단순화

Event Sourcing은 더 나아가 **상태 자체를 이벤트 스트림으로만 관리**하지만, Event Store + Outbox는 상태도 유지하면서 감사·복구 능력을 얻는 **중간 지점**.

## 출처
- [우아한형제들 — 회원시스템 이벤트기반 아키텍처 구축하기](https://techblog.woowahan.com/7835/)
- [우아한형제들 — 배민스토어에 이벤트 기반 아키텍처를 곁들인](https://techblog.woowahan.com/13101/)

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Idempotency-Key|멱등성 키]]
- [[Messaging-Patterns|메시징 패턴]]
- [[MQ-Kafka|Kafka]]
