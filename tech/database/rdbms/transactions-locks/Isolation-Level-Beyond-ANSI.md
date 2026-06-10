---
tags: [database, rdbms, isolation-level, serializable, linearizable, snapshot-isolation, distributed-db]
status: done
category: "Data & Storage - RDB"
aliases: ["Isolation Level Beyond ANSI", "Strict Serializable", "Linearizable", "Snapshot Isolation", "ANSI SQL 격리 한계"]
---

# ANSI 격리 수준의 한계와 Strict Serializable

ANSI SQL의 4대 격리 수준(Read Uncommitted / Read Committed / Repeatable Read / Serializable)은 **표준 자체가 불완전**하다. 실제 DBMS마다 동일 이름 아래 다른 동작을 제공하고, 분산 환경에서는 기존 정의로 설명 안 되는 이상 현상이 생긴다. 기본 격리 수준은 [[Isolation-Level]] 참조.

## 핵심 명제

- ANSI SQL의 격리 정의는 **이상 현상의 발생 유무**를 기준으로 하지만, 현상 목록이 불완전하다
- MySQL InnoDB·PostgreSQL·Oracle이 같은 "Repeatable Read"·"Serializable"을 다르게 구현
- **Snapshot Isolation**은 ANSI에 정의되지 않았지만 대부분 DB의 "Repeatable Read" 실체
- **Strict Serializable = Serializable + Linearizable** — 분산 DB에서 필요한 진짜 엄격한 기준

## ANSI 표준의 한계 — "A Critique of ANSI SQL Isolation Levels"

1995년 Berenson 등의 논문 *A Critique of ANSI SQL Isolation Levels*가 지적한 문제:

- **이상 현상 정의가 너무 느슨** — 같은 이름의 격리에서 구현자마다 다른 해석 가능
- **Snapshot Isolation 누락** — 실제로 널리 쓰이는데 ANSI에는 없음
- **Serializable의 정의가 모호** — "이상 현상이 없다"로만 정의되어, 완전 비어있는 결과를 리턴해도 만족 가능

결과적으로 표준은 있지만 **DBMS 간 호환성 보장이 안 됨**.

### Dirty Write — ANSI 최소 기준에도 없는 것

ANSI Read Uncommitted도 **Dirty Write는 막는다** — 트랜잭션 A가 쓴 row를 B가 커밋 전에 덮어쓰는 것. Degree 0(Berenson 분류)은 이것도 허용하지만, Oracle·PostgreSQL은 Read Uncommitted 자체를 지원하지 않고, MySQL도 실무에서 거의 안 쓴다.

## DBMS별 실제 구현 차이

| DBMS | Repeatable Read 구현 | Serializable 구현 |
|---|---|---|
| **MySQL InnoDB** | Snapshot + Next-Key Lock(일부 Phantom 방지) | 모든 읽기를 `SELECT ... LOCK IN SHARE MODE`처럼 처리 |
| **PostgreSQL** | Snapshot Isolation (Phantom Read 완전 방지) | SSI (Serializable Snapshot Isolation) — Serializable 보장 |
| **Oracle** | 미지원 (Read Committed만) | 실질적으로 Snapshot Isolation (진짜 Serializable 아님) |
| **SQL Server** | Snapshot + Lock | Pessimistic 2PL 기반 |
| **DB2** | Cursor Stability (다른 이름) | Repeatable Read |

**함정**: "Serializable"이라고 쓰여 있어도 실제로는 Snapshot Isolation일 수 있음 (Oracle). 쓰기 skew 같은 이상 현상이 남을 수 있다.

## Serializable의 진짜 정의

ANSI SQL-99 원문:
> A serializable execution is defined to be an execution of the operations of concurrently executing SQL-transactions that produces the same effect as some serial execution of those same SQL-transactions.

핵심: 동시 실행의 결과가 **어떤 직렬 실행**(some serial execution)과 동일한 결과면 됨.
- "어떤"이라는 조건 — 순서가 **특정되지 않음**
- 트랜잭션 순서가 실제 시간과 달라도 무방
- 심지어 읽기가 "빈 상태"를 반환하더라도, 동일 결과를 내는 직렬 실행이 하나만 존재하면 만족

이 느슨함이 단일 머신에선 문제가 안 된다 — 자연스레 시간 순서로 정렬되기 때문. 분산 환경에서 문제 폭발.

## Snapshot Isolation — ANSI에 없는 실전 표준

**Snapshot Isolation (SI)**: 트랜잭션 시작 시점의 데이터 스냅샷으로 읽기 일관성 제공. 쓰기는 First-Committer-Wins.

- Phantom Read 방지
- Write Skew 허용 (두 트랜잭션이 서로의 읽기를 기반으로 다른 row를 쓰는 경우)
- ANSI에는 없지만 **Oracle·PostgreSQL Repeatable Read·CockroachDB 등의 실질 기반**

### Write Skew 예시

계좌 A·B가 있고 잔액 합이 ≥ $100이면 $50 출금 가능 규칙.
- T1: A 잔액 읽음(60) + B 잔액 읽음(50) → A에서 50 인출
- T2: A 잔액 읽음(60) + B 잔액 읽음(50) → B에서 50 인출
- 둘 다 커밋 → A=10, B=0, 합 10 (규칙 위반)

Snapshot Isolation에서 허용됨. PostgreSQL SSI나 진짜 Serializable만 방지.

## Strict Serializable — Serializable + Linearizable

### Linearizable (선형화 가능)

**단일 객체**에 대한 연산이 실시간 순서와 일치하는 것처럼 보이는 성질.
- 연산 A가 B 시작 전에 완료되면, B는 반드시 A의 영향을 본다
- 시간 축을 따라 "점"으로 순서가 매겨짐
- 분산 시스템에서 가장 강력한 일관성 모델

x86/64 CPU조차 완전한 Linearizable은 아님 (메모리 barrier 없이는).

### Strict Serializable

`Serializable + Linearizable` — 직렬 실행 순서가 **실시간 순서와 일치**.
- Serializable은 "어떤 순서든"이지만 Strict Serializable은 "실시간 순서"
- 단일 머신 DB에서는 자연히 만족됨 (시간 증가 값으로 정렬)
- 분산 DB에서는 구현 난이도 급증

## 분산 DB에서의 일관성 난제

Replica·Sharding·지리 분산이 들어오면 Serializable만으로는 부족. 각 DB가 다른 접근:

| 시스템 | 전략 |
|---|---|
| **Google Spanner** | TrueTime (원자시계 + GPS)로 글로벌 타임스탬프. Paxos 동기 복제, 동기 복제 센터 간 거리 1,000마일 제한 |
| **CockroachDB** | HLC (Hybrid Logical Clock) + Serializable Isolation |
| **FaunaDB** | Calvin 알고리즘 (결정적 순서 결정) |
| **YugabyteDB** | Raft + HLC, Snapshot/Serializable 선택 |
| **Cassandra** | 기본 Eventual Consistency, LWT(Lightweight Transaction)로 Linearizable 선택 가능 |

**완벽한 해결책은 아직 없음** — 성능·가용성·일관성 트레이드오프 (CAP·PACELC 이론).

## 실무 선택 기준

| 상황 | 권장 격리 |
|---|---|
| 일반 OLTP, 순서 크게 안 탐 | Read Committed + 낙관적 락 (most DBs default) |
| 읽기 일관성 필요, 동시성 유지 | Snapshot Isolation (PostgreSQL Repeatable Read) |
| Write Skew 위험한 도메인 (금융·재고) | Serializable / SSI (PostgreSQL) |
| 글로벌 분산 + 실시간 순서 | Strict Serializable (Spanner·Cockroach) |
| 에너지 효율·성능 우선 | Eventual Consistency + 명시적 LWT |

**핵심 원칙**: 격리 수준은 **해결책이 아니라 문제 유형의 지표**. 도메인 규칙이 진짜 엄격히 필요한지 판단이 먼저.

## 흔한 오해

- **"Serializable = 시간 순서대로"** — 아님. "어떤 직렬 실행과 동일한 결과"가 정의. Linearizable이 합쳐져야 시간 순서
- **"Oracle Serializable이 진짜 Serializable"** — 실제로는 Snapshot Isolation. Write Skew 발생 가능
- **"MySQL Repeatable Read는 Phantom Read를 완전 방지"** — 대부분 방지하지만 일부 엣지 케이스에서 발생 가능
- **"Snapshot Isolation = Repeatable Read"** — 많은 DB에서 그렇게 구현되지만 표준 용어로는 별개
- **"분산 DB도 Serializable만 지키면 OK"** — 단일 노드 관점. 분산에서는 Strict Serializable까지 봐야
- **"격리 수준만 올리면 안전"** — Deadlock·성능 저하·락 확산 같은 비용 증가

## 면접 체크포인트

- **ANSI 4대 격리 수준**과 각각 방지하는 이상 현상
- **Snapshot Isolation이 ANSI에 없다**는 사실과 Write Skew가 발생하는 이유
- **MySQL InnoDB vs PostgreSQL vs Oracle**의 동일 격리 이름 다른 구현
- **Serializable의 진짜 정의** ("어떤 직렬 실행과 동일한 결과")
- **Linearizable** 의 의미와 Strict Serializable
- 분산 DB에서 **TrueTime·HLC·Calvin** 같은 일관성 기법의 목적
- 격리 수준은 **해결책이 아닌 지표**라는 관점

## 출처
- [vwjdalsgkv (네이버 블로그) — Read uncommitted 이하 Serializable 이상](https://blog.naver.com/vwjdalsgkv/223285219248)
- Berenson et al. — *A Critique of ANSI SQL Isolation Levels* (1995)
- [Jepsen — Consistency models](https://jepsen.io/consistency)

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준 (기본)]]
- [[Transactions|트랜잭션·ACID]]
- [[Lock|DB Lock]]
- [[Replication|Replication]]
- [[Sharding|샤딩]]
