---
tags: [database, rdbms, mysql, innodb]
status: index
category: "Database - RDBMS"
aliases: ["MySQL"]
---

# MySQL

MySQL 엔진 내부와 운영 문서 모음. InnoDB 구조와 튜닝, 백업, 파티셔닝, 진단, PostgreSQL 비교까지.

- [[MySQL-Fundamentals|MySQL 기본기 (조회, 자료형, 변경 안전성, 권한, NestJS와 TypeORM)]]
- [[MySQL-Architecture|MySQL 아키텍처, SQL 처리 파이프라인 (2계층 구조, 파서/옵티마이저/실행기, 스토리지 엔진, 뷰)]]
- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴 (IGNORE, UPSERT, REPLACE, 조건부 갱신)]]
- [[MySQL-Performance|성능 튜닝, 진단 (InnoDB Buffer Pool, Aurora 파라미터 표준, Slow Query, Digest 통계)]]
- [[MySQL-Operations|운영 (설정 변경, 압축과 아카이빙, MySQL Job Queue)]]
- [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]
- [[MySQL-Partitioning|MySQL Partitioning (RANGE/HASH/LIST, Partition Pruning, DROP PARTITION)]]
- [[MySQL-Backup|MySQL 백업, 복원 (mysqldump, XtraBackup, binlog PITR, RTO/RPO)]]
- [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴 (정규화 위반, 확장 불가, 이식성 부족 8가지 이유)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차 (인덱스 키 길이 767/3072, collation 충돌, latin1 복구)]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델, MVCC, Hash Join, Partial Index, Aurora 이관 사례)]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션 (타입 매핑, 함수 재작성, DMS, 시퀀스 보정)]]
