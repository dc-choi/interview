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

## 브로커
- [x] [[tech/messaging-data-pipeline/brokers/SQS|SQS (Standard/FIFO, Visibility Timeout, DLQ, 소비자 패턴)]]
- [x] [[tech/messaging-data-pipeline/brokers/EventBridge|EventBridge (Rules/Targets, 패턴 매칭, Archive & Replay, vs SNS)]]
- [x] [[tech/messaging-data-pipeline/brokers/MQ-Kafka|Message Queue: Kafka (토픽, 파티션, 세그먼트, KRaft)]]
- [x] [[tech/messaging-data-pipeline/brokers/Redis|Redis Messaging (list, stream)]]
- [ ] [[MQ-RabbitMQ|Message Queue: RabbitMQ]]
- [ ] [[MQ-BullMQ|Message Queue: BullMQ]]

## 배달 보장
- [x] [[tech/messaging-data-pipeline/delivery-guarantees/Delivery-Semantics|Delivery semantics (at-least/most/exactly-once, 시스템별 지원)]]
- [x] [[tech/messaging-data-pipeline/delivery-guarantees/At-Least-Once|At-Least-Once (Insert-First 패턴, 상태 머신, 멱등성)]]
- [x] [[tech/messaging-data-pipeline/delivery-guarantees/Idempotency-Key|Idempotency Key (고유 식별자, 중복 감지, TTL, Stripe 사례)]]
- [x] [[tech/messaging-data-pipeline/delivery-guarantees/Consumer-Group|Consumer Group (Redis Streams, Kafka 비교, 리밸런싱)]]
- [ ] [[At-Most-Once]]
- [ ] [[Exactly-Once|Exactly-once (실무 한계)]]
- [ ] [[Deduplication|Deduplication 전략]]
- [ ] [[Ordering-Guarantee]]
- [ ] [[DLQ]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Replay-Backfill|Replay / Backfill]]

## CDC · Outbox
- [x] [[tech/messaging-data-pipeline/cdc-outbox/CDC-Debezium|CDC · Debezium (binlog 기반 CDC, Snapshot→Streaming, Aurora 설정, Transactional Outbox와 결합)]]
- [x] [[tech/messaging-data-pipeline/cdc-outbox/Transactional-Outbox|Transactional Outbox (Dual Write 해결, Polling vs CDC)]]

## 패턴
- [x] [[tech/messaging-data-pipeline/patterns/Messaging-Patterns|메시징 패턴 (Pub/Sub, Task Distribution, Request/Reply, 기술 비교)]]
- [x] [[tech/messaging-data-pipeline/patterns/Fan-Out-Architecture|Fan-out Architecture (1:N 분배, SNS+SQS·Kafka 그룹, in-flight 한계, warm-up, 멱등성)]]
- [x] [[tech/messaging-data-pipeline/patterns/Event-Driven-Patterns|이벤트 드리븐 실전 패턴 3종 (경쟁 소비자, Retry+DLQ, Async Request-Response)]]
- [ ] [[Event-Driven-Architecture|Event-driven architecture]]
- [ ] [[Saga-Pattern|Saga Pattern (Choreography / Orchestration)]]
- [ ] [[Backpressure-Control|Backpressure 제어]]
- [ ] [[Shadow-Traffic]]
