---
tags: [database, rdbms, mysql, stored-function, optimizer]
status: done
verified_at: 2026-10-05
category: "Database - RDBMS"
aliases: ["MySQL Stored Functions", "MySQL 저장 함수"]
---

# MySQL 저장 함수

저장 함수는 서버에 정의하고 SQL 표현식에서 호출해 값을 반환하는 stored routine이다. 중복 계산을 한곳에 둘 수 있지만, 행마다 실행되는 비용, 옵티마이저 정보, 복제 안전성과 권한 경계를 함께 책임져야 한다.

## 결정성은 계약이다

```sql
CREATE FUNCTION normalize_score(score DECIMAL(5, 2))
RETURNS DECIMAL(5, 2)
DETERMINISTIC
NO SQL
SQL SECURITY INVOKER
RETURN LEAST(100, GREATEST(0, score));
```

같은 입력에 항상 같은 결과를 내면 `DETERMINISTIC`, 시점, 세션이나 변경 가능한 데이터에 따라 달라질 수 있으면 `NOT DETERMINISTIC`이다. 아무것도 쓰지 않으면 기본값은 `NOT DETERMINISTIC`이다.

이 선언은 MySQL이 함수 본문을 증명한 결과가 아니다. 작성자의 계약이며 서버는 진실성을 검사하지 않는다.

- 실제 비결정 함수를 `DETERMINISTIC`으로 거짓 선언하면 옵티마이저가 잘못된 계획이나 결과를 만들 수 있다.
- 실제 결정 함수를 `NOT DETERMINISTIC`으로 두면 상수화 같은 사용 가능한 최적화를 놓칠 수 있다. 비교값으로 쓰면 PK 조건도 풀스캔이 된다([[#비교값으로 쓴 NOT DETERMINISTIC 함수|아래 재현]]).
- 함수가 테이블을 읽는다면 인자만 같다고 결정적인 것이 아니다. 참조 데이터가 바뀌는지도 계약에 포함한다.
- binary logging이 켜진 환경에서는 결정성 선언이 함수 생성 허용과 복제 안전성에도 영향을 준다.

따라서 성능을 위해 모든 함수에 `DETERMINISTIC`을 붙이지 않는다. 결정성 선언을 빠뜨리지 말고 의미가 참일 때만 `DETERMINISTIC`으로 선언하며, 대표 쿼리의 `EXPLAIN ANALYZE`와 호출 횟수를 확인한다.

## 비교값으로 쓴 NOT DETERMINISTIC 함수

옵티마이저는 `NOT DETERMINISTIC` 함수의 결과를 상수로 취급하지 못하고 행마다 다시 호출한다. 그래서 `WHERE id = f()`처럼 PK와 비교해도 인덱스로 찾지 못하고 호출 비용과 풀스캔 비용이 겹친다. 8.4.6에서 본문이 같은 함수(호출 수를 세는 사용자 변수 증가 포함)를 10만 행 테이블의 PK와 비교한 결과는 다음과 같다.

| 선언 | 실행 계획 | 함수 호출 | 실행 시간 |
|---|---|---|---|
| `DETERMINISTIC` | PRIMARY 단건 조회(`eq_ref`, TREE의 `<cache>(f_det())`) | 3회 | 약 0.01ms |
| `NOT DETERMINISTIC` 또는 선언 생략 | 풀스캔(`type=ALL`) | 100,000회 | 약 122ms |

- 선언을 생략한 함수도 `information_schema.ROUTINES.IS_DETERMINISTIC`이 `NO`이고 같은 계획이 나왔다. 결정적인 로직이어도 선언을 빠뜨리면 비교값으로 쓰는 순간 비용이 테이블 크기에 비례한다.
- 비결정 내장 함수를 포함한 표현식도 상수가 아니다. 매뉴얼은 WHERE의 `RAND()`가 행마다 평가되어 인덱스 최적화에 쓸 수 없다고 적고, `SYSDATE()`도 아래처럼 같다.
- 함수 비교 조건의 `EXPLAIN`이 `const`, `eq_ref`, `ref`가 아니라 `ALL`이면 함수의 결정성 선언과 표현식 안의 비결정 함수를 먼저 확인한다. 행마다 다른 값이 필요 없다면 값을 애플리케이션에서 먼저 계산해 바인딩한다.

## NOW와 SYSDATE

`NOW()`는 한 SQL 문장이 시작한 시각을 문장 안에서 일정하게 반환한다. `SYSDATE()`는 실제 호출 시각을 반환하므로 한 문장 안에서도 값이 달라질 수 있고, 이를 참조하는 표현식 평가에는 인덱스를 사용할 수 없다. `--sysdate-is-now`는 `SYSDATE()`를 `NOW()`의 별칭으로 만들지만 source와 replica에 일관되게 적용해야 한다.

저장 함수가 `NOW()`를 포함하면 문장 안에서 값이 일정하더라도 함수 자체는 비결정적이다. 문장 단위 안정성과 함수의 장기 결정성을 같은 개념으로 취급하지 않는다.

## 성능과 운영 경계

- `WHERE indexed_col = stored_function(?)`에서 함수가 상수처럼 평가될지는 결정성, 인자와 계획에 달려 있다. 선언만 보고 인덱스 사용을 보장하지 않는다.
- 컬럼마다 함수를 호출하는 조건은 대량 행에서 비싸다. 가능한 경우 범위 조건, 조인, 생성 컬럼이나 함수 인덱스와 비교한다.
- `SQL SECURITY DEFINER`가 기본이다. definer 권한으로 실행할 필요가 없다면 `INVOKER`를 검토하고 definer 계정의 수명과 권한을 관리한다.
- 함수가 의존하는 SQL mode는 생성 또는 변경 시점 값으로 저장된다. 마이그레이션에서 정의와 환경을 함께 버전 관리한다.
- 도메인 규칙을 DB 함수에 둘지 애플리케이션 코드에 둘지는 다중 소비자, 원자성, 배포 결합과 관측 가능성으로 결정한다.

## 정의와 호출의 실무 규칙

```sql
DELIMITER $$
CREATE FUNCTION dept_avg_salary(p_dept_id INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_avg INT;
  SELECT AVG(salary) INTO v_avg
  FROM employee
  WHERE dept_id = p_dept_id;
  RETURN v_avg;
END$$
DELIMITER ;
```

- `DELIMITER`는 서버 SQL이 아니라 mysql 클라이언트 명령이다. 본문의 세미콜론에서 클라이언트가 문장을 끊지 않도록 바꾸는 것이므로 드라이버로 직접 보낼 때는 `CREATE FUNCTION`부터 `END`까지를 한 문장으로 보내고 `DELIMITER`를 넣지 않는다. migration 도구는 Flyway처럼 스크립트의 `DELIMITER`를 해석하는 도구와 그렇지 않은 도구가 있으므로 그 도구의 문장 구분 규칙을 따른다.
- `RETURNS`는 함수에 필수이고 본문에는 `RETURN`이 있어야 한다. 파라미터는 항상 IN이다.
- `CONTAINS SQL`(기본), `NO SQL`, `READS SQL DATA`, `MODIFIES SQL DATA`는 서버가 강제하지 않는 권고 정보다. binary logging이 켜져 있으면 `DETERMINISTIC`, `NO SQL`, `READS SQL DATA` 중 하나도 명시하지 않은 `CREATE FUNCTION`은 오류 1418로 거부된다. `log_bin_trust_function_creators`로 우회하기보다 실제 성질을 선언한다.
- 지역 변수는 `DECLARE`로 선언하고 선언한 `BEGIN ... END` 블록 안에서만 유효하다. `@avg` 같은 사용자 정의 변수는 세션 범위라 함수가 끝난 뒤에도 남는다. 연결 풀의 연결은 여러 요청이 재사용하므로 함수 안에서 사용자 변수를 임시 저장소로 쓰면 연결을 초기화하지 않는 한 값이 다음 요청으로 새어 나갈 수 있다.
- 지역 변수나 파라미터 이름이 컬럼 이름과 같으면 MySQL은 변수로 해석한다. 파라미터 이름을 `dept_id`로 지으면 `WHERE dept_id = dept_id`가 컬럼 비교가 아니게 되므로 `p_`, `v_` 같은 접두사로 이름을 구분한다.
- 함수는 결과 집합을 반환할 수 없고, 명시적이거나 암묵적인 commit과 rollback을 포함할 수 없으며, 재귀 호출할 수 없다. 이런 작업 단위는 [[MySQL-Stored-Procedures|MySQL 저장 프로시저]]로 옮긴다.

## 행마다 실행되는 숨은 쿼리

`SELECT d.*, dept_avg_salary(d.id) FROM department AS d`는 한 문장처럼 보이지만 SELECT 목록의 함수가 결과 행마다 호출되어 함수 안의 `SELECT AVG(...)`도 부서 수만큼 실행된다. SELECT 절 상관 스칼라 서브쿼리와 같은 반복 비용이 함수 이름 뒤에 숨는다. 목록 조회는 한 번의 집계와 조인으로 바꾼다.

```sql
SELECT d.id, d.name, s.avg_salary
FROM department AS d
LEFT JOIN (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM employee
  GROUP BY dept_id
) AS s ON s.dept_id = d.id;
```

## 난수 ID 생성 함수의 충돌

`1000000000 + FLOOR(RAND() * 1000000000)`처럼 앞자리를 1로 고정한 10자리 난수 ID는 뒤 9자리의 10억 가지 값에서 고른다. birthday 문제로 계산하면 약 3만 7천 개를 발급했을 때 충돌 확률이 50%에 이르고 1만 개에서도 약 4.9%다. 이런 함수는 PK 중복 오류를 받아 다시 생성하는 경로가 필수이고, 호출마다 결과가 다르므로 `NOT DETERMINISTIC`이다. 순번, UUIDv7 같은 생성 전략과의 비교는 [[Primary-Key-Strategy|PK 생성 전략]]에 둔다.

## 등록된 함수 찾기

- 루틴은 만들 때의 기본 데이터베이스에 속한다. 다른 데이터베이스에 만들려면 `db_name.func_name`으로 한정한다. 루틴 안의 `DATABASE()`는 호출한 쪽이 아니라 루틴이 속한 데이터베이스를 돌려준다.
- `SHOW FUNCTION STATUS WHERE Db = 'company'`로 목록을, `SHOW CREATE FUNCTION dept_avg_salary`로 정의를 본다. `information_schema.ROUTINES`의 `ROUTINE_SCHEMA`, `ROUTINE_TYPE`, `DEFINER`, `IS_DETERMINISTIC`, `SQL_DATA_ACCESS`, `SECURITY_TYPE`으로 감사 쿼리를 만든다.
- `DEFINER`를 생략하면 생성한 계정(`CURRENT_USER`)이 된다. 로컬에서 root로 만든 정의를 그대로 운영 migration에 옮기면 definer 계정에 의존하게 된다.

## 함수에 둘 로직

임계값과 정책이 담긴 규칙은 DB에 둘 뚜렷한 이유가 없으면 애플리케이션에 둔다. 졸업 요건인 TOEIC 800점 같은 값은 바뀔 수 있는 정책이라 변경할 때 애플리케이션 코드와 같은 리뷰, 테스트, 배포 경로를 거쳐야 하고, 함수에 숨기면 업무 로직이 두 계층에 흩어진다. 단위 변환과 형식 정규화처럼 정책이 없는 순수 계산은 여러 쿼리가 재사용하는 유틸 함수 후보다. 판단 기준은 [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]에 있다.

## 출처

- [MySQL 8.4 Reference Manual, CREATE PROCEDURE and CREATE FUNCTION](https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html)
- [MySQL 8.4 Reference Manual, Date and Time Functions](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html)
- [MySQL 8.4 Reference Manual, Stored Program Binary Logging](https://dev.mysql.com/doc/refman/8.4/en/stored-programs-logging.html)
- [MySQL 8.4 Reference Manual, Mathematical Functions, RAND](https://dev.mysql.com/doc/refman/8.4/en/mathematical-functions.html#function_rand)
- [인프런, Real MySQL 시즌 1 - Part 1, Stored Function](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226565)
- [MySQL 8.4 Reference Manual, Defining Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/stored-programs-defining.html)
- [MySQL 8.4 Reference Manual, Local Variable Scope and Resolution](https://dev.mysql.com/doc/refman/8.4/en/local-variable-scope.html)
- [MySQL 8.4 Reference Manual, User-Defined Variables](https://dev.mysql.com/doc/refman/8.4/en/user-variables.html)
- [MySQL 8.4 Reference Manual, Restrictions on Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/stored-program-restrictions.html)
- [MySQL 8.4 Reference Manual, SHOW FUNCTION STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-function-status.html)
- [MySQL 8.4 Reference Manual, The INFORMATION_SCHEMA ROUTINES Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-routines-table.html)
- [MySQL 8.4 Reference Manual, Information Functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [Redgate Flyway Documentation, MySQL](https://documentation.red-gate.com/fd/mysql-277579322.html)
- [YouTube, 쉬운코드, stored function의 특징과 사용 시점](https://www.youtube.com/watch?v=I1jjR58Rzic)

## 관련 문서

- [[MySQL-Stored-Procedures|MySQL 저장 프로시저]]
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]
- [[MySQL-Generated-Columns-and-Functional-Indexes|MySQL 생성 컬럼과 함수 인덱스]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Query-Fundamentals|MySQL 조회 기본기]]
