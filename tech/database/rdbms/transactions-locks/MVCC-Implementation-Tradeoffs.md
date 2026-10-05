---
tags: [database, rdbms, mvcc, postgresql, mysql, innodb]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["MVCC Implementation Tradeoffs", "MVCC 구현 비교"]
---

# MVCC 구현 트레이드오프

MVCC는 읽기 시점에 맞는 row version을 선택해 일관된 snapshot을 제공하는 동시성 제어 방식이다. 여러 version을 유지한다는 원리는 같지만 저장 위치, index 연결과 cleanup 방식은 제품마다 다르다.

## 공통 mental model

1. 데이터가 바뀌면 현재 값과 구분되는 새 version 또는 이전 값을 복원할 정보가 생긴다.
2. reader는 statement나 transaction의 snapshot에 맞는 version을 선택한다. 다른 트랜잭션의 미커밋 변경은 보이지 않고 자기 변경은 보인다. 어느 commit까지 보이는지는 격리 수준이 정한다.
3. 보존하지 않기로 한 version은 재사용하거나 삭제해야 한다. 일부 구현은 active snapshot을 기다리고, 일부는 보존 범위를 넘은 read를 실패시킨다.

MVCC는 스냅샷 읽기와 동시 쓰기의 row lock 충돌을 줄이지만 write conflict, metadata lock과 명시적 locking read까지 없애지는 않는다. PostgreSQL 문서는 읽기가 쓰기를, 쓰기가 읽기를 막지 않는 점을 MVCC의 주된 이점으로 든다. 같은 row를 쓰려는 트랜잭션끼리는 여전히 row lock으로 기다리고, 그 lock은 보통 commit 또는 rollback까지 유지된다([[Two-Phase-Locking|2PL]]). 대가는 이전 version을 보관할 공간과 정리 작업이다.

READ UNCOMMITTED에서는 제품마다 다르다. PostgreSQL은 이 수준을 READ COMMITTED처럼 처리해 snapshot 규칙을 그대로 쓰고, InnoDB는 snapshot 규칙도 잠금도 쓰지 않고 읽어 일관된 읽기를 보장하지 않는다.

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

Consistent read는 MySQL 매뉴얼의 InnoDB 용어이고, Current Read는 locking read와 DML을 가리킬 때 흔히 쓰는 약칭이다. PostgreSQL의 일반 `SELECT`에 그대로 대응시키지 않는다. 격리 수준별 read view 수명은 [[Isolation-Level|MySQL InnoDB 격리 수준]]과 [[Lock|MySQL InnoDB Lock]]에서, purge 운영은 [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]에서 다룬다.

MySQL 8.4의 hidden system field, secondary index 가시성 확인과 재현 실험은 [[MySQL-InnoDB-MVCC-and-Undo|InnoDB MVCC와 Undo]]가 소유한다. 이 비교 문서에서는 PostgreSQL의 tuple 가시성 용어와 InnoDB의 undo 용어를 하나의 구현처럼 합치지 않는다.

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

## 같은 격리 수준 이름에서 갈리는 쓰기 충돌

저장 구조 말고도 제품마다 갈리는 지점이 두 가지 더 있다. snapshot을 언제 만드는지, 그리고 snapshot 이후 다른 트랜잭션이 commit한 row를 쓰려 할 때 실패시키는지다.

### snapshot 시점

- MySQL InnoDB RR: 트랜잭션의 첫 consistent read가 snapshot을 만든다. `START TRANSACTION WITH CONSISTENT SNAPSHOT`을 쓰면 시작 시점에 만든다.
- PostgreSQL RR: 트랜잭션에서 처음 실행한, transaction control이 아닌 문장의 시작 시점 snapshot을 쓴다.
- READ COMMITTED는 두 제품 모두 문장마다 새 snapshot을 쓴다.
- Berenson 등의 snapshot isolation 정의도 snapshot 시점을 첫 read 이전 어느 때든 될 수 있다고 둔다. 트랜잭션 시작 시점으로 일반화해 외우지 않는다.

### 애플리케이션에서 계산해 쓰는 lost update

x=50, y=10에서 T1은 x에서 y로 40을 이체하고 T2는 x에 30을 입금한다. 둘 다 x를 일반 SELECT로 읽고 애플리케이션에서 계산한 값을 UPDATE로 쓴다. T1이 x를 먼저 갱신해 row lock을 잡았고, T2는 x=50을 읽은 뒤 80을 쓰려다 대기한다. 정상 결과는 x=40, y=50이다.

| DBMS와 격리 수준 | T1 commit 뒤 T2의 UPDATE | 결과 |
|---|---|---|
| MySQL InnoDB, RC와 RR | 최신 commit row에 80을 쓰고 성공 | x=80, y=50. T1의 출금이 사라진다 |
| PostgreSQL RC | 갱신된 row로 WHERE를 다시 평가한 뒤 80을 쓰고 성공 | 같은 lost update |
| PostgreSQL RR | `could not serialize access due to concurrent update`(SQLSTATE 40001)로 실패 | T2를 처음부터 재시도하면 x=40, y=50 |

PostgreSQL RR은 snapshot 이후 다른 트랜잭션이 바꾼 row를 갱신하거나 잠그지 못하게 한다. 먼저 갱신한 쪽이 이기는 snapshot isolation이다([[Isolation-Level-Beyond-ANSI#Snapshot Isolation — ANSI에 없는 실전 표준|Snapshot Isolation]]). 이 보호는 나중에 쓰는 트랜잭션이 RR 이상일 때만 작동한다. T2가 먼저 갱신하면 T1이 나중 갱신자가 되므로, 같은 데이터를 쓰는 트랜잭션 모두의 격리 수준을 맞춰야 한다. 격리 수준은 트랜잭션마다 따로 지정할 수 있다.

MySQL InnoDB는 RR에서도 이 검사를 하지 않는다. 매뉴얼도 RR 트랜잭션의 UPDATE와 DELETE가 자기 SELECT로는 보지 못한, 방금 commit된 row에 영향을 줄 수 있다고 설명한다. 막는 방법은 다음과 같다.

1. 계산을 문장 안으로 옮긴다. `UPDATE account SET balance = balance + 30 WHERE id = 'x'`는 InnoDB와 PostgreSQL RC에서 최신 commit 값에 더해진다. PostgreSQL RR에서는 snapshot 이후 다른 트랜잭션이 같은 row를 바꿔 commit했다면 여전히 40001이므로 재시도 경로가 필요하다.
2. 읽기를 locking read로 바꾼다. InnoDB의 `SELECT ... FOR UPDATE`는 RR에서도 snapshot이 아니라 최신 commit 값을 읽고 잠근다. 같은 데이터를 읽고 쓰는 모든 트랜잭션이 함께 따라야 한다.
3. version 조건을 둔 조건부 UPDATE로 충돌을 감지한다([[Lock#Optimistic Lock (낙관적 잠금)|낙관적 잠금]]).

### 서로 다른 row를 쓰는 write skew

x=10, y=10에서 T1은 `x = x + y`, T2는 `y = x + y`를 실행한다. serial이면 (20, 30) 또는 (30, 20)이다. 두 트랜잭션이 RR에서 x와 y를 일반 SELECT로 읽으면 둘 다 (10, 10)을 보고 T1은 x에, T2는 y에 20을 쓴다. 같은 row를 쓰지 않으므로 두 제품 모두 두 commit을 허용해 (20, 20)이 남는다.

| 대응 | MySQL InnoDB | PostgreSQL |
|---|---|---|
| RR에서 x, y를 `FOR UPDATE`로 읽기 | T2는 T1이 끝날 때까지 기다린 뒤 최신 x=20을 읽고 y=30을 쓴다 | T2는 기다린 뒤 snapshot 이후 바뀐 x를 잠그려다 40001로 실패하고 재시도한다. `FOR SHARE`도 같다 |
| RC에서 `FOR UPDATE`로 읽기 | 기다린 뒤 최신 값을 읽는다 | 기다린 뒤 갱신된 row를 잠그고 돌려준다 |
| SERIALIZABLE | autocommit이 꺼진 트랜잭션의 일반 SELECT를 `FOR SHARE`로 바꾼다. 읽은 row를 서로 갱신하려는 두 트랜잭션이 겹쳐 실행되면 S에서 X로 올리다 deadlock이 날 수 있고, InnoDB가 한쪽을 rollback한다 | SSI가 snapshot 읽기를 유지하면서 predicate lock(`SIReadLock`)으로 read-write 의존을 추적하고, 직렬 실행과 어긋날 수 있는 트랜잭션을 40001로 실패시킨다. predicate lock은 대기를 만들지 않는다 |

`FOR UPDATE`는 이미 있는 row의 충돌만 직렬화한다. 조건에 맞는 row가 새로 들어와 생기는 충돌은 InnoDB RR의 next-key lock처럼 범위를 잠그는 구현이 아니면 막지 못한다([[Isolation-Level#InnoDB RR에서의 Phantom Read 방지|InnoDB의 phantom 방지]]). PostgreSQL에서 이런 충돌까지 막으려면 SERIALIZABLE을 쓰거나 table 수준의 명시적 잠금을 검토한다.

재시도 계약도 정한다. InnoDB deadlock 오류 1213과 PostgreSQL serialization failure는 모두 SQLSTATE 40001이며, 실패한 트랜잭션은 처음부터 새로 실행한다([[Lock-Wait-Convoy#락 관련 에러 분기|락 에러 분기]]).

## 운영 체크포인트

- version 생성 속도와 cleanup 속도를 함께 본다. 현재 저장량 하나만으로 backlog의 방향을 판단하지 않는다.
- PostgreSQL은 `n_dead_tup`, `n_tup_hot_upd`와 `backend_xmin`을, InnoDB는 History List Length와 undo 공간을 관측한다.
- cleanup이 공간을 재사용 가능하게 하는 것과 운영체제에 반환하는 것을 구분한다.
- transaction뿐 아니라 실제 statement와 snapshot 수명을 제한한다.
- 같은 데이터를 쓰는 트랜잭션들의 격리 수준, locking read 사용 여부와 재시도 경로를 한 규약으로 맞춘다. 한 경로만 RR이나 `FOR UPDATE`를 써서는 lost update가 남는다.

## 관련 문서

- [[Transactions|트랜잭션]]
- [[Isolation-Level|MySQL InnoDB 중심 트랜잭션 격리 수준]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계와 Snapshot Isolation]]
- [[Serializability-and-Recoverability|스케줄, 직렬 가능성과 회복 가능성]]
- [[Two-Phase-Locking|2단계 잠금 (2PL)]]
- [[Lock|MySQL InnoDB Lock]]
- [[Lock-Wait-Convoy|락 대기 큐와 에러 분기]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-Undo-Purge-HLL|Undo Purge와 History List Length]]
- [[MySQL-InnoDB-MVCC-and-Undo|MySQL 8.4 InnoDB MVCC와 Undo]]

## 출처

- [PostgreSQL's MVCC is bad. So is everyone else's. — boringSQL](https://boringsql.com/posts/mvcc-bad-bad/)
- [PostgreSQL 18 Documentation, MVCC Introduction](https://www.postgresql.org/docs/18/mvcc-intro.html)
- [PostgreSQL 18 Documentation, System Columns](https://www.postgresql.org/docs/18/ddl-system-columns.html)
- [PostgreSQL 18 Documentation, Heap-Only Tuples](https://www.postgresql.org/docs/18/storage-hot.html)
- [PostgreSQL 18 Documentation, Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 Documentation, Monitoring Statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 Documentation, Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18 Documentation, Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual, Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, An InnoDB Deadlock Example](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-example.html)
- [A Critique of ANSI SQL Isolation Levels — SIGMOD 1995, Berenson et al.](https://arxiv.org/abs/cs/0701157)
- [Database System Concepts 7th Ed., Chapter 18 Concurrency Control 슬라이드 — Silberschatz, Korth, Sudarshan](https://www.db-book.com/slides-dir/PDF-dir/ch18.pdf)
- [SQL Server, Transaction Locking and Row Versioning Guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17)
- [MongoDB 8.2 Manual, WiredTiger Storage Engine](https://www.mongodb.com/docs/v8.2/core/wiredtiger/)
- [CockroachDB Documentation, Operational FAQs](https://www.cockroachlabs.com/docs/stable/operational-faqs)
- [etcd 3.6 Documentation, Maintenance](https://etcd.io/docs/v3.6/op-guide/maintenance/)
- [YouTube, 쉬운코드, DB MVCC 개념과 isolation level별 동작 (MySQL, PostgreSQL)](https://www.youtube.com/watch?v=wiVvVanI3p4)
- [YouTube, 쉬운코드, DB MVCC 이어서: MySQL, PostgreSQL 예제와 select ... for update](https://www.youtube.com/watch?v=-kJ3fxqFmqA)
