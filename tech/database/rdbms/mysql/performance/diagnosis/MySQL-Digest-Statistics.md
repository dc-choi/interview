---
tags: [database, mysql, performance-schema, digest, performance-insights, prepared-statement, p99, qps]
status: done
verified_at: 2026-08-21
category: "Database - RDBMS"
aliases: ["MySQL Digest Statistics", "max_digest_length", "performance_schema_digests_size", "events_statements_summary_by_digest", "events_statements_histogram_by_digest", "Digest 통계 함정", "MySQL 쿼리 P99"]
---

# MySQL Digest 통계 운영 (PI 통계의 신뢰도 함정)

Performance Insights와 `events_statements_summary_by_digest`는 **정규화된 쿼리(digest)** 단위로 통계를 집계한다. digest는 리터럴을 추상화한 쿼리 형태(`WHERE id = ?`)로, 같은 모양의 쿼리를 한 줄로 묶어 통계를 낸다. 그런데 digest를 **만드는 방식과 저장하는 한계** 때문에 통계가 잘못 묶이거나 아예 유실될 수 있다 — 통계가 어긋나면 [[DB-Incident-Triage|시점 비교 분석]] 자체가 무너진다.

## max_digest_length — 긴 쿼리가 한 덩어리로 오묶임

MySQL은 **전체 SQL이 아니라 `max_digest_length` 바이트만큼 앞부분만 잘라** 정규화해 digest를 만든다. 기본값은 **1024바이트**.

- 앞 1024바이트가 같고 **뒤 조건만 다른** 긴 쿼리들은 서로 다른 쿼리인데도 **하나의 digest로 합쳐진다**.
- 결과적으로 통계가 뭉뚱그려져 어떤 쿼리가 진짜 문제인지 구분이 안 된다.
- **대응**: 관련 파라미터를 늘린다(예: **4096**). 메모리 사용량은 늘지만 실제 영향은 작다고 보고 적용 가능.

> `max_digest_length`(서버)와 `performance_schema_max_digest_length`(performance_schema)는 함께 맞춰야 한다.

## performance_schema_digests_size — 테이블이 차면 신규 통계 유실

digest 통계는 `events_statements_summary_by_digest` 테이블에 저장되고, 저장 가능한 digest 개수는 `performance_schema_digests_size`로 정해진다. 기본값은 `-1`이라 서버가 시작 시점에 크기를 자동 산정하며, 크기를 고정하려면 서버 시작 시 값을 명시한다.

- 이 공간이 꽉 차면 **신규 쿼리의 통계가 개별 행으로 저장되지 않는다** → Performance Insights에서도 안 보인다. (초과분은 `DIGEST`가 `NULL`인 특수 catch-all 행에 합산돼 총 실행 수는 세지만 어떤 쿼리였는지 식별할 수 없다)
- 그 `NULL` 행이 전체 실행의 큰 비중을 차지하면 표가 포화됐다는 신호로 읽는다.
- **대응 두 가지(병행 권장)**:
  1. `performance_schema_digests_size`를 늘린다.
  2. 일정 수준 이상 차면 주기적으로 `TRUNCATE performance_schema.events_statements_summary_by_digest`로 비운다(통계 리셋).

## digest 표에서 P99와 QPS를 뽑는 경로

`events_statements_summary_by_digest`는 digest별로 `MIN_TIMER_WAIT`, `AVG_TIMER_WAIT`, `MAX_TIMER_WAIT`과 함께 `QUANTILE_95`, `QUANTILE_99`, `QUANTILE_999`(피코초)를 직접 제공한다. 이 분위수는 수집된 히스토그램 데이터로 계산한 **상한 추정치(high estimate)**다. 따라서 P99의 1차 소스는 `QUANTILE_99`이고, 평균만 보면 꼬리가 두꺼운 쿼리를 정상으로 오판한다.

버킷 경계와 분포를 직접 봐야 할 때는 짝을 이루는 히스토그램 표로 내려간다. `performance_schema.events_statements_histogram_by_digest`는 `SCHEMA_NAME`, `DIGEST`별로 latency 버킷(`BUCKET_NUMBER`로 식별)을 나누고 버킷마다 `BUCKET_TIMER_LOW`, `BUCKET_TIMER_HIGH`(피코초), `COUNT_BUCKET`, `COUNT_BUCKET_AND_LOWER`, `BUCKET_QUANTILE`을 제공한다. `BUCKET_QUANTILE`은 그 버킷 이하에 속한 statement 비율이므로, 이 값이 0.99 이상이 되는 첫 버킷의 `BUCKET_TIMER_HIGH`가 P99의 상한이다.

```sql
SELECT BUCKET_TIMER_HIGH / 1000000000 AS p99_ms
FROM performance_schema.events_statements_histogram_by_digest
WHERE SCHEMA_NAME = 'appdb' AND DIGEST = ?
  AND BUCKET_QUANTILE >= 0.99
ORDER BY BUCKET_NUMBER
LIMIT 1;
```

읽는 값은 버킷 경계라 실제 P99보다 크게 나오고 정밀도가 버킷 폭에 갇힌다. 절대값을 SLO 판정에 그대로 쓰기보다 같은 digest의 시점 간 추세 비교에 쓴다.

QPS는 두 층에서 나온다.

| 층 | 소스 | 산출 | 쓰임 |
|---|---|---|---|
| digest 단위 | `events_statements_summary_by_digest.COUNT_STAR` | 주기적으로 읽어 차분 후 경과 초로 나눔 | 어떤 쿼리 형태가 호출량을 만드는지 |
| 서버 단위 | `SHOW GLOBAL STATUS`의 `Questions`, `Com_select` 등 | 같은 방식으로 차분 | 전체 처리량과 read/write 구성비 |

`Questions`는 클라이언트가 보낸 statement 수를 세고 `COM_PING`, `COM_STMT_PREPARE` 같은 일부 명령과 stored program 내부 statement는 제외하므로, digest 쪽 합계와 정확히 맞지 않는 것이 정상이다.

**리셋 결합에 주의한다.** 두 층 모두 누적 카운터라 재시작과 `TRUNCATE`에서 0으로 떨어진다. 특히 `events_statements_summary_by_digest`를 truncate하면 `events_statements_histogram_by_digest`도 함께 비워진다. 위의 포화 대응으로 주기적 truncate를 돌리면 P99 기준선까지 같이 사라지므로, truncate 주기와 외부 time-series 수집 주기를 함께 설계하고 reset 시점을 기록한다.

## Prepared Statement — PI 통계를 흐리게 한다

MySQL에서 Prepared Statement를 쓰면 Performance Insights에서 **쿼리 통계가 제대로 안 잡힐 수 있다**.

- MySQL은 Prepared Statement를 **커넥션 단위로 관리** → 여러 세션이 많이 만들면 **서버 메모리를 불필요하게 소모**.
- Prepared Statement는 **같은 쿼리를 여러 번 재사용**할 때 이득이다. 매 쿼리마다 prepare → execute → close를 반복하면 오히려 비효율.
- **가이드**: 재사용 없이 1회성으로 prepare/close를 반복하는 패턴이 보이면 Prepared Statement 사용을 줄인다. (드라이버의 동적 쿼리가 만드는 캐시 폭발은 [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]] 참고)

## PostgreSQL은 이 함정에서 비교적 자유롭다

| 항목 | MySQL | PostgreSQL |
|------|-------|------------|
| digest 식별 | SQL 텍스트 앞부분(`max_digest_length`) 절단 | **쿼리 파싱 결과(queryid) 기반** |
| 긴 쿼리 오묶임 | 발생 가능 | 적음 |
| 통계 테이블 포화 | 꽉 차면 신규 유실 → 수동 truncate 필요 | `pg_stat_statements`가 **덜 쓰인 쿼리를 밀어내고**(LRU 유사) 신규 저장 |

따라서 MySQL에서 필요한 digest 길이 조정이나 테이블 truncate 전략을 PostgreSQL에 그대로 옮길 필요는 없다.

## 면접 체크포인트

- digest(정규화 쿼리)가 통계 집계의 단위인 이유와 `max_digest_length` 절단의 부작용(긴 쿼리 오묶임)
- `performance_schema_digests_size` 포화 시 신규 쿼리 통계가 `NULL` 행으로 합산되는 메커니즘과 대응(증설 + truncate)
- `events_statements_summary_by_digest`의 `QUANTILE_99`가 히스토그램 기반 상한 추정치라는 점과, 버킷 분포를 직접 봐야 할 때 `events_statements_histogram_by_digest`의 `BUCKET_QUANTILE`로 내려가는 경로
- QPS를 digest `COUNT_STAR` 차분과 전역 `Questions` 차분 중 어디서 뽑을지, 두 값이 어긋나는 이유
- truncate가 summary와 histogram을 함께 비워 분위수 기준선을 날린다는 결합
- Prepared Statement가 PI 통계를 흐리고 메모리를 쓰는 이유, 재사용 없는 prepare/close 반복의 비효율
- MySQL(텍스트 절단) vs PostgreSQL(파싱 기반 + LRU 제거) digest 처리 차이
- 통계가 왜곡/유실되면 시점 비교 분석이 무너진다는 연결

## 출처

- [KDMS 데이터베이스 인사이트, DB 이슈 분석 도구와 운영 — YouTube](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=5)
- [Performance Schema Statement Digests and Sampling — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html)
- [Statement Summary Tables — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [Statement Histogram Summary Tables — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-histogram-summary-tables.html)
- [Performance Schema System Variables — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variables.html)
- [Server Status Variables — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)

## 관련 문서
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]] — events_statements_summary_by_digest 활용
- [[DB-Incident-Triage|DB 장애 분석 방법론]] — digest 통계 기반 시점 비교
- [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발]] — 드라이버 동적 쿼리 함정
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]] — 엔진 차이 전반
- [[RDS-Monitoring|RDS 모니터링]] — Performance Insights 운영
