---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["데이터, 검색과 메시징 주제 어휘", "Vocabulary Data"]
ontology_concepts:
  - {id: database, type: Topic, label: Database, aliases: [DB, 데이터베이스]}
  - {id: rdbms, type: Topic, label: RDBMS, aliases: [Relational Database, 관계형 데이터베이스], broader: database}
  - {id: mysql, type: Topic, label: MySQL, broader: rdbms}
  - {id: innodb, type: Topic, label: InnoDB, broader: mysql}
  - {id: postgresql, type: Topic, label: PostgreSQL, aliases: [postgres], broader: rdbms}
  - {id: oracle, type: Topic, label: Oracle, aliases: [Oracle Database]}
  - {id: sql, type: Topic, label: SQL}
  - {id: transaction, type: Topic, label: Transaction, aliases: [transactions, 트랜잭션]}
  - {id: lock, type: Topic, label: Lock, aliases: [locking, 락]}
  - {id: replication, type: Topic, label: Replication, aliases: [복제]}
  - {id: schema, type: Topic, label: Schema, aliases: [스키마]}
  - {id: modeling, type: Topic, label: Modeling, aliases: [모델링]}
  - {id: storage, type: Topic, label: Storage}
  - {id: metadata, type: Topic, label: Metadata}
  - {id: data, type: Topic, label: Data}
  - {id: redis, type: Topic, label: Redis}
  - {id: cache, type: Topic, label: Cache, aliases: [caching, 캐시]}
  - {id: opensearch, type: Topic, label: OpenSearch}
  - {id: search, type: Topic, label: Search, aliases: [검색]}
  - {id: vector, type: Topic, label: Vector}
  - {id: time-series, type: Topic, label: Time Series, aliases: [시계열]}
  - {id: iceberg, type: Topic, label: Apache Iceberg}
  - {id: messaging, type: Topic, label: Messaging, aliases: [메시징]}
  - {id: kafka, type: Topic, label: Kafka, aliases: [Apache Kafka], broader: messaging}
  - {id: cdc, type: Topic, label: CDC, aliases: [Change Data Capture]}
  - {id: data-pipeline, type: Topic, label: Data Pipeline, aliases: [데이터 파이프라인]}
  - {id: pipeline, type: Topic, label: Pipeline, aliases: [pipelines]}
  - {id: streaming, type: Topic, label: Streaming, aliases: [스트리밍]}
  - {id: batch, type: Topic, label: Batch, aliases: [배치]}
  - {id: idempotency, type: Topic, label: Idempotency, aliases: [idempotent, 멱등성]}
  - {id: retry, type: Topic, label: Retry, aliases: [재시도]}
  - {id: fan-out, type: Topic, label: Fan-out}
---

# 주제 어휘: 데이터, 검색과 메시징

문서 frontmatter의 `tags` 표기를 데이터베이스, 캐시, 검색, 메시징과 데이터 파이프라인 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
