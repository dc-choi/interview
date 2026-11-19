---
tags: [ai, ontology, instances, messaging, reliability]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["이벤트 발행 온톨로지 선언: Relay와 CDC"]
ontology_concepts:
  - {id: polling-relay, type: Approach, label: "Polling Relay", aliases: ["폴링 Relay", "Polling 방식 Relay", "outbox 폴링 발행"], evidence: "[[Transactional-Outbox-Relay#Polling 방식]]"}
  - {id: cdc-relay, type: Approach, label: "CDC Relay", aliases: ["CDC 방식 Relay", "Debezium CDC Relay", "변경 로그 기반 Relay"], evidence: "[[Transactional-Outbox-Relay#CDC 방식]]"}
  - {id: db-native-change-stream-relay, type: Approach, label: "DB 내장 변경 스트림 Relay", aliases: ["DB Native Change Stream Relay", "내장 변경 스트림 Relay", "change feed Relay"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: log-based-cdc, type: Approach, label: "transaction log 기반 CDC", aliases: ["Log-based CDC", "로그 기반 CDC", "binlog/WAL 기반 CDC", "변경 로그 기반 CDC"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: log-cdc-source-load, type: Tradeoff, label: "log 기반 CDC의 source 부하", aliases: ["CDC는 항상 무침습이 아님", "binlog와 connector의 source 부하"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: incremental-key-polling, type: Approach, label: "timestamp 또는 증가 key polling", aliases: ["증가 key polling", "timestamp polling", "max(id) 커서 polling"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: change-polling-limits, type: Tradeoff, label: "timestamp 또는 증가 key polling의 주요 한계", aliases: ["timestamp polling 한계", "증가 key polling 한계"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: auto-increment-gap, type: Problem, label: "auto_increment 갭", aliases: ["auto_increment gap", "늦게 커밋된 작은 id 행 누락", "증가 key polling 행 누락"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: overlapping-cursor-reread, type: Approach, label: "커서 구간 겹쳐 다시 읽기", aliases: ["커서 overlap 재조회", "겹쳐 읽고 멱등 흡수"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: timestamp-delay-window, type: Approach, label: "타임스탬프 지연 윈도우", aliases: ["timestamp 지연 윈도우", "지연 윈도우 polling"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: db-trigger-change-table, type: Approach, label: "DB trigger와 change table", aliases: ["trigger 기반 변경 기록", "change table trigger"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: trigger-write-path-schema-coupling, type: Tradeoff, label: "source write 경로, trigger 배포와 schema 결합", aliases: ["trigger 변경 기록의 결합 비용"], evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {id: raw-table-cdc, type: Approach, label: "raw table CDC", aliases: ["Raw CDC", "업무 table 변경 그대로 relay", "row change CDC"], evidence: "[[CDC-Debezium-Concept#Raw CDC와 domain event]]"}
  - {id: row-event-lacks-business-intent, type: Tradeoff, label: "row event는 업무 의도를 충분히 설명하지 못함", aliases: ["raw row change의 약한 업무 계약", "업무 이벤트 계약 약함"], evidence: "[[CDC-Debezium-Concept#Raw CDC와 domain event]]"}
  - {id: debezium-mysql-connector, type: Approach, label: "Debezium MySQL connector", aliases: ["Debezium MySQL", "MySQL binlog CDC connector"], evidence: "[[CDC-Debezium-Concept#Debezium MySQL 흐름]]"}
  - {id: debezium-schema-history, type: Condition, label: "Debezium schema history 유지", aliases: ["schema history topic", "schema history 복구 자산"], evidence: "[[CDC-Debezium-Concept#Debezium MySQL 흐름]]"}
  - {id: connector-restart-redelivery, type: Tradeoff, label: "connector 재시작과 장애 복구 시 event 재전달", aliases: ["Debezium event 재전달", "connector restart 중복 전달"], evidence: "[[CDC-Debezium-Concept#순서와 전달 보장]]"}
  - {id: binlog-format-row, type: Condition, label: "binlog_format = ROW", aliases: ["ROW 형식 binlog", "binlog ROW format"], evidence: "[[CDC-Debezium-Setup#MySQL CDC의 전제]]"}
  - {id: debezium-postgresql-connector, type: Approach, label: "Debezium PostgreSQL connector", aliases: ["Debezium PostgreSQL", "PostgreSQL logical replication CDC", "pgoutput 기반 CDC"], evidence: "[[CDC-Debezium-Setup#PostgreSQL CDC의 전제]]"}
  - {id: wal-level-logical, type: Condition, label: "wal_level = logical", aliases: ["logical WAL level", "wal_level logical 설정"], evidence: "[[CDC-Debezium-Setup#PostgreSQL CDC의 전제]]"}
  - {id: inactive-replication-slot-wal, type: Tradeoff, label: "미회수 슬롯의 WAL 압박 또는 재동기화", aliases: ["죽은 replication slot의 pg_wal 압박", "slot 무효화 후 재동기화"], evidence: "[[CDC-Debezium-Setup#미회수 슬롯 주의]]"}
  - {id: debezium-incremental-snapshot, type: Approach, label: "Debezium incremental snapshot", aliases: ["chunk 단위 snapshot"], evidence: "[[CDC-Debezium-Setup#초기 스냅샷이 부담되는 경우]]"}
  - {id: large-table-snapshot-load, type: Problem, label: "대용량 table snapshot 부하", aliases: ["initial snapshot 부담", "큰 table snapshot 압박", "snapshot source I/O 압박"], evidence: "[[CDC-Debezium-Operations#Initial snapshot과 streaming 전환]]"}
  - {id: bulk-backfill-with-cdc-catchup, type: Approach, label: "bulk backfill과 CDC catch-up 조합", aliases: ["별도 bulk backfill", "bulk snapshot과 live stream 결합", "외부 bulk load와 no_data 결합"], evidence: "[[CDC-Debezium-Operations#Initial snapshot과 streaming 전환]]"}
  - {id: snapshot-stream-cutoff-token, type: Condition, label: "bulk snapshot과 live stream 경계의 cutoff token", aliases: ["cutoff token", "명시적 cutoff"], evidence: "[[CDC-Debezium-Operations#Initial snapshot과 streaming 전환]]"}
  - {id: offset-skip, type: Approach, label: "offset skip", aliases: ["offset 건너뛰기", "CDC offset skip", "connector offset 건너뛰기"], evidence: "[[CDC-Debezium-Operations#장애별 복구]]"}
  - {id: offset-skip-data-gap, type: Tradeoff, label: "살아난 듯 보여도 남는 data gap", aliases: ["offset skip 데이터 누락", "data gap 잔존"], evidence: "[[CDC-Debezium-Operations#장애별 복구]]"}
  - {id: approved-data-loss-and-backfill-plan, type: Condition, label: "승인된 data-loss 결정과 backfill 계획", aliases: ["data-loss 승인", "skip 전 backfill 계획"], evidence: "[[CDC-Debezium-Operations#장애별 복구]]"}
  - {id: cdc-pii-blast-radius, type: Tradeoff, label: "CDC의 PII blast radius 확대", aliases: ["CDC 개인정보 노출 범위 확대"], evidence: "[[CDC-Debezium-Operations#보안과 거버넌스]]"}
  - {id: native-stream-lag-alert-below-retention, type: Condition, label: "relay lag 경보를 보존 기간보다 훨씬 짧게", aliases: ["변경 스트림 보존 기간 lag 경보", "보존 기간을 넘긴 relay 중단 방지"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: dynamodb-streams-relay, type: Approach, label: "DynamoDB Streams Relay", aliases: ["DynamoDB Streams outbox", "DynamoDB 변경 스트림 Relay"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: dynamodb-cross-item-order-not-guaranteed, type: Tradeoff, label: "outbox item 사이 발행 순서 미보장", aliases: ["DynamoDB Streams item 간 순서"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: cosmos-db-change-feed-relay, type: Approach, label: "Cosmos DB change feed Relay", aliases: ["Cosmos DB change feed outbox", "Cosmos change feed Relay"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: outbox-item-same-partition-key, type: Condition, label: "outbox 항목을 업무 항목과 같은 partition key에 둠", aliases: ["Cosmos DB partition key 트랜잭션"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: cockroachdb-changefeed-relay, type: Approach, label: "CockroachDB changefeed Relay", aliases: ["CockroachDB changefeed outbox"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {id: cockroachdb-no-cross-key-or-transaction-order, type: Tradeoff, label: "key 간 순서와 transaction 순서 없음", aliases: ["CockroachDB changefeed 순서 한계"], evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
ontology_relations:
  - {subject: "concept:polling-relay", predicate: alternative_to, target: "concept:cdc-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:polling-relay", predicate: alternative_to, target: "concept:db-native-change-stream-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:cdc-relay", predicate: alternative_to, target: "concept:db-native-change-stream-relay", evidence: "[[Transactional-Outbox#Relay 구현 방식]]"}
  - {subject: "concept:log-based-cdc", predicate: has_tradeoff, target: "concept:cdc-operational-overhead", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:log-based-cdc", predicate: has_tradeoff, target: "concept:log-cdc-source-load", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:incremental-key-polling", predicate: has_tradeoff, target: "concept:change-polling-limits", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:overlapping-cursor-reread", predicate: addresses, target: "concept:auto-increment-gap", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:timestamp-delay-window", predicate: addresses, target: "concept:auto-increment-gap", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:log-based-cdc", predicate: addresses, target: "concept:auto-increment-gap", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:overlapping-cursor-reread", predicate: alternative_to, target: "concept:timestamp-delay-window", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:overlapping-cursor-reread", predicate: alternative_to, target: "concept:log-based-cdc", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:timestamp-delay-window", predicate: alternative_to, target: "concept:log-based-cdc", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:incremental-key-polling", predicate: alternative_to, target: "concept:log-based-cdc", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:overlapping-cursor-reread", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:db-trigger-change-table", predicate: has_tradeoff, target: "concept:trigger-write-path-schema-coupling", evidence: "[[CDC-Debezium-Concept#변경을 얻는 방식]]"}
  - {subject: "concept:raw-table-cdc", predicate: has_tradeoff, target: "concept:row-event-lacks-business-intent", evidence: "[[CDC-Debezium-Concept#Raw CDC와 domain event]]"}
  - {subject: "concept:raw-table-cdc", predicate: alternative_to, target: "concept:transactional-outbox", evidence: "[[CDC-Debezium-Concept#Raw CDC와 domain event]]"}
  - {subject: "concept:debezium-mysql-connector", predicate: broader, target: "concept:log-based-cdc", evidence: "[[CDC-Debezium-Concept#Debezium MySQL 흐름]]"}
  - {subject: "concept:debezium-mysql-connector", predicate: requires, target: "concept:debezium-schema-history", evidence: "[[CDC-Debezium-Concept#Debezium MySQL 흐름]]"}
  - {subject: "concept:debezium-mysql-connector", predicate: has_tradeoff, target: "concept:connector-restart-redelivery", evidence: "[[CDC-Debezium-Concept#순서와 전달 보장]]"}
  - {subject: "concept:version-guard", predicate: addresses, target: "concept:stale-payload-application", evidence: "[[CDC-Debezium-Concept#순서와 전달 보장]]"}
  - {subject: "concept:debezium-mysql-connector", predicate: requires, target: "concept:binlog-format-row", evidence: "[[CDC-Debezium-Setup#MySQL CDC의 전제]]"}
  - {subject: "concept:debezium-postgresql-connector", predicate: broader, target: "concept:log-based-cdc", evidence: "[[CDC-Debezium-Setup#PostgreSQL CDC의 전제]]"}
  - {subject: "concept:debezium-postgresql-connector", predicate: requires, target: "concept:wal-level-logical", evidence: "[[CDC-Debezium-Setup#PostgreSQL CDC의 전제]]"}
  - {subject: "concept:debezium-postgresql-connector", predicate: has_tradeoff, target: "concept:inactive-replication-slot-wal", evidence: "[[CDC-Debezium-Setup#미회수 슬롯 주의]]"}
  - {subject: "concept:debezium-postgresql-connector", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[CDC-Debezium-Setup#슬롯 지연과 장애 전환의 경계]]"}
  - {subject: "concept:debezium-incremental-snapshot", predicate: addresses, target: "concept:large-table-snapshot-load", evidence: "[[CDC-Debezium-Setup#초기 스냅샷이 부담되는 경우]]"}
  - {subject: "concept:debezium-incremental-snapshot", predicate: alternative_to, target: "concept:bulk-backfill-with-cdc-catchup", evidence: "[[CDC-Debezium-Operations#Initial snapshot과 streaming 전환]]"}
  - {subject: "concept:bulk-backfill-with-cdc-catchup", predicate: requires, target: "concept:snapshot-stream-cutoff-token", evidence: "[[CDC-Debezium-Operations#Initial snapshot과 streaming 전환]]"}
  - {subject: "concept:offset-skip", predicate: has_tradeoff, target: "concept:offset-skip-data-gap", evidence: "[[CDC-Debezium-Operations#장애별 복구]]"}
  - {subject: "concept:offset-skip", predicate: requires, target: "concept:approved-data-loss-and-backfill-plan", evidence: "[[CDC-Debezium-Operations#장애별 복구]]"}
  - {subject: "concept:log-based-cdc", predicate: has_tradeoff, target: "concept:cdc-pii-blast-radius", evidence: "[[CDC-Debezium-Operations#보안과 거버넌스]]"}
  - {subject: "concept:polling-relay", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox-Relay#Outbox Relay 구현 방식]]"}
  - {subject: "concept:cdc-relay", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox-Relay#Outbox Relay 구현 방식]]"}
  - {subject: "concept:db-native-change-stream-relay", predicate: requires, target: "concept:consumer-idempotency-guaranteed", evidence: "[[Transactional-Outbox-Relay#Outbox Relay 구현 방식]]"}
  - {subject: "concept:db-native-change-stream-relay", predicate: requires, target: "concept:native-stream-lag-alert-below-retention", evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {subject: "concept:dynamodb-streams-relay", predicate: has_tradeoff, target: "concept:dynamodb-cross-item-order-not-guaranteed", evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {subject: "concept:cosmos-db-change-feed-relay", predicate: requires, target: "concept:outbox-item-same-partition-key", evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
  - {subject: "concept:cockroachdb-changefeed-relay", predicate: has_tradeoff, target: "concept:cockroachdb-no-cross-key-or-transaction-order", evidence: "[[Transactional-Outbox-Relay#DB 내장 변경 스트림]]"}
---

# 이벤트 발행 온톨로지 선언: Relay와 CDC

Relay 구현 방식, 변경 캡처 방식과 Debezium 운영 조건에 대한 개념 36개와 타입 관계 39개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/event-publishing.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
