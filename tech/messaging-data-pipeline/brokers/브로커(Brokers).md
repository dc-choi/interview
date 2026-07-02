---
tags: [messaging, brokers]
status: index
category: "Messaging - 브로커"
aliases: ["Brokers"]
---

# 브로커(Brokers)

SQS, EventBridge, Kafka, Redis — 주요 메시지 브로커.

## 목차
- [x] [[SQS|SQS (Standard/FIFO, Visibility Timeout, DLQ, 멱등성, 소비자 패턴)]]
  - [[SQS-Lambda-ESM|Lambda 폴링 (ESM 스케일링, throttling 가짜 DLQ, concurrency, Provisioned Mode)]]
  - [[SQS-Consumer-Lambda-vs-ECS|컨슈머 선택 (Lambda vs ECS 워커 트레이드오프)]]
- [x] [[SNS|SNS (Topic, Fan-out, Filter, SNS+SQS, SNS vs EventBridge)]]
- [x] [[EventBridge|EventBridge (이벤트 버스 3종, Rules/Targets, Scheduler, Archive & Replay, vs SNS)]]
  - [[EventBridge-Event-Patterns|이벤트 패턴 매칭 (연산자 문법, 매칭 규칙, $or, 테스트)]]
  - [[EventBridge-SQS-Target|EventBridge → SQS 타겟 패턴 (리소스 정책, 메시지 구조, 컨슈머, 2단 DLQ)]]
- [x] [[MQ-Kafka|Kafka (서브 인덱스 — 내부, 패턴, 컨슈머, 파티션 산정)]]
  - [[MQ-Kafka-Internals|기본 구조와 내부 (토픽, 파티션, 세그먼트, KRaft, 빠른 이유)]]
  - [[MQ-Kafka-Patterns|실전 패턴 (키 순서, Outbox+Debezium, Event Bus, Streams)]]
  - [[MQ-Kafka-Consumer|컨슈머 구현 (NestJS, eachMessage vs eachBatch)]]
  - [[MQ-Kafka-Streams|Kafka Streams (상태 저장소, KStream/KTable, 윈도우, EOS, 운영)]]
  - [[Kafka-Partition-Sizing|파티션 개수 산정 (산정식, per-partition 처리량, eCKU 한도)]]
- [x] [[Kinesis|Kinesis (Data Streams, Firehose, Analytics, Video — Shard, Partition Key, KCL/KPL, vs Kafka/SQS)]]
- [x] [[Amazon-MQ|Amazon MQ (RabbitMQ/ActiveMQ 매니지드, 하이브리드 마이그레이션, 표준 프로토콜)]]
- [x] [[Redis|Redis Messaging (list, stream)]]
- [x] [[Messaging-Broker-Comparison|브로커 비교 (RabbitMQ, BullMQ, SQS, Kafka — 성능, 운영, 선택 플로차트)]]
