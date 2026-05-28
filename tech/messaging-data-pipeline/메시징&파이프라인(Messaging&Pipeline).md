---
tags: [messaging, redis]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["메시징&파이프라인(Messaging&Pipeline)", "Messaging & Data Pipeline"]
---

# 메시징&파이프라인(Messaging&Pipeline)

## 큰 그림 (먼저 보기)

- [[Event-Driven-Architecture|Event-Driven Architecture (EDA) — 결정 프레임워크]] (아키텍처 카테고리) — 신뢰성·결합도·일관성 3축 트레이드오프 + **8개 결정 층** + 패턴 매핑 그림

## 목차 (메시징 인프라 — "어떻게 안전하게 전송")

- [[tech/messaging-data-pipeline/brokers/브로커(Brokers)|브로커 (Brokers)]] — SQS·EventBridge·Kafka·Redis
- [[tech/messaging-data-pipeline/delivery-guarantees/배달보장(DeliveryGuarantees)|배달 보장 (Delivery Guarantees)]] — Delivery semantics·At-Least-Once·Idempotency·Consumer Group
- [[tech/messaging-data-pipeline/patterns/패턴(MessagingPatterns)|메시징 패턴 (Patterns)]] — Pub/Sub·Fan-out·경쟁 소비자
- [[tech/messaging-data-pipeline/cdc-outbox/CDC&Outbox|CDC · Outbox]] — Debezium·Transactional Outbox

## 오케스트레이션 (워크플로우 스케줄러 — "어떻게 돌리고 운영")

- [[Airflow-DAG-Parsing|Airflow DAG 파싱 최적화]] — dag-processor 재파싱 비용·메트릭 기반 진단·인프라 튜닝·top-level 안티패턴·2.x→3.x 변경점

## 관련 (아키텍처 카테고리 — "어떻게 설계")

> 메시징 = 인프라 도구 / 아키텍처 = 설계·모델링 결정. EDA Overview·Saga·Event Sourcing은 모두 아키텍처 카테고리.

- [[Event-Driven-Architecture|EDA 결정 프레임워크]] — 전체 그림 (위 큰 그림 참조)
- [[Saga-Pattern|Saga Pattern]] — 분산 트랜잭션·보상 (Choreography vs Orchestration)
- [[Event-Sourcing|Event Sourcing]] — 상태 자체를 이벤트 스트림으로 (CQRS와 짝)
- [[DDD&Hexagonal|DDD · Hexagonal]] — Aggregate·경계 모델링 (이벤트 발행 단위)

## 미작성
- [ ] [[MQ-RabbitMQ|Message Queue: RabbitMQ]]
- [ ] [[MQ-BullMQ|Message Queue: BullMQ]]
- [ ] [[At-Most-Once]]
- [ ] [[Exactly-Once|Exactly-once]]
- [ ] [[Deduplication]]
- [ ] [[Ordering-Guarantee]]
- [ ] [[DLQ]]
- [ ] [[Retry-Backoff|Retry / Backoff]]
- [ ] [[Replay-Backfill|Replay / Backfill]]
- [ ] [[Backpressure-Control|Backpressure 제어]]
- [ ] [[Shadow-Traffic]]

## 현장사례
- [[SSG-Ecommerce-Seminar#메시지브로커|SSG 메시지 브로커]] — Kafka 중심, 이벤트 드리븐, 트랜잭션 고려 필수
- [[Elegant-OOP-Design#방법2:도메인이벤트|우아한 객체지향: 도메인 이벤트]] — 객체 참조를 이벤트로 느슨하게 연결
