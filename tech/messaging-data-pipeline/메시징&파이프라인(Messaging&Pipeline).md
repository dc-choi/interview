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
- [x] [[Delivery-Semantics|Delivery semantics (at-least/most/exactly-once, 시스템별 지원)]]
- [x] [[At-Least-Once|At-Least-Once (Insert-First 패턴, 상태 머신, 멱등성)]]
- [ ] [[At-Most-Once]]
- [ ] [[Exactly-Once|Exactly-once (실무 한계)]]
- [x] [[Idempotency-Key|Idempotency Key (고유 식별자, 중복 감지, TTL, Stripe 사례)]]
- [ ] [[Deduplication|Deduplication 전략]]
- [ ] [[Ordering-Guarantee]]
- [x] [[Consumer-Group|Consumer Group (Redis Streams, Kafka 비교, 리밸런싱)]]
- [ ] [[DLQ]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Replay-Backfill|Replay / Backfill]]
- [ ] [[CDC|CDC (Debezium 등)]]
- [ ] [[Outbox-Pattern]]
- [ ] [[Saga-Pattern|Saga Pattern (Choreography / Orchestration)]]
- [ ] [[Backpressure-Control|Backpressure 제어]]
- [ ] [[Shadow-Traffic]]
- [x] [[Redis|Redis Messaging (list, stream)]]
- [x] [[Messaging-Patterns|메시징 패턴 (Pub/Sub, Task Distribution, Request/Reply)]]
