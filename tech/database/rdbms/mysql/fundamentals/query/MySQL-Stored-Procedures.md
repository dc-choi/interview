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
| 재귀 | `max_sp_recursion_depth`(기본 0, 재귀 금지)까지 | 불가 |

프로시저는 닉네임 변경과 이력 기록처럼 반환값 없이 끝나는 작업 단위에, 함수는 SQL 식 안에서 재사용하는 계산에 맞는다. 다른 DBMS는 경계가 다르다. PostgreSQL 함수는 OUT 파라미터로 여러 컬럼을 돌려줄 수 있고, PostgreSQL 프로시저는 `CALL`이 명시적 트랜잭션 블록 밖에서 실행될 때만 본문에서 commit하거나 rollback할 수 있다. 제품을 비교하거나 옮길 때는 이 표를 대상 제품 문서로 다시 채운다.

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
