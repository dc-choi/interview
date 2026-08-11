---
tags: [database, mysql, innodb, mvcc, undo, read-view]
status: done
verified_at: 2026-08-11
category: "Database - RDBMS"
aliases: ["MySQL InnoDB MVCC", "InnoDB MVCC and Undo"]
---

# MySQL 8.4 InnoDB MVCC와 Undo

이 문서는 MySQL 8.4 InnoDB가 현재 clustered record와 undo를 이용해 consistent read를 제공하는 방식을 다룬다. PostgreSQL의 heap tuple, `xmin`/`xmax`, `ctid`와 VACUUM은 같은 문제를 푸는 다른 구현이므로 이 문서의 용어와 섞지 않는다.

## 저장 모델: 현재 row와 이전 버전 복원 정보

InnoDB clustered record에는 사용자 컬럼 외에 다음 system field가 붙는다.

| 필드 | 크기 | 역할 |
|---|---:|---|
| `DB_TRX_ID` | 6 bytes | record를 마지막으로 insert 또는 update한 transaction 식별 |
| `DB_ROLL_PTR` | 7 bytes | 이전 값을 복원하는 undo record 위치 |
| `DB_ROW_ID` | 6 bytes | InnoDB가 clustered index를 자동 생성한 record에서 row 식별 |

변경 전 값은 table 안에 새 row version으로 나란히 쌓이는 것이 아니라 undo tablespace의 rollback segment에 기록된다. undo record는 변경을 rollback하는 정보이면서 consistent read가 이전 값을 재구성하는 정보다.

- insert undo는 다른 transaction이 과거 버전으로 볼 필요가 없으므로 commit 뒤 폐기할 수 있다.
- update undo는 기존 row의 과거 상태가 snapshot에 필요할 수 있어 바로 없앨 수 없다.
- `DB_ROLL_PTR`가 가리키는 undo를 이용해 필요한 이전 상태를 복원한다. undo record의 실제 byte layout은 공개 SQL 계약이 아니다.

## Read view가 결정하는 것

Consistent read는 읽기 시작 시점에 어떤 transaction의 변경을 볼 수 있는지 나타내는 read view를 사용한다.

| 상황 | consistent read의 판단 |
|---|---|
| 자신의 앞선 변경 | commit 전이어도 보임 |
| view를 만들기 전에 commit된 변경 | 보임 |
| view 시점에 미완료였거나 그 뒤 시작된 변경 | 보이지 않음, 필요하면 undo로 이전 상태 복원 |
| 다른 transaction의 미커밋 변경 | 보이지 않음 |

Reference Manual이 보장하는 것은 이 가시성 결과다. 소스 코드의 `ReadView` 필드명, transaction ID 경곗값과 내부 함수는 MySQL 8.4 공개 계약이 아니므로 면접 답변의 전제로 두지 않는다.

### 격리 수준별 수명

- `REPEATABLE READ`: 첫 consistent read가 view를 만들고 이후 consistent read가 재사용한다. `START TRANSACTION`만으로 view가 생겼다고 단정하지 않는다.
- `READ COMMITTED`: consistent read 문장마다 새 view를 만든다.
- `START TRANSACTION WITH CONSISTENT SNAPSHOT`: `REPEATABLE READ`에서 transaction 시작과 함께 view를 만든다.

일반 `SELECT`의 snapshot 규칙을 locking read, `UPDATE`와 `DELETE`에 그대로 적용하면 안 된다. 이 문장들은 현재 상태를 대상으로 잠금을 획득한다. MySQL 매뉴얼도 `REPEATABLE READ`에서 locking statement와 nonlocking `SELECT`를 섞으면 서로 다른 table 상태를 다루게 된다고 경고한다.

## 같은 transaction에서 존재하지 않았던 상태가 보이는 이유

InnoDB consistent read는 자신의 변경을 항상 보여 준다. 따라서 오래된 snapshot으로 읽은 뒤 다른 transaction이 새로 commit한 row를 자신이 update하면, 다음 일반 `SELECT`에는 과거 snapshot과 자기 변경이 섞일 수 있다. 그 결과는 database 전체가 한 시점에 가졌던 상태일 필요가 없다.

이 성질 때문에 `SELECT`로 검증한 값을 애플리케이션에서 계산한 뒤 `UPDATE`하는 check-then-act는 안전하지 않다. 불변식을 `UPDATE ... WHERE 조건`에 넣거나 처음부터 locking read를 사용하고 영향받은 row 수를 확인한다.

## Secondary index에서 생기는 추가 조회

Secondary index record에는 clustered record의 `DB_TRX_ID`와 `DB_ROLL_PTR`가 없다. secondary key가 바뀌면 이전 entry를 delete-mark하고 새 entry를 insert하며, purge가 나중에 이전 entry를 정리한다.

InnoDB가 secondary entry만으로 현재 read view에 보이는지 확정할 수 없는 경우에는 clustered index record를 찾아 `DB_TRX_ID`를 검사하고 필요하면 이전 버전을 복원한다. 이때 query가 필요한 컬럼을 secondary index가 모두 포함해도 covering index 경로만으로 끝나지 않을 수 있다. 오래된 snapshot과 purge 지연이 read amplification으로 이어지는 연결점이다.

## Undo의 수명과 purge

Commit은 transaction의 변경을 확정하지만 update undo가 즉시 사라진다는 뜻은 아니다. 어떤 active read view도 더 이상 필요로 하지 않을 때 purge가 update undo와 delete-marked record를 정리할 수 있다.

History List Length는 정확한 undo byte 수가 아니라 purge를 기다리는 history의 backlog 신호다. read view의 수명, undo 생성 속도와 purge 처리 속도를 같이 봐야 하며 상세 운영은 [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]에서 다룬다.

## 두 세션으로 가시성 경계 재현

버려도 되는 테스트 instance에서 `innodb_lab`에 `CREATE`, `DROP`, `SELECT`, `INSERT`, `UPDATE`가 있는 전용 lab 계정으로 setup과 Session A/B를 실행한다.

```sql
CREATE DATABASE IF NOT EXISTS innodb_lab;
USE innodb_lab;
DROP TABLE IF EXISTS mvcc_lab;
CREATE TABLE mvcc_lab (
  id BIGINT PRIMARY KEY,
  amount INT NOT NULL
) ENGINE = InnoDB;
INSERT INTO mvcc_lab VALUES (1, 100), (3, 300);
COMMIT;
```

Session A가 먼저 snapshot을 만든다.

```sql
USE innodb_lab;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM mvcc_lab ORDER BY id; -- 1, 3
```

Session B가 새 row를 commit한다.

```sql
USE innodb_lab;
START TRANSACTION;
INSERT INTO mvcc_lab VALUES (2, 200);
COMMIT;
```

Session A에서 snapshot read와 write의 대상을 비교한다.

```sql
SELECT * FROM mvcc_lab ORDER BY id;               -- 여전히 1, 3
UPDATE mvcc_lab SET amount = amount + 1 WHERE id = 2; -- 1 row matched
SELECT * FROM mvcc_lab ORDER BY id;               -- 1, 2(201), 3
ROLLBACK;
```

첫 두 `SELECT`는 같은 read view를 쓰지만 `UPDATE`는 새로 commit된 row를 대상으로 삼는다. 이후 id 2는 자기 변경이므로 보인다. `READ COMMITTED`로 실험을 반복하면 Session B의 commit 뒤 두 번째 consistent read부터 id 2가 보인다.

모든 transaction을 끝낸 뒤 setup 계정에서 `DROP TABLE innodb_lab.mvcc_lab;`로 이 실험의 table만 정리한다.

## 관찰과 통과 기준

- `INFORMATION_SCHEMA.INNODB_TRX`의 시작 시각과 실행 SQL을 함께 본다. nonlocking read-only transaction은 engine transaction ID가 아직 없을 수 있다. 이 table 조회와 `SHOW ENGINE INNODB STATUS`에는 `PROCESS` 권한이 필요하므로 별도 운영 observer로 확인한다.
- `SHOW ENGINE INNODB STATUS`의 History list length는 추세로 본다. 특정 숫자를 row 수나 byte 수로 환산하지 않는다.
- 설명할 수 있어야 한다: RR인데 `UPDATE`가 snapshot에 없던 row를 바꿀 수 있는 이유, secondary covering query가 clustered lookup으로 바뀌는 조건, commit된 undo가 purge를 기다리는 이유.

## 출처

- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual, Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 Reference Manual, Undo Logs](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, The INNODB_TRX Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-trx-table.html)
- [MySQL 8.4 Reference Manual, SHOW ENGINE](https://dev.mysql.com/doc/refman/8.4/en/show-engine.html)

## 관련 문서

- [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]]
- [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Isolation-Level|트랜잭션 격리 수준]]
