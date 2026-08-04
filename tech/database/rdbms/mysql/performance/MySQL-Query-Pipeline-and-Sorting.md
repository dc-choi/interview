---
tags: [database, rdbms, mysql, iterator, sorting, group-by, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Query Pipeline and Sorting", "MySQL 파이프라인과 정렬"]
verified_at: 2026-08-04
---

# MySQL 쿼리 파이프라인과 정렬

MySQL 8.4의 TREE 실행 계획은 iterator가 자식에게서 row를 받아 부모로 전달하는 구조를 보여 준다. 전체 중간 결과를 먼저 만드는 operator도 있고 row를 받는 즉시 넘길 수 있는 operator도 있다. `LIMIT`, 정렬과 집계의 비용은 이 경계에서 달라진다.

## Pipeline과 조기 종료

index가 `WHERE`와 `ORDER BY`를 함께 지원하면 scan이 이미 필요한 순서로 row를 내보낼 수 있다. 상위 `LIMIT` iterator는 필요한 수를 받은 뒤 자식 scan을 멈출 수 있다.

```sql
CREATE INDEX idx_posts_category_created
    ON posts(category_id, created_at DESC, id DESC);

SELECT id, created_at
FROM posts
WHERE category_id = 10
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

반대로 정렬이 필요하면 matching rows를 수집하고 정렬한 뒤에야 첫 row를 내보내는 blocking 구간이 생길 수 있다. `LIMIT`가 있어도 조건을 만족하는 후보 탐색 비용이 자동으로 20행이 되는 것은 아니다.

## `Using filesort` 해석

`Using filesort`는 index 순서만으로 결과를 만들지 못해 추가 정렬 단계를 사용한다는 뜻이다. 항상 disk sort라는 뜻은 아니다. MySQL은 memory buffer를 사용하고 필요할 때 disk temporary file을 사용한다.

확인할 것은 표시 자체보다 다음 값이다.

- 정렬에 들어간 실제 row 수와 row 폭
- sort buffer와 disk spill 여부
- 첫 row가 나오기까지 걸린 시간
- 정렬 key와 index key의 방향, prefix
- `LIMIT`와 data skew가 plan에 미친 영향

동일한 `ORDER BY` 값 사이의 순서는 보장되지 않는다. pagination이나 반복 가능한 결과가 필요하면 unique tiebreaker를 추가한다.

## Index 정렬을 사용할 수 있는 조건

복합 index는 leftmost prefix와 key-part 방향에 따라 순서를 제공한다. 선행 key가 상수 조건으로 고정되면 뒤 key의 정렬을 활용할 수 있다. MySQL 8.4 descending index는 `(a DESC, b ASC)` 같은 혼합 방향도 저장한다.

index 정렬이 가능해도 많은 base row lookup이 필요하면 optimizer가 table scan과 filesort를 더 싸게 볼 수 있다. query가 covering인지, 반환 비율과 `LIMIT`이 어떤지 함께 비교한다.

## Internal temporary table

MySQL은 `GROUP BY`, `DISTINCT`, `UNION`, 일부 window function이나 materialization에 internal temporary table을 사용할 수 있다. `Using temporary`는 진단 신호이지 즉시 장애라는 판정은 아니다.

MySQL 8.4의 기본 in-memory engine은 TempTable이고, 크기와 전역 한도를 넘으면 disk의 InnoDB temporary table로 전환될 수 있다. `tmp_table_size`, TempTable memory 한도와 실제 workload를 함께 본다. status counter만으로 특정 query의 spill을 단정하지 않는다.

## `GROUP BY`와 index

### Loose Index Scan

각 group의 일부 key만 읽어 결과를 만들 수 있다. 일반적인 조건은 다음과 같다.

- single table query
- `GROUP BY` column이 index의 leftmost prefix
- 나머지 key part 조건과 aggregate가 지원 형태를 만족

traditional `EXPLAIN`에서는 `Using index for group-by`로 보일 수 있다. `MIN()`과 `MAX()` 외에도 제한된 DISTINCT aggregate 형태가 지원되므로 함수 이름만으로 판정하지 않는다.

### Tight Index Scan

range를 만족하는 index key를 모두 읽되, key 순서를 활용해 grouping할 수 있다. loose scan처럼 group 사이를 건너뛰지는 않지만 temporary table을 피할 수 있다. index를 썼다는 사실보다 실제 읽은 rows와 grouping 단계의 시간을 비교한다.

## 검증 절차

1. 결과의 결정적인 정렬 순서를 먼저 정의한다.
2. TREE 형식 `EXPLAIN ANALYZE`에서 iterator 경계와 actual rows, loops를 본다.
3. index scan, filesort, temporary table 대안을 같은 데이터 분포로 비교한다.
4. 첫 페이지와 깊은 페이지, 작은 group과 skew가 큰 group을 각각 측정한다.
5. index 추가 전 쓰기 비용과 기존 index 중복을 확인한다.

## 출처

- [MySQL 8.4, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4, ORDER BY Optimization](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)
- [MySQL 8.4, LIMIT Query Optimization](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
- [MySQL 8.4, GROUP BY Optimization](https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html)
- [MySQL 8.4, Internal Temporary Table Use](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [인프런, Top-N 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471871)
- [인프런, 파이프라인 모델 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471872)
- [인프런, filesort, 메모리와 디스크](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471942)
- [인프런, GROUP BY 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471948)

## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[Pagination-Optimization|페이징 성능 최적화]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
