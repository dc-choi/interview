---
tags: [database, rdbms, mysql, innodb]
status: index
category: "Database - RDBMS"
aliases: ["MySQL"]
---

# MySQL

MySQL 엔진 내부와 운영 문서 모음. InnoDB 구조와 튜닝, 백업, 파티셔닝, 진단, PostgreSQL 비교까지.

- [[MySQL-Architecture|MySQL 아키텍처, SQL 처리 파이프라인 (2계층 구조, 파서/옵티마이저/실행기, 스토리지 엔진, 뷰)]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝 (Buffer Pool, flush_log_at_trx_commit, io_capacity, 압축)]]
- [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]
- [[MySQL-Partitioning|MySQL Partitioning (RANGE/HASH/LIST, Partition Pruning, DROP PARTITION)]]
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단 (Slow Query Log, performance_schema, processlist, 락 대기)]]
- [[MySQL-Backup|MySQL 백업, 복원 (mysqldump, XtraBackup, binlog PITR, RTO/RPO)]]
- [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴 (정규화 위반, 확장 불가, 이식성 부족 8가지 이유)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차 (인덱스 키 길이 767/3072, collation 충돌, latin1 복구)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델, MVCC, Hash Join, Partial Index, Aurora 이관 사례)]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션 (타입 매핑, 함수 재작성, DMS, 시퀀스 보정)]]
