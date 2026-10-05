---
tags: [database, rdbms, transaction, mvcc]
status: done
category: "Data & Storage - RDB"
aliases: ["트랜잭션", "Transactions"]
verified_at: 2026-10-05
---

# 트랜잭션

데이터베이스의 상태를 변화시키는 하나의 논리적인 작업 단위이며, 여러개의 연산이 수행될 수 있다. 하나의 트랜잭션은 commit되거나 rollback된다.

여러개의 작업을 하나의 논리적인 단위로 묶어서 반영과 복구를 조정할 수 있기 위해 사용한다.

commit 전 실패라면 rollback으로 아직 확정되지 않은 rollback 가능 DB 변경을 취소할 수 있다. 이미 commit한 변경이나 외부 시스템 효과까지 되돌리지는 못한다.

예를 들어서 결제를 진행하는 경우 계좌에서 출금 -> 주문 및 결제 완료하는 것을 하나의 논리적인 작업의 단위로 묶어서 반영과 복구를 조정할 수 있다.

## Connection과 session 경계

JDBC에서 하나의 local transaction은 한 `Connection`, 즉 DB의 한 session에서 수행된다. 여러 SQL이 하나의 transaction이어야 한다면 같은 connection에서 실행하고 마지막에 commit 또는 rollback해야 한다. 각 repository가 별도 connection을 얻으면 하나의 원자적 작업으로 묶이지 않는다.

- Auto-commit mode에서는 각 statement가 독립적으로 commit된다. 단일 statement에는 편리하며 그 자체가 잘못된 설정은 아니다. MySQL은 새 연결을 autocommit으로 시작해 오류 없이 끝난 문장마다 commit하고, 오류가 난 문장의 commit 또는 rollback은 오류 종류에 따른다. 현재 상태는 `SELECT @@autocommit`으로 확인한다.
- 계좌 이체처럼 여러 statement가 모두 성공하거나 모두 취소돼야 하면 auto-commit을 끄고 명시적 transaction boundary를 둔다.
- Commit은 현재 transaction의 rollback 가능 변경을 확정하고, rollback은 아직 commit하지 않은 rollback 가능 변경을 취소한다. DDL과 비트랜잭션 테이블은 이 경계에서 제외될 수 있다.
- Service use case가 transaction boundary를 소유하고 repository가 `Connection`을 business interface로 노출하지 않게 한다.
- Pool에 connection을 반환할 때 transaction state를 깨끗하게 복원하는 책임은 framework와 pool contract에 맞춰 관리한다.

일반적인 사용 흐름은 transaction을 시작하고, 읽기와 쓰기 SQL 사이에 분기와 반복 같은 로직을 수행한 뒤, 문제가 없으면 commit하고 중간에 취소해야 하면 rollback하는 것이다. JDBC로 이 경계를 직접 다루면 실패 경로의 순서가 중요하다. JDBC 계약상 transaction 도중 auto-commit mode를 바꾸면 그 transaction이 commit된다. catch가 `SQLException`만 잡으면 `RuntimeException`이 난 경로는 rollback 없이 finally의 `setAutoCommit(true)`에 도달해 절반만 끝난 변경을 commit한다. 열린 transaction이 있는 채로 `close()`하면 결과는 드라이버 구현에 달려 있다.

```java
void transfer(DataSource ds, TransferRequest req) throws SQLException {
    try (Connection con = ds.getConnection()) {
        con.setAutoCommit(false);
        try {
            withdraw(con, req.from(), req.amount());
            deposit(con, req.to(), req.amount());
            con.commit();
        } catch (Throwable t) {
            con.rollback(); // 모든 실패 경로에서 mode 복원보다 먼저 되돌린다
            throw t;
        } finally {
            con.setAutoCommit(true); // 열린 transaction이 남아 있으면 이 호출이 commit한다
        }
    }
}
```

Spring의 `@Transactional`은 connection 획득, commit, rollback과 상태 복원을 transaction manager로 옮겨 이 반복 코드를 숨긴다([[Spring-Transactional|Spring 트랜잭션]]).

## ACID

DBMS가 기본으로 해 주는 일과 개발자가 정해야 하는 일을 나눠 본다.

| 속성 | DBMS가 하는 일 | 개발자가 정할 일 |
|---|---|---|
| Atomicity | commit이면 변경을 모두 반영하고 rollback이면 모두 되돌린다 | 어디까지를 한 transaction으로 묶을지, 어떤 실패에서 rollback하고 어떤 실패는 대체 처리로 이어 갈지 |
| Consistency | PK, FK, CHECK, trigger처럼 DB에 선언한 규칙의 위반을 오류로 알린다 | DB에 선언하지 않은 업무 불변식을 transaction 안에서 지키고, 오류를 받으면 transaction을 끝낸다 |
| Isolation | 선택한 격리 수준의 동시성 제어를 수행한다 | 격리 수준, locking read와 조건부 UPDATE를 고른다 |
| Durability | commit된 변경을 장애 뒤에도 남긴다 | flush 정책 같은 durability 설정과 저장 장치를 확인한다 |

### Atomicity(원자성)

- 트랜잭션의 연산은 데이터베이스에 모두 반영되든지 아니면 전혀 반영되지 않아야 한다.
- commit이면 모든 rollback 가능 변경을 반영하고, rollback이면 모두 취소한다. 오류가 났다고 자동 rollback되는지는 DB, driver와 애플리케이션의 transaction boundary에 따라 확인한다.
- 실패했다고 언제나 전체 rollback이 답은 아니다. 일부 실패를 대체 경로로 이어 갈지도 업무 규칙으로 정한다. 다만 MySQL에서 대부분의 문장 오류는 그 문장만 되돌리고 이미 잡은 lock은 풀지 않으므로, 이어 가든 포기하든 transaction을 명시적으로 끝낸다.

### Consistency(일관성)

- 트랜잭션이 데이터베이스를 정의된 제약과 비즈니스 불변식을 만족하는 유효한 상태에서 다른 유효한 상태로 옮겨야 한다.
- 기본키, 외래키, CHECK 같은 DB 제약은 엔진이 강제하고, 계좌 잔고 합 같은 비즈니스 불변식은 애플리케이션과 transaction 설계가 함께 보장한다.
- 수행 전후 값이 모두 같아야 한다는 뜻은 아니다. 정상 transaction은 값을 바꾸되 불변식을 깨지 않아야 한다.
- 예를 들어 `CHECK (balance >= 0)`이 있으면 잔액보다 큰 출금 UPDATE는 오류로 실패한다. 이어서 입금 UPDATE를 실행해도 의미가 없으므로 애플리케이션이 오류를 받아 rollback한다. MySQL은 8.0.16부터 CHECK를 강제하며, 그 전 버전은 CHECK 구문을 파싱만 하고 무시했다.
- 제약은 보통 commit 시점이 아니라 각 문장을 실행할 때 검사한다. PostgreSQL은 UNIQUE, PRIMARY KEY, FK, EXCLUDE 제약을 `DEFERRABLE`로 선언해 transaction 끝에 검사하게 할 수 있지만 CHECK와 NOT NULL은 미룰 수 없다. trigger로 규칙을 검사해 오류를 내는 방법도 있다([[Database-Views-and-Programmability-Triggers|트리거]], [[Data-Integrity-Constraints|무결성 제약]]).

### Isolation(독립성, 격리성)

- 동시 transaction의 결과가 선택한 isolation level이 허용하는 관찰 규칙을 따라야 한다.
- 모든 개입과 가시성을 막는다는 뜻은 아니다. Read uncommitted, Read committed, Repeatable read와 Serializable은 허용하는 anomaly와 동시성이 다르다.
- dirty read, non-repeatable read, phantom, serialization anomaly의 허용 여부와 lock, MVCC 동작에 영향을 준다.
- 격리가 없으면 H 잔액 200을 읽어 둔 이체 transaction이 그사이 commit된 30 입금을 모른 채 220을 써서 입금이 사라진다([[Lock#동시성 제어가 없을 때: Lost Update|Lost Update]]). 완전한 격리의 기준인 serializability와 rollback이 번지지 않게 하는 recoverability는 [[Serializability-and-Recoverability|스케줄 이론]]에서 다룬다.

### Durability(영속성, 지속성)

- 성공적으로 commit된 트랜잭션의 결과는 전원 장애나 DB 프로세스 crash가 나도 남아야 한다. 보통 비휘발성 저장 장치에 기록해 보장한다.
- DB 설정과 저장 장치는 성능을 위해 이 보장을 약화할 수 있으므로 운영 설정을 함께 확인한다([[MySQL-InnoDB-Redo-and-Crash-Recovery#Durability 설정의 실제 경계|InnoDB durability 설정]]).

## MVCC (Multi-Version Concurrency Control)

각 statement나 transaction이 snapshot에 맞는 row version을 읽도록 **여러 버전의 데이터를 유지**하는 동시성 제어 기법. 스냅샷 읽기와 동시 쓰기의 row lock 충돌을 줄이지만 모든 종류의 lock과 write conflict를 없애지는 않는다.

이전 version의 저장 위치, index 연결과 cleanup 방식은 제품마다 다르다. 공통 원리와 구현 차이는 [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]에서 분리해 다룬다.

- MySQL InnoDB의 read view, Consistent Read와 Current Read는 [[Isolation-Level|MySQL InnoDB 격리 수준]]과 [[Lock|MySQL InnoDB Lock]] 참고
- PostgreSQL의 `VACUUM`과 bloat 운영은 [[PostgreSQL-Production-Operations|PostgreSQL 운영]] 참고

## 트랜잭션 설계 원칙

### 범위 최소화
- 트랜잭션 안에서는 **꼭 필요한 연산만** 수행
- 입력 형식처럼 현재 DB 상태에 의존하지 않는 사전 검증, 외부 API 호출, 파일 I/O는 가능한 트랜잭션 **밖**에서 수행
- 재고 확인처럼 동시 변경될 수 있는 상태 검증과 비즈니스 불변식 확인은 트랜잭션 **안**에서 수행
- 이유: 트랜잭션이 길어질수록 lock 보유 시간 증가 → 동시성 저하, 데드락 위험 증가

### 외부 호출은 트랜잭션 경계 밖으로 분리
- 외부 API 호출(카톡, 이메일 등)은 네트워크 지연이 불확실 → lock과 트랜잭션 자원을 오래 보유하게 됨
- 알림 누락을 허용할 수 있는 경로는 commit 뒤 best-effort 호출로 분리할 수 있음
- 유실과 중복을 관리해야 하는 경로는 비즈니스 변경과 outbox 레코드를 같은 DB 트랜잭션에 저장하고, 별도 relay가 재시도하며 consumer가 중복을 흡수 ([[Transactional-Outbox|Transactional Outbox]])

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Serializability-and-Recoverability|스케줄, 직렬 가능성과 회복 가능성]]
- [[Two-Phase-Locking|2단계 잠금 (2PL)]]
- [[Lock|DB Lock]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Spring-Transactional|Spring 트랜잭션 추상화]]
- [[Data-Integrity-Constraints|데이터 무결성 제약]]
- [[Index]]
- [[SQL]]
- [[NoSQL-Overview|NoSQL 개요, BASE 모델]] — ACID와 대비되는 최종적 일관성

## InnoDB commit의 경로

교과서의 active, partially committed와 committed 상태는 구현을 이해하는 모델이며 InnoDB 내부 상태명과 1:1 대응하지 않는다. 변경은 undo와 redo buffer, dirty page에 반영되고 commit durability는 redo flush 정책과 저장 장치에 의존한다. data page는 commit마다 모두 쓰지 않고 이후 checkpoint로 flush할 수 있다. group commit은 여러 commit의 flush를 묶을 수 있어 statement마다 반드시 fsync 한 번이라고 계산하지 않는다.

Deadlock은 전체 transaction rollback을 낼 수 있지만 일반 제약 오류와 기본 lock timeout은 statement만 취소할 수 있다. 오류마다 전체 rollback 여부를 확인하고 실패한 업무 transaction을 명시적으로 종료한다.

## START TRANSACTION과 mode 변경

START TRANSACTION은 COMMIT/ROLLBACK까지 autocommit을 일시 해제한 뒤 이전 mode로 되돌린다. `SET autocommit=0`은 session mode 자체를 바꾸어 commit 뒤에도 다음 transaction이 이어질 수 있다. pooled connection을 반환할 때 열린 transaction과 mode를 복원한다. 비트랜잭션 table의 변경과 implicit-commit DDL은 일반 rollback 계약 밖이다.

MySQL에서 transaction이 열린 채로 `START TRANSACTION`이나 `BEGIN`을 다시 실행하면 진행 중이던 transaction이 암묵적으로 commit된다. 중첩 transaction처럼 동작하지 않는다. autocommit을 끈 session이 마지막 transaction을 commit하지 않고 끝나면 MySQL은 그 transaction을 rollback한다.

## Savepoint는 transaction 종료가 아니다

`SAVEPOINT sp`, `ROLLBACK TO SAVEPOINT sp`로 이후 변경을 취소해도 transaction은 열린 채이며 마지막 COMMIT/ROLLBACK이 필요하다. InnoDB는 일반적으로 savepoint 뒤 메모리에 보유한 row lock을 해제하지 않는다. 새로 insert한 row의 undo에 따른 해제는 별도다. 부분 rollback을 lock 보유 시간을 줄이는 방법으로 쓰지 않는다. implicit commit DDL과 transaction 종료는 savepoint를 제거한다.

## 출처
- [인프런, Hong, 메모리, 트랜잭션, 락](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338555)
- [MySQL 8.4 Reference Manual, START TRANSACTION/COMMIT/ROLLBACK](https://dev.mysql.com/doc/refman/8.4/en/commit.html)
- [MySQL 8.4 Reference Manual, Optimizing InnoDB Transaction Management](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html)
- [AWS Prescriptive Guidance, Transactional Outbox Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Oracle AI Database 26ai, COMMIT and implicit DDL commit](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/COMMIT.html)
- [Oracle 11g 강의, INSERT, UPDATE, DELETE, COMMIT, ROLLBACK](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4664)
- 강의: [필요성](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328815), [Commit/Rollback](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328816), [ACID](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328817), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328819)
- 김영한 강사, [트랜잭션, 개념 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110076)
- 김영한 강사, [데이터베이스 연결 구조와 DB 세션](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110077)
- 김영한 강사, [트랜잭션 DB 예제 1, 개념 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110078)
- 김영한 강사, [트랜잭션 DB 예제 2, 자동 커밋과 수동 커밋](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110079)
- 김영한 강사, [트랜잭션 DB 예제 3, 트랜잭션 실습](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110080)
- 김영한 강사, [트랜잭션 DB 예제 4, 계좌이체](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110081)
- 김영한 강사, [트랜잭션 적용 1](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110085)
- 김영한 강사, [트랜잭션 적용 2](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110086)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110087)
- [MySQL 8.4 Reference Manual, innodb error handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [MySQL 8.4 Reference Manual, savepoint](https://dev.mysql.com/doc/refman/8.4/en/savepoint.html)
- [인프런, MySQL Transaction Deep Dive [ LifeCycle, Autocommit, Statement vs Row based ]](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373900)
- [인프런, 트랜잭션 - 함께가 아니면 하지 않아!](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86863)
- [MySQL 8.4 Reference Manual, autocommit, Commit, and Rollback](https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html)
- [MySQL 8.0 Reference Manual, CHECK Constraints](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html)
- [PostgreSQL 18 Documentation, CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [Java SE 27 API, java.sql.Connection](https://docs.oracle.com/en/java/javase/27/docs/api/java.sql/java/sql/Connection.html)
- YouTube, 쉬운코드, [데이터베이스 트랜잭션과 ACID](https://www.youtube.com/watch?v=sLJ8ypeHGlM)
