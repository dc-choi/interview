---
tags: [database, rdbms, replication, sharding, clustering]
status: index
category: "Database - RDBMS"
aliases: ["Scaling & Operations", "확장과 운영"]
---

# 확장과 운영 (Scaling & Operations)

RDB를 여러 대로 확장하고 운영하는 전략 모음. 샤딩, 복제, 클러스터링, 읽기 복제본 라우팅.

- [[Sharding|Sharding (키 매핑, 파티셔닝, 샤딩, 레플리케이션 비교, 수직 분할의 I/O 조건, Citus distribution column, colocation, Vitess 계열 앞단 계층 패턴)]]
- [[Replication|Replication (sync / async, 역할 이름과 8.4 문법, 쓰기를 나누지 않는 한계)]]
- [[Clustering|Clustering (DB 서버 다중화)]]
- [[Read-Replica-Routing|Read Replica 라우팅 (자동 분기, Read-After-Write, 트랜잭션, Prisma/TypeORM 구현)]]
- [[Transaction-Logs-Replication-CDC|트랜잭션 로그와 복제, PITR, CDC (binlog, WAL, archive log, replication slot 보존, PG17 failover slot)]]
