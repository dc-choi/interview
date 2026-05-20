---
tags: [architecture, messaging, event-driven, overview]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Event-Driven Architecture", "EDA", "이벤트 기반 아키텍처", "EDA Overview", "Event-Driven", "이벤트 드리븐"]
---

# Event-Driven Architecture (EDA) — 결정 프레임워크

이벤트 기반 아키텍처는 단일 패턴이 아니라 **층층이 쌓이는 결정의 묶음**이다. 어디까지 들어갈지가 도메인·팀 규모·운영 부담에 따라 다르고, 각 층마다 별도 트레이드오프가 있다. 이 문서는 인접 패턴들이 어떤 층을 담당하는지, 어떻게 연결되는지를 정리한다.

## 핵심 트레이드오프 3축

```
신뢰성 (at-least-once·idempotent) × 결합도 (사실 이벤트·Zero Payload) × 일관성 (즉시 → 최종)
```

- 더 신뢰성 있게 = 더 많은 인프라 부담
- 더 느슨한 결합 = 새 구독자 추가 자유 + 즉시 일관성 포기
- 더 강한 일관성 = 분산의 이점 일부 포기

도메인이 셋 중 어디를 우선하는지가 EDA 깊이를 결정한다.

## 8개 결정 층

### 층 1: 이벤트 기반인가? (들어갈지 결정)

| 동기 호출 | 이벤트 기반 |
|---|---|
| 호출자가 수신자 다 알아야 | 발행자는 수신자 모름 |
| 한 곳 실패 = 전체 실패 | 한 곳 실패 격리 가능 |
| 즉시 일관성 ✅ | **최종 일관성** |
| 확장 어려움 | 새 구독자 추가 자유 |

**결정 기준**: 도메인이 최종 일관성을 받아들일 수 있나? UI/UX가 "방금 한 작업이 즉시 반영" 가정으로 설계되어 있나?

### 층 2: 발행자 신뢰성 (Producer-Side Reliability)

**문제 — Dual Write**: DB와 브로커는 별개 시스템. 둘 중 하나 실패 시 정합성 깨짐.
- DB ✅ + 발행 ❌ = 이벤트 유실 (후속 처리 영원히 안 됨)
- 발행 ✅ + DB ❌ = 유령 이벤트 (수신자가 없는 데이터 기다림)

**해결**:
- [[Transactional-Outbox]] — DB 트랜잭션 안에 outbox INSERT → Relay가 폴링/CDC로 발행
- [[CDC&Outbox]] — Debezium이 WAL 읽어 발행 (대규모)

**결과**: at-least-once 보장.

### 층 3: 소비자 신뢰성 (Consumer-Side Reliability)

**문제**: at-least-once는 중복 수신 발생. 같은 이벤트 두 번 처리하면 결제 두 번·메일 두 번.

**해결**:
- [[Idempotency-Key]] — 메시지 ID·비즈니스 키로 중복 제거
- **DLQ (Dead Letter Queue)** — 최종 실패 메시지 격리, 수동 확인
- **Visibility Timeout + 재시도** — 처리 중 crash 시 자동 재전달

**결과**: 중복 처리해도 결과 같음. 최종 실패는 격리.

### 층 4: 이벤트의 본질 (What is an Event?)

**문제**: 명령형 이벤트는 발행자가 수신자 행동을 지시 → 결합도 다시 올라감.
- `ProcessOrderCommand` ❌ — 발행자가 "이거 해라" 지시
- `OrderPlaced` ✅ — 발행자는 사실만 알리고, 수신자가 자기 대응 결정

**해결**:
- **사실 기반 이벤트** — 동사 과거형 (`OrderPlaced`·`PaymentReceived`·`ProductRecycled`)
- **Zero Payload 전략** — ID만 발행, Consumer가 Source of Truth 재조회
  - 트레이드오프: 조회 1회 추가
  - 이점: 순서 무관·스키마 안정·항상 최신 상태

**결과**: 새 구독자 추가 시 발행자 수정 X. 결합도 진짜 낮아짐.

### 층 5: 순서·중복·일관성 (Ordering)

**문제**: 분산 환경에서 이벤트 순서 뒤바뀜 (네트워크 재시도·파티션 리밸런싱·다중 워커).

**해결**:
- **FIFO + MessageGroupId** — 특정 키 단위 순서 보장 (SQS FIFO·Kafka 파티션 키). 처리량은 그룹별 병렬
- **Zero Payload** — 순서 무의미하게 만듦 (최신 상태 재조회)
- **idempotent processing** — 같은 키 재처리해도 동일 결과

**결정**: 진짜 순서가 필요한가? 대부분의 경우 Zero Payload + idempotent로 우회 가능.

### 층 6: 분산 트랜잭션 (Distributed Transactions)

**문제**: 한 비즈니스 작업이 여러 서비스 걸침. 2PC는 코디네이터 장애·블로킹·성능 이슈.

**해결**:
- [[Saga-Pattern]] — 보상 트랜잭션
  - **Choreography**: 각 서비스가 이벤트 듣고 자기 단계 (단계 적을 때)
  - **Orchestration**: 중앙 코디네이터가 호출 순서 통제 (복잡할 때)

**적용 결정**: 단일 서비스 안에서 풀 수 있으면 안 씀. 진짜 분산이면 Saga + 보상.

### 층 7: 이벤트 보관·재처리 (Persistence & Replay)

**문제**: 이벤트가 발행되고 사라지면 — 감사 추적·재해 복구·새 구독자 추가가 어려움.

**해결 (depth 순서)**:

| 패턴 | 무엇을 저장 | 상태 모델 | 적용 비용 |
|---|---|---|---|
| **Outbox만** | 발행 대기 이벤트 (발행 후 삭제 가능) | 기존 상태 테이블 그대로 | 낮음 |
| **Event Store + 상태 혼합** | 모든 이벤트 영구 + 별도 상태 테이블 | 둘 다 유지 (중간 지점) | 중간 |
| [[Event-Sourcing]] | 영속 이벤트만 (상태는 도출) | 상태 = replay 결과 | 높음 |

CQRS와의 결합:
- **CQRS (Command Query Responsibility Segregation)** = 쓰기/읽기 모델 분리
- Event Sourcing은 거의 항상 CQRS와 함께 — Command는 Event Store에 append, Query는 Projection이 만든 Read Model 조회

### 층 8: 운영·관측 (Operations, Observability)

- **DLQ 모니터링** — 최종 실패 추적·알림
- **메시지 lag** — 소비자 처리 지연 추적 (Kafka consumer lag·SQS 큐 depth)
- **이벤트 스키마 진화** — Upcaster 패턴 (v1→v2 변환 레이어), `event_type` + `version` 필드 처음부터
- **재해 복구** — Read Model 통째 rebuild 시나리오·시간 사전 측정
- **분산 트레이싱** — TraceId를 이벤트 페이로드 또는 헤더에 전파
- **3계층 이벤트 전파**:
  - Application Event — `@TransactionalEventListener` (도메인 내 비관심사)
  - Internal Event — Outbox → SNS/SQS/Kafka (한 컨텍스트)
  - External Event — Outbox → Kafka 일반화 스키마 (다른 서비스·팀)

## 카테고리 상관관계 그림

```
[층 1: 결정] 이벤트 기반? 최종 일관성 OK?
    ↓ YES
[층 2: 발행 신뢰성]  Outbox or CDC
    ↓ at-least-once
[브로커]  SNS·SQS·Kafka·RabbitMQ·EventBridge·Pub/Sub
    ↓
[층 3: 소비 신뢰성]  Idempotency Key + DLQ + Visibility Timeout
    ↓
[층 4: 이벤트 본질]  사실 기반(과거형) + Zero Payload
    ↓
[층 5: 순서]  필요시 FIFO + MessageGroupId
    ↓
[비즈니스 패턴 결정]
    ├─ 단순 알림 fan-out → 여기까지로 충분
    ├─ 분산 트랜잭션 필요? → 층 6: Saga (보상)
    ├─ 감사·복구·새 read model 자주? → 층 7: Event Store 확장
    └─ 상태 자체가 본질? → 층 7: Event Sourcing + CQRS
    ↓
[층 8: 운영]  DLQ·lag·Upcaster·재해 복구·분산 트레이싱
```

## 적용 깊이 결정 — 도메인별 권장

| 도메인 | 최소 깊이 | 추천 패턴 |
|---|---|---|
| 단순 알림·메일 fan-out | 층 1~3 | SNS/SQS + Idempotency Key |
| 발주·재고 같은 비즈니스 이벤트 | 층 1~5 | Outbox + SNS/SQS + Saga(필요시) |
| 결제·금융·정산 | 층 1~6 + 8 | Outbox + Saga + 감사 로그 |
| 제품 생애주기·공급망·DPP | 층 1~7 + 8 | Event Store 확장 또는 Event Sourcing 검토 |
| 감사·규제·SOX·GDPR 강제 | 층 1~7 (ES 권장) | Event Sourcing + CQRS + crypto-shredding |

## 인접 패턴 분류 정리

### 메시징 인프라 관점 (`tech/messaging-data-pipeline/`)
- [[브로커(Brokers)]] — 인프라 선택
- [[Transactional-Outbox]] · [[CDC&Outbox]] — 발행 신뢰성
- [[Idempotency-Key]] — 소비 신뢰성
- 구체 브로커: [[EventBridge]] · [[SQS]] · [[SNS]]

### 비즈니스·도메인 패턴 관점 (`tech/architecture-design/ddd-hexagonal/`)
- [[Saga-Pattern]] — 분산 트랜잭션
- [[Event-Sourcing]] — 상태 모델링 (도메인 모델 자체 결정이라 아키텍처 카테고리)
- [[DDD&Hexagonal]] · [[DDD]] — Aggregate·경계 모델링

= **메시징 인프라 패턴은 신뢰성 보장 도구**, **도메인 패턴은 비즈니스 모델 결정**. 둘은 다른 층을 담당하지만 EDA에서 함께 작동한다.

## 자주 만나는 오해

- **"이벤트 기반 = 마이크로서비스"** — 모놀리스 안에서도 EDA 도입 가능 (도메인 분리 + Outbox)
- **"Kafka를 써야 EDA"** — SNS/SQS·RabbitMQ·EventBridge로도 충분. Kafka는 이벤트 보존·재처리·다소비자 스트림 필요할 때
- **"Event Sourcing이 EDA의 끝판왕"** — 도메인이 안 맞으면 과설계. 대부분은 Outbox + 사실 이벤트로 충분
- **"분산 트랜잭션 = 2PC"** — 2PC는 거의 안 씀. Saga + 보상 또는 Outbox로 결과적 일관성

## 운영 시 핵심 메트릭

| 메트릭 | 의미 | 임계 예시 |
|---|---|---|
| DLQ 메시지 수 | 최종 실패 누적 | > 0 (즉시 알림) |
| Consumer lag | 처리 지연 | > 1분 (5분 지속 시 알림) |
| Outbox 미처리 행 | Relay 지연 | > 1,000건 또는 5분 이상 미처리 |
| 이벤트 처리 P99 | 소비자 처리 시간 | < 1초 (도메인별 조정) |
| Idempotency hit rate | 중복 차단 비율 | 0이 아닌지 (재시도 발생 시그널) |

## 관련 문서

- [[브로커(Brokers)]]
- [[Transactional-Outbox]]
- [[CDC&Outbox]]
- [[Idempotency-Key]]
- [[Saga-Pattern]]
- [[Event-Sourcing]]
- [[EventBridge]] · [[SQS]] · [[SNS]]
