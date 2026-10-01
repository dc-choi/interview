---
tags: [database, rdbms, mysql, dml, update, delete, batch]
status: done
verified_at: 2026-09-30
category: "Data & Storage - RDB"
aliases: ["MySQL UPDATE DELETE 패턴", "UPDATE 대입 순서", "CASE UPDATE", "JOIN UPDATE", "MySQL 배치 갱신", "affected rows"]
---

# MySQL UPDATE와 DELETE 패턴

[[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]에서 기존 행을 바꾸는 문장을 분리한 문서다. UPDATE와 DELETE는 대상 선택, 대입 의미, 영향 행 수의 해석과 잠금 범위를 함께 정해야 한다. MySQL 8.4 기준이며, 8.4.6 재현은 기본 설정 단일 서버(Docker, aarch64)에서 확인한 결과다.

## 읽고 쓰는 틈을 없애는 UPDATE

현재 값을 애플리케이션으로 읽어 계산한 뒤 다시 저장하면 동시 갱신을 덮어쓸 수 있다. 가능한 불변식은 한 문장의 조건부 갱신으로 표현한다.

```sql
UPDATE inventory
SET quantity = quantity - 3
WHERE product_id = 42
  AND quantity >= 3;
```

영향받은 행이 1개면 차감 성공, 0개면 재고 부족 또는 대상 없음으로 해석한다. MySQL 단일 테이블 `UPDATE`는 `ORDER BY`와 `LIMIT`를 지원하지만, multi-table `UPDATE`에는 둘을 사용할 수 없다.

### affected rows는 changed인가 matched인가

`UPDATE`는 기본적으로 실제 값이 바뀐 행 수(changed)를 돌려주고, 이미 같은 값인 행은 WHERE에 걸려도 세지 않는다. 클라이언트가 `CLIENT_FOUND_ROWS`로 접속하면 WHERE에 걸린 행 수(matched)를 돌려준다. 위 조건부 차감처럼 매칭되면 반드시 값이 바뀌는 문장은 두 기준이 같다.

- Node.js `mysql2`는 기본 접속 flag에 `FOUND_ROWS`를 넣는다. 8.4.6에서 3행 중 1행만 바뀐 UPDATE는 `affectedRows` 3, `changedRows` 1이었고, flag를 끄자 `affectedRows`가 1이 됐다. TypeORM의 `UpdateResult.affected`는 드라이버의 `affectedRows`를 그대로 옮기므로 mysql2 기본 설정에서는 matched 기준이다.
- 같은 문장도 mysql CLI와 애플리케이션이 다른 숫자를 본다. 성공 조건이 대상 존재인지 실제 변경인지 먼저 정하고, 변경 여부가 필요하면 WHERE에 현재 값과 다르다는 조건을 넣는다.

### SET 대입은 왼쪽부터 평가된다

MySQL 단일 테이블 `UPDATE`는 SET의 대입을 일반적으로 왼쪽에서 오른쪽으로 평가하고, 뒤 대입은 앞에서 바뀐 값을 본다. 매뉴얼은 이 동작이 표준 SQL과 다르다고 명시하고, multi-table `UPDATE`는 대입 순서를 보장하지 않는다. PostgreSQL은 우변이 갱신 전 값을 쓴다.

```sql
-- MySQL: previous_status에 'DONE'이 들어간다
UPDATE job SET status = 'DONE', previous_status = status WHERE id = 1;
-- 이전 값을 보존하는 컬럼을 먼저 대입한다
UPDATE job SET previous_status = status, status = 'DONE' WHERE id = 1;
```

- `SET a = b, b = a`는 MySQL에서 교환이 아니라 두 값이 같아진다. 앞 대입 결과에 기대지 않는 식으로 바꾸고 fixture로 검증한다.
- `score = score + 10`처럼 자기 이전 값만 참조하면 영향이 없다. 같은 SET 안에서 방금 바꾼 컬럼을 다른 식이 참조할 때만 결과가 순서에 묶인다.
- ORM이 엔티티 필드 순서로 SET을 만든다면 의존 관계가 있는 대입은 명시 SQL로 순서를 고정한다. MySQL과 PostgreSQL 사이를 옮기면 같은 UPDATE가 다른 결과를 낸다([[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]).

## CASE 조건부 UPDATE

조건에 따라 값을 증감하거나 상태를 바꾸는 규칙이 짧고 안정적이면, 행마다 CASE로 계산하는 set-based UPDATE가 왕복과 경쟁 구간을 줄인다. 자주 바뀌는 업무 정책까지 SQL의 CASE에 넣으면 수정과 테스트가 어려워지므로 경계는 [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]로 판단한다.

```sql
UPDATE posts
SET view_count = view_count + 1,
    status = CASE WHEN view_count >= 1000 THEN 'POPULAR' ELSE status END
WHERE post_id = :post_id;
```

- ELSE를 생략하면 조건에 맞지 않는 행에 NULL이 대입된다. nullable 컬럼은 조용히 NULL이 되고, NOT NULL 컬럼은 strict SQL mode에서 오류 1048로 문장 전체가 실패하며, strict가 아니면 타입의 암묵 기본값(숫자 0, 문자열 빈 값, 날짜 zero 값)과 warning이 남는다(8.4.6 재현 일치). 기존 값을 유지하려면 `ELSE 컬럼`을 쓰거나 WHERE를 CASE 조건과 맞춘다.
- 위 CASE는 앞 대입으로 증가한 `view_count`를 본다. 999였던 행은 같은 문장에서 1000이 되어 `POPULAR`로 바뀐다. 갱신 전 값으로 판단해야 하면 CASE 대입을 앞에 둔다.
- CASE가 같은 값을 다시 쓰는 행은 changed에 세지 않으므로 결과 검증은 위 affected rows 기준을 따른다.
- `like_count = like_count + CASE ... END` 같은 증감형은 재실행하면 두 번 반영된다. 재시도할 수 있는 경로는 목표 절대값을 쓰거나 멱등 키와 함께 둔다([[Aggregate-Summary-Table-Patterns#Idempotency는 같은 입력에서 같은 상태다|집계의 idempotency]]).

## 서브쿼리로 대상을 고르는 UPDATE와 DELETE

WHERE의 서브쿼리로 다른 테이블 조건을 만족하는 행만 고칠 수 있다. 실행 전 같은 조건의 SELECT로 대상 PK와 건수를 확인한다([[MySQL-Data-and-Access-Safety#UPDATE와 DELETE 안전 절차|UPDATE와 DELETE 안전 절차]]).

- 변경하는 테이블을 같은 문장의 서브쿼리에서 다시 읽으면 보통 오류 1093(`You can't specify target table ... for update in FROM clause`)이다. `DELETE FROM t WHERE ... (SELECT ... FROM t)`, `UPDATE t ... WHERE col = (SELECT ... FROM t)`와 상관 서브쿼리로 자기 테이블 평균을 구하는 형태가 모두 해당한다.
- 예외는 대상 테이블을 derived table로 감싸고 그 결과가 merge되지 않고 materialize될 때다. 갱신 전에 대상 행이 임시 테이블로 확정된다. 8.4.6에서는 기본 `derived_merge=on`에서도 단순 wrapper가 실행됐지만 매뉴얼의 조건은 materialization이므로 `NO_MERGE` 힌트로 의도를 드러낸다.
- `IN`, `ALL`, `ANY`, `SOME` 서브쿼리 안의 `LIMIT`는 오류 1235다. 상위 N개만 고치려면 대상 PK를 derived table로 먼저 뽑거나 단일 테이블 `UPDATE ... ORDER BY ... LIMIT`를 쓴다.
- 같은 테이블 기준 갱신은 먼저 집계한 derived table과의 JOIN UPDATE가 읽기 쉽다. 대상이 크면 애플리케이션이 대상 PK를 확정한 뒤 작은 배치로 나눈다.

```sql
-- 카테고리 평균보다 비싼 메뉴만 10% 인하
UPDATE menu AS m
JOIN (SELECT category, AVG(price) AS avg_price FROM menu GROUP BY category) AS a
  ON a.category = m.category
SET m.price = m.price * 0.9
WHERE m.price > a.avg_price;
```

서브쿼리가 읽는 원본 행도 잠길 수 있다. 매뉴얼은 `UPDATE t ... WHERE col IN (SELECT ... FROM s ...)`에서 s의 행에 shared next-key lock을 건다고 적는다. 8.4.6 재현에서 REPEATABLE READ는 s의 검색 범위와 다음 gap까지 S lock을 잡았고, READ COMMITTED는 s를 consistent read로 읽어 잠그지 않았다. 서브쿼리 조건에도 인덱스와 좁은 범위가 필요하다.

## JOIN UPDATE와 JOIN DELETE

MySQL의 multi-table `UPDATE`, `DELETE`는 join으로 대상을 찾고 한 문장에서 변경할 수 있다.

```sql
UPDATE inventory AS i
JOIN stock_adjustment AS a ON a.product_id = i.product_id
SET i.quantity = i.quantity + a.delta
WHERE a.batch_id = :batch_id;

DELETE s
FROM session AS s
JOIN expired_account AS e ON e.account_id = s.account_id;
```

- 어떤 table을 읽고 어느 table을 변경하는지 alias로 명시한다.
- Source 여러 행이 target 한 행에 매칭되더라도 target row는 한 번만 갱신된다. 적용할 값이 하나가 되도록 source를 UNIQUE로 제한하거나 먼저 집계한다.
- Multi-table 형식에는 `ORDER BY`와 `LIMIT`를 사용할 수 없다. 큰 작업은 대상 PK를 먼저 제한한 뒤 작은 단일-table DML로 나눈다.
- Foreign key가 얽힌 multi-table `DELETE`는 optimizer의 처리 순서 때문에 실패할 수 있다. 단일 parent delete와 `ON DELETE` 동작이 더 명확한지 비교한다.
- 실행 전 같은 join과 predicate의 `SELECT`로 대상 cardinality를 확인하고 `EXPLAIN`에서 join 순서와 scan 범위를 검증한다. 변경 뒤에는 matched row와 changed row 의미를 구분한다.

### 행마다 다른 값과 여러 테이블 변경

행마다 다른 값을 넣을 때 단건 UPDATE를 반복하지 않고 `VALUES ROW(...)` 테이블 생성자와 join한다. 컬럼 이름은 `column_0`, `column_1` 순이며, 8.4.6에서는 `AS v (coupon_id, new_expired_at)`처럼 컬럼 목록으로 이름을 붙이는 형태도 실행됐다. 타입은 리터럴에서 추론되어 날짜 문자열이 VARCHAR가 되므로 날짜와 금액은 `DATE '...'`나 CAST로 명시한다.

```sql
UPDATE user_coupon AS uc
JOIN (VALUES ROW(101, DATE '2026-10-31'), ROW(102, DATE '2026-11-30')) AS v
  ON v.column_0 = uc.coupon_id
SET uc.expired_at = v.column_1;
```

- SET에 두 테이블의 컬럼을 함께 적으면 한 문장에서 둘 다 바뀐다(상품명과 주문에 저장한 상품명). 이때 대입 순서는 보장되지 않으므로 서로의 새 값에 의존하지 않게 쓴다.
- `DELETE p, c FROM product AS p JOIN category AS c ON ...`처럼 DELETE와 FROM 사이에 지울 테이블을 여러 개 적는다. `LEFT JOIN ... WHERE right.id IS NULL`로 짝이 없는 행만 지울 수도 있다.
- 옵티마이저 힌트는 `UPDATE /*+ JOIN_FIXED_ORDER() */ ...`처럼 UPDATE, DELETE 키워드 바로 뒤에 둔다. `JOIN_FIXED_ORDER`는 FROM 순서대로 join하는 `STRAIGHT_JOIN`과 같다. 다른 위치의 `/*+ ... */`는 힌트로 인식되지 않으며 8.4.6에서는 경고도 없었다.

### 읽기만 하는 테이블의 잠금

매뉴얼은 multi-table 형식에서 읽기만 하는 테이블의 잠금을 따로 적지 않는다. 테이블 전체가 아니라 실제 plan과 격리 수준에 따라 검색한 인덱스 레코드가 잠긴다. 8.4.6에서 위 `inventory JOIN stock_adjustment` 예시를 실행하고 `performance_schema.data_locks`를 본 결과는 다음과 같다.

| 격리 수준 | JOIN 형식의 `stock_adjustment` 잠금 | 같은 조건의 `IN` 서브쿼리 형식 |
|---|---|---|
| REPEATABLE READ | 검색한 보조 인덱스 레코드와 다음 gap에 S next-key, PK 레코드에 S | JOIN 형식과 같음 |
| READ COMMITTED | 검색한 레코드에 gap 없는 S lock | 잠금 없음 |

큰 참조 테이블을 넓게 읽는 JOIN UPDATE는 커밋까지 그 범위의 쓰기를 막으므로 source 조건에 인덱스를 두고 범위를 좁힌다. READ COMMITTED에서도 JOIN 형식은 source를 잠갔다. 잠금을 줄여야 하면 IN 서브쿼리 형식이나 대상 PK를 먼저 확정하는 방식과 비교하되, 계획과 버전에 따라 달라질 수 있으므로 대상 환경의 `data_locks`로 확인한다.

## 큰 변경을 작은 트랜잭션으로 나눈다

```sql
DELETE FROM audit_log
WHERE created_at < '2025-01-01' ORDER BY id LIMIT 5000;
```

영향받은 행이 batch 크기보다 작아질 때까지 반복하면 한 트랜잭션의 undo, redo와 lock 보유 시간을 제한할 수 있다. 다음을 함께 지킨다.

- 조건과 순서를 재개 가능한 keyset으로 고정한다.
- batch마다 commit하고 재시도 횟수, 처리 위치와 영향 행 수를 기록한다.
- 삭제 조건을 받치는 인덱스를 준비하고 `EXPLAIN`으로 스캔 범위를 확인한다.
- multi-table `DELETE`에는 `ORDER BY`와 `LIMIT`를 쓸 수 없다. 대상 PK를 먼저 제한해 단일 테이블 삭제로 넘기는 방식을 검토한다.
- 소프트 삭제는 복구와 감사에는 유리하지만 모든 읽기, UNIQUE 제약, 보존 기간과 물리 삭제 작업까지 함께 설계해야 한다.

### 저장 프로시저로 반복할 때의 계약

반복을 애플리케이션이나 스크립트 대신 DB 안의 프로시저로 돌리면 왕복은 줄지만 종료 판정과 트랜잭션 경계를 직접 책임진다.

```sql
CREATE PROCEDURE purge_audit_log()
BEGIN
  DECLARE affected INT DEFAULT 1;
  WHILE affected > 0 DO
    DELETE FROM audit_log WHERE created_at < '2025-01-01' ORDER BY id LIMIT 5000;
    SET affected = ROW_COUNT();
    COMMIT;
    DO SLEEP(0.5);
  END WHILE;
END
```

- `ROW_COUNT()`는 직전 문장의 결과이므로 DML 바로 다음에 읽는다.
- 바깥 트랜잭션 안이나 autocommit이 꺼진 connection에서 부르면 명시 COMMIT이 없는 한 모든 chunk가 한 트랜잭션이 되어 나눈 의미가 사라진다. chunk마다 COMMIT을 둔다.
- 조건이 처리한 행을 대상에서 빼야 진행한다. 삭제, 상태 전이나 `id > last_id` keyset이 그 역할이다. `ORDER BY pk`로 순서를 고정한다. ORDER BY 없는 `LIMIT` DML은 행 순서가 정해지지 않아 statement 기반 복제에서 unsafe로 분류된다.
- UPDATE의 `ROW_COUNT()`는 위 affected rows 기준을 따른다. 8.4.6에서 같은 프로시저의 `ROW_COUNT()`가 mysql CLI 호출에서는 changed, mysql2 기본 접속에서는 matched였다. `SET status = 'ARCHIVED' WHERE created_at < ... LIMIT 5000`처럼 결과가 WHERE를 벗어나지 않는 UPDATE는 changed 기준이면 이미 바뀐 행이 섞이는 순간 batch 크기 미만이나 0을 보고 대상을 남긴 채 멈췄고(CLI 재현), matched 기준이면 같은 행을 계속 골라 끝나지 않는다. 종료는 남은 대상이 있는지로 판정한다.
- 고정 SLEEP은 replica lag, lock wait와 redo 압박에 반응하지 못하고, CALL 하나가 끝날 때까지 connection을 점유하며, 중단 위치를 밖에서 알기 어렵다. 짧은 정리 작업은 프로시저로, 오래 걸리는 운영 작업은 durable checkpoint와 lag 기반 속도 조절을 가진 worker로 둔다([[MySQL-Long-Transactions-and-Batch|장기 트랜잭션과 배치]]).
- 보존 경계가 파티션 경계와 맞으면 행 단위 반복 대신 `DROP PARTITION`이나 `TRUNCATE PARTITION`을 먼저 검토한다([[MySQL-Partitioning|MySQL Partitioning]]).

## 출처

- [MySQL 8.4 Reference Manual, UPDATE](https://dev.mysql.com/doc/refman/8.4/en/update.html)
- [MySQL 8.4 Reference Manual, DELETE](https://dev.mysql.com/doc/refman/8.4/en/delete.html)
- [MySQL 8.4 Reference Manual, Restrictions on Subqueries](https://dev.mysql.com/doc/refman/8.4/en/subquery-restrictions.html)
- [MySQL 8.4 Reference Manual, Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html)
- [MySQL 8.4 Reference Manual, Optimizer Hints](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html)
- [MySQL 8.4 Reference Manual, VALUES Statement](https://dev.mysql.com/doc/refman/8.4/en/values.html)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual, Information Functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [MySQL 8.4 Reference Manual, Replication and LIMIT](https://dev.mysql.com/doc/refman/8.4/en/replication-features-limit.html)
- [PostgreSQL 18 Documentation, UPDATE](https://www.postgresql.org/docs/18/sql-update.html)
- [connection_config.js — node-mysql2 GitHub](https://github.com/sidorares/node-mysql2/blob/master/lib/connection_config.js)
- [MysqlQueryRunner.ts — TypeORM GitHub](https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/driver/mysql/MysqlQueryRunner.ts)
- [인프런, Hong, UPDATE 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367623)
- [인프런, Hong, UPDATE 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367625)
- [인프런, Hong, DELETE 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367628)
- [인프런, Hong, DELETE 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367621)
- [인프런, Real MySQL 시즌 1 - Part 2, JOIN UPDATE와 JOIN DELETE](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226585)
- [인프런, Hong, UPDATE와 DELETE](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338552)
- [인프런, Hong, 복잡한 서비스 데이터를 위한 SELECT 고급화 기법](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338551)
- [인프런, 얄팍한 코딩사전, 데이터 변경, 삭제하기](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86857)

## 관련 문서

- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Lock|DB Lock]]
- [[Transactions|트랜잭션]]
- [[Execution-Plan|실행 계획]]
- [[Database-Views-and-Programmability|View와 DB 저장 프로그램]]
