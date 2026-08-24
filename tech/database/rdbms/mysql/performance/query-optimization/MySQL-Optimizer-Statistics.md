---
tags: [database, rdbms, mysql, optimizer, statistics, histogram, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Optimizer Statistics", "MySQL 옵티마이저 통계"]
verified_at: 2026-08-04
---

# MySQL 옵티마이저 통계

MySQL optimizer는 후보 접근 방식과 join 순서의 예상 비용을 비교한다. 예상 rows와 실제 rows가 크게 어긋나면 좋은 index가 있어도 비싼 계획을 선택할 수 있으므로, query rewrite나 hint보다 먼저 추정 근거를 확인한다.

## 실행 계획의 추정치

traditional `EXPLAIN`에서 다음 값을 함께 본다.

- `rows`: 해당 table에서 조사할 것으로 추정한 행 수
- `filtered`: table condition을 통과할 것으로 추정한 비율
- `rows * filtered / 100`: 다음 table로 전달할 행 수의 근사치
- `key`, `key_len`: 선택한 index와 사용 가능한 key 부분에 대한 단서

이 값은 실행 결과가 아니다. `EXPLAIN ANALYZE`의 actual rows와 loops를 비교하고, 오차가 상위 iterator로 곱해지는 지점을 찾는다. 2배나 10배 같은 고정 허용 기준보다 오차가 계획 선택과 전체 처리량을 바꾸는지가 중요하다.

## InnoDB persistent statistics

InnoDB는 table과 index 통계를 disk에 저장해 restart 후에도 유지할 수 있다. `innodb_stats_persistent`는 기본 활성화되어 있고, 자동 재계산도 기본 활성화된다.

- table의 10%보다 많은 행이 변경되면 background 재계산이 예약될 수 있다.
- 재계산은 비동기이므로 변경 직후 통계가 즉시 정확하다고 가정하지 않는다.
- sample page 수를 늘리면 안정성이 나아질 수 있지만 `ANALYZE TABLE` 비용도 커진다.
- `ANALYZE TABLE`은 table/index 통계를 명시적으로 갱신한다.

운영에서 통계를 다시 모을 때 metadata lock, I/O와 plan change 가능성을 함께 관리한다.

## Histogram

index 통계만으로 알기 어려운 nonindexed column의 값 분포를 histogram으로 보완할 수 있다.

```sql
ANALYZE TABLE orders
UPDATE HISTOGRAM ON status WITH 64 BUCKETS;

SELECT *
FROM information_schema.column_statistics
WHERE table_name = 'orders';
```

MySQL은 distinct 값 수와 bucket 수에 따라 singleton 또는 equi-height histogram을 만든다. bucket을 늘린다고 항상 더 좋은 계획이 되는 것은 아니며, 표본과 분포 변화에 따른 추정 오차를 실제 query로 검증한다.

range optimizer가 index dive 등으로 얻은 추정치가 있으면 histogram보다 그 추정이 우선될 수 있다. histogram은 index를 대신하는 구조가 아니고 row 위치도 저장하지 않는다.

## 수동 갱신과 자동 갱신

MySQL 8.4의 histogram은 기본적으로 `MANUAL UPDATE`다. 생성할 때 `AUTO UPDATE`를 지정하면 다음 상황에서 갱신될 수 있다.

- 해당 table에 `ANALYZE TABLE` 실행
- InnoDB persistent statistics의 background 자동 재계산

```sql
ANALYZE TABLE orders
UPDATE HISTOGRAM ON status
WITH 64 BUCKETS AUTO UPDATE;
```

`AUTO UPDATE`를 지정하지 않은 histogram까지 table 통계와 함께 자동으로 최신화된다고 가정하면 안 된다. 제거는 `ANALYZE TABLE ... DROP HISTOGRAM`을 사용한다.

## 고정 selectivity 규칙을 피하는 이유

인덱스 사용 여부에는 반환 비율뿐 아니라 row 폭, covering 여부, clustering, cache, storage 비용, 정렬, `LIMIT`과 통계가 함께 작용한다. "전체의 20%면 full scan" 같은 보편 임계값은 없다. 비용 모델의 상수도 `mysql.server_cost`, `mysql.engine_cost`에서 조정 가능하므로 환경별 실측이 필요하다.

## 진단 순서

1. 같은 literal/parameter shape로 `EXPLAIN ANALYZE`를 수집한다.
2. 각 iterator의 estimated rows와 actual rows, loops를 비교한다.
3. table/index statistics의 갱신 시점과 sample 설정을 확인한다.
4. skew가 큰 nonindexed predicate라면 histogram을 후보로 검토한다.
5. 통계 갱신 전후 plan과 p95, rows examined를 회귀 비교한다.
6. hint는 통계와 schema로 해결하지 못한 안정성 요구가 있을 때만 제한적으로 쓴다.

## 출처

- [MySQL 8.4, Optimizer Statistics](https://dev.mysql.com/doc/refman/8.4/en/optimizer-statistics.html)
- [MySQL 8.4, ANALYZE TABLE](https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html)
- [MySQL 8.4, InnoDB Persistent Statistics](https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html)
- [MySQL 8.4, EXPLAIN Output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4, The Optimizer Cost Model](https://dev.mysql.com/doc/refman/8.4/en/cost-model.html)
- [인프런, 비용 기반 옵티마이저](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471923)
- [인프런, 테이블 통계 정보](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471924)
- [인프런, 히스토그램 활용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471928)

## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[MySQL-Advanced-Index-Access|MySQL 고급 인덱스 접근]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
