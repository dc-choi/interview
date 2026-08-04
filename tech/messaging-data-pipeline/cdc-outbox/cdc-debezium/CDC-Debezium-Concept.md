---
tags: [cdc, debezium, kafka, mysql, data-pipeline, change-data-capture, binlog]
status: done
verified_at: 2026-08-04
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC 개념과 아키텍처", "CDC 구현 방식과 대안 도구"]
---

# CDC와 Debezium 개념

Change Data Capture는 committed data change를 지속적으로 읽어 다른 시스템이 소비할 event로 전달하는 기법이다. 검색 index, cache projection, analytics와 migration에 유용하지만 row change만으로 업무 의도와 end-to-end consistency가 자동으로 생기지는 않는다.

## 변경을 얻는 방식

| 방식 | 장점 | 주요 한계 |
|---|---|---|
| timestamp 또는 증가 key polling | 시작이 단순하고 별도 log 권한이 적음 | delete, 같은 timestamp, clock, source query 부하와 polling 지연 |
| DB trigger와 change table | transaction 안에서 변경 기록 가능 | source write 경로, trigger 배포와 schema 결합 |
| transaction log 기반 CDC | committed 순서와 delete를 낮은 source query 부하로 읽음 | log retention, connector offset, snapshot과 schema history 운영 |

Log 기반이 항상 무침습인 것은 아니다. Binary log 설정과 보관, replication 권한, initial snapshot, network와 connector가 source에 부하를 만든다. 요구와 운영 역량으로 선택한다.

## Debezium MySQL 흐름

```text
MySQL table
  -> consistent initial snapshot
  -> binary log position or GTID
  -> Debezium MySQL connector
  -> Kafka Connect records
  -> topic partitions
  -> idempotent consumers and projections
```

Connector는 일반적으로 initial snapshot으로 현재 schema와 row를 읽고 snapshot 시점의 binlog position부터 streaming을 이어 간다. Schema history는 과거 binlog event를 당시 table 구조로 해석하는 데 필요하다. Offset은 connector가 어디까지 읽었는지 나타내며 둘 다 복구 자산이다.

Change event에는 `before`, `after`, operation, source table, transaction/log position과 source timestamp 같은 metadata가 포함될 수 있다. 설정과 operation에 따라 field가 없거나 NULL일 수 있으므로 consumer schema를 실제 connector version과 serializer로 확인한다.

## 순서와 전달 보장

- Source log에는 transaction order가 있지만 Kafka consumer가 보는 순서는 topic partition 경계에 의존한다.
- 여러 table/topic과 partition 사이의 전역 순서를 기대하지 않는다.
- Connector restart와 failure recovery에서 event가 다시 전달될 수 있으므로 consumer는 at-least-once를 기본 가정으로 둔다.
- Event ID, source position 또는 entity version으로 중복과 오래된 update를 거부한다.
- Delete event와 tombstone의 의미, compaction 정책을 sink별로 정의한다.

Exactly-once라는 제품 옵션이 있어도 외부 API, 다른 DB와 search index까지 하나의 transaction이 되는 것은 아니다. Replay 가능한 source, transactional processing과 idempotent sink의 경계를 각각 검증한다.

## Raw CDC와 domain event

`orders.status`가 바뀌었다는 row event는 왜 바뀌었는지, 어떤 consumer가 업무적으로 반응해야 하는지 충분히 설명하지 못할 수 있다.

- 단순 projection과 analytics에는 raw table CDC가 적합할 수 있다.
- `OrderPaid`, `RefundApproved` 같은 안정된 업무 계약이 필요하면 application transaction에 outbox row를 함께 기록한다.
- Debezium Outbox Event Router가 outbox event를 topic/key/header로 변환할 수 있다.
- Outbox도 schema version, deduplication, retry와 retention은 별도로 필요하다.

## 사용 판단

1. 허용 가능한 freshness와 누락/중복 처리 계약은 무엇인가?
2. Initial snapshot 동안 source 부하와 consistency를 감당할 수 있는가?
3. Connector 중단보다 binlog retention을 길게 유지할 수 있는가?
4. Schema change를 connector와 consumer에 어떤 순서로 배포하는가?
5. Projection을 full rebuild하고 source와 대사할 수 있는가?
6. Raw row change와 domain event 중 어떤 계약이 필요한가?

## 출처

- [Debezium Documentation, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [Debezium Documentation, Architecture](https://debezium.io/documentation/reference/stable/architecture.html)
- [Debezium Documentation, Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [인프런, Hong, CDC](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338563)

## 관련 문서

- [[CDC-Debezium-Operations|CDC와 Debezium 운영]]
- [[CDC-Debezium-Setup|Debezium DB별 설정]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[Polyglot-Persistence|Polyglot Persistence]]
