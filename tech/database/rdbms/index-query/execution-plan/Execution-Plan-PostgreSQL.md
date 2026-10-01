---
tags: [database, rdbms, postgresql, query-plan, statistics, parallel-query, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["PostgreSQL 실행 계획", "PostgreSQL EXPLAIN 읽기", "pg_stats", "PostgreSQL 병렬 계획"]
verified_at: 2026-09-30
---

# PostgreSQL 실행 계획과 planner 통계

PostgreSQL `EXPLAIN`은 MySQL traditional 표처럼 테이블당 한 줄이 아니라 계획 노드의 트리로 나온다. 숫자의 단위와 병렬 노드의 의미, planner가 읽는 통계를 알아야 추정과 실측의 차이를 해석할 수 있다. PostgreSQL 18 기준이다.

## 계획 노드 읽기

PostgreSQL의 `cost`는 시간이 아니라 planner가 비교하는 임의 단위다. `cost=startup..total`, `rows`, `width`는 모두 추정치이며, `EXPLAIN ANALYZE`의 `actual time`, `rows`, `loops`와 같은 단위가 아니다.

| 노드 | 의미 | 확인할 점 |
|---|---|---|
| `Seq Scan` | 테이블 페이지를 순차 탐색 | 반환 비율이 높다면 인덱스보다 합리적일 수 있음 |
| `Index Scan` | 인덱스로 위치를 찾고 heap 행을 읽음 | `Index Cond`와 heap 접근량 |
| `Index Only Scan` | 가시성 조건이 맞으면 heap 접근을 줄임 | `Heap Fetches`, visibility map |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | 여러 위치를 모아 물리적 페이지 순서로 heap을 읽음 | `Recheck Cond`, 읽은 heap block 수 |
| `Gather` / `Gather Merge` | worker의 병렬 결과를 합침 | worker 수, worker별 실제 행 수와 coordinator 병목 |
| `Sort` | 입력을 정렬 | 정렬 자체보다 메모리 또는 디스크 사용과 입력 행 수 |

`Index Cond`는 인덱스 탐색 범위를 줄이는 조건이고, `Filter`는 읽어 온 행에 나중에 적용하는 조건이다. `Rows Removed by Filter`가 크면 predicate와 인덱스 정의가 맞지 않는지 확인한다. 가장 먼저 볼 숫자는 각 노드의 예상 `rows`와 실제 `rows × loops` 차이다. 큰 차이는 오래된 통계, 상관관계가 반영되지 않은 통계, parameter별 데이터 skew나 잘못된 조건식의 단서가 된다.

반환 행이 적으면 `Index Scan`이 빠르고, 반환 행이 적지 않으면 위치를 비트맵으로 모아 heap을 한꺼번에 읽는 `Bitmap Heap Scan`이 유리할 수 있다. 조건 컬럼에 인덱스를 추가한 뒤 `Seq Scan`이 `Bitmap Heap Scan`으로 바뀌었다면 `Execution Time`과 읽은 block 수로 효과를 확인한다.

함수나 cast가 있다는 이유만으로 인덱스를 절대 사용할 수 없다고 단정하지 않는다. PostgreSQL은 쿼리 식과 일치하는 expression index를 사용할 수 있다. 표준 `C`가 아닌 locale에서 prefix `LIKE`를 지원하려면 `text_pattern_ops` 같은 operator class가 필요하고, 선행 wildcard 검색은 일반 B-tree 범위 탐색과 맞지 않는다.

## cost와 actual 숫자 읽기

- `cost`의 첫 숫자는 출력이 시작되기 전까지의 비용(Sort 노드라면 정렬 시간), 두 번째는 노드가 끝까지 실행된다고 가정한 총비용이다. 단위는 관례상 순차 페이지 읽기 `seq_page_cost`(기본 1.0)를 기준으로 한 상대값이라 절대값보다 변경 전후 비교에 쓴다.
- `width`는 출력 행의 평균 예상 바이트다. `SELECT *` 대신 필요한 컬럼만 조회하면 줄어드는 것으로 projection 개선을 확인할 수 있다.
- `EXPLAIN ANALYZE`의 `actual time`은 첫 행..마지막 행까지의 밀리초이고, `loops`가 2 이상이면 `actual time`과 `rows`는 실행 1회당 평균이다. 노드에서 실제로 쓴 총 시간은 `loops`를 곱해 구한다.
- `Rows Removed by Filter`, 문장 전체의 `Execution Time`을 함께 본다. 튜닝 전후 비교의 목표 지표는 대표 parameter에서의 `Execution Time`이다.
- 18에서는 `ANALYZE`가 `BUFFERS`를 함께 켜고, 실제 rows가 소수 둘째 자리까지 표시되며(`rows=1.00`), 인덱스 스캔 노드에 모든 loop에 걸친 탐색 횟수 `Index Searches`가 나온다. 이전 버전 출력과 비교할 때 형식 차이를 감안한다.

## 병렬 계획

```text
Gather  (cost=1000.00..217018.43 rows=1 width=97)
  Workers Planned: 2
  ->  Parallel Seq Scan on pgbench_accounts  (cost=0.00..216018.33 rows=1 width=97)
```

- `Gather`와 `Gather Merge`는 worker 결과를 leader 한 곳으로 모은다. `Workers Planned`는 planner가 고른 worker 수다.
- `Gather`의 시작 cost에는 worker 기동 비용 `parallel_setup_cost`(기본 1000)가 들어가므로 위 예는 1000.00에서 시작한다. worker에서 leader로 넘기는 행마다 `parallel_tuple_cost`(기본 0.1)가 붙는다.
- `Parallel Seq Scan` 같은 병렬 노드의 예상 `rows`는 전체가 아니라 프로세스 하나 몫이다. PostgreSQL 18 소스는 전체 행을 worker 수와 leader 기여분을 더한 값으로 나눠 추정하고 `Gather`에서 다시 곱한다.
- 실행 시 실제로 뜬 worker는 `Workers Planned`보다 적거나 0일 수 있다. worker는 `max_worker_processes`, `max_parallel_workers` 한도 안에서 가져오므로 `Workers Launched`를 함께 본다.
- 숫자를 단순하게 비교하려면 세션에서 `SET max_parallel_workers_per_gather = 0;`으로 병렬을 끄고 일반 `Seq Scan` 계획과 비교한다. 이 값을 0으로 두면 병렬 실행이 꺼지므로 비교 실험용으로만 쓴다.

## InitPlan과 SubPlan

SELECT 절이나 WHERE 절의 서브쿼리가 행마다 실행되는지는 노드 이름과 `loops`로 확인한다.

- `InitPlan`: 바깥 쿼리의 변수를 참조하지 않고 최대 한 행을 내는 서브쿼리다. 바깥 계획 실행마다 한 번만 돌고 결과를 재사용한다.
- `SubPlan`: 바깥 행의 값을 받아 평가하는 상관 서브쿼리다. 바깥 행마다 실행될 수 있어 대량 데이터에서 느려진다.
- hashed SubPlan: 바깥 변수를 참조하지 않는 `IN`, `ANY` 서브쿼리는 한 번 실행해 해시 테이블로 만든 뒤 탐색할 수 있다.

SELECT 절의 스칼라 서브쿼리가 `SubPlan`으로 나오고 `loops`가 바깥 행 수만큼 크면 조인이나 집계 후 조인으로 바꾸는 방안을 비교한다.

## planner 통계 들여다보기

planner는 실제 데이터가 아니라 통계로 계획을 고른다. 테이블 단위의 행 수와 페이지 수는 `pg_class`의 `reltuples`, `relpages`에, 컬럼 단위 분포는 `pg_statistic`에 있고, 사람이 읽기 좋은 뷰가 `pg_stats`다. `pg_stats`는 읽기 권한이 있는 테이블의 행만 보여 준다.

```sql
SELECT attname, null_frac, n_distinct, most_common_vals,
       most_common_freqs, correlation
FROM pg_stats
WHERE schemaname = 'public' AND tablename = 'transactions';
```

| 컬럼 | 의미 |
|---|---|
| `null_frac` | NULL 비율 |
| `n_distinct` | 양수면 추정 고유값 수, 음수면 고유값 수 ÷ 행 수의 음수. 테이블이 커질수록 고유값이 늘 것으로 보면 음수 형식을 쓰며 `-1`은 유니크 컬럼 |
| `most_common_vals`, `most_common_freqs` | 자주 등장하는 값과 그 빈도 |
| `histogram_bounds` | MCV를 뺀 나머지 값을 비슷한 개수로 나누는 경계 |
| `correlation` | 물리 저장 순서와 값 순서의 상관(-1~+1). ±1에 가까우면 인덱스 스캔의 랜덤 접근이 줄어 싸게 추정됨 |

- 통계는 `ANALYZE`와 `VACUUM ANALYZE`가 표본으로 갱신한다. 표본 크기는 `default_statistics_target`(기본 100)과 컬럼별 `ALTER TABLE ... SET STATISTICS`로 조정한다.
- autovacuum은 마지막 `ANALYZE` 이후 변경된 행 수가 `autovacuum_analyze_threshold`(기본 50) + `autovacuum_analyze_scale_factor`(기본 0.1) × 행 수를 넘으면 `ANALYZE`한다. 평소 수동 실행은 필요 없지만, 짧은 시간의 대량 INSERT나 DELETE로 autovacuum이 돌기 전에 분포가 크게 바뀌면 수동 `ANALYZE`를 검토한다.
- autovacuum은 partitioned table의 부모와 foreign table은 `ANALYZE`하지 않는다. 처음 적재한 뒤와 partition 분포가 크게 바뀐 뒤에 부모를 수동으로 `ANALYZE`한다.
- 단일 컬럼 통계는 컬럼 사이의 상관을 표현하지 못한다. `city`와 `zip`처럼 함께 조건에 쓰이는 상관 컬럼은 `CREATE STATISTICS`로 functional dependency, 다중 컬럼 n-distinct, 다중 컬럼 MCV를 만들 수 있다. 필요한 조합에만 만든다. `ANALYZE`와 계획 수립 비용이 늘기 때문이다.

예상 rows와 실제 rows 차이가 크면 먼저 통계 갱신 시점을 보고, 그다음 해당 조건 컬럼의 `pg_stats`와 상관 컬럼 여부를 확인한다.

## 실험 데이터 준비

대표 데이터가 없을 때 `generate_series`와 `random()`으로 수십만에서 수백만 건의 합성 데이터를 만들어 계획 모양을 볼 수 있다. FK 검증이 없는 테이블에 넣으면 적재가 빠르다. 다만 균등 난수는 실제 skew와 컬럼 상관을 재현하지 못하므로, 합성 데이터로는 노드 모양과 병렬 여부만 보고 성능 결론은 대표 데이터로 다시 확인한다.

## 출처

- [PostgreSQL 18 Documentation, EXPLAIN](https://www.postgresql.org/docs/18/sql-explain.html)
- [PostgreSQL 18 Documentation, Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [PostgreSQL 18 Documentation, How Parallel Query Works](https://www.postgresql.org/docs/18/how-parallel-query-works.html)
- [PostgreSQL 18 Documentation, Resource Consumption](https://www.postgresql.org/docs/18/runtime-config-resource.html)
- [PostgreSQL 18 Documentation, Query Planning](https://www.postgresql.org/docs/18/runtime-config-query.html)
- [PostgreSQL 18 Documentation, pg_stats](https://www.postgresql.org/docs/18/view-pg-stats.html)
- [PostgreSQL 18 Documentation, Statistics Used by the Planner](https://www.postgresql.org/docs/18/planner-stats.html)
- [PostgreSQL 18 Documentation, Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 Documentation, Automatic Vacuuming](https://www.postgresql.org/docs/18/runtime-config-autovacuum.html)
- [PostgreSQL 18 Documentation, ANALYZE](https://www.postgresql.org/docs/18/sql-analyze.html)
- [PostgreSQL 18 Documentation, Index-Only Scans and Covering Indexes](https://www.postgresql.org/docs/18/indexes-index-only-scans.html)
- [PostgreSQL 18 Documentation, Indexes on Expressions](https://www.postgresql.org/docs/18/indexes-expressional.html)
- [PostgreSQL 18 Documentation, Operator Classes](https://www.postgresql.org/docs/18/indexes-opclass.html)
- [cost_gather, compute_gather_rows, src/backend/optimizer/path/costsize.c — PostgreSQL REL_18_STABLE GitHub](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/optimizer/path/costsize.c)
- [PostgreSQL EXPLAIN과 인덱스 성능 비교 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439101)
- [데이터베이스 성능 최적화 패턴 1 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439102)
- [데이터베이스 성능 최적화 패턴 2 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439103)
- [서브 쿼리를 활용하여 쿼리 결과에 대한 조건 및 데이터 소스 활용하기 — 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432804)

## 관련 문서

- [[Execution-Plan|실행 계획 목차]]
- [[Execution-Plan-Basics|실행 계획 기본]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
