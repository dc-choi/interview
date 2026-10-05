---
tags: [database, rdbms, transaction, isolation-level, lock]
status: index
category: "Database - RDBMS"
aliases: ["Transactions & Locks", "트랜잭션과 락"]
---

# 트랜잭션과 락 (Transactions & Locks)

ACID, 스케줄 이론, MVCC, 격리 수준, Lock과 2PL 문서 모음. Race Condition 패턴은 형제 폴더 [[Race-Condition-Patterns]] 참고.

- [[Transactions|ACID와 트랜잭션 경계]]
- [[Serializability-and-Recoverability|스케줄, 직렬 가능성과 회복 가능성 (conflict serializable, precedence graph, recoverable, cascadeless, strict)]]
- [[MVCC-Implementation-Tradeoffs|MVCC 공통 원리와 구현 트레이드오프 (snapshot 시점, MySQL과 PostgreSQL RR의 lost update와 write skew 처리 차이)]]
- [[MySQL-InnoDB-Internals|MySQL 8.4 InnoDB 내부 구조]]
- [[Isolation-Level|Isolation Level (Oracle에서 MySQL 이관 잔액 사례 포함)]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계, Strict Serializable (P0~A5B 현상 목록, Snapshot Isolation과 First-Updater-Wins, Linearizable, 분산 DB)]]
- [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 사용자 편집 충돌, 계산 기준값의 잠금 경계)]]
- [[Two-Phase-Locking|2단계 잠금 2PL (growing과 shrinking, strict와 rigorous, conservative, deadlock, MVCC로 넘어간 이유)]]
- [[Lock-Deadlock|DB 데드락 (ABBA, S → X 업그레이드, 감지와 복구, 락의 이유를 없애는 설계)]]
- [[Lock-Wait-Convoy|락 대기 큐와 convoy (커넥션 풀 소진, NOWAIT의 등가 교환, 1213/1205/3572 분기)]]
