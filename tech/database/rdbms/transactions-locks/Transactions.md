---
tags: [database, rdbms, transaction, mvcc]
status: done
category: "Data & Storage - RDB"
aliases: ["트랜잭션", "Transactions"]
verified_at: 2026-08-04
---

# 트랜잭션

데이터베이스의 상태를 변화시키는 하나의 논리적인 작업 단위이며, 여러개의 연산이 수행될 수 있다. 하나의 트랜잭션은 commit되거나 rollback된다.

여러개의 작업을 하나의 논리적인 단위로 묶어서 반영과 복구를 조정할 수 있기 위해 사용한다.

따라서 데이터의 부정합이 일어났을 경우 롤백을 하여 데이터의 부정합을 방지할 수 있다.

예를 들어서 결제를 진행하는 경우 계좌에서 출금 -> 주문 및 결제 완료하는 것을 하나의 논리적인 작업의 단위로 묶어서 반영과 복구를 조정할 수 있다.

## Connection과 session 경계

JDBC에서 하나의 local transaction은 한 `Connection`, 즉 DB의 한 session에서 수행된다. 여러 SQL이 하나의 transaction이어야 한다면 같은 connection에서 실행하고 마지막에 commit 또는 rollback해야 한다. 각 repository가 별도 connection을 얻으면 하나의 원자적 작업으로 묶이지 않는다.

- Auto-commit mode에서는 각 statement가 독립적으로 commit된다. 단일 statement에는 편리하며 그 자체가 잘못된 설정은 아니다.
- 계좌 이체처럼 여러 statement가 모두 성공하거나 모두 취소돼야 하면 auto-commit을 끄고 명시적 transaction boundary를 둔다.
- Commit은 현재 transaction의 변경을 확정하고, rollback은 아직 commit하지 않은 변경을 취소한다.
- Service use case가 transaction boundary를 소유하고 repository가 `Connection`을 business interface로 노출하지 않게 한다.
- Pool에 connection을 반환할 때 transaction state를 깨끗하게 복원하는 책임은 framework와 pool contract에 맞춰 관리한다.

## ACID
### Atomicity(원자성)
```
1. 트랜잭션의 연산은 데이터베이스에 모두 반영되든지 아니면 전혀 반영되지 않아야 한다.
2. 트랜잭션내의 모든 명령은 반드시 완벽히 수행되어야 하며, 모두가 수행되지 않고 어느 하나라도 오류가 발생하면 트랜잭션 작업 이전으로 되돌려서 원자성을 보장
```

### Consistency(일관성)
```
1. 트랜잭션이 데이터베이스를 정의된 제약과 비즈니스 불변식을 만족하는 유효한 상태에서 다른 유효한 상태로 옮겨야 한다.
2. 기본키, 외래키, CHECK 같은 DB 제약은 엔진이 강제하고, 계좌 잔고 합 같은 비즈니스 불변식은 애플리케이션과 transaction 설계가 함께 보장한다.
3. 수행 전후 값이 모두 같아야 한다는 뜻은 아니다. 정상 transaction은 값을 바꾸되 불변식을 깨지 않아야 한다.
```

### Isolation(독립성, 격리성)
```
1. 동시 transaction의 결과가 선택한 isolation level이 허용하는 관찰 규칙을 따라야 한다.
2. 모든 개입과 가시성을 막는다는 뜻은 아니다. Read uncommitted, Read committed, Repeatable read와 Serializable은 허용하는 anomaly와 동시성이 다르다.
3. dirty read, non-repeatable read, phantom, serialization anomaly의 허용 여부와 lock, MVCC 동작에 영향을 준다.
```

### Durability(영속성, 지속성)
```
1. 성공적으로 완료된 트랜잭션의 결과는 시스템이 고장나더라도 영구적으로 반영되어야 한다.
```

## MVCC (Multi-Version Concurrency Control)

각 statement나 transaction이 snapshot에 맞는 row version을 읽도록 **여러 버전의 데이터를 유지**하는 동시성 제어 기법. 스냅샷 읽기와 동시 쓰기의 row lock 충돌을 줄이지만 모든 종류의 lock과 write conflict를 없애지는 않는다.

이전 version의 저장 위치, index 연결과 cleanup 방식은 제품마다 다르다. 공통 원리와 구현 차이는 [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]에서 분리해 다룬다.

- MySQL InnoDB의 read view, Consistent Read와 Current Read는 [[Isolation-Level|MySQL InnoDB 격리 수준]]과 [[Lock|MySQL InnoDB Lock]] 참고
- PostgreSQL의 `VACUUM`과 bloat 운영은 [[PostgreSQL-Production-Operations|PostgreSQL 운영]] 참고

## 트랜잭션 설계 원칙

### 범위 최소화
- 트랜잭션 안에서는 **꼭 필요한 연산만** 수행
- 검증, 외부 API 호출, 파일 I/O는 트랜잭션 **밖**에서
- 이유: 트랜잭션이 길어질수록 lock 보유 시간 증가 → 동시성 저하, 데드락 위험 증가

### 트랜잭션 안 외부 호출 금지
- 외부 API 호출(카톡, 이메일 등)은 네트워크 지연이 불확실 → lock을 오래 보유하게 됨
- 해결: 트랜잭션 안에서는 DB 작업만 수행하고, 외부 호출은 트랜잭션 완료 후 이벤트로 분리

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Lock|DB Lock]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Index]]
- [[SQL]]
- [[NoSQL-Overview|NoSQL 개요, BASE 모델]] — ACID와 대비되는 최종적 일관성

## 출처
- [인프런, Hong, 메모리, 트랜잭션, 락](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338555)
- [MySQL 8.4 Reference Manual, START TRANSACTION/COMMIT/ROLLBACK](https://dev.mysql.com/doc/refman/8.4/en/commit.html)
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
