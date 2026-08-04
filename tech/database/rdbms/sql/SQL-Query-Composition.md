---
tags: [database, sql, join, subquery, union, case, query-design]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["SQL Query Composition", "SQL 쿼리 조합", "Join Subquery Union Case"]
---

# SQL 쿼리 조합

JOIN, subquery, set operation과 CASE는 여러 관계와 계산 단계를 하나의 결과 집합으로 구성하는 도구다. 문법보다 먼저 **결과 한 row의 의미(grain), 중복/NULL 처리와 단계별 cardinality**를 정의한다.

## JOIN

### INNER JOIN

```sql
SELECT o.id, c.name
FROM orders o
JOIN customer c ON c.id = o.customer_id
WHERE o.ordered_at >= :from;
```

INNER JOIN은 `ON` 조건을 만족하는 row 조합을 반환한다. 흔히 교집합 그림으로 설명하지만 SQL은 중복을 보존하는 bag semantics이고 두 table의 column을 결합하므로 수학적 집합 교집합과 같지는 않다.

- FK에서 unique parent key로 가는 many-to-one join은 left row 하나당 최대 한 parent가 매칭된다.
- parent에서 child로 가는 1:N join은 parent row가 child 수만큼 반복될 수 있다.
- 관계가 아닌 불완전한 key로 join하면 의도하지 않은 many-to-many fan-out이 생긴다.
- optimizer의 물리 join 순서는 작성 순서와 다를 수 있다. `EXPLAIN ANALYZE`로 확인한다.

### OUTER JOIN

LEFT JOIN은 왼쪽 row를 보존하고 매칭되지 않은 오른쪽 column을 NULL로 채운다.

```sql
SELECT c.id
FROM customer c
LEFT JOIN orders o
  ON o.customer_id = c.id
 AND o.ordered_at >= :from
WHERE o.id IS NULL;
```

오른쪽 조건을 `WHERE`에 두면 NULL row를 제거해 사실상 INNER JOIN이 될 수 있다. 매칭 조건인지 최종 결과 filter인지 구분한다. 존재/부재만 필요하면 `EXISTS`/`NOT EXISTS`가 grain을 더 명확히 표현할 수 있다.

RIGHT JOIN은 table 순서를 바꾼 LEFT JOIN으로 표현할 수 있어 팀 convention에 따라 제한할 수 있지만 잘못된 문법은 아니다. FULL OUTER JOIN 지원 여부는 DBMS별로 확인한다.

### SELF/CROSS JOIN

Self join은 같은 table에 서로 다른 alias를 부여하는 일반 join이다. parent 한 단계 조회에는 충분하지만 가변 깊이 tree 전체에는 recursive CTE/closure table이 더 적합할 수 있다.

CROSS JOIN은 두 입력의 Cartesian product를 만들므로 결과 수는 두 cardinality의 곱이다. option 조합 생성처럼 의도적인 경우에 쓰고, 빠진 join predicate로 우연히 발생하지 않게 예상 row 수를 검증한다.

## Subquery

Subquery는 반환 shape와 outer query 참조 여부로 이해한다.

| 형태 | 반환 계약 | 대표 사용 |
|---|---|---|
| scalar | 한 column, 최대 한 row | 비교값, SELECT expression |
| row | 한 row, 여러 column | tuple 비교 |
| table | 여러 row/column | derived table, 단계별 집계 |
| correlated | outer row 참조 | `EXISTS`, row별 조건 |

Scalar subquery가 두 row 이상 반환하면 오류가 난다. `LIMIT 1`로 숨기기 전에 왜 하나여야 하는지 key/order로 보장한다.

### IN, ANY, ALL과 EXISTS

- `IN`은 후보 중 같은 값이 있는지 표현한다.
- `EXISTS`는 subquery가 한 row라도 반환하는지만 본다.
- `ANY`/`ALL`은 비교 연산자가 일부/모든 값에 성립하는지 표현한다.
- `NOT IN` 입력에 NULL이 있으면 3값 논리 때문에 기대와 달리 true가 나오지 않을 수 있다. NULL을 배제하거나 `NOT EXISTS`를 쓴다.

Correlated subquery가 문법상 outer row마다 평가되는 것처럼 보여도 optimizer가 semi-join, materialization 등으로 변환할 수 있다. 반대로 변환되지 않으면 반복 비용이 클 수 있다. JOIN이 항상 빠르거나 subquery가 항상 읽기 쉽다는 규칙 대신 실제 plan과 grain을 비교한다.

### Derived table과 CTE

집계 결과를 다시 join/filter할 때 derived table 또는 CTE로 단계를 이름 붙인다. MySQL이 merge/materialize 중 무엇을 선택하는지 확인하고, 같은 CTE 이름이 중간 결과를 물리적으로 한 번만 계산한다는 보장으로 해석하지 않는다.

## UNION과 set operation

```sql
SELECT occurred_at, 'ORDER' AS event_type, id
FROM orders
UNION ALL
SELECT occurred_at, 'REFUND' AS event_type, id
FROM refund
ORDER BY occurred_at DESC, id DESC;
```

- `UNION ALL`은 중복을 보존해 이어 붙인다.
- `UNION`/`UNION DISTINCT`는 전체 row 기준 중복 제거 비용이 있다.
- 각 query block은 같은 column 수와 호환 가능한 type/의미를 반환해야 한다.
- 최종 `ORDER BY`는 합쳐진 결과에 적용하며 output column 이름은 첫 query block에서 정해진다.
- branch별 `ORDER BY/LIMIT`이 필요하면 DBMS 문법에 맞게 괄호로 query block을 분리한다.

중복이 발생하지 않을 것 같다는 추측으로 `UNION`을 쓰지 않는다. 중복 제거가 업무 요구인지, upstream key가 이미 배타성을 보장하는지 정한 뒤 `ALL` 여부를 선택한다.

## CASE와 조건부 집계

Simple CASE는 한 expression의 값, searched CASE는 순서 있는 boolean 조건을 평가한다. 첫 번째로 참인 branch에서 멈추므로 좁은 조건을 먼저 두고 범위의 겹침을 test한다.

```sql
SELECT category_id,
       SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) AS paid_amount,
       COUNT(CASE WHEN status = 'CANCELED' THEN 1 END) AS canceled_count
FROM orders
GROUP BY category_id;
```

- `SUM`에는 보통 `ELSE 0`, `COUNT(expression)`에는 NULL이 세지지 않는 성질을 의도적으로 쓴다.
- label 분류와 핵심 business policy를 거대한 CASE 하나에 섞지 않는다.
- CASE가 WHERE의 indexed column을 감싸면 sargability를 잃을 수 있어 predicate를 단순화하거나 expression index를 검토한다.
- SELECT alias를 GROUP BY에서 허용하는지는 DBMS 동작에 의존하므로 이식성이 중요하면 expression/CTE를 명시한다.

## 결과 검증 순서

1. 결과 한 row가 무엇인지 문장으로 쓴다.
2. base table마다 예상 cardinality와 unique key를 확인한다.
3. join 하나씩 추가하며 row 수와 NULL 비율을 관찰한다.
4. filter를 ON/WHERE 중 어디에 둔 이유를 설명한다.
5. 집계 전 fan-out과 set operation의 중복 정책을 확인한다.
6. deterministic order가 필요하면 tie-breaker까지 `ORDER BY`에 넣는다.
7. 실행 계획의 추정과 실제 row/time을 운영 규모 data에서 비교한다.

## NestJS와 TypeORM 적용

- Repository relation load가 필요한 grain을 보존하는지 생성 SQL을 확인한다.
- 복잡한 report query는 QueryBuilder/raw SQL로 의도를 드러내고 parameter binding을 사용한다.
- entity hydration이 1:N join 중복을 숨길 수 있으므로 pagination/count query는 별도로 검증한다.
- query 결과 DTO에 의미와 nullability를 명시하고 DB alias와 TypeScript field mapping을 test한다.

## 출처

- [MySQL 8.4, JOIN Clause](https://dev.mysql.com/doc/refman/8.4/en/join.html)
- [MySQL 8.4, Subqueries](https://dev.mysql.com/doc/refman/8.4/en/subqueries.html)
- [MySQL 8.4, UNION Clause](https://dev.mysql.com/doc/refman/8.4/en/union.html)
- [MySQL 8.4, Derived Table and CTE Optimization](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html)
- [MySQL 8.4, Semijoin and Antijoin Transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html)
- [Oracle AI Database 26ai, Joins](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Joins.html)
- [Oracle AI Database 26ai, Using Subqueries](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Using-Subqueries.html)
- [인프런, Hong, SELECT 최적화](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338550)
- [인프런, Hong, SELECT 고급](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338551)
- Oracle 11g 강의: [조인](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4661), [Subquery, ANY, ALL](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4662)
- 강의 전체: [소개](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328652), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328829), [마무리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328826)
- INNER JOIN: [준비](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328736), [필요성](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328737), [1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328738), [2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328739), [3](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328740), [문제](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328741), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328742)
- OUTER/기타 JOIN: [1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328745), [2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328746), [특징](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328747), [Self](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328748), [Cross](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328749), [실습](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328750), [문제 1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328751), [문제 2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328752), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328753)
- Subquery: [소개](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328755), [Scalar](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328756), [다중 row](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328757), [다중 column](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328758), [Correlated 1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328759), [Correlated 2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328760), [SELECT](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328761), [Derived table](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328762), [JOIN 비교](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328763), [문제](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328764), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328765)
- UNION: [DISTINCT](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328767), [ALL](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328768), [정렬](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328769), [문제](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328770), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328771)
- CASE: [기본 1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328773), [기본 2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328774), [Grouping](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328775), [조건부 집계 1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328776), [조건부 집계 2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328777), [문제](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328778), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328779)

## 관련 문서

- [[SQL-Joins|SQL Join과 실행 알고리즘]]
- [[Query-Antipatterns|SQL Query 안티패턴]]
- [[Execution-Plan|Execution plan]]
- [[Pagination-Optimization|Pagination 최적화]]
- [[Hierarchical-Data-Modeling|계층형 데이터 모델링]]
