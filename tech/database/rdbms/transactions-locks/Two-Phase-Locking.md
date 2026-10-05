---
tags: [database, rdbms, lock, concurrency-control, two-phase-locking]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Two-Phase Locking", "2PL", "2단계 잠금", "Strict 2PL", "Rigorous 2PL", "Conservative 2PL"]
---

# 2단계 잠금 (Two-Phase Locking)

lock 기반 동시성 제어에서 트랜잭션이 lock을 언제 얻고 언제 놓을지 정하는 프로토콜이다. lock을 쓰는 것만으로는 직렬성이 보장되지 않고, 2PL 규칙을 지켜야 [[Serializability-and-Recoverability|conflict serializable]] 스케줄이 나온다. 분산 commit 프로토콜인 2PC, OS mutex에서 잠시 spin한 뒤 sleep하는 two-phase lock과는 다른 개념이다.

## 읽기 lock과 쓰기 lock

- **read lock (shared, S)**: 읽기용이다. 다른 트랜잭션의 read lock과 함께 잡을 수 있다.
- **write lock (exclusive, X)**: 잡고 있는 동안 다른 트랜잭션은 같은 데이터에 어떤 lock도 얻지 못한다. 이름과 달리 X lock을 잡은 트랜잭션은 그 데이터를 읽을 수도 쓸 수도 있다.
- 호환되는 조합은 S와 S뿐이다. 나머지 요청은 먼저 잡힌 lock이 풀릴 때까지 대기한다 ([[Lock#Row-level Locks|호환성 표]]).
- 일반 SQL에서는 개발자가 lock과 unlock을 직접 호출하지 않는다. DBMS가 읽기, 쓰기와 locking read에 맞춰 잡고 푼다.

## lock만으로는 직렬성이 보장되지 않는다

x=100, y=200에서 T1은 `x = x + y`, T2는 `y = x + y`를 실행한다. serial 결과는 T1→T2면 x=300, y=500이고 T2→T1이면 x=400, y=300이다. 각 트랜잭션이 데이터를 다 쓴 직후 lock을 놓으면 다음 스케줄이 가능하다.

| 순서 | T1 (`x = x + y`) | T2 (`y = x + y`) |
|---|---|---|
| 1 | | read_lock(x), x=100 읽음, unlock(x) |
| 2 | read_lock(y) | |
| 3 | | write_lock(y) 요청, T1의 read lock 때문에 대기 |
| 4 | y=200 읽음, unlock(y) | |
| 5 | | write_lock(y) 획득, y=200 읽음, y=300 씀, unlock(y) |
| 6 | write_lock(x), x=100 읽음, x=300 씀, unlock(x) | |

결과 x=300, y=300은 어느 serial 결과와도 다르다. T2는 T1이 바꾸기 전의 x를 읽었으므로 serial하려면 T1은 T2가 바꾼 y를 읽어야 한다. 그런데 T2가 x의 lock을 놓고 y의 write lock을 얻기 전 틈에 T1이 y의 read lock을 잡아 갱신 전 y를 읽었다. T2가 `write_lock(y)`를 먼저 얻은 뒤 `unlock(x)`하면 T1의 `read_lock(y)`는 T2가 y를 놓을 때까지 기다리고, 결과는 T2→T1(x=400, y=300)과 같아진다. T1이 먼저 시작하는 경우에 대비해 T1도 `write_lock(x)`를 얻은 뒤 `unlock(y)`해야 한다.

## 2PL 규칙

한 트랜잭션의 모든 lock 획득이 첫 unlock보다 앞서야 한다. 한 번 lock을 놓기 시작하면 새 lock을 얻지 않는다는 뜻이다.

- **growing (expanding) phase**: lock을 얻기만 하고 놓지 않는다.
- **shrinking (contracting) phase**: lock을 놓기만 하고 새로 얻지 않는다.
- 마지막 lock을 얻은 시점을 lock point라고 한다. 2PL을 따르는 트랜잭션들의 스케줄은 conflict serializable이고 lock point 순서가 대응하는 serial 순서다.
- growing phase에서 S를 X로 올리고(upgrade) shrinking phase에서 X를 S로 내리는(downgrade) lock conversion도 2PL 안에서 허용된다. S에서 X로 올릴 때 생기는 deadlock은 [[Lock-Deadlock|DB 데드락]] 참고.
- 2PL은 serializability의 충분조건이지 필요조건이 아니다. 2PL로는 만들 수 없는 conflict serializable 스케줄도 있다.

## 2PL은 deadlock을 막지 않는다

위 예를 2PL로 고친 T1과 T2가 다음 순서로 실행되면 서로를 기다린다.

1. T2가 read_lock(x)을 얻는다.
2. T1이 read_lock(y)을 얻고 y를 읽는다.
3. T1이 unlock(y) 전에 write_lock(x)를 요청하고, T2의 read lock 때문에 대기한다.
4. T2가 x를 읽고 unlock(x) 전에 write_lock(y)를 요청하고, T1의 read lock 때문에 대기한다.

다음 lock을 얻기 전에는 앞의 lock을 놓지 않는 규칙 때문에 이 순환은 스스로 풀리지 않는다. 대처는 OS의 교착상태 대처와 같은 축으로 나뉜다 ([[Concurrency-and-Process-Deadlock|교착상태]]).

- 감지와 복구: wait-for graph에서 cycle을 찾아 victim을 rollback한다. InnoDB는 기본으로 deadlock을 감지해 작은 트랜잭션을 골라 rollback하려 한다 ([[Lock-Deadlock|DB 데드락]]).
- timeout: 정한 시간만 기다리고 포기한다.
- 예방: 필요한 lock을 시작 전에 모두 얻거나(아래 conservative 2PL), 데이터에 순서를 정해 그 순서로만 lock을 얻는다. 트랜잭션 timestamp로 누가 기다리고 누가 rollback할지 정하는 wait-die, wound-wait도 예방 기법이다.

## 2PL의 변형

| 변형 | 규칙 | 보장 | 대가 |
|---|---|---|---|
| Basic 2PL | growing 뒤 shrinking | conflict serializable | deadlock 가능. commit 전에 write lock을 놓으면 다른 트랜잭션이 미커밋 값을 읽어 cascading rollback이 생길 수 있다 |
| Conservative (static) 2PL | 읽고 쓸 데이터 집합을 미리 선언하고 모든 lock을 얻은 뒤 시작 | deadlock 없음. 대기 중인 트랜잭션은 lock을 하나도 쥐고 있지 않다 | 전부 얻을 때까지 시작하지 못한다. 조건 분기와 질의 결과에 따라 접근 대상이 바뀌면 가능한 집합 전체를 넉넉히 선언해야 해 동시성이 떨어진다 |
| Strict 2PL (S2PL) | write lock을 commit 또는 abort까지 보유 | strict 스케줄. recoverable하고 cascading rollback이 없으며 rollback을 before image 복원으로 구현할 수 있다 | write lock 보유 시간이 길어진다 |
| Rigorous 2PL (SS2PL, strong strict 2PL) | read lock과 write lock을 모두 commit 또는 abort까지 보유 | strict 스케줄, commit 순서가 곧 serial 순서 | read lock도 오래 쥐어 그 데이터를 쓰려는 트랜잭션의 대기가 늘어난다 |

교재마다 이름이 다르다. Silberschatz는 write lock만 끝까지 보유하는 쪽을 strict, 모든 lock을 보유하는 쪽을 rigorous라고 부른다. Bernstein 등은 모든 lock을 종료 시점에 함께 놓는 방식을 strict 2PL이라고 부르면서, strictness 자체는 write lock만 끝까지 보유해도 충분하다고 덧붙인다. 이름보다 무엇을 언제까지 보유하는지로 설명한다.

모든 lock을 끝까지 쥐는 구현이 흔한 이유는 두 가지다. 트랜잭션이 SQL을 하나씩 보내면 DBMS는 이 트랜잭션이 lock을 더 요청하지 않는다는 사실을 종료 시점에야 확신할 수 있다. 그리고 write lock을 commit까지 보유해야 strict 스케줄이 된다. Silberschatz는 대부분의 DBMS가 rigorous 2PL을 구현하면서 그냥 2PL이라고 부른다고 설명한다.

## 실제 DBMS에서 보이는 모습

- MySQL InnoDB: 트랜잭션이 잡은 InnoDB lock은 commit 또는 abort 때 함께 풀린다. 문장 하나가 오류로 rollback돼도 lock은 풀리지 않으므로 실패한 트랜잭션은 명시적으로 끝낸다. savepoint로 rollback해도 그 뒤에 잡은 row lock은 남는다(새로 insert한 row는 예외). READ COMMITTED에서 WHERE 조건에 맞지 않는 row의 lock을 일찍 푸는 예외는 [[MySQL-InnoDB-Locking-and-Deadlocks#격리 수준에 따른 차이|InnoDB 격리 수준별 잠금]] 참고.
- InnoDB SERIALIZABLE은 autocommit이 꺼진 트랜잭션의 일반 SELECT를 `SELECT ... FOR SHARE`로 바꾼다. 읽기에도 S lock을 끝까지 쥐는 lock 기반 동작에 가까워진다.
- PostgreSQL: 얻은 lock은 보통 트랜잭션 끝까지 보유한다. 다만 savepoint 뒤에 얻은 lock은 그 savepoint로 rollback하면 즉시 풀린다.

## lock 기반 방식의 한계와 MVCC

S와 S 말고는 모두 대기하므로 순수 lock 기반에서는 읽기와 쓰기가 서로를 막는다. 다중 버전 방식은 읽기에 commit된 version의 snapshot을 주고 쓰기끼리만 lock으로 직렬화한다. 교재의 multiversion 2PL은 갱신 트랜잭션이 rigorous 2PL을 따르고 읽기 전용 트랜잭션은 lock 없이 snapshot을 읽는 형태다. READ COMMITTED와 REPEATABLE READ에서 MySQL InnoDB와 PostgreSQL의 일반 SELECT는 row lock 없이 snapshot을 읽고, 쓰기와 locking read가 잡은 row lock은 앞의 예외를 빼면 트랜잭션 끝까지 유지된다. 일반 SELECT도 테이블 구조 변경을 막는 테이블 수준 lock(MySQL의 metadata lock, PostgreSQL의 `ACCESS SHARE`)은 잡는다. PostgreSQL 문서는 읽기가 쓰기를, 쓰기가 읽기를 막지 않는 점을 MVCC의 주된 이점으로 든다 ([[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]).

## 면접 체크포인트

- lock을 썼는데도 이상 현상이 나는 예를 들고, 원인을 lock을 놓은 뒤 다른 lock을 얻는 틈으로 설명한다.
- 2PL의 두 phase와 lock point를 말하고, 보장하는 것(conflict serializability)과 보장하지 않는 것(deadlock 자유, cascading rollback 방지)을 나눈다.
- strict 2PL과 rigorous 2PL을 무엇을 언제까지 보유하는지로 구분하고, 교재마다 이름이 다르다는 점을 안다.
- conservative 2PL이 deadlock을 막는데도 범용 DBMS에서 쓰기 어려운 이유를 사전 선언의 어려움으로 설명한다.
- 2PL(잠금 프로토콜)과 2PC(분산 commit 프로토콜)를 혼동하지 않는다 ([[Distributed-Transaction-Strategies#2PC를 정확히 이해하기|2PC]]).
- MVCC가 해결한 문제가 read-write 대기라는 점과, MVCC에서도 같은 row의 write-write는 lock으로 기다린다는 점을 함께 말한다.

## 출처

- [Database System Concepts 7th Ed., Chapter 18 Concurrency Control 슬라이드 — Silberschatz, Korth, Sudarshan](https://www.db-book.com/slides-dir/PDF-dir/ch18.pdf)
- [Concurrency Control and Recovery in Database Systems, Chapter 3 Two Phase Locking — Bernstein, Hadzilacos, Goodman](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/05/chapter3.pdf)
- [A Critique of ANSI SQL Isolation Levels — SIGMOD 1995, Berenson et al.](https://arxiv.org/abs/cs/0701157)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, autocommit, Commit, and Rollback](https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html)
- [MySQL 8.4 Reference Manual, InnoDB Error Handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [MySQL 8.4 Reference Manual, SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements](https://dev.mysql.com/doc/refman/8.4/en/savepoint.html)
- [MySQL 8.4 Reference Manual, Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.4 Reference Manual, Metadata Locking](https://dev.mysql.com/doc/refman/8.4/en/metadata-locking.html)
- [PostgreSQL 18 Documentation, Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL 18 Documentation, Introduction to MVCC](https://www.postgresql.org/docs/18/mvcc-intro.html)
- [YouTube, 쉬운코드, LOCK을 활용한 concurrency control과 2PL](https://www.youtube.com/watch?v=0PScmeO3Fig)

## 관련 문서

- [[Serializability-and-Recoverability|스케줄, 직렬 가능성과 회복 가능성]]
- [[Lock|DB Lock]]
- [[Lock-Deadlock|DB 데드락]]
- [[MySQL-InnoDB-Locking-and-Deadlocks|MySQL 8.4 InnoDB Locking과 Deadlock]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Concurrency-and-Process-Deadlock|교착상태, 라이브락, 기아]]
- [[Concurrency-and-Process-Synchronization|OS 동기화와 mutex]]
- [[Distributed-Transaction-Strategies|분산 트랜잭션 전략]]
