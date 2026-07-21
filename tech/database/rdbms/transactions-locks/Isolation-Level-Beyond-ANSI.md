---
tags: [database, rdbms, isolation-level, serializable, linearizable, snapshot-isolation, distributed-db]
status: done
category: "Data & Storage - RDB"
aliases: ["Isolation Level Beyond ANSI", "Strict Serializable", "Linearizable", "Snapshot Isolation", "ANSI SQL 격리 한계"]
verified_at: 2026-07-21
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
- **Serializable의 정의가 모호** — "이상 현상이 없다"로만 정의되어, 완전 비어있는 결과를 리턴해도 만족 가능

결과적으로 표준은 있지만 **DBMS 간 호환성 보장이 안 됨**.

### Dirty Write — 현상 목록만으로는 빠진 문제

Dirty Write는 트랜잭션 A가 쓴 row를 A의 커밋이나 롤백 전에 B가 덮어쓰는 현상이다. Berenson 논문의 비판처럼 SQL-92가 나열한 세 read phenomenon만으로는 이를 충분히 포착하지 못한다. 주요 DBMS는 복구 가능성을 위해 가장 낮은 격리에서도 dirty write를 막지만, 그 사실을 ANSI 현상 정의만으로 증명하면 안 된다. Oracle과 PostgreSQL은 별도의 Read Uncommitted 동작을 제공하지 않고 요청을 Read Committed처럼 처리한다.

## DBMS별 실제 구현 차이

| DBMS | Repeatable Read 구현 | Serializable 구현 |
|---|---|---|
| **MySQL InnoDB** | Snapshot + Next-Key Lock(잠금 읽기와 범위 변경의 Phantom 방지) | `autocommit`이 꺼진 명시적 트랜잭션의 일반 SELECT를 `SELECT ... FOR SHARE`처럼 처리. autocommit 단일 SELECT는 nonlocking consistent read |
| **PostgreSQL** | Snapshot Isolation (Phantom Read 완전 방지) | SSI (Serializable Snapshot Isolation) — Serializable 보장 |
| **Oracle** | 미지원 (Read Committed만) | 실질적으로 Snapshot Isolation (진짜 Serializable 아님) |
| **SQL Server** | `REPEATABLE READ`는 읽은 key의 shared lock을 트랜잭션 끝까지 유지. `SNAPSHOT`은 별도 격리 수준 | `SERIALIZABLE`은 key-range lock으로 phantom도 방지 |
| **Db2** | Read Stability(RS)가 ANSI Repeatable Read에 가까우며 Cursor Stability(CS)는 Read Committed에 가까움 | Repeatable Read(RR)가 가장 강한 수준으로 ANSI Serializable에 대응 |

**함정**: "Serializable"이라고 쓰여 있어도 실제로는 Snapshot Isolation일 수 있음 (Oracle). 쓰기 skew 같은 이상 현상이 남을 수 있다.

## Serializable의 진짜 정의

ANSI SQL-99 원문:
> A serializable execution is defined to be an execution of the operations of concurrently executing SQL-transactions that produces the same effect as some serial execution of those same SQL-transactions.

핵심: 동시 실행의 결과가 **어떤 직렬 실행**(some serial execution)과 동일한 결과면 됨.
- "어떤"이라는 조건 — 순서가 **특정되지 않음**
- 트랜잭션 순서가 실제 시간과 달라도 무방
- 심지어 읽기가 "빈 상태"를 반환하더라도, 동일 결과를 내는 직렬 실행이 하나만 존재하면 만족

Serializable은 단일 머신에서도 실시간 순서를 자동으로 보장하지 않는다. 외부 관찰 순서까지 필요한 시스템은 구현체가 strict serializability 또는 external consistency를 명시적으로 제공하는지 확인해야 한다.

## Snapshot Isolation — ANSI에 없는 실전 표준

**Snapshot Isolation (SI)**: 트랜잭션 시작 시점의 데이터 스냅샷으로 읽기 일관성 제공. 쓰기는 First-Committer-Wins.

- Phantom Read 방지
- Write Skew 허용 (두 트랜잭션이 서로의 읽기를 기반으로 다른 row를 쓰는 경우)
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
| **Google Spanner** | TrueTime (원자시계 + GPS)로 글로벌 타임스탬프. Paxos 동기 복제, 동기 복제 센터 간 거리 1,000마일 제한 |
| **CockroachDB** | HLC (Hybrid Logical Clock) + Serializable Isolation |
| **FaunaDB** | Calvin 알고리즘 (결정적 순서 결정) |
| **YugabyteDB** | Raft + HLC, Snapshot/Serializable 선택 |
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
- **MySQL InnoDB vs PostgreSQL vs Oracle**의 동일 격리 이름 다른 구현
- **Serializable의 진짜 정의** ("어떤 직렬 실행과 동일한 결과")
- **Linearizable** 의 의미와 Strict Serializable
- 분산 DB에서 **TrueTime, HLC, Calvin** 같은 일관성 기법의 목적
- 격리 수준은 **해결책이 아닌 지표**라는 관점

## 출처
- [vwjdalsgkv (네이버 블로그) — Read uncommitted 이하 Serializable 이상](https://blog.naver.com/vwjdalsgkv/223285219248)
- Berenson et al. — *A Critique of ANSI SQL Isolation Levels* (1995)
- [Jepsen — Consistency models](https://jepsen.io/consistency)
- [CockroachDB transaction isolation](https://www.cockroachlabs.com/docs/stable/demo-serializable)
- [Microsoft SQL Server — Transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
- [IBM Db2 — Isolation levels](https://www.ibm.com/docs/en/db2/12.1.x?topic=issues-isolation-levels)

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준 (기본)]]
- [[Transactions|트랜잭션, ACID]]
- [[Lock|DB Lock]]
- [[Replication|Replication]]
- [[Sharding|샤딩]]
