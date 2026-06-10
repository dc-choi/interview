---
tags: [cdc, debezium, kafka, mysql, data-pipeline, change-data-capture, binlog]
status: index
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC", "Change Data Capture", "Debezium", "MySQL CDC", "Aurora CDC"]
---

# CDC, Debezium

CDC(Change Data Capture)는 **데이터베이스의 변경(INSERT/UPDATE/DELETE)을 실시간 스트림으로 뽑아내는 기법**. 애플리케이션 코드를 건드리지 않고 DB 자체의 로그(MySQL binlog, PostgreSQL WAL)를 파싱해 이벤트로 만든다. 서비스 간 데이터 동기화, 이벤트 드리븐 아키텍처, ETL, 검색 인덱스 갱신, 캐시 무효화의 공통 기반 기술. 내용은 아래 세 문서로 분리.

- [[CDC-Debezium-Concept|개념과 아키텍처]] — 왜 CDC인가, 구현 방식 3가지, Debezium 구조, 대안 도구, 사용 시나리오, Outbox 관계
- [[CDC-Debezium-Setup|DB별 전제와 동작 모드]] — MySQL binlog, PostgreSQL WAL, RDS/Aurora 특수사항, Snapshot과 Streaming
- [[CDC-Debezium-Operations|운영과 장애 대응]] — 운영 체크리스트, 대규모 4지표, SMT, Exactly-Once, 흔한 실수, 면접 체크포인트

## 관련 문서
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[MQ-Kafka|Kafka]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[MySQL-Backup|MySQL 백업, 복원]]
