---
tags: [database, mysql, performance-schema, slow-query, monitoring, undo]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Diagnosis", "MySQL 진단"]
---

# MySQL 진단

느려진 쿼리와 내부 병목을 서버 쪽 관측 지표로 좁히는 절차와 그 대응, 그리고 근거가 되는 통계 자체가 어긋나는 조건을 다룬다.

- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]]: Slow Query Log, performance_schema, processlist, 락 대기, 실행 계획 대조, 시스템 신호 연결
- [[MySQL-Digest-Statistics|Digest 통계 운영]]: max_digest_length 절단, digests_size 포화/truncate, QUANTILE_99와 BUCKET_QUANTILE P99, COUNT_STAR/Questions QPS, Prepared Statement PI 영향, PG 비교
- [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]: read view 수명, HLL 급증 진단, Aurora 공유 스토리지와 ARRRC

## 함께 볼 문서

- [[MySQL-Performance|MySQL 성능 튜닝, 진단]]
