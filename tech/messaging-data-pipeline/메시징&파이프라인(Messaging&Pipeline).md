---
tags: [messaging, redis]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["메시징&파이프라인(Messaging&Pipeline)", "Messaging & Data Pipeline"]
---

# 메시징&파이프라인(Messaging&Pipeline)

## 목차

- [[tech/messaging-data-pipeline/brokers/브로커(Brokers)|브로커 (Brokers)]] — SQS·EventBridge·Kafka·Redis
- [[tech/messaging-data-pipeline/delivery-guarantees/배달보장(DeliveryGuarantees)|배달 보장 (Delivery Guarantees)]] — Delivery semantics·At-Least-Once·Idempotency·Consumer Group
- [[tech/messaging-data-pipeline/patterns/패턴(MessagingPatterns)|메시징 패턴 (Patterns)]] — Pub/Sub·Fan-out·경쟁 소비자
- [[tech/messaging-data-pipeline/cdc-outbox/CDC&Outbox|CDC · Outbox]] — Debezium·Transactional Outbox

## 미작성
- [ ] [[Event-Driven-Architecture|Event-driven architecture]]
- [ ] [[MQ-RabbitMQ|Message Queue: RabbitMQ]]
- [ ] [[MQ-BullMQ|Message Queue: BullMQ]]
- [ ] [[At-Most-Once]]
- [ ] [[Exactly-Once|Exactly-once]]
- [ ] [[Deduplication]]
- [ ] [[Ordering-Guarantee]]
- [ ] [[DLQ]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Replay-Backfill|Replay / Backfill]]
- [ ] [[Saga-Pattern|Saga Pattern (Choreography / Orchestration)]]
- [ ] [[Backpressure-Control|Backpressure 제어]]
- [ ] [[Shadow-Traffic]]

## 현장사례
- [[SSG-Ecommerce-Seminar#메시지브로커|SSG 메시지 브로커]] — Kafka 중심, 이벤트 드리븐, 트랜잭션 고려 필수
- [[Elegant-OOP-Design#방법2:도메인이벤트|우아한 객체지향: 도메인 이벤트]] — 객체 참조를 이벤트로 느슨하게 연결
