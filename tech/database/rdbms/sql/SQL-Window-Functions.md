---
tags: [database, sql, window-function, analytic-function, ranking]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["SQL Window Functions", "SQL 윈도 함수", "SQL 분석 함수"]
---

# SQL window function

Window function은 row를 `GROUP BY`처럼 한 row로 접지 않고, 관련 row 집합을 기준으로 계산한 값을 각 row에 붙인다. 순위, 누적 합계, 이동 평균과 이전/다음 값 비교에 적합하다.

## Window의 구성

```sql
function_expression OVER (
  PARTITION BY partition_key
  ORDER BY sort_key
  ROWS BETWEEN frame_start AND frame_end
)
```

- `PARTITION BY`는 서로 계산에 영향을 주지 않는 row 집합을 나눈다. 생략하면 전체 result가 한 partition이다.
- Window 안의 `ORDER BY`는 계산 순서를 정한다. 최종 result 출력 순서를 보장하려면 query 바깥의 `ORDER BY`도 필요하다.
- Frame은 현재 row의 계산에 포함할 row 범위를 정한다. Ranking 함수와 달리 aggregate, `FIRST_VALUE`, `LAST_VALUE` 등에서 특히 중요하다.

## Ranking 함수

| 함수 | tie 처리 | 결과 |
|---|---|---|
| `RANK` | 같은 값은 같은 순위 | 다음 순위에 gap이 생김 |
| `DENSE_RANK` | 같은 값은 같은 순위 | 다음 순위가 연속적 |
| `ROW_NUMBER` | 모든 row에 다른 번호 | 지정한 정렬 순서대로 1부터 부여 |

```sql
SELECT employee_id,
       department_id,
       salary,
       RANK() OVER (
         PARTITION BY department_id
         ORDER BY salary DESC
       ) AS salary_rank,
       ROW_NUMBER() OVER (
         PARTITION BY department_id
         ORDER BY salary DESC, employee_id
       ) AS row_number
FROM employees;
```

`ROW_NUMBER`의 정렬 key가 tie를 완전히 해소하지 않으면 어떤 row가 먼저 번호를 받을지 결정적이지 않을 수 있다. Primary key 같은 stable tiebreaker를 추가한다.

## Group별 top-N

Window 결과는 일반적으로 같은 query block의 `WHERE`보다 나중에 계산된다. 이식 가능한 방식은 subquery/CTE에서 번호를 계산한 뒤 바깥에서 거르는 것이다.

```sql
WITH ranked AS (
  SELECT employee_id,
         department_id,
         salary,
         ROW_NUMBER() OVER (
           PARTITION BY department_id
           ORDER BY salary DESC, employee_id
         ) AS rn
  FROM employees
)
SELECT employee_id, department_id, salary
FROM ranked
WHERE rn <= 3;
```

현재 Oracle 26ai처럼 `QUALIFY`를 지원하는 제품/version은 한 query block에서 analytic result를 filter할 수 있다. Oracle 11g 예제와 여러 DBMS를 함께 지원한다면 subquery 형태가 더 이식 가능하다.

Top-N 요구사항에서 tie를 잘라낼지 모두 포함할지 정한다. 정확히 N row면 `ROW_NUMBER`, 경계의 동률을 함께 포함하려면 `RANK`나 `DENSE_RANK` 조건을 검토한다.

## Frame을 명시해야 하는 이유

```sql
SUM(amount) OVER (
  PARTITION BY account_id
  ORDER BY occurred_at, transaction_id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_total
```

- `ROWS`는 물리 row 수, `RANGE`는 ordering value의 논리적 peer 범위를 기준으로 한다.
- 제품의 default frame에 기대면 duplicate sort key에서 예상과 다른 누적값이 나올 수 있다.
- `LAST_VALUE`가 partition의 마지막 값이 아니라 현재 frame의 마지막 값을 반환하는 실수를 피하려면 frame 끝을 의도대로 명시한다.
- 시간 window는 누락/중복 timestamp, time zone과 late-arriving data까지 test한다.

## `GROUP BY`와 결합

SQL의 논리 처리에서 aggregate/grouping 결과를 만든 뒤 그 row set에 window function을 적용할 수 있다. 따라서 월별 매출을 집계한 다음 누적 매출이나 전월 대비를 계산하는 두 단계 query가 자연스럽다.

Window function을 중첩하거나 alias를 같은 select list에서 바로 재사용할 수 있는지는 제품 문법에 제한이 있다. CTE로 계산 grain을 나누면 의미와 test가 선명해진다.

## Oracle의 `KEEP (DENSE_RANK FIRST/LAST)`

Oracle의 `FIRST`/`LAST`는 독립 함수가 아니라 aggregate function에 붙는 `KEEP` 구문의 modifier다. 정렬 기준의 첫/마지막 dense-rank group에서 값을 집계한다. Tie가 여러 row일 수 있으므로 `MAX`, `MIN` 등 바깥 aggregate가 어떤 값을 고르는지도 contract에 포함한다.

제품 전용 문법과 예제는 [[Oracle-SQL-Dialect|Oracle SQL 방언]]에 분리한다.

## 검증 checklist

1. Input과 output의 row grain을 한 문장으로 적는다.
2. Partition key가 business group을 정확히 표현하는지 확인한다.
3. Ordering key에 stable tiebreaker가 있는지 확인한다.
4. Frame의 시작/끝과 `ROWS`/`RANGE` 의미를 명시한다.
5. NULL ordering과 collations의 제품별 차이를 test한다.
6. Sort, temporary space와 index 사용을 execution plan과 실제 data volume에서 측정한다.

## 출처

- [Oracle AI Database 26ai, Analytic Functions](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Analytic-Functions.html)
- [Oracle AI Database 26ai, RANK](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/RANK.html)
- [Oracle AI Database 26ai, DENSE_RANK](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/DENSE_RANK.html)
- [Oracle AI Database 26ai, ROW_NUMBER](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/ROW_NUMBER.html)
- 강의: [순위 함수와 FIRST/LAST](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5071)

## 관련 문서

- [[SQL-Query-Composition|SQL query 조합]]
- [[Oracle-SQL-Dialect|Oracle SQL 방언]]
- [[Execution-Plan|Execution plan]]
- [[Sorting-Operations|정렬 연산]]
