---
tags: [database, rdbms, mysql, tuning, parameter-group, connection]
status: index
category: "Database - RDBMS"
aliases: ["MySQL Parameter Tuning", "MySQL 파라미터 튜닝"]
---

# MySQL 파라미터 튜닝

워크로드 측정으로 잡는 서버 파라미터, fleet 전체에 안전하게 적용하는 표준 템플릿, 그리고 커넥션 예산과 timeout 계약을 나눠 다룬다.

- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]: Buffer Pool, flush_log_at_trx_commit, io_capacity, 압축
- [[MySQL-Aurora-Parameter-Tuning|MySQL/Aurora 파라미터 표준 튜닝]]: max_connections 로그스케일, 버퍼 고정차감, temptable, sysdate_is_now, cte 깊이, ngram, OOM Response
- [[MySQL-Connection-Management|Connection 관리]]: pool 예산, timeout, thread 모델, overload 진단

## 함께 볼 문서

- [[MySQL-Performance|MySQL 성능 튜닝, 진단]]
