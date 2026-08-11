---
tags: [database, rdbms, mvcc, postgresql, mysql, innodb]
status: done
verified_at: 2026-08-11
category: "Data & Storage - RDB"
aliases: ["MVCC Implementation Tradeoffs", "MVCC 구현 비교"]
---

# MVCC 구현 트레이드오프

MVCC는 읽기 시점에 맞는 row version을 선택해 일관된 snapshot을 제공하는 동시성 제어 방식이다. 여러 version을 유지한다는 원리는 같지만 저장 위치, index 연결과 cleanup 방식은 제품마다 다르다.

## 공통 mental model

1. 데이터가 바뀌면 현재 값과 구분되는 새 version 또는 이전 값을 복원할 정보가 생긴다.
2. reader는 statement나 transaction의 snapshot에 맞는 version을 선택한다.
3. 보존하지 않기로 한 version은 재사용하거나 삭제해야 한다. 일부 구현은 active snapshot을 기다리고, 일부는 보존 범위를 넘은 read를 실패시킨다.

MVCC는 스냅샷 읽기와 동시 쓰기의 row lock 충돌을 줄이지만 write conflict, metadata lock과 명시적 locking read까지 없애지는 않는다.

## 구현을 비교하는 네 가지 질문

1. 이전 version은 table, undo 영역, 별도 version store 중 어디에 있는가?
2. version chain은 이전 version에서 새 version으로 향하는가, 현재 version에서 과거로 향하는가?
3. secondary index는 row의 물리 위치와 논리 key 중 무엇을 가리키는가?
4. 오래된 snapshot이 cleanup을 지연시키는가, 아니면 cleanup이 보존 범위 밖의 read를 실패시키는가?

## PostgreSQL: heap에 row version 저장

- `UPDATE`는 heap에 새 row version을 추가한다. `xmin`과 `xmax`는 version의 생성과 삭제 transaction을, `ctid`는 물리 위치를 나타낸다.
- index entry가 새 물리 위치를 가리켜야 할 수 있다. 다만 index가 참조하는 column을 바꾸지 않고 같은 page에 공간이 있으면 HOT update가 새 index entry를 피한다.
- `VACUUM`은 더 이상 보이지 않는 dead tuple과 index tuple의 공간을 재사용할 수 있게 한다. standard `VACUUM`은 보통 relation 파일을 줄여 운영체제에 공간을 반환하지 않는다.
- 오래된 snapshot은 제거 가능한 version의 경계를 늦출 수 있다. XID가 wraparound하지 않도록 오래된 tuple을 freeze하는 유지보수도 필요하다.

세부 운영은 [[PostgreSQL-Production-Operations|PostgreSQL 운영]]에서 다룬다.

## MySQL InnoDB: undo에서 이전 version 복원

- clustered record에는 마지막 변경 transaction의 `DB_TRX_ID`와 undo record를 가리키는 `DB_ROLL_PTR`가 있다.
- consistent read는 read view보다 새 record를 만나면 undo chain을 따라 과거 row를 재구성한다.
- secondary index column이 바뀌면 이전 entry를 delete-mark하고 새 entry를 추가한다. 바뀌지 않은 secondary index는 같은 이유로 다시 쓸 필요가 없다.
- purge는 어떤 read view도 필요로 하지 않는 undo와 delete-marked record를 정리한다. 오래된 read view가 있으면 History List Length와 undo tablespace가 커질 수 있다.

Consistent Read와 Current Read는 여기서 InnoDB 용어로만 사용한다. PostgreSQL의 일반 `SELECT`에 그대로 대응시키지 않는다. 격리 수준별 read view 수명은 [[Isolation-Level|MySQL InnoDB 격리 수준]]과 [[Lock|MySQL InnoDB Lock]]에서, purge 운영은 [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]에서 다룬다.

## 다른 version 저장 위치

| 구현 | 이전 version 위치 | cleanup과 오래된 read의 관계 |
|------|-------------------|-------------------------------|
| SQL Server row versioning | `tempdb` version store, ADR 사용 시 해당 database의 PVS | 오래 실행되는 transaction이 version store 공간 회수를 늦출 수 있음 |
| MongoDB WiredTiger | WiredTiger history store (`WiredTigerHS.wt`) | snapshot history 보존 기간과 write volume이 history store 사용량에 영향 |
| CockroachDB | timestamp가 붙은 MVCC value | GC와 storage compaction이 이전 value를 정리하며 protected timestamp가 GC를 지연시킬 수 있음 |
| etcd | cluster revision별 key history | compaction 뒤 이전 revision read와 watch는 실패하며 disk 반환에는 defragmentation이 별도로 필요 |

## 같은 UPDATE의 비용 비교

여러 secondary index가 있는 table에서 index에 포함되지 않은 `last_seen`만 갱신한다고 가정한다.

| 축 | PostgreSQL heap | MySQL InnoDB undo |
|----|-----------------|-------------------|
| version 생성 | 새 heap tuple 추가 | clustered record 갱신, 이전 값은 undo에 기록 |
| secondary index | HOT 조건을 만족하지 못하면 새 entry 필요 | `last_seen`을 포함하지 않은 index는 갱신 불필요 |
| 지연된 cleanup | dead tuple을 vacuum이 정리 | undo history를 purge가 정리 |
| 오래된 snapshot | vacuum horizon과 bloat에 압력 | purge horizon, History List Length와 undo 공간에 압력 |

어느 방식도 version 유지 비용을 없애지 않는다. update 비율과 index 수, 오래된 snapshot의 빈도, rollback 비용, 과거 version 읽기 비용과 cleanup 실패 형태가 워크로드에 맞는지 판단한다.

## 운영 체크포인트

- version 생성 속도와 cleanup 속도를 함께 본다. 현재 저장량 하나만으로 backlog의 방향을 판단하지 않는다.
- PostgreSQL은 `n_dead_tup`, `n_tup_hot_upd`와 `backend_xmin`을, InnoDB는 History List Length와 undo 공간을 관측한다.
- cleanup이 공간을 재사용 가능하게 하는 것과 운영체제에 반환하는 것을 구분한다.
- transaction뿐 아니라 실제 statement와 snapshot 수명을 제한한다.

## 관련 문서

- [[Transactions|트랜잭션]]
- [[Isolation-Level|MySQL InnoDB 중심 트랜잭션 격리 수준]]
- [[Lock|MySQL InnoDB Lock]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]

## 출처

- [PostgreSQL's MVCC is bad. So is everyone else's. — boringSQL](https://boringsql.com/posts/mvcc-bad-bad/)
- [PostgreSQL 18 Documentation, MVCC Introduction](https://www.postgresql.org/docs/18/mvcc-intro.html)
- [PostgreSQL 18 Documentation, System Columns](https://www.postgresql.org/docs/18/ddl-system-columns.html)
- [PostgreSQL 18 Documentation, Heap-Only Tuples](https://www.postgresql.org/docs/18/storage-hot.html)
- [PostgreSQL 18 Documentation, Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 Documentation, Monitoring Statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual, Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [SQL Server, Transaction Locking and Row Versioning Guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17)
- [MongoDB 8.2 Manual, WiredTiger Storage Engine](https://www.mongodb.com/docs/v8.2/core/wiredtiger/)
- [CockroachDB Documentation, Operational FAQs](https://www.cockroachlabs.com/docs/stable/operational-faqs)
- [etcd 3.6 Documentation, Maintenance](https://etcd.io/docs/v3.6/op-guide/maintenance/)
