---
tags: [database, oracle, plsql, cursor, procedure, package, trigger]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["PL SQL Cursors Routines and Triggers", "PL/SQL 커서와 저장 프로그램"]
---

# PL/SQL 커서, 서브프로그램, 패키지와 트리거

PL/SQL은 여러 행의 처리, 재사용 가능한 database API와 event 기반 동작을 제공한다. Oracle 11g 강의의 문법은 현재 26ai에도 대부분 남아 있지만, 실행 주체와 transaction 경계를 숨기지 않는 것이 더 중요하다.

## Cursor의 정확한 모델

Cursor는 결과 row 전체를 복사해 두는 단순 memory 공간이 아니라, 특정 SQL 문을 처리하는 private SQL area를 가리키는 handle이다.

- implicit cursor는 PL/SQL이 `SELECT` 또는 DML 실행 때 생성하고 관리한다. `SQL%ROWCOUNT`, `SQL%FOUND`, `SQL%NOTFOUND`, `SQL%ISOPEN`으로 직전 SQL의 상태를 확인한다.
- explicit cursor는 개발자가 query와 이름을 선언한다. 직접 `OPEN`, `FETCH`, `CLOSE`하거나 cursor `FOR LOOP`에 lifecycle을 맡긴다.
- 일반 `SELECT INTO`는 정확히 한 row를 기대한다. 여러 row를 순차 처리하는 문제와 혼동하지 않는다.
- 대량 row-by-row 처리는 context switch와 PGA 사용량을 측정하고 set-based SQL, `BULK COLLECT`, `FORALL`과 비교한다.

```sql
DECLARE
  CURSOR c_employee (p_department_id NUMBER) IS
    SELECT employee_id, last_name
    FROM employees
    WHERE department_id = p_department_id;
BEGIN
  FOR employee IN c_employee(:department_id) LOOP
    DBMS_OUTPUT.PUT_LINE(employee.employee_id || ': ' || employee.last_name);
  END LOOP;
END;
/
```

Cursor `FOR LOOP`는 record를 선언하고 cursor를 열고, row를 가져오고, 정상 종료나 exception 때 닫는다. 수동 lifecycle이 필요한 경우에만 `OPEN/FETCH/CLOSE`를 사용한다.

## Exception을 contract로 다루기

- predefined exception은 `NO_DATA_FOUND`, `TOO_MANY_ROWS`처럼 PL/SQL이 이름을 제공한다.
- 이름 없는 내부 error는 `PRAGMA EXCEPTION_INIT`으로 exception과 error code를 연결할 수 있다.
- application condition은 선언한 exception에 `RAISE`를 사용한다.
- caller에게 application error를 반환할 때 `RAISE_APPLICATION_ERROR`의 code 범위는 `-20000`부터 `-20999`다.

`WHEN OTHERS`가 log만 남기고 성공처럼 끝나면 transaction의 실패가 사라진다. handler가 완전히 복구하지 못했다면 context를 남긴 뒤 `RAISE`로 다시 전달한다.

## Procedure와 function

PL/SQL subprogram은 반복 호출할 수 있는 named block이다.

| 구분 | 중심 contract | 주의점 |
|---|---|---|
| Procedure | 작업 수행, `IN`, `OUT`, `IN OUT` parameter | caller의 transaction을 임의로 commit하지 않기 |
| Function | 반드시 값을 반환 | SQL에서 호출할 때 side effect와 호출 제한 확인 |

Parameter mode는 data flow를 표현하지만 복잡한 여러 `OUT` 값은 이해하기 어려운 API가 될 수 있다. 권한 모델은 `AUTHID DEFINER`와 `AUTHID CURRENT_USER` 중 무엇인지 명시하고, 필요한 직접 privilege를 배포 시 검증한다.

`EXEC`와 `VARIABLE`은 SQL*Plus 계열 client command다. Procedure/function의 PL/SQL 문법이나 일반 database driver API가 아니다.

## Package는 public API와 private 구현을 나눈다

Package specification은 외부에 공개할 type, constant, cursor와 subprogram을 선언한다. Package body는 공개 항목을 구현하고 body 안에서만 쓰는 private 항목도 선언할 수 있다.

Body-only routine은 잘못된 구조가 아니라 encapsulation 수단이다. Specification을 바꾸지 않고 body 구현만 교체하면 공개 선언에 의존하는 객체의 invalidation을 줄일 수 있다. Package state는 session에 귀속될 수 있으므로 connection pool에서 사용자별 상태 저장소처럼 사용하지 않는다.

## Trigger는 보이지 않는 write path다

Trigger는 지정한 database event에 반응해 자동 실행되는 stored PL/SQL unit이다.

- `FOR EACH ROW`가 없으면 statement-level, 있으면 영향을 받은 row마다 실행된다.
- Row trigger에서는 correlation pseudorecord `:OLD`, `:NEW`를 사용한다.
- 일반 trigger는 호출한 statement와 같은 transaction에 참여한다. 독립적인 `COMMIT`이나 `ROLLBACK`은 할 수 없다.
- Autonomous trigger는 별도 transaction이므로 rollback된 업무 변경도 audit에 남을 수 있다. 명시적인 요구와 장애 전략이 있을 때만 사용한다.

```sql
CREATE OR REPLACE TRIGGER orders_audit_trg
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
BEGIN
  INSERT INTO order_status_history(order_id, old_status, new_status)
  VALUES (:OLD.id, :OLD.status, :NEW.status);
END;
/
```

합계나 재고를 row trigger에서 연쇄 갱신하면 bulk DML, 동시성, firing order와 재처리가 복잡해진다. Constraint로 표현할 수 없는 좁은 DB invariant나 audit metadata에 제한하고, 큰 workflow는 명시적인 transaction/service path와 비교한다.

## 배포와 운영 확인

1. Package spec, body, procedure, function과 trigger를 versioned migration으로 관리한다.
2. Compile error와 dependency invalidation을 배포 직후 확인한다.
3. Definer/invoker rights, `EXECUTE` privilege와 role 비활성화 범위를 실제 runtime account로 시험한다.
4. Trigger의 statement/row 단위, bulk DML 비용과 rollback 결과를 regression test한다.
5. DB CPU, lock, error와 호출량을 관측하고 application trace와 연결한다.

## 출처

- [Oracle AI Database 26ai, Cursors Overview](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/cursors-overview.html)
- [Oracle AI Database 26ai, Cursor FOR LOOP Statement](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/cursor-FOR-LOOP-statement.html)
- [Oracle AI Database 26ai, PL/SQL Error Handling](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/plsql-error-handling.html)
- [Oracle AI Database 26ai, PL/SQL Subprograms](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/plsql-subprograms.html)
- [Oracle AI Database 26ai, PL/SQL Packages](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/plsql-packages.html)
- [Oracle AI Database 26ai, PL/SQL Triggers](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/plsql-triggers.html)
- 강의: [Cursor](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5052), [Exception](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5053), [Procedure](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5055), [Function](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5056), [Package](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5057), [Trigger](https://www.inflearn.com/courses/lecture?courseId=36175&unitId=5058)

## 관련 문서

- [[PL-SQL-Fundamentals|PL/SQL 기본기]]
- [[Database-Views-and-Programmability|View와 데이터베이스 저장 프로그램]]
- [[Transactions|트랜잭션]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]
