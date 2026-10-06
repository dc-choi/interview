---
tags: [database, sql, "null", three-valued-logic]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["SQL NULL", "Three-Valued Logic", "3값 논리", "SQL NULL과 3값 논리"]
---

# SQL NULL과 3값 논리

[[SQL-Fundamentals|SQL 기본기]]에서 NULL 절을 분리한 문서다. NULL은 빈 문자열이나 0이 아니라 값이 없음을 나타내는 표식이고, SQL은 NULL이 섞인 조건을 참과 거짓 외에 UNKNOWN으로 평가한다. UNKNOWN을 다루는 규칙이 절마다 달라 결과에서 행이 조용히 빠지는 오류가 생긴다.

## NULL이 나타내는 것

- unknown: 값이 있지만 알려지지 않았다. 생일을 아직 입력하지 않은 경우다.
- unavailable 또는 withheld: 값이 있지만 공개하지 않아 쓸 수 없다. 생일 공개를 거부한 경우다.
- not applicable: 해당 사항이 없다. 집 전화가 없는 사람의 집 전화번호, 편입하지 않은 학생의 이전 학교가 그렇다.

SQL은 이 의미들을 하나의 NULL로 표시한다. 두 사람의 생일이 모두 NULL이라고 같은 생일이라고 판단할 수 없는 이유다. 의미 차이가 업무에 중요하면 상태 컬럼이나 별도 relation으로 모델링하고, 값 부재가 유효한 상태가 아니면 `NOT NULL`로 막는다([[Data-Integrity-Constraints#NOT NULL|NOT NULL]]). 빈 문자열은 NULL과 다른 값이다. NULL 전화번호는 번호를 모른다는 뜻이고 빈 문자열은 전화가 없다고 알려진 상태로 읽을 수 있다.

## 비교는 UNKNOWN을 만든다

비교 대상 한쪽이 NULL이면 `=`, `<>`, `<`, `>` 같은 일반 비교의 결과는 UNKNOWN이다. `NULL = NULL`도 UNKNOWN이다. NULL이 실제 값이었다면 그 값에 따라 참일 수도 거짓일 수도 있기 때문이다. MySQL은 비교 결과를 1, 0, NULL로 표현하므로 UNKNOWN이 NULL로 보인다.

```sql
SELECT 1 = NULL, NULL = NULL, 1 <=> NULL, NULL <=> NULL;
-- MySQL 결과: NULL, NULL, 0, 1
```

- NULL 여부는 `IS NULL`, `IS NOT NULL`로 검사한다. `WHERE birth_date = NULL`은 오류 없이 빈 결과를 돌려주므로 해당 데이터가 없다고 오해하기 쉽다.
- NULL끼리를 같은 값으로 비교하려면 표준 `IS NOT DISTINCT FROM`을 쓴다. MySQL은 같은 의미의 `<=>`를 제공하고 PostgreSQL은 `IS DISTINCT FROM`과 `IS NOT DISTINCT FROM`을 모두 제공한다.
- `x IN (1, 2, NULL)`은 일치하는 값이 없으면 FALSE가 아니라 NULL이다.

## AND, OR, NOT의 진리표

UNKNOWN을 참일 수도 거짓일 수도 있는 값으로 두고 결과가 확정되는지 본다.

| A | B | A AND B | A OR B |
|---|---|---|---|
| TRUE | UNKNOWN | UNKNOWN | TRUE |
| FALSE | UNKNOWN | FALSE | UNKNOWN |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

`NOT UNKNOWN`은 UNKNOWN이다. FALSE가 섞인 AND와 TRUE가 섞인 OR만 UNKNOWN과 무관하게 결과가 정해진다.

## 절마다 다른 판정 규칙

| 위치 | 통과 조건 | UNKNOWN일 때 |
|---|---|---|
| `WHERE` | TRUE | 행 제외 |
| `JOIN ... ON` | TRUE | 매칭 안 됨. INNER JOIN은 제외, OUTER JOIN은 보존 쪽 행을 NULL로 보완 |
| `HAVING` | TRUE | 그룹 제외 |
| `CASE WHEN` | TRUE | 다음 분기, 없으면 `ELSE` |
| `CHECK` 제약 | FALSE가 아님 | 통과 |

- SELECT, UPDATE, DELETE 모두 WHERE 조건이 TRUE인 행만 대상으로 한다. FALSE와 UNKNOWN은 함께 제외되므로 `WHERE salary <> 5000`은 salary가 NULL인 행을 남기지 않는다.
- INNER JOIN은 조인 키가 NULL인 행을 매칭하지 않는다. 부서가 배정되지 않은 직원이 결과에서 사라지면 LEFT JOIN으로 보존한다([[SQL-Joins|SQL 조인]]).
- CHECK는 FALSE일 때만 위반이다. `CHECK (salary >= 5000)`은 NULL salary를 받아들이므로 값이 필수면 `NOT NULL`을 함께 둔다. SQL 표준과 MySQL, PostgreSQL, SQL Server 문서가 모두 이 규칙을 적는다.

## NOT IN과 NULL

`v NOT IN (v1, v2, v3)`은 `v <> v1 AND v <> v2 AND v <> v3`이다. 후보에 NULL이 하나라도 있으면 `v <> NULL`이 UNKNOWN이 되어 전체는 FALSE나 UNKNOWN만 될 수 있고 TRUE가 되지 않는다.

| 식 | 결과 |
|---|---|
| `3 NOT IN (1, 2, 4)` | TRUE |
| `3 NOT IN (1, 2, 3)` | FALSE |
| `3 NOT IN (1, 3, NULL)` | FALSE |
| `3 NOT IN (1, 2, NULL)` | UNKNOWN |

서브쿼리 결과에 NULL이 섞여도 같다. 2000년 이후 출생자가 없는 부서를 `id NOT IN (SELECT dept_id FROM employee WHERE birth_date >= '2000-01-01')`로 찾을 때 2000년 이후 출생자 중 부서 미배정 직원이 있어 서브쿼리 결과에 NULL이 섞이면 결과는 항상 빈 집합이다.

```sql
SELECT d.id, d.name
FROM department AS d
WHERE NOT EXISTS (
  SELECT 1
  FROM employee AS e
  WHERE e.dept_id = d.id
    AND e.birth_date >= '2000-01-01'
);
```

대안은 세 가지다. 컬럼에 `NOT NULL`을 걸 수 있으면 원인을 없애고, 아니면 서브쿼리에 `dept_id IS NOT NULL`을 넣거나 위처럼 `NOT EXISTS`로 바꾼다. MySQL에서 `NOT IN`은 `<> ALL`과 같은 연산이다([[MySQL-Query-Fundamentals-Subqueries#서브쿼리 해석 규칙|서브쿼리 해석 규칙]]).

## 중복, 그룹과 제약의 NULL 처리

비교는 NULL끼리를 같다고 하지 않지만 `GROUP BY`, `DISTINCT`, `UNION`처럼 중복과 그룹을 다루는 연산은 NULL끼리를 중복으로 본다. SQL 표준은 두 값이 모두 NULL이거나 비교로 같으면 not distinct라고 정의한다. 반대로 집계 함수는 대부분 NULL 입력을 건너뛰고, `UNIQUE`와 복합 FK는 MySQL과 PostgreSQL 기본값에서 NULL이 섞인 행을 검사에서 뺀다.

| 연산 | NULL 처리 |
|---|---|
| `GROUP BY` | NULL끼리 한 그룹 |
| `DISTINCT`, `UNION` | NULL 행끼리 중복으로 제거 |
| `ORDER BY` | 한쪽 끝에 모음. MySQL은 ASC에서 먼저, PostgreSQL은 ASC에서 나중 |
| 집계 함수 | `COUNT(column)`, `SUM`, `AVG`, `MIN`, `MAX`는 NULL 입력을 무시. `COUNT(*)`는 행을 세고 MySQL `JSON_ARRAYAGG`는 NULL을 결과에 담음 |
| `UNIQUE` 제약 | MySQL, PostgreSQL 기본값은 NULL끼리 충돌하지 않음. SQL Server는 컬럼당 NULL 하나 |
| 복합 FK | MySQL은 MATCH SIMPLE 의미라 일부 컬럼이 NULL인 행은 부모가 없어도 들어간다 |

집계와 정렬의 세부는 [[SQL-Fundamentals-Aggregation|SQL 집계, 그룹과 정렬]], 제약 쪽은 [[Data-Integrity-Constraints|데이터 무결성 제약]]과 [[Foreign-Key-Integrity|외래 키와 참조 무결성]]에 둔다.

## 점검 질문

- 이 컬럼의 NULL은 모름, 비공개, 해당 없음 중 무엇이고 업무가 그 차이를 구분해야 하는가?
- `=`, `<>`로 NULL을 비교하거나 NULL이 섞일 수 있는 `NOT IN`을 쓰지 않았는가?
- `WHERE x <> :value`가 NULL 행까지 제외한다는 점이 요구사항과 맞는가?
- 필수 값의 CHECK에 `NOT NULL`을 함께 두었는가?
- INNER JOIN이 NULL 키 행을 버려 건수가 줄지 않았는가?

## 출처

- [ISO/IEC 9075:1992 draft, Database Language SQL](https://www.contrib.andrew.cmu.edu/~shadow/sql/sql1992.txt)
- [MySQL 8.4 Reference Manual, Working with NULL Values](https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html)
- [MySQL 8.4 Reference Manual, Problems with NULL Values](https://dev.mysql.com/doc/refman/8.4/en/problems-with-null.html)
- [MySQL 8.4 Reference Manual, Comparison Functions and Operators](https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html)
- [MySQL 8.4 Reference Manual, Logical Operators](https://dev.mysql.com/doc/refman/8.4/en/logical-operators.html)
- [MySQL 8.4 Reference Manual, Flow Control Functions](https://dev.mysql.com/doc/refman/8.4/en/flow-control-functions.html)
- [MySQL 8.4 Reference Manual, CHECK Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraint Differences](https://dev.mysql.com/doc/refman/8.4/en/ansi-diff-foreign-keys.html)
- [MySQL 8.4 Reference Manual, Subqueries with ALL](https://dev.mysql.com/doc/refman/8.4/en/all-subqueries.html)
- [PostgreSQL 18 Documentation, Comparison Functions and Operators](https://www.postgresql.org/docs/18/functions-comparison.html)
- [PostgreSQL 18 Documentation, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18 Documentation, Sorting Rows](https://www.postgresql.org/docs/18/queries-order.html)
- [Microsoft Learn, Unique constraints and check constraints](https://learn.microsoft.com/en-us/sql/relational-databases/tables/unique-constraints-and-check-constraints)
- [YouTube, 쉬운코드, NULL의 의미와 three-valued logic](https://www.youtube.com/watch?v=y_7rOoOodCY)
- [YouTube, 쉬운코드, 관계형 데이터베이스, relation, 키와 제약](https://www.youtube.com/watch?v=gjcbqZjlXjM)

## 관련 문서

- [[SQL-Fundamentals|SQL 기본기]]
- [[SQL-Fundamentals-Aggregation|SQL 집계, 그룹과 정렬]]
- [[Relational-Model-Fundamentals|관계형 모델 기본 개념]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
