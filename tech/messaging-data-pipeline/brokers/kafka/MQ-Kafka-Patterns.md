---
tags: [messaging, kafka, event-streaming, patterns]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Patterns", "카프카 실전 패턴"]
verified_at: 2026-08-28
---

# Kafka 실전 패턴

> 상위 인덱스: [[MQ-Kafka|Kafka]]

대규모 운영에서 반복적으로 쓰이는 Kafka 활용 패턴.

## 키 기반 순서 보장 + 로드 분산

같은 엔티티(예: 주문 ID) 메시지는 **동일 키**로 발행 → 같은 파티션에 저장되어 **키 단위 순서 보장**. 서로 다른 키는 다른 파티션으로 분산되어 병렬 처리가 유지됨.

순서를 지키면서 소비를 병렬화할 때 깨지는 지점(생산자 재시도, 소비자 병렬화)과 소비자 체이닝, watermark식 제한적 비순서는 [[MQ-Kafka-Event-Ordering|이벤트 순서 보장]] 참고.

## Transactional Outbox + Debezium

DB 트랜잭션으로 business row와 Outbox 테이블의 이벤트를 함께 기록하고, **Debezium MySQL Connector**가 committed binlog 변경을 읽어 Kafka로 발행 (→ [[Transactional-Outbox]], [[CDC-Debezium]]).
- business row와 Outbox row의 원자성은 **DB 트랜잭션**이 보장한다. CDC 발행은 그 뒤 독립적으로 일어나므로, 기본 at-least-once delivery에서는 restart나 failure 뒤 같은 이벤트가 다시 전달될 수 있음
- Outbox의 고유 event ID를 메시지에 보존하고, consumer는 그 ID로 멱등 처리 또는 중복 제거. Kafka Connect exactly-once 설정은 별도 지원 범위와 운영 조건을 확인
- Debezium MySQL Connector는 source server의 binlog를 **단일 task**로 읽는다. 같은 DB의 Outbox 테이블만 나누거나 `tasks.max`를 늘려도 Connector 병렬화가 되지 않는다. DB가 이미 shard별 server로 분리된 경우에만 server별 Connector 구성을 검토

## Event Bus (Spring Cloud RemoteApplicationEvent)

설정 변경과 라우팅 규칙 같은 **모든 인스턴스가 동시에 알아야 하는 브로드캐스트**에 사용.
- 각 서버 인스턴스가 **유니크 Consumer Group ID** 사용 → 같은 토픽을 N대 서버가 독립 소비
- 낮은 처리량이 충분하므로 파티션 1개로 단순화

## Kafka Streams로 실시간 집계

원본 이벤트 스트림을 **상태 저장소(State Store)** 로 집계해 지표화. Grafana 대시보드로 시각화 → 이상 감지와 운영 모니터링. 상태 저장소, KStream/KTable, 윈도우, EOS, 운영 지표는 [[MQ-Kafka-Streams|Kafka Streams]] 참고.

## Kafka가 필요한 시점

- 이벤트 리플레이가 필요 (장애 후 재처리, 새 소비자가 과거 이벤트 재생)
- 파티션 내 순서 보장이 필수
- record 크기, durability, latency와 consumer 병렬성을 반영한 부하 시험에서 지속 처리량 요구가 다른 후보를 넘어설 때
- 여러 소비자 그룹이 같은 이벤트를 독립적으로 소비

다른 시스템(SQS, Pub/Sub 등)과의 상세 비교는 [[Messaging-Patterns|메시징 패턴]]과 [[Messaging-Broker-Comparison|브로커 비교]] 참고.

## 출처

- [Debezium, Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [Debezium, Exactly once delivery](https://debezium.io/documentation/reference/configuration/eos.html)
- [Debezium, MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [우아한형제들 — 우리팀은 카프카를 어떻게 사용하고 있을까](https://techblog.woowahan.com/17386/)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Consumer|컨슈머 구현]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium|CDC, Debezium]]
- [[Event-Driven-Patterns|이벤트 드리븐 패턴]]
