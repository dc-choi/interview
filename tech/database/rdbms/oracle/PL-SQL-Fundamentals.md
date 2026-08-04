---
tags: [database, oracle, plsql, record, collection, bind-variable]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["PL SQL Fundamentals", "PL/SQL 기본기", "Oracle PL SQL"]
---

# PL/SQL 기본기

PL/SQL은 Oracle의 procedural extension of SQL이다. SQL의 set operation에 변수, block, 조건, 반복, exception과 stored program을 더한다. 먼저 한 SQL 문으로 해결할 수 있는지 검토하고, 여러 단계의 server-side 제어가 명확한 이점을 줄 때 PL/SQL을 사용한다.

## Block 구조

```sql
DECLARE
  v_name employees.last_name%TYPE;
BEGIN
  SELECT last_name
  INTO v_name
  FROM employees
  WHERE employee_id = :employee_id;

  DBMS_OUTPUT.PUT_LINE(v_name);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    DBMS_OUTPUT.PUT_LINE('not found');
  WHEN TOO_MANY_ROWS THEN
    DBMS_OUTPUT.PUT_LINE('not unique');
END;
/
```

- `DECLARE`는 선택적인 선언부다.
- `BEGIN ... END`는 필수 실행부다.
- `EXCEPTION`은 선택적인 예외 처리부다.
- anonymous block은 실행 후 database object로 남지 않는다.
- procedure, function, package와 trigger는 schema에 저장되는 named program unit다.

마지막 `/`, `SET SERVEROUTPUT ON`, `VARIABLE`, `PRINT`는 SQL*Plus나 호환 client의 명령이지 PL/SQL block 문법이 아니다. 사용 client가 같은 명령을 지원하는지 확인한다.

## 변수와 참조 attribute

```sql
DECLARE
  v_salary employees.salary%TYPE;
  v_employee employees%ROWTYPE;
BEGIN
  NULL;
END;
/
```

- `%TYPE`은 column이나 이미 선언한 item의 data type과 size를 따라간다.
- column을 참조한 `%TYPE` 변수는 column의 `NOT NULL` 같은 constraint를 그대로 상속하지 않는다.
- `%ROWTYPE`은 table, view 또는 cursor row shape를 가진 record variable을 선언한다.
- 정확한 표기는 `%ROWTYPE`이며 `%` 없는 `ROWTYPE`이라는 독립 type이 아니다.
- table schema 변경을 자동으로 흡수한다는 장점과, 필요 없는 column까지 결합되는 dependency를 함께 고려한다.

11g 강의의 30 byte identifier, SQL `VARCHAR2(4000)`와 PL/SQL `VARCHAR2(32767)` 설명을 하나의 영구 규칙으로 외우지 않는다. identifier와 문자열 한도는 database version, SQL/PLSQL context와 설정을 구분해 현재 문서를 확인한다.

## SELECT INTO의 cardinality

일반 `SELECT ... INTO`는 정확히 한 row를 기대한다.

- 0 row면 `NO_DATA_FOUND`가 발생한다.
- 2 row 이상이면 `TOO_MANY_ROWS`가 발생한다.
- 임의의 `ROWNUM = 1`로 문제를 숨기지 말고 key와 business rule로 한 row를 보장한다.
- 여러 row는 cursor, cursor FOR loop 또는 bulk processing을 검토한다.

Exception을 화면에만 출력하고 성공처럼 끝내지 않는다. 호출자가 복구할 수 있는 error contract, rollback 범위와 logging을 정한다.

## Record

Record는 서로 다른 type의 field를 묶는 composite variable이다.

```sql
DECLARE
  TYPE employee_summary_t IS RECORD (
    employee_id employees.employee_id%TYPE,
    name        employees.last_name%TYPE
  );
  v_employee employee_summary_t;
BEGIN
  SELECT employee_id, last_name
  INTO v_employee
  FROM employees
  WHERE employee_id = :employee_id;
END;
/
```

`record.field`로 field를 참조한다. Full row record를 `INSERT`나 `UPDATE SET ROW`에 쓸 수 있지만 허용 위치와 nested record 제한이 있으므로 간결함만 보고 application write contract를 숨기지 않는다.

## Collection

PL/SQL collection은 같은 type의 element를 담는다.

| 종류 | index와 크기 | 주요 경계 |
|---|---|---|
| Associative array | `PLS_INTEGER` 또는 문자열 key | PL/SQL memory 구조, sparse 가능 |
| Varray | 정수 index, 선언한 최대 element 수 | 현재 element 수는 최대보다 작을 수 있음, 순서 유지 |
| Nested table | 정수 index, 크기 확장 가능 | storage/query 사용 시 순서를 가정하지 않음 |

```sql
DECLARE
  TYPE salary_by_id_t IS TABLE OF NUMBER
    INDEX BY PLS_INTEGER;
  v_salary salary_by_id_t;
BEGIN
  v_salary(100) := 12000;
  DBMS_OUTPUT.PUT_LINE(v_salary(100));
END;
/
```

`index-by table`은 associative array의 옛 이름으로 legacy code에서 볼 수 있다. Collection을 큰 결과 집합에 쓰면 PGA memory와 context switch를 측정하고 `BULK COLLECT`의 batch limit, `FORALL`과 error handling을 함께 설계한다.

## Bind와 substitution variable

두 문법은 실행 단계가 다르다.

| 표현 | 처리 주체 | 의미 |
|---|---|---|
| `&name`, `&&name` | SQL*Plus 계열 client | parse 전에 script text를 치환 |
| `:name` | database API와 SQL/PLSQL | parse된 statement의 runtime value placeholder |
| local PL/SQL variable | PL/SQL engine | block scope의 typed storage |

`&`는 사용자 입력을 안전하게 bind하는 기능이 아니다. identifier나 SQL 조각까지 text로 바꿀 수 있어 untrusted input에 사용하면 injection 위험이 있다. Application은 driver의 parameter binding을 사용한다.

SQL*Plus에서는 `VARIABLE result NUMBER`로 host bind를 만들고 block에서 `:result`로 참조한 뒤 `PRINT result`로 볼 수 있다. 이 client command를 일반 application의 bind API와 혼동하지 않는다.

## 조건과 반복

- `IF ... THEN`, `ELSIF`, `ELSE`, `END IF`로 boolean branch를 표현한다. `ELSE IF`가 아니라 `ELSIF`다.
- PL/SQL `CASE` statement와 SQL `CASE` expression은 쓰이는 위치와 반환 계약이 다르다.
- Basic `LOOP`는 `EXIT` 또는 `EXIT WHEN`으로 종료한다. 종료 조건이 변하지 않으면 infinite loop가 된다.
- `WHILE` 조건이 `FALSE`나 `NULL`이면 body를 실행하지 않는다.
- Numeric `FOR` loop의 iterand는 loop scope에서 자동 관리되며 역순은 `REVERSE`를 사용한다.
- `CONTINUE`와 `CONTINUE WHEN`은 현재 iteration의 나머지를 건너뛴다.

Row마다 SQL을 호출하는 loop는 느린 context switch를 만들 수 있다. 한 번의 set-based DML, `MERGE`, bulk SQL과 비교한 뒤 loop를 선택한다.

## Transaction과 소유권

- PL/SQL block이 transaction과 같은 경계는 아니다. 호출 전후의 DML과 같은 session transaction에 참여할 수 있다.
- reusable procedure 안에서 임의로 `COMMIT`하면 caller의 atomicity를 깨뜨릴 수 있다. transaction 종료 주체를 API contract로 정한다.
- exception handler가 error를 삼키면 caller는 실패를 모른다. 복구하지 못하면 context를 남기고 다시 raise한다.
- DDL을 dynamic SQL로 실행해도 Oracle의 implicit commit 경계는 사라지지 않는다.
- stored program의 privilege model, definer/invoker rights, dependency와 edition/deployment 순서를 관리한다.

## 출처

- [Oracle AI Database 26ai, Overview of PL/SQL](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/overview.html)
- [Oracle AI Database 26ai, Block](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/block.html)
- [Oracle AI Database 26ai, Declarations](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/declarations.html)
- [Oracle AI Database 26ai, Collections and Records](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/plsql-collections-and-records.html)
- [Oracle AI Database 26ai, SQL*Plus Substitution and Bind Variables](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqpug/using-substitution-variables-sqlplus.html)
- [Oracle AI Database 26ai, CONTINUE Statement](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/CONTINUE-statement.html)
- 강의: [PL/SQL 개념](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4670), [변수와 type](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4671), [%ROWTYPE와 record](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4672), [Collection과 bind](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4673), [조건문](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4675), [반복문](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4676)

## 관련 문서

- [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]
- [[Oracle-SQL-Dialect|Oracle SQL 방언]]
- [[Database-Views-and-Programmability|View와 데이터베이스 저장 프로그램]]
- [[Transactions|트랜잭션]]
