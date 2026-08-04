---
tags: [database, oracle, sql, nvl, decode, dual, rollup]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle SQL Dialect", "Oracle SQL 방언", "Oracle SQL Functions"]
---

# Oracle SQL 방언

Oracle SQL은 표준 SQL의 공통 골격 위에 함수, 의사 열, 객체와 transaction 동작을 확장한다. 새 코드는 이식 가능한 표현을 기본으로 삼고 Oracle 전용 표현이 주는 이점이 분명할 때 경계를 드러낸다.

## 빠른 구분

| 목적 | 이식성 우선 | Oracle 전용 또는 주의 대상 |
|---|---|---|
| NULL 대체 | `COALESCE` | `NVL` |
| 조건 분기 | `CASE` | `DECODE` |
| 외부 조인 | `LEFT/RIGHT/FULL OUTER JOIN` | legacy `(+)` operator |
| 상수 표현 조회 | `SELECT expression` 지원 여부 확인 | 11g의 `FROM DUAL` |
| 계층 순회 | recursive CTE 개념 | `CONNECT BY`, `PRIOR`, `LEVEL` |
| 번호 생성 | identity/sequence의 제품 문법 확인 | `sequence.NEXTVAL` |

## DUAL의 현재 의미

`DUAL`은 `SYS` schema에 있는 한 행짜리 table로 상수와 함수를 한 번 평가할 때 사용한다.

```sql
SELECT SYSDATE, 2 + 3
FROM DUAL;
```

Oracle Database Release 23부터는 table을 읽지 않는 expression의 `FROM DUAL`을 생략할 수 있다. 11g code와 호환해야 하거나 팀 convention을 맞춰야 하면 그대로 둘 수 있지만, 현재 Oracle의 필수 문법이라고 설명하면 안 된다.

## NULL과 조건 분기

```sql
SELECT COALESCE(commission_pct, 0) AS commission_pct,
       CASE
         WHEN salary >= 10000 THEN 'HIGH'
         ELSE 'STANDARD'
       END AS salary_band
FROM employees;
```

- `NVL(expr1, expr2)`은 첫 값이 NULL이면 두 번째 값을 반환하고 두 인자의 type을 Oracle 규칙으로 변환한다.
- `COALESCE`는 첫 non-null expression을 반환하며 Oracle에서도 short-circuit evaluation을 한다.
- `CASE`는 simple form과 searched form이 있고 첫 matching branch에서 멈춘다.
- `DECODE`는 Oracle 함수다. 비교값과 결과를 번갈아 나열하며, 두 NULL을 같은 값으로 취급하는 Oracle 고유 의미가 있다.

단순한 `NVL`과 `DECODE`를 무조건 고칠 필요는 없다. 다만 새 공유 SQL, migration 가능성이 있는 query와 복잡한 조건에는 `COALESCE`와 `CASE`가 의도를 더 잘 드러낸다. 암시적 형 변환에 기대지 말고 branch의 반환 type을 맞춘다.

## 문자 길이와 byte

Oracle의 문자열 함수는 단위를 구분한다.

- `LENGTH`와 `SUBSTR`은 character 기준이다.
- `LENGTHB`와 `SUBSTRB`는 byte 기준이며 LOB와 multibyte character set에는 추가 제한이 있다.
- `LPAD`의 길이는 표시 길이를 기준으로 하며 multibyte character set에서는 character 수와 다를 수 있다.
- `CONCAT`은 두 값을 연결한다. 여러 값은 중첩하거나 `||` operator를 쓴다.

한글 한 글자가 항상 2 byte라는 규칙은 없다. 실제 byte 수는 database character set과 값에 따라 달라진다. 저장 한도는 column 선언의 `BYTE`/`CHAR` semantics와 `MAX_STRING_SIZE`까지 함께 확인한다.

11g 시대 SQL의 `VARCHAR2` 한도를 현재 PL/SQL 변수 한도와 섞지 않는다. 현재 SQL column의 상한은 기본 `MAX_STRING_SIZE=STANDARD`와 `EXTENDED` 설정에 따라 달라지며, `EXTENDED`는 12c 이후 명시적 migration이 필요하다.

## 날짜와 변환

`SYSDATE`, `ADD_MONTHS`, `MONTHS_BETWEEN`, `NEXT_DAY`, `LAST_DAY`, `TO_CHAR`, `TO_DATE`는 현재도 지원된다. 문제는 함수 존재보다 session의 NLS 설정에 기대는 code다.

```sql
SELECT TO_DATE(:start_date, 'YYYY-MM-DD') AS start_date,
       TO_CHAR(hire_date, 'YYYY-MM-DD') AS hire_date_text
FROM employees;
```

- application에서는 가능하면 driver의 date/timestamp bind type을 사용한다.
- 문자열을 변환할 때 format model을 명시한다.
- `NEXT_DAY`의 요일 이름, 월 이름과 문자 비교는 NLS 영향을 검토한다.
- `DATE`와 `TIMESTAMP`, session time zone과 database time zone을 같은 개념으로 취급하지 않는다.

## 집계와 ROLLUP

`ROLLUP`은 함수 호출이 아니라 `GROUP BY`의 확장이다. grouping column의 오른쪽부터 subtotal을 만들고 grand total을 추가한다.

```sql
SELECT department_id,
       job_id,
       COUNT(*) AS employee_count,
       GROUPING_ID(department_id, job_id) AS grouping_level
FROM employees
GROUP BY ROLLUP (department_id, job_id);
```

subtotal이 만든 NULL과 원본 data의 NULL을 구분하려면 `GROUPING` 또는 `GROUPING_ID`를 사용한다. `DISTINCT`도 집계 함수와 함께 사용할 수 있으므로 `GROUP BY`와의 차이는 집계 가능 여부가 아니라 grouping semantics다.

## 조인 문법

Oracle의 legacy outer join operator `(+)`는 현재도 남아 있지만 Oracle 공식 문서는 `FROM` 절의 `OUTER JOIN` 문법을 권장한다.

```sql
SELECT e.employee_id, d.department_name
FROM employees e
LEFT JOIN departments d
  ON d.department_id = e.department_id;
```

`(+)`는 ANSI join과 같은 query block에서 섞을 수 없고 `OR`, `IN`, self outer join 등에 제약이 있다. 강의의 `(+)` 예제는 legacy code를 읽는 지식으로 남기고 새 code에는 명시적 `JOIN ... ON`을 쓴다.

## KEEP과 FIRST/LAST

Oracle의 `FIRST`와 `LAST`는 독립 함수가 아니라 aggregate function에 붙는 `KEEP` 구문의 modifier다. `DENSE_RANK`로 정렬 기준의 첫 번째 또는 마지막 peer group을 고른 뒤 그 group에 aggregate를 적용한다.

```sql
SELECT department_id,
       MAX(employee_id)
         KEEP (DENSE_RANK FIRST ORDER BY salary DESC) AS employee_id
FROM employees
GROUP BY department_id;
```

최고 급여자가 여러 명이면 `FIRST`가 한 row를 임의로 고르는 것이 아니다. 같은 dense rank의 `employee_id`들에 `MAX`가 적용된다. 필요한 tie 정책이 이름의 최대값인지, 모든 동률 row인지 먼저 정한다.

일반 순위, top-N과 window frame은 [[SQL-Window-Functions|SQL window function]]에서 다룬다.

## DDL과 transaction

Oracle은 syntactically valid DDL 전에 implicit commit을 하고 성공한 DDL 뒤에도 implicit commit을 한다. 따라서 `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`을 일반 DML처럼 `ROLLBACK`할 수 있다고 가정하면 안 된다.

- table 이름은 `RENAME old_name TO new_name` 또는 `ALTER TABLE old_name RENAME TO new_name`으로 바꾼다.
- MySQL의 `RENAME TABLE old TO new`를 Oracle 문법으로 복사하지 않는다.
- `TRUNCATE`는 모든 row를 제거하는 DDL이며 보통 DELETE보다 빠르다는 이유만으로 복구 가능한 작업처럼 다루지 않는다.
- 운영 DDL은 dependency, lock, invalidation과 rollback 대체 절차를 migration에 기록한다.

## View의 Oracle 경계

일반 view는 query 정의를 저장하지 결과 snapshot을 저장하지 않는다. 결과를 저장하고 refresh하는 materialized view와 구분한다.

- 정의 query 교체는 `CREATE OR REPLACE VIEW ... AS SELECT ...`를 사용한다.
- `ALTER VIEW`는 defining query를 교체하는 일반 문법이 아니다.
- expression이 있는 한 column이 수정 불가능하다고 해서 view 전체가 항상 read-only인 것은 아니다.
- set operation, `DISTINCT`, aggregate, `GROUP BY`, 계층 query와 join 등 전체 정의가 inherent updatability를 결정한다.
- 명시적 read contract는 defining query 뒤에 `WITH READ ONLY`를 둔다.

## 출처

- [Oracle AI Database 26ai, Selecting from DUAL](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Selecting-from-the-DUAL-Table.html)
- [Oracle AI Database 26ai, CASE Expressions](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CASE-Expressions.html)
- [Oracle AI Database 26ai, COALESCE](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/COALESCE.html)
- [Oracle AI Database 26ai, DECODE](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/DECODE.html)
- [Oracle AI Database 26ai, LENGTH](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/LENGTH.html)
- [Oracle AI Database 26ai, Joins](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Joins.html)
- [Oracle AI Database 26ai, FIRST and LAST](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/FIRST.html)
- [Oracle AI Database 26ai, COMMIT](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/COMMIT.html)
- [Oracle AI Database 26ai, CREATE VIEW](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CREATE-VIEW.html)
- 강의: [집계와 숫자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4657), [문자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4658), [날짜와 변환 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4659), [GROUP BY와 ROLLUP](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4660), [조인](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4661), [View](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4667)

## 관련 문서

- [[SQL-Fundamentals|SQL 기본기]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[SQL-Window-Functions|SQL window function]]
- [[Database-Views-and-Programmability|View와 데이터베이스 저장 프로그램]]
- [[Oracle-Sequences-and-Hierarchical-Queries|Oracle sequence와 계층형 query]]
