---
tags: [database, rdbms]
status: done
category: "Data & Storage - RDB"
aliases: ["트랜잭션 격리 수준", "Isolation Level"]
verified_at: 2026-08-11
---

# 트랜잭션 격리 수준

이 문서는 MySQL 8.4 InnoDB를 중심으로 격리 수준별 관찰 가능한 결과를 다룬다. MVCC의 저장 방식과 lock 획득 과정은 제품별 구현이므로 [[MVCC-Implementation-Tradeoffs|MVCC 구현 비교]]와 [[MySQL-InnoDB-Internals|InnoDB 내부 구조]]에서 분리한다.

## 레벨
### 레벨 0: Read Uncommitted

- 트랜잭션에서 아직 처리 중인 데이터를 다른 트랜잭션에서 읽는 것을 허용
- Dirty Read, Non-Repeatable Read, Phantom Read 현상 모두 발생
- MySQL에서 설정 가능하지만 권장하지 않음

### 레벨 1: Read Committed

- **Dirty Read 방지**: 트랜잭션이 커밋되어 확정된 데이터만 읽는 것을 허용
- Non-Repeatable Read, Phantom Read 현상은 발생

### 레벨 2: Repeatable Read

- MySQL InnoDB의 기본 격리 수준
- 일반 SELECT는 기본적으로 트랜잭션 안의 **첫 consistent read 시점**에 만든 스냅샷을 반복해서 읽으므로, 이후 다른 트랜잭션이 커밋해도 같은 읽기 관점을 유지한다. `START TRANSACTION WITH CONSISTENT SNAPSHOT`을 쓰면 시작 시점에 스냅샷을 만든다.
- 다른 트랜잭션의 갱신, 삭제 자체를 막는다는 뜻은 아니다. 잠금 읽기(`SELECT ... FOR UPDATE`, `FOR SHARE`)와 UPDATE/DELETE는 현재 record를 대상으로 lock을 획득하며 plain `SELECT`의 read view를 재사용하지 않는다.
- 표준 SQL에서는 Phantom Read 현상이 발생할 수 있음. InnoDB는 잠금 읽기와 범위 갱신에서 Next-Key Lock으로 phantom을 막는다.

### 레벨 3: Serializable

- 트랜잭션 결과가 어떤 직렬 실행 순서와 같아지도록 더 강하게 격리한다.
- 구현체마다 방식은 다르다. InnoDB에서는 `autocommit`이 꺼진 트랜잭션의 일반 SELECT를 `SELECT ... FOR SHARE`처럼 바꿔 공유 잠금을 잡으므로 range insert/update와 충돌할 수 있다. `autocommit`이 켜진 일반 SELECT는 각 문장이 독립 트랜잭션인 consistent nonlocking read다.

## 격리 수준은 성능 등급표가 아니다

격리 수준은 어떤 동시 실행 결과를 허용할지 정하는 계약이다. 강한 수준은 lock wait나 abort를 늘릴 수 있지만 실제 처리량은 query, index, 충돌률과 구현에 따라 달라지므로 level 이름만으로 예측하지 않는다.

## MVCC와 격리 수준의 관계

| 격리 수준 | 스냅샷 시점 | Consistent Read 동작 |
|-----------|-----------|---------------------|
| **Read Committed** | **매 쿼리마다** 최신 커밋 스냅샷 | 같은 트랜잭션 안에서도 SELECT할 때마다 다른 결과 가능 (Non-Repeatable Read) |
| **Repeatable Read** | 기본적으로 **첫 consistent read 시점**에 스냅샷 고정 | 이후 consistent read는 같은 읽기 관점 사용 |

- RR에서도 `SELECT FOR UPDATE` 같은 locking read는 현재 record를 잠그므로 plain `SELECT`의 스냅샷과 다를 수 있음
- MySQL 매뉴얼은 RR에서 locking statement와 nonlocking `SELECT`를 섞으면 서로 다른 table 상태를 다루게 된다고 경고한다. 한 상태에 의존하는 transaction이라면 locking 전략이나 `SERIALIZABLE` 필요성을 명시적으로 검토한다.
- 격리 수준은 read view 수명의 단위(트랜잭션 단위냐 statement 단위냐)만 정할 뿐, 그 단위 하나가 실제로 얼마나 오래 걸리는지는 정하지 못한다. RC라도 하나의 statement가 오래 실행되면 그 read view가 실행 내내 유지되어 undo purge를 막는다 → [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]

## InnoDB RR에서의 Phantom Read 방지

- 표준 SQL에서 RR은 Phantom Read를 방지하지 못하지만, **InnoDB는 잠금 읽기와 범위 변경에서 Next-Key Lock**으로 방지
- 범위 조건의 `SELECT ... FOR UPDATE`, UPDATE, DELETE는 Gap Lock이 함께 걸려 해당 범위에 새 행 INSERT를 차단
- 일반 SELECT는 MVCC 스냅샷을 읽으므로 같은 트랜잭션 안에서 phantom이 보이지 않지만, 삽입 자체를 막는 lock을 잡지는 않는다.
- 단, 이로 인해 INSERT 동시성이 저하될 수 있음

## RC vs RR 실무 선택

### RC로 변경하면 좋아지는 점
- 일반적인 검색, 인덱스 스캔에서 Gap Lock 사용이 줄어듦 → INSERT 동시성 향상
- 각 쿼리가 최신 데이터를 읽음 → 일부 상황에서 더 직관적

### RC로 변경하면 위험한 점
- Phantom Read 허용 → 범위 조건 결과가 트랜잭션 중 변할 수 있음
- 트랜잭션 안에서 "읽은 데이터가 커밋 전에 바뀔 수 있다"는 것을 인지해야 함

### 판단 기준
- transaction 안의 consistent read가 같은 snapshot을 재사용해야 하면 **RR**을 검토한다. locking read와 DML은 그 snapshot 규칙을 따르지 않는다는 점까지 설계한다.
- statement마다 새 committed snapshot이 필요하고 일반 search의 gap locking을 줄이려면 **RC**를 검토한다. Non-Repeatable Read와 Phantom Read를 데이터 계약이 감당해야 한다.
- 어느 쪽이든 잔액, 재고와 예약 불변식은 plain `SELECT`의 격리 수준만 믿지 말고 조건부 UPDATE, locking read와 constraint로 보호한다.

## Oracle → MySQL 이관 시 격리 수준 함정

기본 격리 수준은 Oracle이 READ COMMITTED(RC), MySQL InnoDB가 REPEATABLE READ(RR)다. 같은 SQL이어도 plain read의 snapshot 갱신 시점과 locking read/DML의 잠금 범위가 달라지므로 이관 전에 동시성 가정을 다시 확인한다.

전형적 사례: 결제, 잔액 차감 로직
```
1. SELECT balance FROM accounts WHERE user_id = ?  -- 잔액 읽기
2. (트랜잭션 안에서 잔액 검증)
3. UPDATE accounts SET balance = ... WHERE user_id = ?
```

- Oracle RC: 각 statement는 그 statement가 시작되기 전에 commit된 상태를 읽는다. 같은 query를 다시 실행하면 중간 commit이 보여 Non-Repeatable Read와 Phantom Read가 발생할 수 있다.
- MySQL RR: 일반 SELECT는 첫 consistent read에서 만든 snapshot을 transaction 동안 재사용한다. 재조회도 중간 commit을 반영하지 않아 Oracle RC에서 최신 검증으로 쓰던 재조회가 stale check가 될 수 있다.
- 두 방식 모두 plain SELECT 뒤에 UPDATE하는 check-then-act를 원자적으로 만들지는 않는다. Oracle RC에서도 SELECT 직후 다른 transaction이 바꿀 수 있고, MySQL RR에서는 재조회 자체가 오래된 snapshot일 수 있다.
- MySQL RR의 locking read와 DML은 access path로 잠금 범위가 정해진다. full PK/unique equality로 기존 row를 찾으면 record만 잠글 수 있지만, range/nonunique scan이나 없는 key 검색은 gap/next-key lock으로 insert 대기 범위를 넓힐 수 있다.

대응 패턴:
1. **검증을 쓰기에 결합** — 조건을 `UPDATE ... WHERE`나 constraint로 옮겨 check와 act 사이의 틈을 없앤다.
2. **읽기를 lock 안으로 이동** — `SELECT ... FOR UPDATE`가 선행 lock을 기다린 뒤 현재 record를 읽고 잠근다. 같은 transaction에서 검증과 UPDATE까지 끝낸다.
3. **snapshot 계약을 맞춤** — statement마다 새 snapshot이 필요하면 Spring의 `@Transactional(isolation = Isolation.READ_COMMITTED)`처럼 transaction 단위 RC를 검토한다. 이는 check-then-act의 원자성을 대신하지 않는다.
4. **DB 기본값 변경** — `transaction-isolation = READ-COMMITTED`는 영향 범위가 크므로 access path와 lock wait까지 재현한 뒤 DBA와 결정한다.

격리 수준은 절대적으로 좋고 나쁨이 없다. 비즈니스 요구사항(누적값 갱신, 재고, 잔액, 예약)과 동시성 요구사항(처리량, 응답시간) 사이의 트레이드오프이며, 이관 시점은 이 가정을 다시 검토할 좋은 기회다.

## 출처
- [m0rph2us — MySQL Isolation Level 이해하기](https://m0rph2us.github.io/mysql/transaction/2020/07/06/understanding-mysql-isolation-level.html)
- [네이버파이낸셜 — 실무에서 만나는 DB Isolation Level](https://medium.com/naverfinancial/실무에서-만나는-db-isolation-level-e94a904bbf9d)
- [woojjam — 트랜잭션과 동시성 제어](https://woojjam.tistory.com/9)
- [MySQL 8.4 — Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [Oracle Database 19c — Data Concurrency and Consistency](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html)
- [김영한 강사, 트랜잭션 격리 수준](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328818)

## 관련 문서
- [[Isolation-Level-Beyond-ANSI|ANSI 격리의 한계, Strict Serializable, Snapshot Isolation]]
- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[MySQL-InnoDB-MVCC-and-Undo|MySQL 8.4 InnoDB MVCC와 Undo]]
- [[Index]]
