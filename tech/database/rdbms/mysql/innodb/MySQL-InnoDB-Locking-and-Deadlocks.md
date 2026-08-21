---
tags: [database, mysql, innodb, lock, deadlock, next-key-lock]
status: done
verified_at: 2026-08-11
category: "Database - RDBMS"
aliases: ["MySQL InnoDB Locking", "InnoDB Locking and Deadlocks"]
---

# MySQL 8.4 InnoDB Locking과 Deadlock

InnoDB의 row lock은 SQL 결과 행이 아니라 실행 중 방문한 index record와 그 사이 gap을 대상으로 한다. 따라서 같은 `WHERE`도 access path, 격리 수준, unique key를 완전히 지정했는지에 따라 잠금 범위가 달라진다.

## 잠금 단위

| 잠금 | 대상과 의미 |
|---|---|
| S/X record lock | index record에 거는 공유/배타 잠금 |
| IS/IX intention lock | table 안에서 row S/X lock을 잡으려는 의도를 table 수준에 표시 |
| gap lock | index record 사이, 첫 record 앞, 마지막 record 뒤의 빈 구간에 insert를 억제 |
| next-key lock | index record와 바로 앞 gap을 묶어 잠금 |
| insert intention lock | 같은 gap에서 insert할 위치를 알리는 gap lock의 한 형태 |
| AUTO-INC lock | 일부 `AUTO_INCREMENT` insert 방식에서 사용하는 table 수준 잠금 |

Record lock은 항상 index record에 걸린다. 명시적인 index가 없는 table도 InnoDB가 만든 clustered index를 사용한다. Spatial index는 값의 전체 순서가 없어 next-key locking을 그대로 적용하지 않고 최소 경계 사각형을 대상으로 predicate lock을 사용한다.

Gap lock은 일반 row S/X lock과 다르다. 서로 다른 transaction의 S gap lock과 X gap lock이 같은 gap에 공존할 수 있고, 목적은 다른 transaction의 insert 억제다. Insert intention끼리는 같은 gap의 서로 다른 위치라면 서로 막지 않지만 기존 gap/next-key lock에는 대기할 수 있다.

## 실행 계획이 잠금 범위를 만든다

Locking read, `UPDATE`와 `DELETE`는 보통 검색하며 스캔한 index record를 잠근다. 최종 결과가 한 row여도 비고유 index range를 넓게 읽었다면 잠금은 넓을 수 있다.

- full unique key의 equality lookup이면 찾은 record만 잠그고 앞 gap은 잠그지 않는다.
- unique composite index의 일부 컬럼만 사용하면 unique point lookup 예외가 아니다.
- range 또는 nonunique scan은 `REPEATABLE READ`에서 next-key lock으로 방문 범위의 insert를 막을 수 있다.
- 적절한 index가 없어 full scan하면 다수의 clustered record를 잠가 다른 insert까지 막힌 것처럼 보일 수 있다.
- secondary index로 X lock을 잡는 변경은 대응하는 clustered index record도 잠근다.

잠금 SQL을 고치기 전에 `EXPLAIN`으로 선택된 index와 range를 확인하고 실제 lock을 Performance Schema로 대조한다. 결과 row 수만 보고 lock 수를 추정하지 않는다.

## 격리 수준에 따른 차이

| 문장 | `REPEATABLE READ` | `READ COMMITTED` |
|---|---|---|
| 일반 `SELECT` | 첫 consistent read의 snapshot, row/index lock 없음 | 문장마다 새 snapshot, row/index lock 없음 |
| unique point locking read | 찾은 record lock | 찾은 record lock |
| range locking read와 DML | record와 gap을 next-key 방식으로 잠글 수 있음 | 보통 record만 잠금 |
| 검색에서 제외된 row | statement/transaction 조건에 따라 lock 유지 | `WHERE` 불일치가 확인되면 record lock 해제 |

`READ COMMITTED`도 foreign key와 duplicate-key 검사에는 gap lock을 사용할 수 있다. 또한 `UPDATE`는 잠긴 row의 최신 committed version을 MySQL server에 돌려 조건 일치 여부를 먼저 판단하는 semi-consistent read를 사용한다. 따라서 RC 전환을 단순히 gap lock 제거 옵션으로 취급하지 않는다.

`SERIALIZABLE`에서 `autocommit`이 꺼진 일반 `SELECT`는 `FOR SHARE`처럼 공유 잠금을 잡는다. `autocommit`이 켜진 일반 `SELECT`는 문장 하나가 독립 transaction인 consistent nonlocking read다.

## Locking read의 계약

- `FOR SHARE`는 읽은 범위에 S lock을, `FOR UPDATE`는 X lock을 잡고 commit 또는 rollback까지 보유한다.
- 과거 undo version에는 lock을 걸 수 없다. locking read는 필요한 현재 record가 잠겨 있으면 기다린 뒤 그 상태를 읽는다.
- 바깥 query의 locking clause는 nested subquery가 읽는 table에 자동 전파되지 않는다. 그 table도 잠가야 하면 subquery에 clause를 둔다.
- `NOWAIT`는 기다리지 않고 오류를 반환한다.
- `SKIP LOCKED`는 잠긴 row를 제외하므로 일관된 view가 아니며 queue 형태에 제한한다.
- `NOWAIT`와 `SKIP LOCKED` 모두 row lock에만 적용되고 statement-based replication에도 안전하지 않다.

## Deadlock과 lock wait

Lock wait는 blocker가 끝나면 진행할 수 있는 대기다. Deadlock은 transaction들이 서로가 가진 lock을 기다리는 cycle이다. 기본값인 `innodb_deadlock_detect=ON`이면 InnoDB가 cycle을 찾아 하나를 victim으로 골라 rollback한다. 어느 요청이 항상 victim이 된다고 의존하지 않는다. 감지를 끄면 cycle 기반 victim 선택 없이 `innodb_lock_wait_timeout`으로 대기를 끝낸다.

예방과 복구는 함께 필요하다.

1. 여러 row를 같은 index와 같은 순서로 잠근다.
2. transaction 안의 외부 API와 긴 계산을 제거해 lock 보유 시간을 줄인다.
3. 조건과 index를 좁혀 불필요한 scan lock을 줄인다.
4. `ER_LOCK_DEADLOCK`은 제한 횟수와 jitter를 두고 새 transaction 전체를 재시도한다. `ER_LOCK_WAIT_TIMEOUT`은 deadlock의 증거가 아니며 기본적으로 실패한 statement만 rollback하므로, 전체 transaction을 다시 시도하려면 먼저 명시적으로 rollback한다.
5. retry는 복구 장치다. 반복되는 cycle은 deadlock report의 index, record와 획득 순서를 바꿔 해결한다.

## 세 세션으로 next-key lock 재현

버려도 되는 테스트 instance에 전용 `innodb_lab` schema와 table을 만든다. Setup과 Session A/B는 이 schema에 `CREATE`, `DROP`, `SELECT`, `INSERT`, `UPDATE`가 있는 전용 lab 계정을 쓴다. Performance Schema가 활성화되어 있어야 하며 Session C에는 `data_locks`, `data_lock_waits`의 `SELECT` 권한이 필요하다. `FORCE INDEX`는 작은 table에서도 access path를 고정하기 위한 실험용이다.

```sql
CREATE DATABASE IF NOT EXISTS innodb_lab;
USE innodb_lab;
DROP TABLE IF EXISTS lock_lab;
CREATE TABLE lock_lab (
  id INT PRIMARY KEY,
  bucket INT NOT NULL,
  note VARCHAR(20) NOT NULL,
  KEY ix_bucket_id (bucket, id)
) ENGINE = InnoDB;
INSERT INTO lock_lab VALUES (10, 1, 'a'), (30, 1, 'c');
COMMIT;
```

Session A가 indexed range를 잠근다.

```sql
USE innodb_lab;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM lock_lab FORCE INDEX (ix_bucket_id)
WHERE bucket = 1 AND id BETWEEN 10 AND 30 FOR UPDATE;
```

Session B의 insert는 Session A가 끝날 때까지 기다린다.

```sql
USE innodb_lab;
SET SESSION innodb_lock_wait_timeout = 300;
START TRANSACTION;
INSERT INTO lock_lab VALUES (20, 1, 'waiting');
```

Session C에서 현재 증거를 수집한다.

```sql
SELECT ENGINE_TRANSACTION_ID, INDEX_NAME, LOCK_TYPE,
       LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks
WHERE OBJECT_SCHEMA = 'innodb_lab' AND OBJECT_NAME = 'lock_lab'
ORDER BY ENGINE_TRANSACTION_ID, INDEX_NAME, LOCK_DATA;

SELECT REQUESTING_ENGINE_TRANSACTION_ID AS waiting_trx,
       BLOCKING_ENGINE_TRANSACTION_ID AS blocking_trx
FROM performance_schema.data_lock_waits;
```

`data_lock_waits`에 requester와 blocker 관계가 나타나고 `data_locks`에서 record/gap 관련 mode와 index 범위를 확인할 수 있다. exact row 수와 `LOCK_DATA` 표현은 page 상태와 실행 계획에 따라 달라진다. `ENGINE_LOCK_ID` 문자열 형식은 내부 값이므로 파싱하지 않는다.

RR 대기를 끝낸 뒤 RC 대조군을 같은 두 session에서 실행한다. 아래 주석별 SQL을 해당 session에 실행한다.

```sql
-- Session A: RR range lock 해제
COMMIT;
-- Session B: 대기하던 id 20 INSERT가 끝난 뒤
COMMIT;

-- Session A: RC range lock
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT * FROM lock_lab FORCE INDEX (ix_bucket_id)
WHERE bucket = 1 AND id BETWEEN 10 AND 30 FOR UPDATE;

-- Session B: 일반 range gap을 기다리지 않음
START TRANSACTION;
INSERT INTO lock_lab VALUES (25, 1, 'no-wait');
COMMIT;

-- Session A: 실험 종료
COMMIT;
-- 모든 session 종료 뒤 setup 계정에서 cleanup
DROP TABLE innodb_lab.lock_lab;
```

RC에서도 foreign key와 duplicate-key 검사에는 gap lock을 사용할 수 있다. full PK equality인 `WHERE id = 10 FOR UPDATE`와 비교하면 record-only 예외도 확인할 수 있다.

Performance Schema lock table들은 빠르게 변하고 서로 원자적인 snapshot이 아니다. 한 번의 조회만으로 인과를 확정하지 말고 transaction 시작 시각, SQL, plan, 여러 시점의 wait 관계와 deadlock log를 함께 보관한다.

## 통과 기준

- 결과가 한 row인데도 여러 record가 잠기는 access path를 설명할 수 있다.
- gap lock의 S/X가 공존하는 이유와 insert intention끼리 항상 충돌하지 않는 이유를 설명할 수 있다.
- RR에서 plain `SELECT`와 `FOR UPDATE`가 서로 다른 상태를 볼 수 있는 이유를 MVCC와 연결할 수 있다.
- deadlock retry와 lock 순서/index 개선이 각각 복구와 예방 중 무엇인지 구분할 수 있다.

## 출처

- [MySQL 8.4 Reference Manual, InnoDB Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.4 Reference Manual, InnoDB Error Handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [MySQL 8.4 Reference Manual, InnoDB System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html)
- [MySQL 8.4 Reference Manual, Performance Schema Table Characteristics](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-table-characteristics.html)
- [MySQL 8.4 Reference Manual, Performance Schema Data Lock Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html)
- [MySQL 8.4 Reference Manual, The data_lock_waits Table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html)
- [MySQL 8.4 Reference Manual, InnoDB Transaction and Locking Information](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-examples.html)
- [MySQL 8.4 Reference Manual, InnoDB Internal Data Caveats](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-internal-data.html)

## 관련 문서

- [[MySQL-InnoDB-MVCC-and-Undo|InnoDB MVCC와 Undo]]
- [[MySQL-Gap-Lock|Gap Lock 사례와 회피 전략]]
- [[Lock|DB Lock 전략과 애플리케이션 적용]]
- [[Lock-Deadlock|데드락 완화와 락 제거 설계]]
- [[MySQL-Slow-Query-Diagnosis|Slow Query와 lock wait 진단]]
