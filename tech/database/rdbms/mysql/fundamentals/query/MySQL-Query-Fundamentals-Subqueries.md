---
tags: [database, rdbms, mysql, sql, subquery, semijoin]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Subqueries", "MySQL 서브쿼리 실행", "상관 서브쿼리 비용", "IN vs EXISTS"]
---

# MySQL 서브쿼리 실행과 재작성

[[MySQL-Query-Fundamentals|MySQL 조회 기본기]]에서 서브쿼리 절을 분리한 문서다. 상관 여부는 논리적 의존성이고, 실제로 몇 번 평가되는지는 MySQL이 변환할 수 있는 형태인지가 정한다. MySQL 8.4 기준이며 8.4.6 재현(상품 5천 행, 주문 5만 행)을 함께 적었다.

## 논리적 의존성과 물리 실행

비상관 서브쿼리는 외부 행을 참조하지 않고, 상관 서브쿼리는 외부 행을 참조한다. 이것은 논리적 의존성의 구분이다. 상관 서브쿼리가 물리적으로 매 행마다 실행되고 비상관 서브쿼리가 반드시 한 번만 실행된다고 가정하면 안 된다. MySQL은 조건에 따라 semijoin, antijoin, materialization과 decorrelation을 선택한다. 다만 변환 대상은 형태로 정해져 있고, 변환되지 않는 상관 서브쿼리는 바깥 행마다 다시 평가된다.

- 존재 여부만 필요하면 `EXISTS`와 `NOT EXISTS`로 의도를 표현한다.
- 스칼라 서브쿼리는 최대 한 행, 한 열이어야 한다.
- JOIN과 서브쿼리 중 문법 모양만으로 성능을 결정하지 말고 `EXPLAIN ANALYZE`로 확인한다.

## 조인으로 바뀌는 형태

WHERE나 ON의 최상위(AND로 묶인 항 포함)에 있는 `IN`, `= ANY`, `EXISTS`는 semijoin 후보이고, `NOT IN`, `NOT EXISTS`는 antijoin 후보다. 서브쿼리는 UNION 없는 단일 SELECT여야 하고 HAVING, 집계 함수, LIMIT이 없어야 하며, 바깥 쿼리에 STRAIGHT_JOIN이 없어야 한다. 상관 여부는 조건이 아니고 `semijoin` 스위치는 기본으로 켜져 있다.

- 변환되면 Table pullout, Duplicate Weedout, FirstMatch, LooseScan, Materialization 중 비용이 낮은 전략을 고른다. 첫 일치에서 멈추는 EXISTS의 직관은 FirstMatch에 해당하지만 IN과 EXISTS가 같은 전략 후보가 된다.
- 8.4.6에서 상품을 주문 존재로 거르는 `IN`과 `EXISTS`는 둘 다 `select_type`이 `SIMPLE`이고 `Extra`에 `FirstMatch(p)`가 붙었다. `NOT EXISTS`는 `Not exists`, 즉 antijoin이었다.
- IN은 서브쿼리 결과가 작을 때, EXISTS는 바깥 결과가 작고 안쪽 테이블이 클 때 유리하다는 경험칙은 변환되지 않는 형태(OR로 묶인 조건, 집계나 LIMIT이 있는 서브쿼리 등)를 설명할 때만 쓴다. 변환되는 형태는 계획을 보고 판단한다.

## 바깥 행마다 반복되는 형태

SELECT 절의 상관 스칼라 서브쿼리와 집계를 포함한 스칼라 비교는 semijoin 대상이 아니다. 8.4.6 기본 설정에서 둘 다 `DEPENDENT SUBQUERY`였고, SELECT 절 서브쿼리는 `EXPLAIN ANALYZE`에서 `loops=5000`(상품 행 수)이었다. 상품이 100만 개면 서브쿼리도 그만큼 평가될 수 있다.

```sql
-- 상품마다 다시 평가된다
SELECT p.product_id, p.name,
       (SELECT COUNT(*) FROM orders o WHERE o.product_id = p.product_id) AS order_count
FROM products p;

-- 재작성: COUNT(*)가 아니라 오른쪽 키를 세야 주문 없는 상품이 0이다
SELECT p.product_id, p.name, COUNT(o.order_id) AS order_count
FROM products p
LEFT JOIN orders o ON o.product_id = p.product_id
GROUP BY p.product_id, p.name;
```

- LEFT JOIN 재작성에서 `COUNT(*)`를 쓰면 주문 없는 상품도 NULL 행 하나를 세어 1이 된다. 8.4.6에서 주문 없는 상품 1,000개가 `COUNT(o.order_id)`로는 0, `COUNT(*)`로는 1이었다.
- `WHERE p1.price >= (SELECT AVG(p2.price) FROM products p2 WHERE p2.category = p1.category)` 같은 집계 비교도 `DEPENDENT SUBQUERY`였다. 카테고리별 평균을 derived table로 먼저 만들어 조인한다.
- 상관 스칼라 서브쿼리를 derived table과 LEFT JOIN으로 바꾸는 decorrelation은 `optimizer_switch`의 `subquery_to_derived`가 켜졌을 때만 일어난다. 이 스위치는 기본 off이고, 매뉴얼은 대부분 눈에 띄는 개선이 없고 오히려 느려질 수 있어 주로 테스트용이라고 적는다. 상관 조건이 등호여야 하고 LIMIT, UNION, OR가 없어야 하는 등 조건도 있다. 8.4.6에서 켜면 위 두 쿼리 모두 미리 집계한 `DERIVED` 테이블과의 조인으로 바뀌었다.

계획에서 `DEPENDENT SUBQUERY`와 큰 `loops`가 보이면 바깥 행 수만큼 반복된다고 보고, JOIN과 GROUP BY 재작성과 실측으로 비교한다.

## JOIN과 서브쿼리 선택

JOIN은 옵티마이저가 조인 순서와 접근 경로를 고를 여지가 크고 단순한 서브쿼리는 JOIN으로 바뀌기도 하므로, 성능이 같거나 JOIN이 나은 경우가 많다. JOIN을 먼저 고려하되, JOIN으로 쓰면 지나치게 복잡하거나 서브쿼리 쪽이 훨씬 읽기 쉽거나 단계별 derived table이 더 명확하면 서브쿼리를 쓴다. 성능이 의심되면 두 형태를 `EXPLAIN ANALYZE`와 실제 실행 시간으로 비교한다. 관계형 의미와 결과 grain 비교는 [[SQL-Query-Composition|SQL 쿼리 조합]]에 둔다.

## 출처

- [MySQL 8.4 Reference Manual, Semijoin and Antijoin Transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html)
- [MySQL 8.4 Reference Manual, Correlated Subqueries](https://dev.mysql.com/doc/refman/8.4/en/correlated-subqueries.html)
- [MySQL 8.4 Reference Manual, Switchable Optimizations](https://dev.mysql.com/doc/refman/8.4/en/switchable-optimizations.html)
- [MySQL 8.4 Reference Manual, EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [인프런, 얄팍한 코딩사전, 서브쿼리](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86850)
- [인프런, 김영한, 상관 서브쿼리1](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328759)
- [인프런, 김영한, 상관 서브쿼리2](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328760)
- [인프런, 김영한, SELECT 서브쿼리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328761)
- [인프런, 김영한, 서브쿼리 vs JOIN](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328763)
- [인프런, 김영한, 정리 (서브쿼리)](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328765)

## 관련 문서

- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[SQL-Tuning-Terminology|SQL 튜닝 용어]]
- [[MySQL-Lateral-Derived-Tables|MySQL LATERAL 파생 테이블]]
- [[Execution-Plan|실행 계획]]
