---
tags: [database, rdbms, mysql, performance, tuning, diagnosis]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Performance", "MySQL 성능 튜닝", "MySQL 성능 진단"]
---

# MySQL 성능 튜닝, 진단

MySQL 성능을 좌우하는 파라미터 튜닝과, 느린 쿼리를 찾아내는 진단 도구 문서 모음.

## 파라미터 튜닝

- [[MySQL-InnoDB-Tuning|InnoDB 튜닝 (Buffer Pool, flush_log_at_trx_commit, io_capacity, 압축)]]
- [[MySQL-Aurora-Parameter-Tuning|MySQL/Aurora 파라미터 표준 튜닝 (max_connections 로그스케일, 버퍼 고정차감, temptable, sysdate_is_now, cte 깊이, ngram, OOM Response)]]

## 쿼리 진단

- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단 (Slow Query Log, performance_schema, processlist, 락 대기)]]
- [[MySQL-Digest-Statistics|Digest 통계 운영 (max_digest_length 절단, digests_size 포화/truncate, Prepared Statement PI 영향, PG 비교)]]
