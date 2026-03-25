---
tags: [messaging, redis]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["메시징&파이프라인(Messaging&Pipeline)", "Messaging & Data Pipeline"]
---

# 메시징&파이프라인(Messaging&Pipeline)

## 현장사례
- [[SSG-Ecommerce-Seminar#메시지브로커|SSG 메시지 브로커]] — Kafka 중심, 이벤트 드리븐, 트랜잭션 고려 필수
- [[Elegant-OOP-Design#방법2:도메인이벤트|우아한 객체지향: 도메인 이벤트]] — 객체 참조를 끊고 이벤트로 느슨하게 연결, 시스템 분리 시 메시지 브로커 활용

## Checklist
- [ ] [[Event-Driven-Architecture|Event-driven architecture]]
- [ ] [[MQ-SQS|Message Queue: SQS]]
- [x] [[MQ-Kafka|Message Queue: Kafka (토픽, 파티션, 세그먼트, KRaft)]]
- [ ] [[MQ-RabbitMQ|Message Queue: RabbitMQ]]
- [ ] [[MQ-BullMQ|Message Queue: BullMQ]]
- [ ] [[Delivery-Semantics|Delivery semantics]]
- [ ] [[At-Least-Once]]
- [ ] [[At-Most-Once]]
- [ ] [[Exactly-Once|Exactly-once (실무 한계)]]
- [ ] [[Idempotency-Key]]
- [ ] [[Deduplication|Deduplication 전략]]
- [ ] [[Ordering-Guarantee]]
- [ ] [[Consumer-Group]]
- [ ] [[DLQ]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Replay-Backfill|Replay / Backfill]]
- [ ] [[CDC|CDC (Debezium 등)]]
- [ ] [[Outbox-Pattern]]
- [ ] [[Saga-Pattern|Saga Pattern (Choreography / Orchestration)]]
- [ ] [[Backpressure-Control|Backpressure 제어]]
- [ ] [[Shadow-Traffic]]
- [x] [[Redis|Redis Messaging (list, stream)]]
