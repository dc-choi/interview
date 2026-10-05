---
tags: [database, rdbms, isolation-level, serializable, linearizable, snapshot-isolation, distributed-db]
status: done
category: "Data & Storage - RDB"
aliases: ["Isolation Level Beyond ANSI", "Strict Serializable", "Linearizable", "Snapshot Isolation", "ANSI SQL 격리 한계"]
verified_at: 2026-10-05
---

# ANSI 격리 수준의 한계와 Strict Serializable

ANSI SQL의 4대 격리 수준(Read Uncommitted / Read Committed / Repeatable Read / Serializable)은 **표준 자체가 불완전**하다. 실제 DBMS마다 동일 이름 아래 다른 동작을 제공하고, 분산 환경에서는 기존 정의로 설명 안 되는 이상 현상이 생긴다. 기본 격리 수준은 [[Isolation-Level]] 참조.

## 핵심 명제

- ANSI SQL의 격리 정의는 **이상 현상의 발생 유무**를 기준으로 하지만, 현상 목록이 불완전하다
- MySQL InnoDB, PostgreSQL, Oracle이 같은 "Repeatable Read", "Serializable"을 다르게 구현
- **Snapshot Isolation**은 ANSI에 정의되지 않았지만 PostgreSQL과 일부 DBMS의 Repeatable Read 계열 동작을 설명한다. 같은 이름을 locking 방식으로 구현하는 DBMS도 있음
- **Strict serializability**는 serializable 실행 순서가 트랜잭션의 실시간 선후 관계도 보존하도록 요구한다. 단일 노드와 분산 환경 모두에서 별도로 확인해야 하는 보장이다.

## ANSI 표준의 한계 — "A Critique of ANSI SQL Isolation Levels"

1995년 Berenson 등의 논문 *A Critique of ANSI SQL Isolation Levels*가 지적한 문제:

- **이상 현상 정의가 너무 느슨** — 같은 이름의 격리에서 구현자마다 다른 해석 가능
- **Snapshot Isolation 누락** — 실제로 널리 쓰이는데 ANSI에는 없음
- **현상 목록만으로 Serializable을 판단하면 약해짐** — 논문은 세 현상만 금지한 해석을 ANOMALY SERIALIZABLE이라 부른다. Snapshot Isolation은 A1, A2, A3(dirty read, non-repeatable read, phantom의 좁은 해석)를 모두 피하면서도 진짜 serializable은 아니어서, 표만 보고 serializable로 판단하는 오해가 흔하다

결과적으로 표준은 있지만 **DBMS 간 호환성 보장이 안 됨**.

### Dirty Write — 현상 목록만으로는 빠진 문제

Dirty Write는 트랜잭션 A가 쓴 row를 A의 커밋이나 롤백 전에 B가 덮어쓰는 현상이다. Berenson 논문의 비판처럼 SQL-92가 나열한 세 read phenomenon만으로는 이를 충분히 포착하지 못한다. 논문은 x=y 같은 두 항목 사이의 제약이 깨질 수 있고, rollback을 before image 복원으로 구현할 수 없게 된다는 이유로 모든 격리 수준에서 dirty write를 금지해야 한다고 정리했다([[Serializability-and-Recoverability#회복 가능성: rollback이 다른 트랜잭션으로 번지는 경우|strict 스케줄]]). 주요 DBMS는 복구 가능성을 위해 가장 낮은 격리에서도 dirty write를 막지만, 그 사실을 ANSI 현상 정의만으로 증명하면 안 된다. Oracle과 PostgreSQL 모두 Read Uncommitted 동작 자체는 제공하지 않지만 요청 처리 방식은 다르다. PostgreSQL은 `READ UNCOMMITTED` 구문을 받아들이되 내부적으로 Read Committed로 처리하고, Oracle은 Read Committed(기본), Serializable, Read Only만 지원해 같은 구문을 ORA-02179(valid options: ISOLATION LEVEL { SERIALIZABLE | READ COMMITTED })로 거부한다 (Read Only는 격리 수준 구문이 아니라 `SET TRANSACTION READ ONLY` 별개 구문으로 설정한다).

### 논문이 정리한 현상 목록

논문은 현상을 이력(history) 표기로 다시 정의하고 ANSI의 세 현상에 dirty write와 다음 이상 현상을 더했다. `r1[P]`는 T1이 조건 P를 만족하는 집합을 읽는 것이다.

| 기호 | 현상 | 이력 | 의미 |
|---|---|---|---|
| P0 | Dirty Write | `w1[x]...w2[x]...(c1 or a1)` | 미커밋 값을 덮어쓴다 |
| P1 | Dirty Read | `w1[x]...r2[x]...(c1 or a1)` | 미커밋 값을 읽는다 |
| P2 | Fuzzy (Non-Repeatable) Read | `r1[x]...w2[x]...(c1 or a1)` | 읽은 항목을 다른 트랜잭션이 바꾸거나 지운다 |
| P3 | Phantom | `r1[P]...w2[y in P]...(c1 or a1)` | 읽은 조건의 집합에 insert, update, delete가 생긴다 |
| P4 | Lost Update | `r1[x]...w2[x]...w1[x]...c1` | 읽어 둔 값으로 계산한 쓰기가 다른 갱신을 덮는다 |
| A5A | Read Skew | `r1[x]...w2[x]...w2[y]...c2...r1[y]...(c1 or a1)` | 관련된 두 항목을 서로 다른 시점의 상태로 읽는다 |
| A5B | Write Skew | `r1[x]...r2[y]...w1[y]...w2[x]...(c1 and c2 occur)` | 각자 읽은 상태로 서로 다른 항목을 써서 둘을 잇는 제약이 깨진다 |

- ANSI 문장을 abort나 재조회가 실제로 일어나야 성립하는 strict 해석(A1, A2, A3)으로 읽으면 빠지는 이상이 있다. x에서 y로 40을 옮기는 T1이 x=10을 아직 commit하지 않은 사이 T2가 x=10과 y=50을 읽으면 합계 60을 본다. 아무도 abort하지 않았으니 A1은 아니지만 P1이다. 논문은 일어날 수 있는 순서 자체를 막는 broad 해석(P1, P2, P3)이 ANSI의 의도라고 결론낸다.
- 같은 조건을 다시 읽지 않아도 phantom이 될 수 있다. T1이 `v > 10`인 row를 찾았는데 없었고, 그 사이 T2가 `v = 15` row를 넣고 개수 카운터를 1로 올려 commit하면 T1이 이어서 읽은 카운터와 앞선 조회가 어긋난다.
- A5A에서 x와 y가 같은 항목이면 P2가 된다. P4는 READ COMMITTED에서 가능하지만 P2를 막는 lock 기반 REPEATABLE READ에서는 생기지 않아, 두 수준 사이의 중간 강도 수준을 구분하는 데 쓰인다.

## DBMS별 실제 구현 차이

| DBMS | Repeatable Read 구현 | Serializable 구현 |
|---|---|---|
| **MySQL InnoDB** | Snapshot + Next-Key Lock(잠금 읽기와 범위 변경의 Phantom 방지) | `autocommit`이 꺼진 명시적 트랜잭션의 일반 SELECT를 `SELECT ... FOR SHARE`처럼 처리. autocommit 단일 SELECT는 nonlocking consistent read |
| **PostgreSQL** | Snapshot Isolation (PostgreSQL 문서 기준 RR에서 phantom read 없음, 동시 갱신된 row 쓰기는 40001) | SSI (Serializable Snapshot Isolation) — Serializable 보장 |
| **Oracle** | 미지원 (Read Committed, Serializable, Read Only만 제공) | 실질적으로 Snapshot Isolation (진짜 Serializable 아님) |
| **SQL Server** | `REPEATABLE READ`는 읽은 key의 shared lock을 트랜잭션 끝까지 유지. `SNAPSHOT`은 별도 격리 수준 | `SERIALIZABLE`은 key-range lock으로 phantom도 방지 |
| **Db2** | Read Stability(RS)가 ANSI Repeatable Read에 가까우며 Cursor Stability(CS)는 Read Committed에 가까움 | Repeatable Read(RR)가 가장 강한 수준으로 ANSI Serializable에 대응 |

**함정**: "Serializable"이라고 쓰여 있어도 실제로는 Snapshot Isolation일 수 있음 (Oracle). 쓰기 skew 같은 이상 현상이 남을 수 있다.

## Serializable의 진짜 정의

ANSI SQL-99 원문:
> A serializable execution is defined to be an execution of the operations of concurrently executing SQL-transactions that produces the same effect as some serial execution of those same SQL-transactions.

핵심: 동시 실행의 결과가 **어떤 직렬 실행**(some serial execution)과 동일한 결과면 됨.
- "어떤"이라는 조건 — 순서가 **특정되지 않음**
- 트랜잭션 순서가 실제 시간과 달라도 무방
- 심지어 읽기가 빈 상태를 반환하더라도, 동일 결과를 내는 직렬 실행이 하나라도 존재하면 만족 (Jepsen은 모든 읽기를 시각 0에 실행한 것처럼 처리하는 구현을 예로 든다)

Serializable은 단일 머신에서도 실시간 순서를 자동으로 보장하지 않는다. 외부 관찰 순서까지 필요한 시스템은 구현체가 strict serializability 또는 external consistency를 명시적으로 제공하는지 확인해야 한다.

## Snapshot Isolation — ANSI에 없는 실전 표준

**Snapshot Isolation (SI)**: 허용하는 현상이 아니라 구현 방식으로 정의한 수준이다. 트랜잭션은 Start-Timestamp 시점까지 commit된 데이터의 snapshot을 읽는다. 이 시점은 첫 read 이전 어느 때여도 되므로 snapshot을 만드는 시점이 제품마다 다르다. 자기 쓰기는 자기 snapshot에 반영되어 다시 읽으면 보이고, commit 전에는 다른 트랜잭션에 보이지 않는다. 다중 버전 동시성 제어(MVCC)의 한 형태다.

- **First-Committer-Wins**: commit하려는 트랜잭션의 실행 구간 안에 같은 항목을 쓴 다른 트랜잭션이 먼저 commit했으면 abort한다. 이 규칙이 lost update(P4)를 막는다.
- **First-Updater-Wins**: 쓰는 시점에 row lock으로 동시 쓰기를 검사하는 변형이며 abort가 일어나는 시점만 다르다. Oracle `SERIALIZABLE`은 트랜잭션 시작 뒤 commit된 변경이 있는 row를 갱신하려 하면 ORA-08177로 실패하고, PostgreSQL RR은 먼저 갱신한 쪽이 commit하면 나중 갱신자를 40001로 실패시킨다([[MVCC-Implementation-Tradeoffs#같은 격리 수준 이름에서 갈리는 쓰기 충돌|MySQL과 PostgreSQL 비교]]).
- 읽기가 쓰기를 막지 않고 쓰기에 막히지도 않는다. dirty read와 non-repeatable read가 없고, 같은 조건을 다시 읽을 때의 phantom(A3)도 없다.
- Write Skew(A5B)를 허용한다. 같은 조건의 합계를 각자 확인하고 서로 다른 새 row를 넣어 제약을 깨는 P3 형태(작업 시간 합계 8시간 제한에 두 트랜잭션이 각각 1시간 작업을 추가)도 First-Committer-Wins로는 막지 못한다.
- ANSI에는 없지만 Oracle의 `SERIALIZABLE`, PostgreSQL의 `REPEATABLE READ` 같은 구현을 설명하는 데 쓰인다. CockroachDB의 기본 `SERIALIZABLE`은 SI 예시로 분류하지 않는다.

### Write Skew 예시

계좌 A, B가 있고 잔액 합이 ≥ $100이면 $50 출금 가능 규칙.
- T1: A 잔액 읽음(60) + B 잔액 읽음(50) → A에서 50 인출
- T2: A 잔액 읽음(60) + B 잔액 읽음(50) → B에서 50 인출
- 둘 다 커밋 → A=10, B=0, 합 10 (규칙 위반)

Snapshot Isolation에서 허용됨. PostgreSQL SSI나 진짜 Serializable만 방지.

## Strict Serializable — Serializable + Linearizable

### Linearizable (선형화 가능)

**단일 객체**에 대한 연산이 실시간 순서와 일치하는 것처럼 보이는 성질.
- 연산 A가 B 시작 전에 완료되면, B는 반드시 A의 영향을 본다
- 시간 축을 따라 "점"으로 순서가 매겨짐
- 분산 시스템에서 사용하는 강한 일관성 모델 중 하나다. 단일 객체 연산의 linearizability와 여러 연산을 묶는 트랜잭션 격리는 적용 단위가 다르다.

### Strict Serializable

직렬 실행 순서가 겹치지 않는 트랜잭션의 **실시간 선후 관계와 일치**하는 성질이다. 흔히 serializability에 실시간 제약을 더한 것으로 설명한다.
- Serializable은 "어떤 순서든"이지만 Strict Serializable은 "실시간 순서"
- 단일 머신 DB도 자동으로 만족하지 않으며 제품과 격리 모드의 보장을 확인해야 한다.
- 분산 DB에서는 시계, 합의, 복제 지연까지 조정해야 해 구현 비용이 더 커질 수 있다.

## 분산 DB에서의 일관성 난제

Replica, Sharding, 지리 분산이 들어오면 Serializable만으로는 부족. 각 DB가 다른 접근:

| 시스템 | 전략 |
|---|---|
| **Google Spanner** | TrueTime (GPS + 원자시계)로 글로벌 타임스탬프. Paxos 복제 위에 TrueTime 기반 commit wait으로 external consistency 제공, 복제본 수와 복제본 간 거리는 애플리케이션이 제약으로 지정 |
| **CockroachDB** | HLC (Hybrid Logical Clock) + Serializable Isolation |
| **FaunaDB** | Calvin 알고리즘 (결정적 순서 결정) |
| **YugabyteDB** | Raft + HLC, Serializable/Snapshot/Read Committed 선택 |
| **Cassandra** | 기본 Eventual Consistency, LWT(Lightweight Transaction)로 Linearizable 선택 가능 |

**완벽한 해결책은 아직 없음** — 성능, 가용성, 일관성 트레이드오프 (CAP, PACELC 이론).

## 실무 선택 기준

| 상황 | 권장 격리 |
|---|---|
| 일반 OLTP, 순서 크게 안 탐 | Read Committed + 낙관적 락 (most DBs default) |
| 읽기 일관성 필요, 동시성 유지 | Snapshot Isolation (PostgreSQL Repeatable Read) |
| Write Skew 위험한 도메인 (금융, 재고) | Serializable / SSI (PostgreSQL) |
| 글로벌 분산 + 실시간 순서 | strict serializability 또는 external consistency를 명시적으로 보장하는 모드 |
| 에너지 효율, 성능 우선 | Eventual Consistency + 명시적 LWT |

**핵심 원칙**: 격리 수준은 **해결책이 아니라 문제 유형의 지표**. 도메인 규칙이 진짜 엄격히 필요한지 판단이 먼저.

## 흔한 오해

- **"Serializable = 시간 순서대로"** — 아님. "어떤 직렬 실행과 동일한 결과"가 정의. Linearizable이 합쳐져야 시간 순서
- **"Oracle Serializable이 진짜 Serializable"** — 실제로는 Snapshot Isolation. Write Skew 발생 가능
- **"MySQL Repeatable Read는 Phantom Read를 완전 방지"** — 대부분 방지하지만 일부 엣지 케이스에서 발생 가능
- **"Snapshot Isolation = Repeatable Read"** — 많은 DB에서 그렇게 구현되지만 표준 용어로는 별개
- **"분산 DB도 Serializable이면 항상 충분"** — 요구사항이 실시간 외부 순서까지 포함하는지 구분하고 제품 보장을 확인해야 함
- **"격리 수준만 올리면 안전"** — Deadlock, 성능 저하, 락 확산 같은 비용 증가

## 면접 체크포인트

- **ANSI 4대 격리 수준**과 각각 방지하는 이상 현상
- **Snapshot Isolation이 ANSI에 없다**는 사실과 Write Skew가 발생하는 이유
- P0~P4, A5A, A5B를 이력으로 설명하고, abort가 없어도 dirty read가 문제인 예로 broad 해석이 필요한 이유를 말한다
- SI의 First-Committer-Wins와 First-Updater-Wins, 같은 RR에서 PostgreSQL은 lost update를 40001로 막고 MySQL은 막지 않는 차이
- **MySQL InnoDB vs PostgreSQL vs Oracle**의 동일 격리 이름 다른 구현
- **Serializable의 진짜 정의** ("어떤 직렬 실행과 동일한 결과")
- **Linearizable** 의 의미와 Strict Serializable
- 분산 DB에서 **TrueTime, HLC, Calvin** 같은 일관성 기법의 목적
- 격리 수준은 **해결책이 아닌 지표**라는 관점

## 출처
- [vwjdalsgkv (네이버 블로그) — Read uncommitted 이하 Serializable 이상](https://blog.naver.com/vwjdalsgkv/223285219248)
- [Berenson et al. — *A Critique of ANSI SQL Isolation Levels* (SIGMOD 1995, MSR-TR-95-51)](https://arxiv.org/abs/cs/0701157)
- [Jepsen — Consistency models](https://jepsen.io/consistency)
- [Jepsen — Serializability (읽기를 시각 0에 배치하는 예)](https://jepsen.io/consistency/models/serializable)
- [PostgreSQL — Transaction Isolation (Repeatable Read = Snapshot Isolation, Phantom Read 미발생, SSI)](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Spanner: Google's Globally-Distributed Database (OSDI 2012)](https://www.usenix.org/system/files/conference/osdi12/osdi12-final-16.pdf)
- [YugabyteDB — Transaction isolation levels](https://docs.yugabyte.com/stable/architecture/transactions/isolation-levels/)
- [CockroachDB transaction isolation](https://www.cockroachlabs.com/docs/stable/demo-serializable)
- [Microsoft SQL Server — Transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
- [IBM Db2 — Isolation levels](https://www.ibm.com/docs/en/db2/12.1.x?topic=issues-isolation-levels)
- [Oracle — ORA-02179 (지원 격리 수준 구문)](https://docs.oracle.com/en/error-help/db/ora-02179/)
- [Oracle Database 19c Concepts — Data Concurrency and Consistency (Read Committed, Serializable, Read Only)](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html)
- [Silberschatz, Korth, Sudarshan — Database System Concepts 7th Ed., Chapter 18 Concurrency Control 슬라이드 (First-Updater-Wins)](https://www.db-book.com/slides-dir/PDF-dir/ch18.pdf)
- [YouTube, 쉬운코드, transaction isolation level과 snapshot isolation](https://www.youtube.com/watch?v=bLLarZTrebU)

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준 (기본)]]
- [[Transactions|트랜잭션, ACID]]
- [[Serializability-and-Recoverability|스케줄, 직렬 가능성과 회복 가능성]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현과 MySQL, PostgreSQL의 쓰기 충돌 차이]]
- [[Lock|DB Lock]]
- [[Replication|Replication]]
- [[Sharding|샤딩]]
