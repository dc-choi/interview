---
tags: [database, mysql, slow-query, performance-schema, monitoring]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Slow Query", "performance_schema", "pt-query-digest"]
---

# MySQL Slow Query 진단

평균은 멀쩡한데 P95, P99 응답이 튀거나 슬로우 알람이 자주 오면 **개별 쿼리 단위**로 원인 추적이 필요. MySQL은 4가지 도구를 제공 — Slow Query Log, performance_schema, `SHOW PROCESSLIST`, `information_schema.innodb_*`. 각 도구의 적합 사용처를 알면 사고 시간이 분 단위에서 초 단위로 줄어든다.

## 4가지 진단 도구

| 도구 | 적합 시나리오 | 비용 |
|------|-------------|------|
| **Slow Query Log** | 사후 패턴 분석, 워크로드 변화 추적 | 디스크 쓰기 (가벼움) |
| **performance_schema** | 실시간, 집계, 다이제스트 단위 통계 | 메모리, CPU 약간 |
| **SHOW PROCESSLIST** | 지금 이 순간 무엇이 도는가 | 무시 가능 |
| **innodb_lock_waits, innodb_trx** | 락 대기, 데드락 추적 | 무시 가능 |

## Slow Query Log

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 0.5;        -- 0.5초 이상
SET GLOBAL log_queries_not_using_indexes = ON;   -- 인덱스 안 쓴 쿼리도
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

`long_query_time`은 **초 단위(소수점 가능)** — 0.1, 0.5, 1처럼 도메인 SLO에 맞춰. 운영에서는 보통 0.5~1s 시작 → 점진 강화.

### 분석 도구

| 도구 | 용도 |
|------|------|
| `mysqldumpslow` | MySQL 기본, 패턴 그룹화 (가벼움) |
| `pt-query-digest` (Percona) | 다이제스트, 정렬, 통계 풍부 |
| 운영급 APM | DataDog/PMM 등이 자동 수집 |

```bash
# 횟수 기준 상위 10개
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# 총 소요 시간 기준
pt-query-digest /var/log/mysql/slow.log --limit 10
```

`pt-query-digest`가 표준 — 쿼리 다이제스트(파라미터 추상화한 쿼리 형태)별로 횟수, 총 시간, 평균, P95 출력 → 우선순위 즉시 파악.

## performance_schema — 실시간 집계

MySQL 내부의 라이브 통계. 재시작, 로그 회전 영향 없음. 다이제스트 단위로 자동 집계.

```sql
SELECT
  digest_text,
  count_star,
  ROUND(avg_timer_wait / 1e9, 2)  AS avg_ms,
  ROUND(max_timer_wait / 1e9, 2)  AS max_ms,
  sum_rows_examined,
  sum_rows_sent
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_timer_wait DESC
LIMIT 10;
```

핵심 컬럼:
- `count_star` — 실행 횟수
- `avg/max_timer_wait` — 피코초 (`/1e9` = ms)
- `sum_rows_examined` — 옵티마이저가 검사한 행 (인덱스 효율성 신호)
- `sum_rows_sent` — 클라이언트에 보낸 행

`rows_examined / rows_sent` 비율이 크면 **인덱스 부족 또는 WHERE 조건 비효율**. 1:1에 가깝게 만드는 것이 튜닝 목표.

### 다이제스트 풀 운영

```sql
-- 통계 초기화 (튜닝 후 효과 측정)
TRUNCATE performance_schema.events_statements_summary_by_digest;

-- 집계 가능한 다이제스트 수 늘리기 (기본 5000)
SET GLOBAL performance_schema_digests_size = 10000;
```

## SHOW PROCESSLIST, information_schema.processlist

지금 이 순간 어떤 쿼리가 도는가. 사고 대응 1차 도구.

```sql
SELECT id, user, host, db, command, time, state, LEFT(info, 100) AS query
FROM information_schema.processlist
WHERE command != 'Sleep' AND time > 5
ORDER BY time DESC;
```

| 컬럼 | 의미 |
|------|------|
| `time` | 현재 명령이 시작된 후 경과 (초) |
| `state` | `Sending data`, `Locked`, `Copying to tmp table` 등 |
| `info` | 실행 중 쿼리 (긴 쿼리 자르기) |

오래 걸리는 트랜잭션 차단 시 `KILL <id>` — 단 in-flight 작업 영향 고려.

## 락 대기 추적

```sql
SELECT
  r.trx_id            AS waiting_trx,
  r.trx_mysql_thread_id AS waiting_thread,
  r.trx_query         AS waiting_query,
  b.trx_id            AS blocking_trx,
  b.trx_mysql_thread_id AS blocking_thread,
  b.trx_query         AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;
```

MySQL 8.0에서는 `performance_schema.data_locks` / `data_lock_waits`로 더 풍부한 정보. 락 종류(`LOCK_TYPE`/`LOCK_MODE`/`LOCK_DATA`)까지 보임 — Gap Lock 디버깅 표준.

데드락 직후 진단:

```sql
SHOW ENGINE INNODB STATUS\G
-- LATEST DETECTED DEADLOCK 섹션에 마지막 데드락 트랜잭션 한 쌍
```

## InnoDB 메트릭

```sql
-- Buffer Pool 적중률, 체크포인트 등
SELECT * FROM information_schema.innodb_metrics
WHERE status = 'enabled' AND name LIKE '%buffer_pool%';

-- 또는
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';
```

```
Innodb_buffer_pool_read_requests / (read_requests + reads)  → 적중률
```

99% 이상이 일반적 목표. 90% 이하면 [[MySQL-InnoDB-Tuning|버퍼풀 튜닝]] 검토.

## 사고 대응 워크플로

```
1. 알람 수신 (P95, 에러율, 슬로우 카운트)
2. SHOW PROCESSLIST: 지금 도는 비정상 쿼리?
3. innodb_lock_waits: 락 대기 사슬 있나?
4. performance_schema.events_statements_summary_by_digest:
   최근 통계로 어떤 다이제스트가 새로 튀었나?
5. Slow Query Log: 사후 분석, 튜닝 우선순위
6. EXPLAIN으로 개별 쿼리 실행 계획 재확인
```

## 흔한 실수

- **`long_query_time = 10s`로 시작**: 진짜 느린 것만 잡힘. 0.5~1s가 운영 출발점.
- **Slow Query Log만 보고 분석**: 파라미터별로 흩어져 패턴 안 보임. `pt-query-digest`로 다이제스트 그룹화.
- **performance_schema 비활성화**: 5.6+ 기본 활성, 비활성된 환경이라면 켜기. 비용 미미.
- **`KILL` 남발**: 진행 중 트랜잭션 끊으면 롤백 비용 큼. 원인 파악 후 신중하게.
- **`rows_examined`/`rows_sent` 비율 무시**: 1000:1, 10000:1 같은 비율은 인덱스 부재 강력 신호.
- **데드락 직후 SHOW ENGINE INNODB STATUS 안 봄**: 직후가 아니면 다른 데드락에 덮임 — 즉시 수집, 로그 적재.

## 면접 체크포인트

- 4가지 진단 도구의 적합 사용처
- `long_query_time` 시작값 — 0.5~1s가 일반적
- `pt-query-digest` 같은 다이제스트 그룹화의 의미
- `events_statements_summary_by_digest`의 핵심 컬럼 (rows_examined/rows_sent 비율)
- `SHOW PROCESSLIST`로 in-flight 쿼리 추적
- `innodb_lock_waits` + `data_locks`로 락 사슬 진단
- 데드락 분석 — `SHOW ENGINE INNODB STATUS`의 LATEST DETECTED DEADLOCK
- Buffer Pool 적중률 (99% 목표) 모니터링

## 관련 문서

- [[Execution-Plan|EXPLAIN, 실행계획]]
- [[Lock|Lock (row/gap/next-key, 데드락)]]
- [[MySQL-Gap-Lock|Gap Lock 디버깅]]
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝 (Buffer Pool, 로그)]]
- [[Application-Performance-Monitoring|APM (P95/P99, OTel)]]
