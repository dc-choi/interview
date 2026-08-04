---
tags: [messaging, kafka, event-streaming]
status: done
verified_at: 2026-08-04
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Internals", "카프카 기본 구조와 내부"]
---

# Kafka 기본 구조와 내부

> 상위 인덱스: [[MQ-Kafka|Kafka]]

Kafka는 event를 topic의 partition log에 append하고 여러 consumer group이 각자 offset으로 읽는 분산 event streaming platform이다. queue처럼 작업을 분산할 수 있지만, consume 뒤 record가 즉시 사라지는 전통적인 queue와 달리 retention 정책 동안 다시 읽을 수 있다.

## 기본 구조

| 구성요소 | 역할 |
|----------|------|
| Producer | event를 topic에 발행하고 partition을 선택 |
| Broker | partition log를 저장하고 client의 읽기/쓰기를 처리 |
| Consumer | 할당된 partition을 polling하고 처리 위치를 관리 |
| Controller quorum | cluster metadata와 partition leader 상태를 관리 |

- 카프카는 데이터를 한번에 합쳐서 보낼 수 있음 (배치)

## 토픽과 파티션

- 프로듀서는 여러 토픽으로 메시지를 보낼 수 있고, 컨슈머도 여러 토픽에서 메시지를 가져올 수 있음
- 하나의 토픽에는 여러 개의 **파티션**이 있을 수 있음
- 파티션 안에는 **offset**(메시지 일련번호)이 있음

### 파티션과 컨슈머 규칙
- Producer는 명시한 partition, record key와 partitioner 정책으로 목적 partition을 고른다. key 없는 record가 항상 단순 round-robin이라고 가정하지 않는다.
- 같은 key는 partition 수와 partitioner가 유지되는 동안 같은 partition에 모이고, 그 partition의 append 순서로 읽힌다.
- **한 consumer group 안에서는** partition 하나가 같은 시점에 최대 한 consumer에게 할당된다.
- 다른 consumer group은 같은 partition을 독립적으로 읽을 수 있으므로 "partition 하나에 consumer 하나"는 cluster 전체 규칙이 아니다.
- consumer 수가 partition 수보다 많으면 같은 group의 남는 consumer는 idle이다. consumer 하나가 여러 partition을 맡는 것은 가능하다.
- consumer가 추가, 제거되거나 장애가 나면 group이 partition을 재할당한다. 처리 중 중복과 pause를 고려해 idempotency와 rebalance 대응이 필요하다.
- 토픽 생성 시 초기 파티션 개수 산정(프로듀서와 컨슈머 요구량, per-partition 처리량, 플랫폼 한도)은 [[Kafka-Partition-Sizing|파티션 개수 산정]] 참고

key는 같은 entity event의 partition affinity와 순서를 다루는 도구다. consumer가 handler 내부에서 병렬 처리하거나 여러 topic/group이 같은 DB row를 수정하면 race는 다시 생긴다. key만으로 동시성 제어, exactly-once business 처리나 global ordering이 보장되지는 않는다.

## 세그먼트

- partition log는 여러 segment file로 나뉘어 저장되고 size/time 조건으로 active segment가 roll된다.
- retention 또는 compaction 정책에 따라 오래된 record가 제거될 수 있으므로 Kafka를 무기한 archive로 간주하지 않는다.
- consumer는 저장된 group offset이나 명시한 offset으로 다시 읽는다. 장애가 나면 무조건 처음부터 시작하는 것이 아니며 retention 밖의 offset은 복구할 수 없다.

## KRaft

KRaft는 Kafka controller quorum이 Raft 기반 metadata log를 관리하는 mode다. Apache Kafka 4.0부터 ZooKeeper mode가 제거되어 Kafka는 KRaft로만 실행된다.

- 새 local/production 구성은 KRaft 기준으로 작성한다.
- 오래된 ZooKeeper Docker Compose 예제는 당시 version을 재현할 때만 사용하고 현재 기본 예제로 복사하지 않는다.
- 별도 ZooKeeper ensemble이 사라져 구성 요소와 metadata 운영 경로가 단순해졌지만, 모든 workload가 일정 배수 빨라진다고 일반화하지 않는다.
- controller quorum과 broker 역할을 같은 process에 둘지 분리할지는 개발과 production 규모에 따라 결정한다.

## 순서, 내구성과 transaction 경계

- 순서는 topic 전체가 아니라 partition 안에서 보장된다. 같은 key 사용은 전역 순서를 만들지 않는다.
- replication은 broker 장애 내성을 높이지만 producer `acks`, `min.insync.replicas`, unclean leader election과 retention 설정이 실제 손실 경계를 바꾼다.
- offset commit 전에 side effect를 끝내면 재처리 때 중복될 수 있고, 먼저 commit하면 장애 때 처리가 유실될 수 있다. consumer side effect를 멱등하게 만든다.
- 주문 DB commit 뒤 Kafka에 바로 publish하는 코드는 crash gap이 있다. 주문 row와 outbox row를 같은 RDB transaction에 저장한 뒤 relay가 발행한다.
- NestJS 단방향 event는 `emit()`과 `@EventPattern()`을 사용한다. `send()`와 `@MessagePattern()`은 reply topic을 사용하는 request-response 용도다.

## 카프카가 빠른 이유

Kafka의 처리량은 한 가지 기술이 아니라 다음 구조의 조합에서 나온다.

- **Sequential log**: append와 offset 기반 순차 읽기로 작은 random I/O를 줄인다.
- **OS page cache**: broker heap에 record cache를 중복해 두기보다 filesystem cache와 read-ahead를 활용한다.
- **Batching**: producer request, broker append와 consumer fetch를 batch로 처리해 왕복과 작은 I/O 비용을 나눈다.
- **Compression**: record batch를 압축한 상태로 log에 저장하고 consumer까지 전달해 network와 disk 양을 줄인다.
- **Zero-copy 경로**: 조건이 맞으면 page cache의 데이터를 `sendfile` 경로로 socket에 전달해 user-space copy를 줄인다. Kafka 공식 문서상 SSL 경로에서는 이 최적화를 사용하지 않는다.
- **Partition 병렬성**: 여러 broker와 consumer에 작업을 나눌 수 있다. 처리량이 partition 수에 항상 선형 비례하는 것은 아니며 key skew, broker I/O, network와 downstream 처리량에 제한된다.

## 출처

- [Apache Kafka, Introduction](https://kafka.apache.org/documentation/)
- [Apache Kafka 4.0 release announcement, KRaft only](https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/)
- [Apache Kafka, Design](https://kafka.apache.org/41/design/design/)
- [NestJS, Microservices basics](https://docs.nestjs.com/microservices/basics)
- [frogred8 — 카프카는 왜 빠를까?](https://frogred8.github.io/docs/034_why_is_kafka_fast/)
- 김빌 강사, [Kafka 이론](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273696), [Docker Compose 실습](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273697), [주문 로직 리팩터링](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273698)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Patterns|실전 패턴]]
- [[MQ-Kafka-Event-Ordering|Kafka 이벤트 순서 보장]]
- [[Kafka-Partition-Sizing|파티션 개수 산정]]
- [[Consumer-Group|Consumer Group]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Delivery-Semantics|전달 보장]]
