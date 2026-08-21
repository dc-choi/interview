---
tags: [database, rdbms, transaction, isolation-level, lock]
status: index
category: "Database - RDBMS"
aliases: ["Transactions & Locks", "트랜잭션과 락"]
---

# 트랜잭션과 락 (Transactions & Locks)

ACID, MVCC, 격리 수준, Lock 메커니즘 문서 모음. Race Condition 패턴은 형제 폴더 [[Race-Condition-Patterns]] 참고.

- [[Transactions|ACID와 트랜잭션 경계]]
- [[MVCC-Implementation-Tradeoffs|MVCC 공통 원리와 구현 트레이드오프]]
- [[MySQL-InnoDB-Internals|MySQL 8.4 InnoDB 내부 구조]]
- [[Isolation-Level|Isolation Level (Oracle에서 MySQL 이관 잔액 사례 포함)]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계, Strict Serializable (Snapshot Isolation, Linearizable, 분산 DB)]]
- [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 스냅샷 읽기 vs 현재 읽기)]]
- [[Lock-Deadlock|DB 데드락 (ABBA, S → X 업그레이드, 감지와 복구, 락의 이유를 없애는 설계)]]
- [[Lock-Wait-Convoy|락 대기 큐와 convoy (커넥션 풀 소진, NOWAIT의 등가 교환, 1213/1205/3572 분기)]]
