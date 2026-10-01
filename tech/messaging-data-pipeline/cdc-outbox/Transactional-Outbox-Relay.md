---
tags: [messaging, reliability, pattern, outbox, cdc]
status: done
verified_at: 2026-10-01
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Outbox Relay", "Transactional Outbox Relay", "Outbox Relay 구현 방식"]
---

# Outbox Relay 구현 방식

> 상위 문서: [[Transactional-Outbox|Transactional Outbox]]

outbox에 남은 이벤트를 브로커로 옮기는 Relay의 구현 방식별 세부다. 방식 비교와 선택 기준 표는 [[Transactional-Outbox#Relay 구현 방식|Relay 구현 방식]]에 있다. 어느 방식이든 발행은 at-least-once라 소비자 멱등 처리가 필요하다.

## Polling 방식
- 주기적으로 `WHERE processed_at IS NULL` 조회 → 발행 → 마킹
- NestJS `@Cron('*/5 * * * * *')`로 5초 간격 구현 가능
- 단일 코드베이스에서 바로 구현할 수 있어 소규모 팀에 적합
- 인스턴스를 2개 이상 띄우는 순간 같은 행을 여러 Relay가 집는다 → [[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때|다중 인스턴스 절]]

## CDC 방식
- Debezium이 DB 변경 로그(PostgreSQL WAL, MySQL binlog 등)를 읽어 outbox 테이블 변경을 감지
- 변경 즉시 Kafka로 발행 → 거의 실시간
- 애플리케이션의 별도 polling relay 코드는 줄일 수 있지만 outbox 기록과 connector 설정, CDC 인프라 운영은 필요

## DB 내장 변경 스트림
- 업무 쓰기와 outbox 항목을 같은 트랜잭션으로 남기고 DB가 내장한 변경 스트림을 relay로 쓴다. connector 운영은 줄지만 순서, 전달과 보존 의미는 제품 규칙을 따른다(2026-10-01 공식 문서 기준).
- **DynamoDB Streams**: 순서는 같은 item(primary key) 단위로만 보장되므로 이벤트마다 outbox item을 새로 쓰면 item 사이의 발행 순서는 보장되지 않는다. record 보존(24시간), shard당 reader 수와 Lambda 재처리는 [[DynamoDB-Streams|DynamoDB Streams]]에 있다.
- **Cosmos DB change feed**: 기본 활성이고 순서는 partition key 안에서만 보장된다. 트랜잭션도 같은 logical partition key 안에서만 되므로 outbox 항목을 업무 항목과 같은 partition key에 둔다. latest version mode는 delete를 담지 않으며 change feed processor는 at-least-once다.
- **CockroachDB changefeed**: 같은 key는 첫 emit 순서를 보장하지만 key 간 순서와 transaction 순서는 없고, at-least-once라 드물게 중복을 보낸다.
- 업무 table 변경을 그대로 relay하면 raw row change라 업무 이벤트 계약이 약하다([[CDC-Debezium-Concept#Raw CDC와 domain event|Raw CDC와 domain event]]). 보존 기간을 넘긴 relay 중단은 복구할 수 없으므로 lag 경보를 보존 기간보다 훨씬 짧게 두고, 소비자 멱등 처리는 그대로 필요하다.

## 출처
- [NestJS 공식 문서, Task Scheduling](https://docs.nestjs.com/application/task-scheduling)
- [Debezium 공식 문서, PostgreSQL Connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)
- [Debezium 공식 문서, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [AWS 공식 문서, Change data capture for DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [Azure Cosmos DB 공식 문서, Change feed](https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed)
- [Azure Cosmos DB 공식 문서, Transactional batch operations](https://learn.microsoft.com/en-us/azure/cosmos-db/transactional-batch)
- [CockroachDB 공식 문서, Changefeed Messages (ordering and delivery guarantees)](https://docs.cockroachlabs.com/docs/stable/changefeed-messages)
- [Dowon Lee 강사, Dual Write, Outbox와 CDC](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289780)
- [Dowon Lee 강사, Distributed Databases](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289782)

## 관련 문서
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium|CDC, Debezium]]
- [[DynamoDB-Streams|DynamoDB Streams]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Delivery-Semantics|전달 보장]]
