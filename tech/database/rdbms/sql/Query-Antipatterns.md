---
tags: [database, rdbms, mysql, sql, antipattern, query-design]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["SQL 쿼리 안티패턴", "Query Antipatterns"]
---

# SQL 쿼리 안티패턴

느린 쿼리는 인덱스 하나의 문제가 아닐 수 있다. 조인으로 행 수가 불어나거나, 임시 결과가 반복해서 만들어지거나, 잘못된 결과를 `DISTINCT`로 숨기는 구조라면 먼저 쿼리의 의미와 중간 카디널리티를 고쳐야 한다.

## DISTINCT로 잘못된 조인을 숨기기

`DISTINCT`가 요구사항의 집합 의미라면 정당하다. 하지만 PK를 조회했는데 중복이 생겨 마지막에 붙였다면 조인 관계부터 확인한다.

```sql
-- 주문마다 item과 payment가 각각 N개이면 N 곱하기 N 행이 만들어질 수 있다.
SELECT o.id, SUM(i.amount), SUM(p.amount)
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN payments p ON p.order_id = o.id
GROUP BY o.id;
```

독립적인 1:N 자식은 각각 먼저 집계한 뒤 부모에 조인한다. 이 방식은 합계 왜곡을 막고 중간 행 수도 줄인다.

```sql
WITH item_sum AS (
  SELECT order_id, SUM(amount) AS item_amount
  FROM order_items GROUP BY order_id
), payment_sum AS (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM payments GROUP BY order_id
)
SELECT o.id, i.item_amount, p.paid_amount
FROM orders o
LEFT JOIN item_sum i ON i.order_id = o.id
LEFT JOIN payment_sum p ON p.order_id = o.id;
```

## LEFT JOIN의 오른쪽 조건을 WHERE에 두기

오른쪽 테이블의 조건을 `WHERE`에 두면 매칭되지 않은 행의 `NULL`이 제거되어 결과가 사실상 INNER JOIN처럼 바뀔 수 있다.

```sql
-- 활성 결제가 없어도 주문을 남긴다.
SELECT o.id, p.id
FROM orders o
LEFT JOIN payments p
  ON p.order_id = o.id
 AND p.status = 'PAID';
```

오른쪽 조건이 매칭 자격인지, 최종 결과를 제거하는 필터인지 먼저 말로 정의한 뒤 `ON`과 `WHERE`를 선택한다.

오른쪽 조건이 NULL 보완 행에서 `FALSE`나 `UNKNOWN`이 되는 null-rejected 조건이면 MySQL은 outer join을 inner join으로 바꿀 수 있다. 이는 결과 의미가 이미 inner join과 같기 때문에 가능한 최적화다. LEFT JOIN을 썼다는 문법만으로 왼쪽 행 보존을 보장하지 않는다.

### COUNT에서 LEFT JOIN 제거하기

반환 컬럼에 오른쪽 테이블을 쓰지 않는다고 JOIN을 무조건 지울 수 있는 것은 아니다. 오른쪽 한 행이 여러 번 매칭되면 LEFT JOIN이 왼쪽 행을 증폭하므로 `COUNT(*)` 결과도 달라진다. 제거 전 다음을 증명한다.

- FK나 UNIQUE 제약으로 오른쪽 매칭이 최대 한 행인가?
- 오른쪽의 `ON` 또는 `WHERE` 조건이 왼쪽 행의 포함 여부에 영향을 주는가?
- 원래 요구가 조인 행 수인지 왼쪽 entity 수인지 명확한가?
- `COUNT(DISTINCT left_id)`로 중복을 숨기기 전에 JOIN 자체가 필요한가?

동일성이 증명되면 count 전용 쿼리에서 JOIN을 제거하면 읽기와 중복 제거 비용을 줄일 수 있다. ORM count API도 생성 SQL을 확인한다.

## 인덱스 컬럼을 함수로 감싸기

```sql
WHERE DATE(created_at) = '2026-08-04'
```

일반 `created_at` 인덱스는 원본 값 순서로 저장되므로, 다음 반열린 범위가 보통 더 직접적인 탐색 조건이다.

```sql
WHERE created_at >= '2026-08-04 00:00:00'
  AND created_at <  '2026-08-05 00:00:00'
```

표현식 자체가 핵심 조회 규칙이면 MySQL functional index나 generated column index를 검토한다. functional key part는 괄호가 필요하고 query 표현식, 타입과 collation이 인덱스 표현식과 호환되어야 한다. 적용 여부는 `EXPLAIN ANALYZE`로 확인한다.

### Full scan을 유발할 수 있는 조건

Index가 존재해도 predicate가 usable range를 만들지 못하거나 많은 row를 반환하면 optimizer가 table scan을 고를 수 있다.

- `LIKE 'prefix%'`는 B-tree range 후보지만 `LIKE '%suffix'`는 일반적인 선두 범위를 만들지 못한다.
- 숫자와 문자열의 암묵 변환은 변환 방향에 따라 indexed column lookup을 방해하거나 비교 의미를 바꿀 수 있다. 입력과 column 타입을 맞춘다.
- `<>`, `NOT IN`, 넓은 범위 조건도 index range 후보가 될 수 있지만 selectivity가 낮으면 scan이 더 쌀 수 있다.
- `OR`가 있다는 이유만으로 scan을 단정할 수 없다. MySQL은 단일 range, Index Merge 또는 scan을 비용으로 비교한다.

고정된 selectivity 임계값을 외우지 않는다. `EXPLAIN ANALYZE`에서 access type, 예상과 실제 row 수, filter 비율을 확인하고 통계, predicate와 index를 함께 조정한다.

## CASE에 바뀌는 업무 데이터를 박아 넣기

고정된 출력 형식이나 짧은 분기에는 `CASE`가 자연스럽다. 반면 등급별 수수료, 코드별 라벨처럼 운영 중 추가되고 속성이 늘어나는 규칙을 긴 `CASE`로 관리하면 배포 없이 데이터를 바꾸기 어렵고 여러 쿼리의 규칙이 갈라진다.

- 닫힌 계산 규칙은 `CASE`로 둔다.
- 운영자가 바꾸는 코드, 라벨, 임계값은 lookup 또는 policy table 후보로 본다.
- 테이블로 옮길 때는 FK, 유효 기간, 중복 구간과 변경 이력을 함께 설계한다.

## SELECT 별표와 뷰 중첩

애플리케이션과 뷰의 경계에서는 필요한 컬럼을 명시한다. `SELECT *`는 전송량을 키우고, 같은 이름의 컬럼이 추가되거나 뷰를 다시 만들 때 소비자 계약을 흐리며, covering index 기회를 잃게 할 수 있다.

MySQL은 view, derived table, CTE를 항상 같은 방식으로 실행하지 않는다.

- `MERGE`가 가능하면 바깥 쿼리와 정의를 합칠 수 있다.
- 병합할 수 없으면 내부 임시 테이블로 materialize할 수 있다.
- `DISTINCT`, `GROUP BY`, aggregate, `LIMIT` 같은 구문은 병합을 막는 요인이 될 수 있다.
- 뷰를 여러 겹 쌓았다는 사실만으로 느리다고 단정하지 말고 최종 실행 계획의 materialization, 임시 테이블, 읽은 행 수를 확인한다.

재사용 가능한 의미 단위는 뷰로 남기되, 요청 경로의 핵심 쿼리는 필요하면 평탄화하거나 사전 집계 테이블로 분리한다. MySQL에는 일반 테이블처럼 자동 갱신되는 native materialized view가 없으므로 갱신 책임도 설계해야 한다.

## 진단 순서

1. 기대 결과의 grain을 한 문장으로 적는다. 예: 주문당 한 행.
2. 각 조인의 관계가 1:1, 1:N, N:M 중 무엇인지 확인한다.
3. 조인 단계별 실제 행 수와 추정 행 수를 비교한다.
4. `DISTINCT`, 임시 테이블, materialization이 필요한 이유를 설명한다.
5. 의미를 고친 뒤 인덱스와 통계를 조정한다.

## 출처

- [MySQL 8.4 Reference Manual, Functional Key Parts](https://dev.mysql.com/doc/refman/8.4/en/create-index.html#create-index-functional-key-parts)
- [MySQL 8.4 Reference Manual, Outer Join Simplification](https://dev.mysql.com/doc/refman/8.4/en/outer-join-simplification.html)
- [MySQL 8.4 Reference Manual, View Processing Algorithms](https://dev.mysql.com/doc/refman/8.4/en/view-algorithms.html)
- [MySQL 8.4 Reference Manual, Derived Table, View and CTE Optimization](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html)
- [MySQL 8.4 Reference Manual, Range Optimization](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4 Reference Manual, Type Conversion in Expression Evaluation](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)
- [인프런, Hong, LEFT JOIN과 NULL](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=368009)
- [인프런, Hong, 여러 집계와 행 증폭](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=368011)
- [인프런, Hong, CASE WHEN 관리](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367629)
- [인프런, Hong, 인덱스 컬럼과 함수](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367633)
- [인프런, Hong, 뷰와 SELECT 별표](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367632)
- [인프런, Hong, DISTINCT 오용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367630)
- [인프런, Hong, 뷰 중첩](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367631)
- [인프런, Real MySQL 시즌 1 - Part 1, LEFT JOIN 주의사항 및 튜닝](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226570)
- [인프런, Real MySQL 시즌 1 - Part 2, 풀스캔 쿼리 패턴과 튜닝](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226576)

## 관련 문서

- [[SQL-Joins|SQL 조인]]
- [[Execution-Plan|실행 계획]]
- [[Sorting-Operations|정렬 연산]]
- [[Covering-Index|커버링 인덱스]]
