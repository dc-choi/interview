---
tags: [messaging, redis]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["메시징&파이프라인(Messaging&Pipeline)", "Messaging & Data Pipeline"]
---

# 메시징&파이프라인(Messaging&Pipeline)

## 큰 그림 (먼저 보기)

- [[Event-Driven-Architecture|Event-Driven Architecture (EDA) — 결정 프레임워크]] (아키텍처 카테고리) — 신뢰성, 결합도, 일관성 3축 트레이드오프 + **8개 결정 층** + 패턴 매핑 그림

## 목차 (메시징 인프라 — 어떻게 안전하게 전송)

- [[tech/messaging-data-pipeline/brokers/브로커(Brokers)|브로커 (Brokers)]] — SQS, EventBridge, Kafka, Redis
- [[tech/messaging-data-pipeline/delivery-guarantees/배달보장(DeliveryGuarantees)|배달 보장 (Delivery Guarantees)]] — Delivery semantics, At-Least-Once, Idempotency, Consumer Group
- [[tech/messaging-data-pipeline/patterns/패턴(MessagingPatterns)|메시징 패턴 (Patterns)]] — Pub/Sub, Fan-out, 경쟁 소비자, 백필 자원 격리
- [[tech/messaging-data-pipeline/cdc-outbox/CDC&Outbox|CDC, Outbox]] — Debezium, Transactional Outbox

## 파이프라인 실전 (설계와 오케스트레이션 — 어떻게 설계하고 돌리나)

- [[Airflow-DAG-Parsing|Airflow DAG 파싱 최적화]] — dag-processor 재파싱 비용, 메트릭 기반 진단, 인프라 튜닝, top-level 안티패턴, 2.x→3.x 변경점
- [[ELT-Platform|ELT 플랫폼 (셀프서비스 데이터 파이프라인)]] — 정의와 실행을 DSL로 분리, 동적 DAG 생성, DB→DWH 대량 복제(JDBC 파티셔닝), Build vs Buy
- [[Inventory-Data-Pipeline|재고 데이터 파이프라인]] — 옴니채널 재고 병목 3종, 기초재고 배치 파티셔닝, 임계 경로 최소화 + Kafka 팬아웃, Push/Pull 하이브리드 전달

## 관련 (아키텍처 카테고리 — 어떻게 설계)

> 메시징 = 인프라 도구 / 아키텍처 = 설계, 모델링 결정. EDA Overview, Saga, Event Sourcing은 모두 아키텍처 카테고리.

- [[Event-Driven-Architecture|EDA 결정 프레임워크]] — 전체 그림 (위 큰 그림 참조)
- [[Saga-Pattern|Saga Pattern]] — 분산 트랜잭션, 보상 (Choreography vs Orchestration)
- [[Event-Sourcing|Event Sourcing]] — 상태 자체를 이벤트 스트림으로 (CQRS와 짝)
- [[DDD&Hexagonal|DDD, Hexagonal]] — Aggregate, 경계 모델링 (이벤트 발행 단위)

## 추가 학습 체크리스트
- [x] [[Messaging-Broker-Comparison|RabbitMQ (AMQP, Exchange 라우팅, 운영 부담, 선택 기준)]] — NestJS 전송 계약은 [[NestJS-Microservices|수동 ACK, prefetch, durable queue]]
- [x] [[NestJS-Queues|BullMQ (잡 옵션, 재시도와 백오프, WorkerHost, 분리 프로세스)]]
- [x] [[Delivery-Semantics|At-Most-Once (유실 가능, 중복 없음, 적용 범위)]]
- [x] [[Idempotent-Consumer|Exactly-once와 effectively-once (브로커 경계, 외부 부수효과, Inbox)]]
- [x] [[Idempotent-Consumer|Deduplication (자연 멱등, 원자적 중복 제거, 상태 머신)]]
- [x] [[MQ-Kafka-Event-Ordering|Ordering Guarantee (Kafka 순서 보장, 소비자 체이닝)]]
- [x] [[Event-Driven-Patterns|DLQ (오류 분류, 격리, 알람, 플랫폼별 구현)]]
- [x] [[Event-Driven-Patterns|Retry / Backoff (지수 백오프, jitter, 일시 오류와 영구 오류 분류)]]
- [x] [[Backfill-Resource-Isolation|Replay / Backfill (전용 토픽과 워커, 청크 처리, 자원 격리)]]
- [x] [[Backpressure|Backpressure 제어 (pull, feedback, buffer, drop, BullMQ concurrency 경계)]]
- [ ] Shadow Traffic (작성 예정: `Shadow-Traffic`) — 기존 보강: [[Blue-Green#관련 무중단 배포 전략|Blue-Green과 Shadow/Dark Launch]]

## 현장사례
- [[SSG-Ecommerce-Seminar#메시지브로커|SSG 메시지 브로커]] — Kafka 중심, 이벤트 드리븐, 트랜잭션 고려 필수
- [[Elegant-OOP-Design#방법2:도메인이벤트|우아한 객체지향: 도메인 이벤트]] — 객체 참조를 이벤트로 느슨하게 연결
