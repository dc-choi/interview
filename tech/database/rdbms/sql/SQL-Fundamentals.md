---
tags: [database, sql, select, aggregate, ddl, dml, transaction]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["SQL Fundamentals", "SQL 기초 문법", "SELECT GROUP BY DDL DML"]
---

# SQL 기본기

SQL은 관계형 데이터의 구조와 결과 조건을 선언하는 언어다. ISO SQL이 공통 골격을 정의하지만 실제 타입, 함수, DDL의 트랜잭션 동작과 세부 문법은 DBMS마다 다르다. 공통 개념과 제품 방언을 분리해 익힌다.

## 관계와 결과 grain

테이블의 한 행이 무엇을 뜻하는지, 기본 키와 후보 키가 무엇인지 먼저 정한다. 쿼리도 결과 한 행의 의미를 문장으로 정의한 뒤 작성한다. 조인과 집계가 이 grain을 바꾸므로 문법이 맞아도 행 수가 틀릴 수 있다.

## 명령 분류

| 목적 | 대표 문장 | 검토할 점 |
|---|---|---|
| 조회 | `SELECT` | 결과 grain, NULL, 중복, 정렬 |
| 데이터 변경 | `INSERT`, `UPDATE`, `DELETE`, `MERGE` | 영향 행, 동시성, 롤백 |
| 구조 정의 | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | 잠금, 암시적 commit, 복구 계획 |
| 권한 | `GRANT`, `REVOKE` | 최소 권한, 소유자 |
| 트랜잭션 | `COMMIT`, `ROLLBACK`, `SAVEPOINT` | 경계, 재시도, 외부 호출 |

DDL, DML, DCL, TCL 같은 묶음은 학습에 유용하지만 표준과 제품 문서가 문장을 분류하는 방식은 완전히 같지 않다. 예를 들어 Oracle은 `SELECT`를 제한적인 DML로 분류한다.

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

## 조건과 NULL

- `BETWEEN a AND b`는 일반적으로 양 끝값을 포함한다. 반열린 시간 구간은 `>= start AND < end`가 안전하다.
- `IN`은 값 후보, `EXISTS`는 행 존재 여부를 표현한다.
- `LIKE`의 `%`는 0개 이상, `_`는 한 문자에 대응한다. escape와 collation은 제품 설정을 확인한다.
- NULL은 빈 문자열이나 0이 아니라 알 수 없거나 적용되지 않는 상태다. `= NULL` 대신 `IS NULL`을 쓴다.
- `NOT IN`의 후보에 NULL이 있으면 3값 논리 때문에 참이 되지 않을 수 있다. NULL을 제거하거나 `NOT EXISTS`를 쓴다.
- 값은 문자열 결합이 아니라 bind parameter로 전달한다. identifier를 동적으로 바꿔야 하면 허용 목록으로 제한한다.

## 집계와 그룹

| 표현 | 의미 |
|---|---|
| `COUNT(*)` | 입력 행 수 |
| `COUNT(column)` | NULL이 아닌 값 수 |
| `COUNT(DISTINCT column)` | NULL을 제외한 고유 값 수 |
| `SUM`, `AVG` | NULL이 아닌 수치의 합과 평균 |
| `MIN`, `MAX` | 비교 가능한 값의 최소와 최대 |

`DISTINCT`와 집계 함수를 함께 쓸 수 없다는 설명은 틀리다. `COUNT(DISTINCT customer_id)`처럼 집계 인자에 적용할 수 있고, `SELECT DISTINCT`도 집계 결과 행에 적용할 수 있다. 다만 중복 제거의 위치와 비용이 달라 의도를 명시해야 한다.

`WHERE`는 그룹 전 행을, `HAVING`은 그룹 결과를 거른다. 같은 query block의 `WHERE`에서 집계 결과를 직접 참조할 수는 없지만, 집계를 계산한 subquery나 CTE의 결과를 바깥 `WHERE`에서 거를 수 있다.

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
- `INSERT`는 column 목록을 명시해 schema 순서 변경의 영향을 줄인다.
- `UPDATE`와 `DELETE`는 `WHERE`가 없으면 전체 행을 대상으로 한다. 실행 전 동일 조건의 `SELECT`와 예상 영향 행을 확인한다.
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

## 출처

- [ISO/IEC 9075-1:2023, SQL Framework](https://www.iso.org/standard/76583.html)
- [Oracle AI Database 26ai, Types of SQL Statements](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Types-of-SQL-Statements.html)
- [Oracle AI Database 26ai, SELECT](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/SELECT.html)
- 강의 도입: [데이터베이스 기본 개념](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4650), [SQL Developer와 SQL 분류](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4654)
- 조회와 함수: [SELECT](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4656), [집계와 숫자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4657), [문자 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4658), [날짜와 조건 함수](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4659), [GROUP BY와 HAVING](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4660)
- 데이터 정의와 변경: [CREATE, ALTER, DROP, TRUNCATE](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4663), [INSERT, UPDATE, DELETE, COMMIT, ROLLBACK](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4664)

## 관련 문서

- [[SQL-Query-Composition|SQL 쿼리 조합]]
- [[Data-Integrity-Constraints|데이터 무결성과 제약 조건]]
- [[Transactions|트랜잭션]]
- [[Oracle-SQL-Dialect|Oracle SQL 방언]]
