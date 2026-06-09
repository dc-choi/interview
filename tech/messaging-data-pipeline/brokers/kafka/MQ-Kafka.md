---
tags: [messaging, kafka, event-streaming]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka", "Message Queue: Kafka"]
---

# Kafka

오픈소스 분산 이벤트 스트리밍 도구. 내구성과 효율적인 디스크 사용으로 신뢰성 있는 키-값 메시지 전달을 보장한다.

## 목차

- [[MQ-Kafka-Internals|기본 구조와 내부 (토픽, 파티션, 세그먼트, KRaft, 빠른 이유)]]
- [[MQ-Kafka-Patterns|실전 패턴 (키 기반 순서, Outbox+Debezium, Event Bus, Streams)]]
- [[MQ-Kafka-Consumer|컨슈머 구현 (NestJS 마이크로서비스, eachMessage vs eachBatch)]]
- [[Kafka-Partition-Sizing|파티션 개수 산정 (산정식, per-partition 처리량, eCKU 한도)]]

## 핵심 한 줄

- 파티션은 병렬성과 순서 보장의 단위 — 같은 키는 같은 파티션으로 순서 보장, 다른 키는 분산 병렬
- 디스크 기반인데 빠른 이유는 Sequential I/O, Zero-Copy(sendfile), Page Cache, 배치 압축
- Kafka가 맞는 시점은 이벤트 리플레이, 파티션 내 순서, 초당 수만 건, 다중 소비자 그룹 독립 소비

## 출처

- [frogred8 — 카프카는 왜 빠를까?](https://frogred8.github.io/docs/034_why_is_kafka_fast/)
- [우아한형제들 — 우리팀은 카프카를 어떻게 사용하고 있을까](https://techblog.woowahan.com/17386/)
- [채널톡 — 카프카 파티션 개수, 어떻게 정할까](https://tech.channel.io/ko/articles/17439f55)

## 관련 문서

- [[Event-Driven-Architecture|Event-driven architecture]]
- [[Consumer-Group|Consumer Group]]
- [[DLQ|Dead Letter Queue]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium|CDC, Debezium]]
