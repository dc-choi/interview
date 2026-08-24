---
tags: [database, rdbms, mysql, performance, optimizer, index]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Query Optimization", "MySQL Query 최적화"]
---

# MySQL Query 최적화

옵티마이저가 실행 계획을 고르는 근거와 인덱스 접근, 정렬, 조인 비용을 다루는 문서를 모은다.

- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]: ICP, skip scan, Index Merge, MRR, invisible/descending index
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]: persistent statistics, histogram, 고정 selectivity 회피, 진단 순서
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 쿼리 pipeline과 정렬]]: filesort, temporary table, LIMIT, GROUP BY
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]: nested loop, hash join, BKA/MRR, join 순서, covering lookup 절감, hint 원칙

## 함께 볼 문서

- [[MySQL-Performance|MySQL 성능 튜닝, 진단]]
