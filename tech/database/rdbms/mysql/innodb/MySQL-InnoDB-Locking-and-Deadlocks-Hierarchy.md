---
tags: [database, mysql, innodb, lock, intention-lock, metadata-lock]
status: done
verified_at: 2026-09-30
category: "Database - RDBMS"
aliases: ["MySQL Lock Hierarchy", "MySQL 잠금 계층", "Intention Lock 호환성", "InnoDB lock escalation"]
---

# MySQL 잠금 계층

[[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]]의 잠금 단위를 인스턴스와 테이블 수준까지 넓혀 본 문서다. MySQL의 잠금은 수준마다 목적과 구현이 다르고, 위 수준의 잠금이 행 잠금과 공존하는 방식을 알아야 DDL 대기와 백업 영향을 설명할 수 있다. MySQL 8.4 문서 기준이며 8.4.6 재현 결과를 함께 적었다.

## 수준별 잠금

| 수준 | 대표 잠금 | 막는 것 |
|---|---|---|
| 인스턴스 | `FLUSH TABLES WITH READ LOCK`의 global read lock | 모든 database의 테이블 쓰기. `UNLOCK TABLES`까지 서버 전체의 쓰기가 멈춘다 |
| 인스턴스 | `LOCK INSTANCE FOR BACKUP`의 backup lock | 파일 생성, 이름 변경과 삭제, `TRUNCATE TABLE`, `OPTIMIZE TABLE`, `REPAIR TABLE`, 계정 관리, redo에 기록되지 않는 InnoDB 파일 변경. DML은 허용한다 |
| 테이블 | `LOCK TABLES`, metadata lock(MDL) | MDL은 트랜잭션이 쓴 테이블의 구조 변경을 그 트랜잭션이 끝날 때까지 막는다 |
| 테이블 | IS, IX intention lock | 테이블 전체를 요구하는 잠금만 막는다 |
| 행 | record, gap, next-key lock | [[MySQL-InnoDB-Locking-and-Deadlocks#잠금 단위|잠금 단위]] 참고 |

- global read lock은 서버 전체의 쓰기를 막으므로 운영 중에는 쓰지 않는다. 일관된 백업이 목적이면 DML을 허용하는 backup lock 기반 도구를 쓰되 그 도구도 잠금이 전혀 없지는 않다([[MySQL-Backup|MySQL 백업]]). backup lock은 `BACKUP_ADMIN` 권한이 필요하다.
- MDL은 열린 트랜잭션이 SELECT만 했어도 잡힌다. 8.4.6에서 SELECT 뒤 커밋하지 않은 세션이 `SHARED_READ`를 쥐자 `ALTER TABLE`은 `EXCLUSIVE`를 `PENDING`으로 기다렸고, 그 뒤에 들어온 PK 단건 SELECT까지 대기하다 1205로 실패했다. 대기 상한은 `lock_wait_timeout`(기본 31,536,000초)이고 InnoDB 행 잠금의 `innodb_lock_wait_timeout`(기본 50초)과 별개지만 시간 초과 오류 번호는 같은 1205다. DDL 전에 오래 열린 트랜잭션을 확인하고 DDL 세션의 `lock_wait_timeout`을 짧게 둔다([[Schema-Migration-Large-Table|대용량 스키마 변경]]).

## Intention lock과 다중 세분화 잠금

InnoDB는 행 잠금과 테이블 잠금이 공존하도록 multiple granularity locking을 쓴다. 행에 S lock을 잡기 전에 테이블에 IS 이상을, 행에 X lock을 잡기 전에 테이블에 IX를 먼저 얻는다. `SELECT ... FOR SHARE`는 IS, `SELECT ... FOR UPDATE`와 DML은 IX를 건다. 8.4.6의 `performance_schema.data_locks`에서 `FOR SHARE`는 `TABLE IS`와 `RECORD S,REC_NOT_GAP`, PK 조건 UPDATE는 `TABLE IX`와 `RECORD X,REC_NOT_GAP`으로 보였다.

목적은 누군가 행을 잠갔거나 잠글 예정임을 테이블 수준에 표시하는 것이다. `LOCK TABLES ... WRITE` 같은 테이블 전체 요청은 모든 행 잠금을 뒤지지 않고 이 표시만으로 충돌을 판정한다.

| | X | IX | S | IS |
|---|---|---|---|---|
| X | 충돌 | 충돌 | 충돌 | 충돌 |
| IX | 충돌 | 호환 | 충돌 | 호환 |
| S | 충돌 | 충돌 | 호환 | 호환 |
| IS | 충돌 | 호환 | 호환 | 호환 |

IX끼리는 호환되므로 서로 다른 행을 바꾸는 두 트랜잭션은 테이블 수준에서 막히지 않는다. intention lock은 테이블 전체 요청 외에는 아무것도 막지 않는다.

## Lock escalation은 없다

일부 DBMS는 잠근 행이 많아지면 메모리를 아끼려고 행 잠금을 테이블 잠금으로 올리는 lock escalation을 한다. InnoDB는 잠금 정보를 공간 효율적으로 저장하므로 escalation이 필요 없고, 여러 사용자가 모든 행이나 임의의 행 집합을 잠가도 메모리가 고갈되지 않는다고 매뉴얼은 적는다. 많은 행을 잠그면 escalation이 생긴다는 설명은 InnoDB에 맞지 않는다.

InnoDB에서 테이블 전체가 잠긴 것처럼 보이면 escalation이 아니라 적절한 인덱스 없이 스캔한 문장이 방문한 모든 record와 gap을 잠근 결과다. 해법은 인덱스와 조건 조정이다([[MySQL-InnoDB-Locking-and-Deadlocks#실행 계획이 잠금 범위를 만든다|실행 계획이 잠금 범위를 만든다]]).

## 출처

- [MySQL 8.4 Reference Manual, InnoDB Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual, InnoDB Transaction Model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
- [MySQL 8.4 Reference Manual, Metadata Locking](https://dev.mysql.com/doc/refman/8.4/en/metadata-locking.html)
- [MySQL 8.4 Reference Manual, LOCK INSTANCE FOR BACKUP and UNLOCK INSTANCE Statements](https://dev.mysql.com/doc/refman/8.4/en/lock-instance-for-backup.html)
- [MySQL 8.4 Reference Manual, FLUSH Statement](https://dev.mysql.com/doc/refman/8.4/en/flush.html)
- [MySQL 8.4 Reference Manual, Server System Variables, lock_wait_timeout](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_lock_wait_timeout)
- [인프런, Hong, MySQL Lock (Intention Lock, Gap Lock, 다중 세분화)](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373902)

## 관련 문서

- [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]]
- [[Lock|DB Lock 전략과 애플리케이션 적용]]
- [[MySQL-Backup|MySQL 백업, 복원과 PITR]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
