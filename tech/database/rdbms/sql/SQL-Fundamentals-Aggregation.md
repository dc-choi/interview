---
tags: [database, sql, aggregate, group-by, having, order-by]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["SQL Aggregation", "SQL 집계, 그룹과 정렬", "GROUP BY HAVING ORDER BY"]
---

# SQL 집계, 그룹과 정렬

[[SQL-Fundamentals|SQL 기본기]]에서 집계와 정렬 절을 분리한 문서다. 집계 함수는 여러 행을 하나의 요약 값으로 줄이고, `GROUP BY`는 요약 단위를, `HAVING`은 남길 그룹을 정한다. 조건을 어느 단계에 두는지가 집계의 입력을 바꾸므로 결과 grain과 함께 설계한다.

## 집계 함수와 NULL

| 표현 | 의미 | 입력 행이 없을 때 |
|---|---|---|
| `COUNT(*)` | 입력 행 수 | 0 |
| `COUNT(column)` | NULL이 아닌 값 수. 같은 값도 중복해 센다 | 0 |
| `COUNT(DISTINCT column)` | NULL을 제외한 고유 값 수 | 0 |
| `SUM`, `AVG` | NULL이 아닌 수치의 합과 평균 | NULL |
| `MIN`, `MAX` | 비교 가능한 값의 최소와 최대 | NULL |

- 위 표의 집계 함수는 `COUNT(*)`를 빼고 NULL 입력을 무시한다. MySQL `JSON_ARRAYAGG`처럼 NULL을 결과에 담는 집계도 있으므로 다른 함수는 함수별 설명을 확인한다. 직원 16명 중 2명의 `dept_id`가 NULL이면 `COUNT(dept_id)`는 14다. 행 수가 목적이면 `COUNT(*)`를 쓴다.
- 조건에 맞는 행이 없으면 `SUM`은 0이 아니라 NULL이다. 화면이나 API가 0을 기대하면 `COALESCE(SUM(amount), 0)`으로 계약을 명시한다.
- `AVG`는 NULL 행을 분모에서도 뺀다. NULL을 0으로 봐야 하는 업무라면 `AVG(COALESCE(score, 0))`처럼 의도를 드러낸다.
- MySQL에서 정수와 DECIMAL 인자의 `SUM`, `AVG`는 DECIMAL을, FLOAT과 DOUBLE 인자는 DOUBLE을 반환한다. 표시 자릿수는 결과에 `ROUND`를 적용해 맞춘다.
- `GROUP BY` 없이 집계 함수를 쓰면 전체 행을 한 그룹으로 본다.

`DISTINCT`와 집계 함수를 함께 쓸 수 없다는 설명은 틀리다. `COUNT(DISTINCT customer_id)`처럼 집계 인자에 적용할 수 있고, `SELECT DISTINCT`도 집계 결과 행에 적용할 수 있다. 다만 중복 제거의 위치와 비용이 달라 의도를 명시해야 한다.

## GROUP BY와 HAVING

`GROUP BY`의 기준 컬럼(grouping attribute)은 여러 개일 수 있다. 기준 값이 NULL인 행끼리는 한 그룹이 된다. 부서별 인원에서 부서 미배정 직원이 `dept_id`가 NULL인 그룹으로 따로 나오는 이유다.

```sql
SELECT dept_id, sex, COUNT(*) AS empl_count
FROM employee
GROUP BY dept_id, sex
ORDER BY empl_count DESC;
```

`WHERE`는 그룹 전 행을, `HAVING`은 그룹 결과를 거른다. 같은 query block의 `WHERE`에서 집계 결과를 직접 참조할 수는 없지만, 집계를 계산한 subquery나 CTE의 결과를 바깥 `WHERE`에서 거를 수 있다.

- `HAVING`은 집계 값을 subquery와 비교할 수 있다. 회사 전체 평균보다 평균 연봉이 낮은 부서는 `HAVING AVG(salary) < (SELECT AVG(salary) FROM employee)`로 거른다.
- GROUP BY 키를 SELECT에 반드시 넣어야 하는 것은 아니다. 다만 빼면 결과 행이 어느 그룹인지 알 수 없다. 강제되는 쪽은 반대 방향이다. SELECT의 비집계 컬럼은 GROUP BY 키이거나 키에 함수 종속이어야 한다(아래 비집계 컬럼 절).

### 조건이 집계 입력을 바꾼다

참여 인원이 7명 이상인 프로젝트에서 1990년대생의 수와 평균 연봉을 구한다고 하자. 1990년대생 조건을 `WHERE`에 두고 `HAVING COUNT(*) >= 7`을 붙이면 HAVING의 COUNT도 1990년대생만 센다. 조건이 1990년대생이 7명 이상인 프로젝트로 바뀐다. 그룹의 자격을 필터 전 행에서 계산해야 하면 대상 그룹을 따로 고른다.

```sql
SELECT w.proj_id, COUNT(*) AS cnt_1990s, ROUND(AVG(e.salary)) AS avg_salary
FROM works_on AS w
JOIN employee AS e ON e.id = w.empl_id
WHERE e.birth_date >= '1990-01-01' AND e.birth_date < '2000-01-01'
  AND w.proj_id IN (
    SELECT proj_id FROM works_on GROUP BY proj_id HAVING COUNT(*) >= 7
  )
GROUP BY w.proj_id
ORDER BY w.proj_id;
```

한 번 읽으면서 두 기준을 함께 계산하려면 조건부 집계를 쓴다.

```sql
SELECT w.proj_id,
       COUNT(CASE WHEN e.birth_date >= '1990-01-01'
                   AND e.birth_date <  '2000-01-01' THEN 1 END) AS cnt_1990s,
       ROUND(AVG(CASE WHEN e.birth_date >= '1990-01-01'
                       AND e.birth_date <  '2000-01-01' THEN e.salary END)) AS avg_salary
FROM works_on AS w
JOIN employee AS e ON e.id = w.empl_id
GROUP BY w.proj_id
HAVING COUNT(*) >= 7;
```

두 쿼리의 결과 grain은 다르다. 첫 쿼리는 1990년대생이 없는 프로젝트를 결과에서 빼고, 조건부 집계는 그 프로젝트를 0과 NULL로 남긴다. 조건이 행의 자격인지, 그룹의 자격인지, 그룹의 자격을 어떤 행 집합에서 계산하는지를 문장으로 쓴 뒤 `WHERE`와 `HAVING`에 배치한다. 조건부 집계의 다른 쓰임은 [[SQL-Query-Composition#CASE와 조건부 집계|CASE와 조건부 집계]]에 있다.

## 정렬

- `ORDER BY`의 기본 방향은 `ASC`다. 여러 키를 쓰면 앞의 키로 먼저 정렬하고 같은 값 안에서 다음 키로 정렬한다. `ORDER BY dept_id, salary DESC`는 부서 오름차순 안에서 연봉 내림차순이다.
- NULL의 위치는 제품마다 다르다. SQL-92는 구현에 맡겼다. MySQL은 ASC에서 NULL을 먼저, DESC에서 나중에 둔다. PostgreSQL은 NULL을 가장 큰 값처럼 다뤄 ASC에서 나중에 두며 `NULLS FIRST`, `NULLS LAST`로 바꿀 수 있다. MySQL 8.4 문법에는 이 옵션이 없으므로 `ORDER BY dept_id IS NULL, dept_id`처럼 NULL 여부를 첫 정렬 키로 둔다. DBMS를 옮기면 같은 쿼리의 NULL 위치가 바뀌는지 확인한다.
- 페이지네이션처럼 결정적인 순서가 필요하면 고유 키를 마지막 정렬 키로 둔다([[Pagination-Optimization|페이징 성능 최적화]]).

표준 SQL은 `WHERE`에서 SELECT 별칭을 참조할 수 없다. `WHERE`를 평가할 때는 그 값이 아직 정해지지 않았기 때문이다. 정렬은 논리 순서에서 SELECT 다음이라 `ORDER BY empl_count`처럼 별칭을 쓸 수 있다([[SQL-Fundamentals#SELECT의 논리적 단계|SELECT의 논리적 단계]]). MySQL은 `GROUP BY`와 `HAVING`의 별칭도 허용하지만 이식성이 필요하면 식을 반복하거나 CTE로 단계를 나눈다. PostgreSQL의 ORDER BY는 출력 컬럼 이름을 단독으로만 쓸 수 있고 `ORDER BY sum + c` 같은 식 안에서는 쓸 수 없다.

## 비집계 컬럼의 값

SELECT의 비집계 값은 group key 또는 제품이 인정하는 functional dependency로 결정되어야 한다. MySQL ONLY_FULL_GROUP_BY를 끄고 임의의 name을 선택하면 서버가 그룹 안의 아무 값이나 고르고, ORDER BY는 어떤 row의 값을 고를지에 영향을 주지 못한다. group 최대값의 다른 column은 집계 후 재조인이나 tie-breaker 있는 window로 구한다([[SQL-Window-Functions|SQL window function]]).

## 점검 질문

- COUNT의 인자가 행 수인지 NULL 아닌 값 수인지 의도와 맞는가?
- 빈 입력에서 SUM이 NULL이 되는 경우를 API 계약에 반영했는가?
- 그룹의 자격 조건을 필터 전 행과 필터 후 행 중 어디에서 계산해야 하는가?
- NULL 정렬 위치가 DBMS 이관 뒤에도 같은가?
- ORDER BY에 고유 tie-breaker가 있는가?

## 출처

- [MySQL 8.4 Reference Manual, Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [MySQL 8.4 Reference Manual, group by handling](https://dev.mysql.com/doc/refman/8.4/en/group-by-handling.html)
- [MySQL 8.4 Reference Manual, Working with NULL Values](https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html)
- [MySQL 8.4 Reference Manual, Problems with Column Aliases](https://dev.mysql.com/doc/refman/8.4/en/problems-with-alias.html)
- [MySQL 8.4 Reference Manual, SELECT Statement](https://dev.mysql.com/doc/refman/8.4/en/select.html)
- [PostgreSQL 18 Documentation, Sorting Rows](https://www.postgresql.org/docs/18/queries-order.html)
- [ISO/IEC 9075:1992 draft, Database Language SQL](https://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt)
- [인프런, 집계와 숫자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4657)
- [인프런, GROUP BY와 HAVING](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4660)
- [YouTube, 쉬운코드, group by, aggregate function, order by](https://www.youtube.com/watch?v=rG8yQ7yKGTE)

## 관련 문서

- [[SQL-Fundamentals|SQL 기본기]]
- [[SQL-Fundamentals-NULL|SQL NULL과 3값 논리]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[SQL-Window-Functions|SQL window function]]
- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
- [[MySQL-SQL-Mode|MySQL SQL Mode]]
