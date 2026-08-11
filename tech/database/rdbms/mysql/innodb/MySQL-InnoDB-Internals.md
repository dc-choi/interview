---
tags: [database, mysql, innodb, transaction, internals]
status: index
category: "Database - RDBMS"
aliases: ["MySQL InnoDB Internals", "InnoDB 내부 구조"]
---

# MySQL 8.4 InnoDB 내부 구조

MySQL 8.4의 공개된 동작 계약을 기준으로 InnoDB의 버전, 잠금과 복구 경로를 분리해 학습한다. PostgreSQL의 tuple, `xmin`/`xmax`, VACUUM 용어는 [[MVCC-Implementation-Tradeoffs|MVCC 구현 비교]]에만 둔다.

## 학습 순서

1. [[MySQL-InnoDB-MVCC-and-Undo|MVCC와 Undo]]: 현재 row에서 과거 버전을 복원하고 snapshot에 맞는 값을 고르는 과정
2. [[MySQL-InnoDB-Locking-and-Deadlocks|Locking과 Deadlock]]: 실행 계획이 잠금 범위를 만들고 wait-for 관계가 생기는 과정
3. [[MySQL-InnoDB-Redo-and-Crash-Recovery|Redo와 Crash Recovery]]: commit을 내구성 경계까지 보내고 crash 뒤 일관성을 회복하는 과정

## 문서 경계

- 격리 수준별 결과는 [[Isolation-Level|트랜잭션 격리 수준]]이 소유한다.
- 오래된 read view와 purge backlog 운영은 [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]이 소유한다.
- 파라미터 선택과 성능 측정은 [[MySQL-InnoDB-Tuning|InnoDB 튜닝]]이 소유한다.
- 백업, PITR과 재해 복구는 [[MySQL-Backup|MySQL 백업과 복원]]이 소유한다.

세 문서는 Reference Manual에 공개된 계약을 정본으로 삼는다. `ReadView` 내부 필드, undo record의 물리 배치와 lock ID 문자열 형식처럼 버전에 따라 바뀔 수 있는 구현 세부는 안정된 계약으로 외우지 않는다.
