---
tags: [database, rdbms, mysql, stored-procedure, transaction]
status: done
verified_at: 2026-10-05
category: "Database - RDBMS"
aliases: ["MySQL Stored Procedures", "MySQL 저장 프로시저", "Stored Procedure vs Function"]
---

# MySQL 저장 프로시저

저장 프로시저는 서버에 저장해 두고 `CALL`로 실행하는 문장 묶음이다. 값을 돌려주는 식이 아니라 하나의 작업 단위라서 저장 함수와 호출 방식, 결과 전달, 트랜잭션 제어가 다르다. 함수의 결정성과 정의 규칙은 [[MySQL-Stored-Functions|MySQL 저장 함수]], DB에 로직을 둘지의 판단은 [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]와 [[Database-Views-and-Programmability|View와 DB 저장 프로그램]]에 둔다. MySQL 8.4 문서 기준이다.

## 파라미터 모드

```sql
CREATE PROCEDURE product(IN a INT, IN b INT, OUT result INT)
  SET result = a * b;

CALL product(5, 7, @result);
SELECT @result;  -- 35
```

| 모드 | 호출 시 값을 받는가 | 프로시저 안의 변경이 호출자에게 보이는가 |
|---|---|---|
| `IN`(기본) | 받음 | 아니오 |
| `OUT` | 받지 않음. 프로시저 안의 초기값은 NULL | 예 |
| `INOUT` | 받음 | 예 |

- 모드를 생략하면 IN이다. 결과용 파라미터에서 `OUT`을 빠뜨리면 입력 파라미터가 되어 값이 호출자에게 돌아오지 않는다.
- `INOUT`은 두 변수의 값을 맞바꾸는 swap처럼 받은 값을 바꿔 돌려줄 때 쓴다. 호출 전에 변수를 초기화한다.
- 클라이언트에서 호출하면 OUT과 INOUT 값은 사용자 변수로 받는다(다른 루틴 안에서는 지역 변수나 파라미터로도 받는다). 사용자 변수는 세션이 끝날 때까지 남고 `CALL`이 오류로 끝나면 OUT 값이 돌아오지 않으므로 연결 풀에서는 다음 요청이 이전 값을 읽지 않게 호출마다 다시 설정한다.

## 결과 집합 반환

프로시저 안의 일반 SELECT는 결과 집합을 그대로 클라이언트에 보낸다. 부서별 평균 연봉 같은 표를 `RETURN`이나 OUT 파라미터 없이 돌려줄 수 있다. `CALL`은 프로시저 안 문장들의 결과 집합에 더해 호출 상태를 알리는 결과를 하나 더 보내므로 클라이언트는 여러 결과를 처리해야 한다. 저장 함수는 결과 집합을 반환할 수 없고 `SELECT ... INTO`나 cursor로만 결과를 다룬다.

## 트랜잭션은 CALL이 만들지 않는다

```sql
CREATE PROCEDURE change_nickname(IN p_user_id INT, IN p_nickname VARCHAR(30))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO nickname_logs (user_id, nickname, changed_at)
  SELECT id, nickname, NOW() FROM users WHERE id = p_user_id;
  UPDATE users SET nickname = p_nickname WHERE id = p_user_id;
  COMMIT;
END
```

- `BEGIN ... END`는 복합문일 뿐 트랜잭션을 시작하지 않는다. 저장 프로그램 안의 `BEGIN [WORK]`도 블록 시작으로 해석되므로 트랜잭션은 `START TRANSACTION`으로 연다.
- autocommit 세션에서 트랜잭션 밖의 각 문장은 그 자체로 원자적으로 커밋된다. 위 예에서 `START TRANSACTION`이 없으면 로그 INSERT가 이미 커밋된 뒤 UPDATE가 실패할 수 있다. 여러 DML이 한 불변식이면 프로시저 안이나 호출하는 쪽 중 한 곳에서 경계를 명시한다.
- MySQL 트랜잭션은 중첩되지 않는다. `START TRANSACTION`은 진행 중인 트랜잭션을 암묵적으로 커밋하므로 애플리케이션 트랜잭션 안에서 위 프로시저를 호출하면 그때까지의 작업이 확정되고, 프로시저의 `COMMIT`이나 `ROLLBACK`이 경계를 대신 정한다. 프로시저를 애플리케이션 트랜잭션 안에서 쓸 계획이면 내부에서 트랜잭션을 열지 않고 경계를 호출자가 소유한다.
- 저장 함수와 트리거는 명시적이거나 암묵적인 commit, rollback을 포함할 수 없다. 트랜잭션 제어가 필요한 작업 단위는 프로시저나 애플리케이션이 맡는다.

## 저장 함수와의 차이

| 항목 | 프로시저 | 함수 |
|---|---|---|
| 정의 | `CREATE PROCEDURE` | `CREATE FUNCTION`, `RETURNS` 필수 |
| 호출 | `CALL` 단독 문장 | SELECT, INSERT, UPDATE, DELETE의 식 안 |
| 값 전달 | OUT, INOUT 파라미터와 결과 집합. `RETURN`은 쓰지 않음 | `RETURN` 값 하나. 파라미터는 항상 IN |
| 반환 의무 | 없음 | 반드시 반환 |
| 결과 집합 | 가능 | 불가 |
| 트랜잭션 제어 | 가능 | 불가 |
| 동적 SQL(`PREPARE`) | 가능 | 불가 |
| 재귀 | `max_sp_recursion_depth`(기본 0, 재귀 금지)까지 | 불가 |

프로시저는 닉네임 변경과 이력 기록처럼 반환값 없이 끝나는 작업 단위에, 함수는 SQL 식 안에서 재사용하는 계산에 맞는다. 다른 DBMS는 경계가 다르다. PostgreSQL 함수는 OUT 파라미터로 여러 컬럼을 돌려줄 수 있고, PostgreSQL 프로시저는 `CALL`이 명시적 트랜잭션 블록 밖에서 실행될 때만 본문에서 commit하거나 rollback할 수 있다. 제품을 비교하거나 옮길 때는 이 표를 대상 제품 문서로 다시 채운다.

## 커서로 한 행씩 처리

커서는 SELECT 결과를 한 행씩 읽어 행마다 처리할 때 쓴다. MySQL 커서는 읽기 전용이라 커서로 행을 수정할 수 없고, 한 방향으로만 이동하며 행을 건너뛸 수 없다. 서버가 결과 테이블을 복사해 둘 수도 있고 그러지 않을 수도 있는(asensitive) 커서라서, 루프 안에서 같은 테이블을 바꿀 때 그 변경이 커서에 보일지에 기대지 않는다. 이 절은 MySQL 8.4 문서로 2026-10-12 확인한 기준이다.

```sql
CREATE PROCEDURE avg_salary()
BEGIN
  DECLARE v_salary DECIMAL(18, 2);
  DECLARE v_count BIGINT DEFAULT 0;
  DECLARE v_total DECIMAL(38, 2) DEFAULT 0;
  DECLARE done BOOLEAN DEFAULT FALSE;
  DECLARE salary_cur CURSOR FOR SELECT salary FROM employee WHERE salary IS NOT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN salary_cur;
  read_loop: LOOP
    FETCH salary_cur INTO v_salary;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET v_count = v_count + 1;
    SET v_total = v_total + v_salary;
  END LOOP;
  CLOSE salary_cur;
  SELECT v_total / NULLIF(v_count, 0) AS avg_salary;
END
```

- `DECLARE`는 `BEGIN ... END`의 맨 앞에만 둘 수 있고, 변수와 조건, 커서, 핸들러 순서로 선언해야 한다.
- 더 읽을 행이 없으면 `FETCH`가 SQLSTATE `'02000'`의 No Data 조건을 내고 `NOT FOUND` 핸들러가 종료 플래그를 세운다. `LOOP`는 종료문이 없으면 무한 반복하므로 `FETCH` 바로 다음에 플래그를 확인해 `LEAVE`한다. 확인을 처리 뒤에 두면 행이 없는 마지막 `FETCH` 뒤에도 처리가 한 번 더 실행된다.
- `NOT FOUND`는 행을 찾지 못한 `SELECT ... INTO`에서도 발생한다. 루프 안의 조회가 비면 같은 핸들러가 플래그를 세워 커서에 행이 남아 있어도 루프가 끝나므로, 그런 조회는 자체 `BEGIN ... END` 블록과 핸들러로 감싸 커서의 종료와 구분한다.
- 명시적으로 닫지 않은 커서는 선언한 블록이 끝날 때 닫히고, 열리지 않은 커서를 `CLOSE`하면 오류가 난다.
- 위 예는 `salary`가 `DECIMAL(18, 2)`인 경우의 구조 예시다. NULL은 제외하고 빈 결과는 NULL을 반환한다. 실제 평균은 `AVG(salary)` 한 문장으로 구한다. 커서는 행마다 다른 문장을 실행해야 하는 처리처럼 집합 연산으로 표현하기 어려운 경우에 쓴다.

## 동적 SQL

테이블 이름처럼 문장 구조가 호출마다 달라지면 문자열로 문장을 만들어 `PREPARE`와 `EXECUTE`로 실행한다. 이런 동적 SQL은 저장 프로시저에서는 쓸 수 있지만 저장 함수와 트리거에서는 쓸 수 없다. 이 절은 MySQL 8.4 문서로 2026-10-12 확인한 기준이다.

```sql
CREATE PROCEDURE count_by_user(IN p_table VARCHAR(64), IN p_user_id INT)
SQL SECURITY INVOKER
BEGIN
  SET @sql = CASE p_table
    WHEN 'orders' THEN 'SELECT COUNT(*) FROM `orders` WHERE user_id = ?'
    WHEN 'refunds' THEN 'SELECT COUNT(*) FROM `refunds` WHERE user_id = ?'
    ELSE NULL
  END;
  IF @sql IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'table not allowed';
  END IF;
  SET @user_id = p_user_id;
  PREPARE stmt FROM @sql;
  EXECUTE stmt USING @user_id;
  DEALLOCATE PREPARE stmt;
END
```

- `PREPARE`할 문장은 문자열 리터럴이나 사용자 변수로만 주고, `EXECUTE ... USING`에 바인딩할 값도 사용자 변수로만 넘긴다. 준비한 문장(prepared statement)의 범위는 프로시저가 아니라 세션이라 프로시저가 끝난 뒤에도 실행될 수 있으므로, 그 문장 안에서는 프로시저의 지역 변수와 파라미터를 참조할 수 없다. 위 예가 파라미터 값을 `@user_id`로 옮겨 넘기는 이유다.
- `?` 자리표시자는 값 자리에만 쓸 수 있다. 테이블과 컬럼 이름은 값으로 바인딩할 수 없으므로 허용된 고정 식별자나 문장으로 매핑한다. 위 예는 입력 문자열 자체를 SQL에 붙이지 않고 두 문장 중 하나만 선택하며, `SQL SECURITY INVOKER`로 호출자의 권한을 쓴다. 검사 없이 이름을 이어 붙이면 SQL을 주입할 수 있다([[Prepared-Statement-Cache|Prepared Statement와 캐시 경계]], [[SQL-Injection]]).
- 프로시저 안에서 준비한 문장은 프로시저가 끝나도 해제되지 않고 세션에 남으므로 `DEALLOCATE PREPARE`로 해제한다. 오류 경로에서도 해제하거나 연결을 재사용하기 전에 세션을 초기화한다. 같은 이름의 다음 `PREPARE`가 이전 문장을 암묵적으로 해제하지만 다음 호출에 정리를 맡기지는 않는다. `@sql` 같은 사용자 변수도 세션에 남아 연결 풀의 다음 요청에 보일 수 있다([[MySQL-Stored-Functions#정의와 호출의 실무 규칙|정의와 호출의 실무 규칙]]).
- 커서의 SELECT는 커서를 만들 때 검사되므로 동적 SQL로 만든 문장에는 커서를 쓸 수 없다.

## 변경과 배포

- `ALTER PROCEDURE`는 COMMENT, SQL SECURITY 같은 특성만 바꾼다. 파라미터나 본문을 바꾸려면 `DROP PROCEDURE` 뒤 `CREATE PROCEDURE`를 해야 하므로 그 사이에 들어온 `CALL`은 프로시저가 없다는 오류 1305를 받는다. 운영 중 변경은 새 이름으로 만들고, 호출부를 옮긴 뒤 옛 프로시저를 지운다.
- 서버는 저장 프로그램을 세션별 캐시에 둔다. 한 세션이 캐시한 정의는 다른 세션과 공유되지 않고 세션이 끝나면 버려진다. 프로시저가 서버 전체에서 한 번 컴파일되어 계속 빨라진다는 설명은 MySQL에 맞지 않는다.
- 복제에는 프로시저 안의 DML이 개별 이벤트로 기록되고 `CALL` 자체는 기록되지 않는다.
- mysql 클라이언트로 정의할 때는 `DELIMITER`를 바꾸고, 드라이버로는 정의 전체를 한 문장으로 보낸다. migration 도구는 도구마다 `DELIMITER` 해석 여부가 다르다([[MySQL-Stored-Functions#정의와 호출의 실무 규칙|정의와 호출의 실무 규칙]]). 정의는 versioned migration으로 관리하고 `SHOW PROCEDURE STATUS WHERE Db = 'company'`, `SHOW CREATE PROCEDURE`, `information_schema.ROUTINES`로 운영 정의와 저장소 정의를 대조한다.

## 면접 체크포인트

- 프로시저와 함수의 차이(호출 위치, 반환 방식, 반환 의무, 결과 집합, 트랜잭션 제어)를 설명할 수 있는가?
- CALL 하나가 원자적이지 않은 이유와 경계를 둘 위치는?
- 애플리케이션 트랜잭션 안에서 `START TRANSACTION`이 든 프로시저를 호출하면 무엇이 확정되는가?
- 본문만 바꾸는 프로시저 배포가 MySQL에서 무중단이 아닌 이유는?
- 저장 프로그램 캐시가 세션 단위라는 점이 성능 설명에 주는 의미는?
- 커서 루프가 행을 다 읽기 전에 끝나는 원인과 막는 방법은?
- 동적 SQL에서 테이블 이름을 `?`로 바인딩하지 못할 때 주입을 막는 방법은?

## 출처

- [MySQL 8.4 Reference Manual, CREATE PROCEDURE and CREATE FUNCTION](https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html)
- [MySQL 8.4 Reference Manual, CALL Statement](https://dev.mysql.com/doc/refman/8.4/en/call.html)
- [MySQL 8.4 Reference Manual, ALTER PROCEDURE Statement](https://dev.mysql.com/doc/refman/8.4/en/alter-procedure.html)
- [MySQL 8.4 Reference Manual, RETURN Statement](https://dev.mysql.com/doc/refman/8.4/en/return.html)
- [MySQL 8.4 Reference Manual, START TRANSACTION, COMMIT, and ROLLBACK Statements](https://dev.mysql.com/doc/refman/8.4/en/commit.html)
- [MySQL 8.4 Reference Manual, Statements That Cause an Implicit Commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
- [MySQL 8.4 Reference Manual, Restrictions on Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/stored-program-restrictions.html)
- [MySQL 8.4 Reference Manual, Caching of Prepared Statements and Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/statement-caching.html)
- [MySQL 8.4 Reference Manual, Server System Variables, max_sp_recursion_depth](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_max_sp_recursion_depth)
- [MySQL 8.4 FAQ, Stored Procedures and Functions](https://dev.mysql.com/doc/refman/8.4/en/faqs-stored-procs.html)
- [MySQL 8.4 Reference Manual, Cursors](https://dev.mysql.com/doc/refman/8.4/en/cursors.html)
- [MySQL 8.4 Reference Manual, Aggregate Function Descriptions](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [MySQL 8.4 Reference Manual, Flow Control Functions](https://dev.mysql.com/doc/refman/8.4/en/flow-control-functions.html)
- [MySQL 8.4 Reference Manual, Cursor FETCH Statement](https://dev.mysql.com/doc/refman/8.4/en/fetch.html)
- [MySQL 8.4 Reference Manual, Cursor CLOSE Statement](https://dev.mysql.com/doc/refman/8.4/en/close.html)
- [MySQL 8.4 Reference Manual, DECLARE Statement](https://dev.mysql.com/doc/refman/8.4/en/declare.html)
- [MySQL 8.4 Reference Manual, DECLARE ... HANDLER Statement](https://dev.mysql.com/doc/refman/8.4/en/declare-handler.html)
- [MySQL 8.4 Reference Manual, LOOP Statement](https://dev.mysql.com/doc/refman/8.4/en/loop.html)
- [MySQL 8.4 Reference Manual, SIGNAL Statement](https://dev.mysql.com/doc/refman/8.4/en/signal.html)
- [MySQL 8.4 Reference Manual, Prepared Statements](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html)
- [MySQL 8.4 Reference Manual, PREPARE Statement](https://dev.mysql.com/doc/refman/8.4/en/prepare.html)
- [MySQL 8.4 Reference Manual, EXECUTE Statement](https://dev.mysql.com/doc/refman/8.4/en/execute.html)
- [MySQL 8.4 Reference Manual, Local Variable Scope and Resolution](https://dev.mysql.com/doc/refman/8.4/en/local-variable-scope.html)
- [PostgreSQL 18 Documentation, User-Defined Procedures](https://www.postgresql.org/docs/18/xproc.html)
- [PostgreSQL 18 Documentation, Query Language (SQL) Functions](https://www.postgresql.org/docs/18/xfunc-sql.html)
- [YouTube, 쉬운코드, stored procedure와 stored function의 차이](https://www.youtube.com/watch?v=m2jx18yg8EA)

## 관련 문서

- [[MySQL-Stored-Functions|MySQL 저장 함수]]
- [[Database-Views-and-Programmability|View와 DB 저장 프로그램]]
- [[Database-Views-and-Programmability-Triggers|데이터베이스 트리거]]
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]
- [[Transactions|트랜잭션]]
- [[MySQL-Error-Handling|MySQL 오류 처리]]
- [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]
