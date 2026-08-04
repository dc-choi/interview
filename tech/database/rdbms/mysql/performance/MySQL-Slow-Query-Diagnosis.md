---
tags: [database, mysql, slow-query, performance-schema, monitoring]
status: done
verified_at: 2026-08-04
category: "Database - RDBMS"
aliases: ["MySQL Slow Query", "performance_schema", "pt-query-digest"]
---

# MySQL Slow Query 진단

느린 query는 한 SQL 문장만의 문제가 아닐 수 있다. workload 증가, lock wait, plan 변화, buffer pool, storage와 connection queue를 같은 시간축에서 좁힌 뒤 대표 query의 추정과 실제를 비교한다.

## 관찰 도구의 시간 범위

| 도구 | 보는 범위 | 주의점 |
|---|---|---|
| slow query log | 임계값을 넘겨 완료된 statement 기록 | 파일 I/O, rotation, parameter와 민감값 관리 |
| Performance Schema digest | 정규화된 statement shape의 누적 통계 | finite digest table, restart/reset과 수집 설정 영향 |
| process list/current events | 현재 실행, 대기 중인 session | 순간 snapshot이라 짧은 spike를 놓칠 수 있음 |
| `data_locks`, `data_lock_waits` | 현재 InnoDB lock과 wait 관계 | blocker 종료 전 transaction 영향 확인 |
| `EXPLAIN ANALYZE` | 한 statement의 실제 iterator 시간과 row | statement를 실제 실행해 부하와 DML 부수효과 발생 |

하나만 보지 않는다. Slow log로 반복 shape를 찾고 digest로 총 부하를 우선순위화한 뒤 current wait와 plan을 연결한다.

## Slow query log를 SLO에 맞춘다

```sql
SET PERSIST slow_query_log = ON;
SET PERSIST long_query_time = 0.5;
```

예시의 0.5초는 권장값이 아니다. API와 batch SLO, log volume과 분석 비용을 기준으로 시작값을 정하고 단계적으로 조정한다. `log_queries_not_using_indexes`도 full scan이 정당한 작은 table query까지 대량 기록할 수 있으므로 sampling과 rate를 관찰한다.

운영 전에는 다음을 확인한다.

- log destination, 파일 권한, rotation과 disk 상한
- bind parameter, literal과 comment에 PII/secret이 남는지
- managed service에서 log export와 retention을 어디서 관리하는지
- 설정이 실행 중 값과 재시작 뒤 값에 모두 반영되는지

`mysqldumpslow`나 `pt-query-digest`로 parameter를 제외한 query shape별 count, total time, tail distribution과 rows examined를 묶는다. 평균 시간이 짧아도 호출량이 큰 digest가 총 DB 시간을 지배할 수 있다.

## Digest로 총 비용을 본다

```sql
SELECT DIGEST_TEXT,
       COUNT_STAR,
       SUM_TIMER_WAIT,
       MAX_TIMER_WAIT,
       SUM_ROWS_EXAMINED,
       SUM_ROWS_SENT,
       SUM_CREATED_TMP_DISK_TABLES
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

- total time으로 전체 부하, max와 latency histogram으로 tail을 본다.
- `rows examined / rows sent`는 candidate 신호일 뿐 목표 비율이 아니다. 집계와 존재 확인 등 query 의미에 따라 달라진다.
- temporary disk table, sort, errors와 no-index count를 query 목적과 함께 본다.
- digest table이 포화되면 새 shape가 NULL digest bucket에 합쳐질 수 있다. [[MySQL-Digest-Statistics|Digest 통계 운영 함정]]을 함께 본다.

Performance Schema summary는 영구 이력이 아니다. restart, `TRUNCATE`와 설정 변경 영향을 받으므로 외부 time-series로 필요한 지표를 내보내고 reset 시점을 기록한다.

## 현재 blocker를 찾는다

```sql
SELECT *
FROM performance_schema.data_lock_waits;

SELECT trx_id, trx_state, trx_started,
       trx_mysql_thread_id, trx_rows_locked, trx_query
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

`SHOW PROCESSLIST` 또는 Performance Schema current statement로 실행 시간, state와 query를 보고 `data_lock_waits`의 waiting engine transaction과 blocking transaction을 연결한다. 오래된 blocker를 `KILL`하기 전에 요청 owner, commit 가능성, rollback 크기와 failover 영향을 확인한다. 원인을 수집하지 않고 session을 반복 종료하면 장애 증거만 지울 수 있다.

Deadlock은 wait timeout과 다르다. `SHOW ENGINE INNODB STATUS`의 최근 deadlock과 error log를 즉시 수집하고 transaction별 lock 순서, index와 재시도 정책을 본다.

## 실행 계획으로 좁힌다

1. 실제 느린 parameter shape와 schema, session 설정을 재현한다.
2. `EXPLAIN`에서 access type만 등급처럼 보지 말고 예상 rows와 join 관계를 읽는다.
3. 안전한 환경에서 `EXPLAIN ANALYZE`로 `actual rows * loops`, first-row와 total time을 비교한다.
4. 첫 큰 추정 오차, 반복 lookup 또는 sort/materialization으로 범위를 좁힌다.
5. 통계, query, index 또는 data distribution을 한 가지씩 고치고 같은 workload로 재측정한다.

`ALL`은 작은 table이나 반환 비율이 큰 query에서 합리적일 수 있고 `ref`도 많은 loop가 반복되면 느릴 수 있다. `possible_keys`에 index가 있다는 이유만으로 `FORCE INDEX`를 추가하지 않는다. Hint는 plan regression을 임시로 통제할 수 있지만 data와 version 변화 뒤 부채가 되므로 이유, 만료 조건과 검증 query를 남긴다.

## 시스템 신호와 연결한다

- query latency와 lock wait time
- logical/physical reads, buffer pool eviction과 storage latency
- connection queue, active session과 thread 상태
- redo/checkpoint pressure, temporary disk I/O와 CPU saturation
- replica receiver/applier lag와 long transaction

Hit ratio나 `long_query_time`에 보편적인 합격선은 없다. 사용자 SLO와 baseline 대비 변화가 판단 기준이다.

## 출처

- [MySQL 8.4 Reference Manual, Slow Query Log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.4 Reference Manual, Statement Summary Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL 8.4 Reference Manual, Performance Schema Data Lock Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html)
- [MySQL 8.4 Reference Manual, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 Reference Manual, Optimizer Hints](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html)
- [인프런, Hong, 성능지표 및 EXPLAIN](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338542)

## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[MySQL-Digest-Statistics|Digest 통계 운영 함정]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]
- [[MySQL-Connection-Management|MySQL connection 관리]]
- [[Lock|DB Lock]]
- [[DB-Incident-Triage|DB 장애 분석 방법론]]
