---
tags: [database, sql, select, ddl, dml, transaction]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["SQL Fundamentals", "SQL 기초 문법", "SELECT GROUP BY DDL DML"]
---

# SQL 기본기

SQL은 관계형 데이터의 구조와 결과 조건을 선언하는 언어다. ISO SQL이 공통 골격을 정의하지만 실제 타입, 함수, DDL의 트랜잭션 동작과 세부 문법은 DBMS마다 다르다. 공통 개념과 제품 방언을 분리해 익힌다.

## 관계와 결과 grain

테이블의 한 행이 무엇을 뜻하는지, 기본 키와 후보 키가 무엇인지 먼저 정한다. 쿼리도 결과 한 행의 의미를 문장으로 정의한 뒤 작성한다. 조인과 집계가 이 grain을 바꾸므로 문법이 맞아도 행 수가 틀릴 수 있다. SQL 테이블이 관계형 모델의 relation과 달리 중복 행을 허용하는 multiset이라는 점은 [[Relational-Model-Fundamentals|관계형 모델 기본 개념]]에 있다.

## 명령 분류

| 목적 | 대표 문장 | 검토할 점 |
|---|---|---|
| 조회 | `SELECT` | 결과 grain, NULL, 중복, 정렬 |
| 데이터 변경 | `INSERT`, `UPDATE`, `DELETE`, `MERGE` | 영향 행, 동시성, 롤백 |
| 구조 정의 | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | 잠금, 암시적 commit, 복구 계획 |
| 권한 | `GRANT`, `REVOKE` | 최소 권한, 소유자 |
| 트랜잭션 | `COMMIT`, `ROLLBACK`, `SAVEPOINT` | 경계, 재시도, 외부 호출 |

DDL, DML, DCL, TCL 같은 묶음은 학습에 유용하지만 표준과 제품 문서가 문장을 분류하는 방식은 완전히 같지 않다. 예를 들어 Oracle은 `SELECT`를 제한적인 DML로 분류한다.

## 표준과 제품 방언

SQL은 관계형 DBMS의 표준 언어지만 표준이 구현을 강제하지 않아 제품마다 지원 문법, 타입과 기본 동작이 다르다. 예제 SQL이 다른 DBMS에서 그대로 동작한다고 가정하지 않고 사용하는 DBMS 버전의 매뉴얼을 기준으로 삼는다.

- MySQL에서 `CREATE SCHEMA`는 `CREATE DATABASE`의 동의어이고 데이터베이스 안에 바로 테이블이 있다. `SHOW DATABASES`로 목록을 보고 `USE company`로 기본 데이터베이스를 정하며 `SELECT DATABASE()`로 확인한다. 기본 데이터베이스가 없으면 `NULL`이다.
- PostgreSQL에서 schema는 데이터베이스 안의 namespace다. 한 데이터베이스가 여러 schema를 가지고 테이블은 schema에 속하며 기본 schema는 `public`이다. 한 연결은 접속한 데이터베이스 하나의 데이터만 다룬다.
- 같은 schema라는 단어가 MySQL에서는 데이터베이스, PostgreSQL에서는 그 아래 단계를 가리키므로 이관과 권한 설계에서 단위를 다시 맞춘다.

## SELECT의 논리적 단계

개념적으로 다음 순서로 결과를 구성한다. 옵티마이저의 실제 실행 순서와는 다르다.

1. `FROM`과 `JOIN`으로 입력 관계를 만든다.
2. `WHERE`로 개별 행을 거른다.
3. `GROUP BY`로 그룹을 만든다.
4. `HAVING`으로 그룹을 거른다.
5. `SELECT` 표현식을 계산한다.
6. `DISTINCT`로 결과 행 중복을 제거한다.
7. `ORDER BY`로 최종 결과를 정렬한다.
8. 제품 문법에 맞는 `FETCH`, `LIMIT`, `OFFSET`으로 범위를 제한한다.

```sql
SELECT customer_id,
       COUNT(*) AS order_count,
       SUM(amount) AS total_amount
FROM orders
WHERE ordered_at >= :from_date
GROUP BY customer_id
HAVING SUM(amount) >= :minimum_total
ORDER BY total_amount DESC, customer_id;
```

최종 순서가 필요하면 `ORDER BY`를 명시하고 동률을 깨는 키까지 넣는다. 저장 순서나 우연히 관찰한 실행 순서를 계약으로 삼지 않는다.

### 선택, 투영과 조인 조건

조건은 역할로 나누어 읽는다. 선택 조건(selection condition)은 관심 있는 행을 고르고, 조인 조건(join condition)은 두 테이블의 행을 잇는다. SELECT 목록의 투영 속성(projection attribute)은 결과로 가져올 컬럼이다. 결과는 두 조건을 모두 만족한 행에서 투영 속성의 값만 남긴 것이다.

```sql
-- 프로젝트 2002를 이끄는 리더의 id, 이름, 직군
SELECT e.id AS leader_id, e.name AS leader_name, e.position
FROM project AS p
JOIN employee AS e ON e.id = p.leader_id  -- 조인 조건
WHERE p.id = 2002;                         -- 선택 조건
```

- `FROM project, employee`처럼 테이블을 나열하고 WHERE에 조인 조건을 섞으면 선택 조건과 구분이 흐려진다. 명시적 `JOIN ... ON`으로 역할을 나눈다([[SQL-Joins|SQL 조인]]).
- 여러 테이블에 같은 이름의 컬럼(`id`, `name`)이 있으면 테이블 이름이나 별칭으로 한정해야 한다. MySQL은 모호한 참조를 오류 1052(`Column 'id' in where clause is ambiguous`)로 거부한다. 지금 이름이 겹치지 않아도 컬럼이 추가되면 깨지므로 다중 테이블 쿼리는 모든 컬럼을 한정한다.
- `AS`는 테이블과 컬럼에 별칭을 붙이며 생략할 수 있다. 컬럼 별칭은 결과의 이름만 바꾼다.
- 다중 테이블 쿼리의 `SELECT *`는 모든 테이블의 컬럼을 이어 붙여 같은 이름의 컬럼이 중복해 나온다.
- 선택 조건 컬럼에 인덱스를 둘지는 선택도, 쓰기 비용과 실제 실행 계획으로 정한다. 조건 컬럼마다 인덱스를 만드는 규칙은 없다([[Index|인덱스]]).

## 조건 표현

- `BETWEEN a AND b`는 일반적으로 양 끝값을 포함한다. 반열린 시간 구간은 `>= start AND < end`가 안전하다.
- `IN`은 값 후보, `EXISTS`는 행 존재 여부를 표현한다. `IN (2001, 2002)`는 같은 컬럼을 OR로 이은 조건과 같다.
- `LIKE`의 `%`는 0개 이상의 문자, `_`는 정확히 한 문자에 대응한다. 와일드카드 문자 자체를 찾으려면 escape 문자를 앞에 둔다. MySQL은 `ESCAPE`를 생략하면 `\`를 쓰고(`NO_BACKSLASH_ESCAPES` 모드면 escape 문자 없음) `LIKE 'a|_%' ESCAPE '|'`처럼 바꿀 수 있다. 문자열 리터럴도 `\`를 escape로 해석하므로 `\` 자체를 찾는 패턴은 `'\\\\'`로 쓴다. collation과 trailing space 규칙은 제품 설정을 확인한다.
- 사용자 검색어를 `LIKE CONCAT('%', ?, '%')`에 바인딩해도 검색어 속 `%`와 `_`는 와일드카드로 동작한다. escape 문자, `%`, `_`를 먼저 escape하고, 선행 `%` 패턴은 B-tree 범위 탐색을 못 한다는 비용도 함께 본다([[Query-Antipatterns#Full scan을 유발할 수 있는 조건|Full scan을 유발하는 조건]]).
- NULL 비교, 3값 논리와 `NOT IN`의 NULL 함정은 [[SQL-Fundamentals-NULL|SQL NULL과 3값 논리]]로 분리했다.
- 값은 문자열 결합이 아니라 bind parameter로 전달한다. identifier를 동적으로 바꿔야 하면 허용 목록으로 제한한다.

## 집계, 그룹과 정렬

집계 함수의 NULL 처리와 빈 입력, `WHERE`와 `HAVING`에 둔 조건이 집계 입력을 바꾸는 방식, 정렬의 NULL 위치와 별칭 범위, 비집계 컬럼 규칙은 [[SQL-Fundamentals-Aggregation|SQL 집계, 그룹과 정렬]]로 분리했다.

## 표현식과 함수

이식성이 중요한 조건 분기는 `CASE`, NULL 대체는 `COALESCE`를 우선 검토한다. 문자열, 날짜, 숫자 함수와 암시적 형 변환은 제품별 차이가 크다.

```sql
SELECT CASE
         WHEN amount >= 100000 THEN 'HIGH'
         WHEN amount >= 10000 THEN 'MEDIUM'
         ELSE 'LOW'
       END AS amount_band,
       COALESCE(discount_amount, 0) AS discount_amount
FROM orders;
```

날짜 문자열은 session format에 맡기지 말고 parameter의 타입이나 명시적 format을 사용한다. 문자 길이와 byte 길이도 같은 개념이 아니다.

## DDL과 데이터 변경

- `CREATE TABLE`에서 타입, NULL 허용 여부, 기본값과 제약을 함께 설계한다.
- `ALTER TABLE`은 운영 규모에서 잠금, table rewrite와 호환성 영향을 먼저 확인한다.
- `DROP`은 객체를, `TRUNCATE`는 보통 모든 행을 빠르게 제거하지만 복구와 트랜잭션 동작은 제품별로 다르다.
- `INSERT`는 column 목록을 명시해 schema 순서 변경의 영향을 줄인다. 목록을 생략하면 테이블 정의 순서대로 모든 컬럼의 값을 줘야 한다. 목록에 없는 컬럼은 기본값을 받고, MySQL strict mode에서는 기본값이 없는 컬럼을 빠뜨리면 오류가 난다.
- 여러 행은 `INSERT INTO t (a, b) VALUES (1, 2), (3, 4)`처럼 한 문장으로 넣어 왕복을 줄인다. 한 문장의 행 수는 lock 시간, undo와 복제 지연을 보고 정한다([[MySQL-Long-Transactions-and-Batch|장기 트랜잭션과 배치]]).
- `UPDATE`와 `DELETE`는 `WHERE`가 없으면 전체 행을 대상으로 한다. 실행 전 동일 조건의 `SELECT`와 예상 영향 행을 확인한다. 다른 테이블 조건으로 바꿀 행을 고를 때는 조인 조건과 대상 컬럼을 테이블 이름으로 한정한다. MySQL의 multi-table UPDATE와 DELETE는 [[DML-Conflict-and-Batch-Patterns-Update-Delete|UPDATE와 DELETE 패턴]]에 있다.
- 구조 변경도 GUI에서만 수행하지 말고 versioned migration으로 남긴다.

## 트랜잭션 경계

`COMMIT`은 현재 트랜잭션을 확정하고 `ROLLBACK`은 현재 트랜잭션 전체 또는 지정한 savepoint 이후를 되돌린다. DBMS와 client의 autocommit, DDL 암시적 commit, 연결 종료 동작은 각각 확인한다.

1. 업무 불변식을 만족하는 최소 write만 한 트랜잭션에 둔다.
2. 외부 API와 파일 I/O는 DB lock을 잡은 채 기다리지 않도록 분리한다.
3. 오류가 나면 statement만 실패했는지 transaction 전체가 실패했는지 driver 계약을 확인한다.
4. timeout 뒤 성공 여부가 불명확한 write는 idempotency key와 결과 조회로 수습한다.

## 안전한 학습 순서

1. 작은 fixture에 query를 실행한다.
2. 빈 입력, NULL, 중복과 경계값을 추가한다.
3. 예상 결과와 영향 행을 test로 고정한다.
4. 실제 DBMS version의 공식 문법과 실행 계획을 확인한다.
5. 운영과 비슷한 cardinality에서 lock과 비용을 측정한다.

## 마지막 날의 자정 함정

DATETIME에 `BETWEEN '2026-10-01' AND '2026-10-31'`을 주면 상한은 31일 자정으로 해석되어 그 뒤의 시간이 빠진다. 월 조회는 `>= '2026-10-01' AND < '2026-11-01'`로 표현한다. 초의 최댓값으로 상한을 맞추면 fractional precision이나 timezone에서 경계가 깨질 수 있다.

## 출처

- [ISO/IEC 9075-1:2023, SQL Framework](https://www.iso.org/standard/76583.html)
- [Oracle AI Database 26ai, Types of SQL Statements](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Types-of-SQL-Statements.html)
- [Oracle AI Database 26ai, SELECT](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/SELECT.html)
- 강의 도입: [데이터베이스 기본 개념](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4650), [SQL Developer와 SQL 분류](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4654)
- 조회와 함수: [SELECT](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4656), [집계와 숫자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4657), [문자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4658), [날짜와 조건 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4659), [GROUP BY와 HAVING](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4660)
- 데이터 정의와 변경: [CREATE, ALTER, DROP, TRUNCATE](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4663), [INSERT, UPDATE, DELETE, COMMIT, ROLLBACK](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4664)
- [인프런, 조인 종합 실습](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328750)
- [MySQL 8.4 Reference Manual, CREATE DATABASE Statement](https://dev.mysql.com/doc/refman/8.4/en/create-database.html)
- [MySQL 8.4 Reference Manual, Information Functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [MySQL 8.4 Reference Manual, String Comparison Functions and Operators](https://dev.mysql.com/doc/refman/8.4/en/string-comparison-functions.html)
- [MySQL 8.4 Reference Manual, INSERT Statement](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [MySQL 8.4 Error Message Reference, Server Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [PostgreSQL 18 Documentation, Schemas](https://www.postgresql.org/docs/18/ddl-schemas.html)
- [YouTube, 쉬운코드, SQL의 개념과 데이터베이스 정의](https://www.youtube.com/watch?v=c8WNbcxkRhY)
- [YouTube, 쉬운코드, SQL로 데이터 추가, 수정, 삭제하기](https://www.youtube.com/watch?v=mgnd5JWeCK4)
- [YouTube, 쉬운코드, SELECT 기본 문법과 AS, DISTINCT, LIKE](https://www.youtube.com/watch?v=dTBwgWMUguE)


## 관련 문서

- [[Relational-Model-Fundamentals|관계형 모델 기본 개념]]
- [[SQL-Fundamentals-NULL|SQL NULL과 3값 논리]]
- [[SQL-Fundamentals-Aggregation|SQL 집계, 그룹과 정렬]]
- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[Data-Integrity-Constraints|데이터 무결성과 제약 조건]]
- [[Transactions|트랜잭션]]
- [[Oracle-SQL-Dialect|Oracle SQL 방언]]
