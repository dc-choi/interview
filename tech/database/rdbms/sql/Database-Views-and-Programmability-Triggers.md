---
tags: [database, mysql, postgresql, trigger, audit]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Database Triggers", "데이터베이스 트리거", "SQL Trigger", "MySQL Trigger"]
---

# 데이터베이스 트리거

[[Database-Views-and-Programmability|View와 DB 저장 프로그램]]에서 트리거 절을 분리한 문서다. 트리거는 테이블의 INSERT, UPDATE, DELETE를 계기로 자동 실행되는 저장 프로그램이다. DB를 직접 수정하는 모든 client에 적용된다는 강점과, 호출한 SQL만 봐서는 보이지 않는 암묵적 write path라는 약점을 함께 가진다.

## 구성 요소

```sql
CREATE TRIGGER log_user_nickname
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  IF NOT (OLD.nickname <=> NEW.nickname) THEN
    INSERT INTO users_log (user_id, nickname, changed_at)
    VALUES (OLD.id, OLD.nickname, NOW());
  END IF;
END
```

- 시점: `BEFORE`는 행 변경 전, `AFTER`는 행 변경 후에 실행된다. BEFORE 트리거는 `SET NEW.col = ...`로 저장될 값을 바꿀 수 있다.
- 이벤트: INSERT, UPDATE, DELETE.
- 범위: 영향받는 행마다 실행하는 row-level과 문장마다 한 번 실행하는 statement-level이 있다.
- `OLD`는 UPDATE 전 행과 DELETE된 행, `NEW`는 INSERT된 행과 UPDATE 후 행이다. INSERT 트리거에는 OLD가, DELETE 트리거에는 NEW가 없다. OLD는 읽기 전용이고 AFTER 트리거의 NEW도 읽기만 할 수 있다.
- 위 예는 같은 닉네임으로 UPDATE한 경우를 이력에서 빼려고 NULL-safe 비교 `<=>`로 실제 변경만 기록한다. mysql 클라이언트에서는 본문의 세미콜론 때문에 `DELIMITER`를 바꿔 실행한다([[MySQL-Stored-Functions#정의와 호출의 실무 규칙|정의와 호출의 실무 규칙]]).

## MySQL과 PostgreSQL의 차이

| 기능 | MySQL 8.4 | PostgreSQL 18 |
|---|---|---|
| 한 트리거의 이벤트 | 하나 | `INSERT OR UPDATE OR DELETE`처럼 여러 개 |
| 실행 단위 | `FOR EACH ROW`만 | `FOR EACH ROW`, `FOR EACH STATEMENT`(생략하면 statement) |
| 실행 조건 | 없음. 본문의 `IF`로 대신 | `WHEN (OLD.nickname IS DISTINCT FROM NEW.nickname)` |
| 본문 | SQL 문장 하나 또는 `BEGIN ... END` | `trigger`를 반환하는 트리거 함수 |
| 같은 시점과 이벤트의 여러 트리거 | 생성 순서. `FOLLOWS`, `PRECEDES`로 조정 | 트리거 이름의 알파벳 순서 |

부서 1003의 직원 5명 연봉을 한 UPDATE로 올릴 때 평균 연봉을 다시 계산하는 트리거가 row-level이면 5번, statement-level이면 1번 실행된다. PostgreSQL의 statement-level 트리거는 변경된 행이 0개여도 실행되며, 변경된 행 전체가 필요하면 `REFERENCING NEW TABLE AS ...` transition table로 받는다. MySQL은 row-level만 지원하므로 문장 단위로 한 번 처리할 일은 애플리케이션이나 배치로 옮기는 편이 낫다.

## 트리거가 실행되지 않는 변경

MySQL 8.4 기준이다.

- `TRUNCATE TABLE`, `DROP TABLE`과 파티션 삭제는 DELETE를 쓰지 않으므로 DELETE 트리거를 실행하지 않는다. 삭제 감사를 트리거에 맡기면 이 경로가 기록에서 빠진다.
- FK의 cascade 동작은 트리거를 실행하지 않는다([[Foreign-Key-Integrity#Cascade와 보이지 않는 후속 처리|Cascade와 보이지 않는 후속 처리]]).
- SQL 문장을 보내지 않는 API(NDB API)의 변경, `INFORMATION_SCHEMA`와 `performance_schema`의 변경도 트리거를 실행하지 않는다.
- 반대로 INSERT 트리거는 `LOAD DATA`와 `REPLACE`에서도, DELETE 트리거는 `REPLACE`에서도 실행된다. `INSERT ... ON DUPLICATE KEY UPDATE`는 BEFORE INSERT 뒤 중복이면 BEFORE UPDATE와 AFTER UPDATE를, 중복이 아니면 AFTER INSERT를 실행한다. 대량 적재와 UPSERT의 트리거 비용을 rehearsal로 확인한다.

## MySQL 트리거 본문의 제약

- 트리거를 실행한 문장이 읽거나 쓰는 테이블은 트리거 안에서 수정할 수 없다(오류 1442). 같은 행의 값은 BEFORE 트리거의 `SET NEW.col`로 바꾸고, 같은 테이블의 다른 행을 고쳐야 하는 규칙은 트리거 대신 애플리케이션 command로 표현한다.
- `START TRANSACTION`, `COMMIT`, `ROLLBACK`을 쓸 수 없다. 트리거는 호출한 문장의 일부라서 BEFORE나 AFTER 트리거가 실패하면 문장 전체가 실패하고, InnoDB 같은 트랜잭션 테이블에서는 그 문장과 트리거의 변경이 함께 되돌려진다.
- 클라이언트에 결과 집합을 돌려주는 문장과 그런 프로시저의 `CALL`은 쓸 수 없다.

## 집계를 트리거로 유지할 때

구매가 들어올 때마다 사용자의 누적 구매 금액을 갱신하는 트리거에서 `SELECT SUM(price) INTO total FROM buy WHERE user_id = NEW.user_id`로 합계를 다시 읽어 집계 행을 덮어쓰는 방식은 두 비용이 있다.

- 구매 한 건마다 그 사용자의 전체 이력을 다시 읽는다. 이력이 길수록 INSERT가 느려진다.
- 합계 조회는 잠금 없는 일관된 읽기라서 동시 트랜잭션은 서로의 미커밋 구매 행을 보지 못한다. 두 구매가 동시에 들어오면 각자 상대 구매가 빠진 합계를 계산하고, 늦게 갱신한 쪽이 앞선 결과를 덮어써 누적 금액이 실제보다 작아진다. MySQL 8.4.11 재현에서 5,000원 구매 트랜잭션이 열린 사이에 15,000원 구매를 넣자 REPEATABLE READ와 READ COMMITTED 모두 두 번째 INSERT는 집계 행의 잠금만 기다렸고, 커밋 뒤 누적 금액은 20,000이 아니라 15,000으로 남았다.

```sql
CREATE TRIGGER sum_buy_prices
AFTER INSERT ON buy
FOR EACH ROW
UPDATE user_buy_stats
SET price_sum = price_sum + NEW.price
WHERE user_id = NEW.user_id;
```

증분 UPDATE는 집계 행을 잠그고 그 행의 최신 값에 더한다. InnoDB에서 SELECT의 스냅샷은 UPDATE 같은 DML에 그대로 적용되지 않으므로 동시 구매가 순서대로 누적된다. 같은 재현에서 이 트리거로 바꾸면 두 격리 수준 모두 20,000이었다. 집계 행이 없을 때의 생성, 취소와 환불 같은 감소 이벤트, 원장 기준 재집계 대사를 함께 설계하고([[Aggregate-Summary-Table-Patterns|집계 요약 테이블]]), 인기 사용자 한 행에 쓰기가 몰리면 그 행이 경합 지점이 된다는 점도 본다.

## 운영 원칙

- 단순 audit metadata나 좁은 파생 값처럼 DB 경계의 작은 규칙에 제한한다.
- 큰 cascade, 외부 호출 또는 복잡한 workflow를 trigger에 숨기지 않는다.
- 트리거가 다른 테이블을 바꾸고 그 테이블의 트리거가 다시 실행되는 연쇄는 데이터가 왜 바뀌었는지 추적하기 어렵게 만들고 문장 하나의 응답 시간과 DB CPU를 늘린다. 한 이벤트에서 시작하는 연쇄의 깊이를 리뷰로 제한한다.
- 프로시저는 애플리케이션의 호출부가 연결 고리가 되지만 트리거는 코드에 흔적이 없다. 테이블별 트리거와 동작을 migration과 스키마 문서에 남기고 `SHOW TRIGGERS`나 `information_schema.TRIGGERS`로 운영 정의를 대조한다.
- bulk import, backfill과 replication에서 실행 여부/부하를 rehearsal한다.
- business actor/reason은 DB session만으로 알 수 없을 수 있어 application context 전달이 필요하다.

이력 기록은 trigger, application write와 CDC 중 누락 가능성, business context와 운영 비용을 비교한다. trigger가 있다는 이유로 history table의 retention/권한/검증이 해결되지는 않는다. 애플리케이션 write path, [[Transactional-Outbox|Transactional Outbox]]나 CDC로 같은 목적을 이룰 수 있으면 그쪽을 먼저 검토하고, 모든 writer에게 강제해야 하는 작은 규칙에만 트리거를 남긴다.

## 출처

- [MySQL 8.4 Reference Manual, CREATE TRIGGER Statement](https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html)
- [MySQL 8.4 Reference Manual, Trigger Syntax and Examples](https://dev.mysql.com/doc/refman/8.4/en/trigger-syntax.html)
- [MySQL 8.4 Reference Manual, Using Triggers](https://dev.mysql.com/doc/refman/8.4/en/triggers.html)
- [MySQL 8.4 Reference Manual, Restrictions on Stored Programs](https://dev.mysql.com/doc/refman/8.4/en/stored-program-restrictions.html)
- [MySQL 8.4 Reference Manual, Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 Error Message Reference, Server Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [PostgreSQL 18 Documentation, CREATE TRIGGER](https://www.postgresql.org/docs/18/sql-createtrigger.html)
- [PostgreSQL 18 Documentation, Overview of Trigger Behavior](https://www.postgresql.org/docs/18/trigger-definition.html)
- [인프런, 김영한, 저장 프로그램 함정과 대안](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328823)
- [YouTube, 쉬운코드, SQL trigger의 의미와 주의 사항](https://www.youtube.com/watch?v=mEeGf4ZWQKI)

## 관련 문서

- [[Database-Views-and-Programmability|View와 DB 저장 프로그램]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사]]
- [[Aggregate-Summary-Table-Patterns|집계 요약 테이블]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Transaction-Logs-Replication-CDC|트랜잭션 로그, 복제와 CDC]]
- [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서와 저장 프로그램]]
