---
tags: [database, rdbms, mysql, join, optimizer, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Join Optimization", "MySQL 조인 최적화"]
verified_at: 2026-08-04
---

# MySQL 조인 최적화

SQL의 `INNER`, `LEFT` 같은 논리적 join과 nested-loop, hash 같은 물리적 실행 알고리즘은 구분한다. MySQL optimizer는 join 순서, 접근 방식과 알고리즘 후보의 비용을 비교하며, 작은 table을 항상 먼저 읽는 식의 단일 규칙으로 결정하지 않는다.

## Nested-Loop Join

outer input의 각 row에 대해 inner input에서 matching row를 찾는다. inner join key를 selective index로 탐색할 수 있으면 OLTP의 작은 결과 집합에 효율적이다.

```text
outer rows N * inner lookup cost
```

outer가 작아도 inner lookup이 full scan이면 반복 비용이 커질 수 있다. 반대로 inner index가 있어도 outer가 매우 크고 lookup이 non-covering이면 clustered row 접근이 누적된다. 실제 rows와 loops를 곱해 반복 작업량을 확인한다.

## Hash Join

MySQL 8.4는 applicable join index가 없는 equi-join에서 hash join을 사용할 수 있다. 한 input으로 hash table을 만들고 다른 input을 probe한다. memory를 넘으면 disk를 사용할 수 있으므로 build side 크기와 spill을 확인한다.

MySQL 8.4의 hash join은 non-equi 조건도 지원한다. 이 경우 hash Cartesian product를 만든 뒤 조건을 filter하는 형태가 될 수 있어 비용이 클 수 있다. inner join뿐 아니라 outer, semijoin과 antijoin에도 지원 범위가 있다.

따라서 "hash join은 등가 조건만 가능"이나 "index가 있으면 nested loop가 항상 빠르다"고 단정하지 않는다. 조건, 통계와 실제 iterator 시간을 본다.

## BKA와 MRR

Batched Key Access는 outer row의 inner lookup key를 join buffer에 모으고 MRR로 base row 접근의 지역성을 개선하는 nested-loop 계열 방식이다.

MySQL 8.4에서 BKA는 기본적으로 꺼져 있다. 사용하려면 문서 기준으로 다음 optimizer switch 조합이 필요하다.

```sql
SET optimizer_switch =
  'mrr=on,mrr_cost_based=off,batched_key_access=on';
```

활성화만으로 개선을 보장하지 않는다. batch, buffer와 추가 정렬 비용까지 representative workload에서 비교한다.

## Join 순서와 추정치

join 순서는 시작 table의 크기보다 predicate 적용 뒤의 예상 rows, inner access 비용, join dependency와 정렬 요구에 좌우된다. 잘못된 cardinality estimate는 다음 table의 반복 횟수까지 곱해진다.

1. `EXPLAIN ANALYZE`에서 각 iterator의 estimated rows, actual rows와 loops를 비교한다.
2. stale statistics와 skew, correlated column, parameter shape를 확인한다.
3. join 전에 한 table에서 안전하게 적용할 수 있는 predicate가 있는지 본다.
4. inner lookup index의 key 순서와 covering 가능성을 검토한다.
5. 반환 row 수를 바꾸지 않는지 확인하며 query rewrite를 회귀 테스트한다.

outer join에서는 row 보존 의미가 join reorder와 predicate 이동을 제한한다. `LEFT JOIN`의 right-table 조건을 `WHERE`로 옮기면 inner join처럼 결과가 바뀔 수 있으므로 성능만 보고 이동하지 않는다.

## Covering으로 반복 lookup 줄이기

inner secondary index가 join key와 필요한 projection을 덮으면 각 loop에서 clustered row lookup을 생략할 수 있다. 큰 outer input에서는 작은 loop당 절감도 누적된다. 다만 넓은 index의 쓰기 비용과 buffer-pool pressure를 함께 측정한다.

## Hint 사용 원칙

`JOIN_ORDER`, `JOIN_FIXED_ORDER`, index hint로 선택을 제한할 수 있지만 hint는 충돌하거나 적용할 수 없으면 무시될 수 있다. 다음 순서로 접근한다.

1. 결과 집합과 predicate를 확인한다.
2. 통계, histogram과 index를 점검한다.
3. 실제 plan을 반복 측정한다.
4. plan 안정성이 필요한 제한된 query에만 hint를 쓰고 upgrade 때 재검증한다.

## 출처

- [MySQL 8.4, Nested-Loop Join Algorithms](https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html)
- [MySQL 8.4, Hash Join Optimization](https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html)
- [MySQL 8.4, Block Nested-Loop and Batched Key Access Joins](https://dev.mysql.com/doc/refman/8.4/en/bnl-bka-optimization.html)
- [MySQL 8.4, Multi-Range Read Optimization](https://dev.mysql.com/doc/refman/8.4/en/mrr-optimization.html)
- [MySQL 8.4, Optimizer Hints](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html)
- [인프런, NLJ 동작 원리](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471931)
- [인프런, 해시 조인](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471933)
- [인프런, 드라이빙 테이블 선택](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471934)
- [인프런, join과 커버링 인덱스](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471939)

## 관련 문서

- [[SQL-Joins|SQL 조인]]
- [[Execution-Plan|실행 계획]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
