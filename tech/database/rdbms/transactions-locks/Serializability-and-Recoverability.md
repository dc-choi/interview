---
tags: [database, rdbms, transaction, concurrency-control, serializability, recoverability]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["Serializability and Recoverability", "Schedule", "스케줄", "직렬 가능성", "회복 가능성", "Conflict Serializable", "Recoverable Schedule"]
---

# 스케줄, 직렬 가능성과 회복 가능성

동시에 실행되는 트랜잭션들의 operation이 실제로 실행된 순서를 스케줄(schedule)이라고 한다. 동시성 제어(concurrency control)는 허용할 스케줄을 두 기준으로 제한한다. 결과가 트랜잭션을 하나씩 실행한 결과와 같아야 하고(serializability), 어떤 트랜잭션이 rollback해도 이미 commit된 트랜잭션의 의미가 바뀌지 않아야 한다(recoverability). ACID의 Isolation이 이 기준을 요구하고, [[Isolation-Level|격리 수준]]은 이 기준을 성능과 맞바꿔 완화한 계약이다.

## 표기와 스케줄

- `r1(x)`는 T1이 x를 읽음, `w2(x)`는 T2가 x를 씀, `c1`과 `a1`은 T1의 commit과 abort다.
- 스케줄은 여러 트랜잭션의 operation을 실행 순서대로 늘어놓은 것이다. 한 트랜잭션 안의 operation 순서는 어떤 스케줄에서도 바뀌지 않는다.
- serial schedule은 트랜잭션을 겹치지 않고 하나씩 실행한다. nonserial schedule은 서로의 operation이 끼어든다(interleaving).

serial schedule은 이상한 결과를 만들지 않지만 한 트랜잭션이 디스크 I/O를 기다리는 동안 다른 트랜잭션이 CPU를 쓰지 못하고, 짧은 트랜잭션이 긴 트랜잭션 뒤에서 기다린다. 그래서 DBMS는 nonserial schedule을 허용하되 결과가 serial schedule과 같은 것만 허용하려 한다.

K 계좌(100)에서 H 계좌(200)로 20을 이체하는 T1과 H에 30을 입금하는 T2로 확인한다.

| 스케줄 | 실행 순서 | 종류 | 최종 H |
|---|---|---|---|
| S1 | `r1(K) w1(K) r1(H) w1(H) c1 r2(H) w2(H) c2` | serial, T1→T2 | 250 |
| S2 | `r2(H) w2(H) c2 r1(K) w1(K) r1(H) w1(H) c1` | serial, T2→T1 | 250 |
| S3 | `r1(K) w1(K) r2(H) w2(H) c2 r1(H) w1(H) c1` | nonserial | 250 |
| S4 | `r1(K) w1(K) r1(H) r2(H) w2(H) c2 w1(H) c1` | nonserial | 220 |

S4에서 T1은 T2가 쓰기 전의 H(200)를 읽어 두었다가 220을 써서 T2의 입금을 지운다. 이것이 lost update다.

## Conflict와 conflict serializable

두 operation이 다음을 모두 만족하면 conflict 관계다.

1. 서로 다른 트랜잭션에 속한다.
2. 같은 데이터에 접근한다.
3. 적어도 하나가 write다.

read-write conflict와 write-write conflict가 있고, read끼리는 conflict가 아니다. conflict인 두 operation은 순서를 바꾸면 결과가 달라질 수 있고, conflict가 아닌 인접 operation은 순서를 바꿔도 결과가 같다.

- 두 스케줄이 같은 트랜잭션들로 이루어지고 모든 conflict 쌍의 순서가 같으면 conflict equivalent다. conflict가 아닌 인접 operation을 맞바꾸기만 해서 한쪽을 다른 쪽으로 바꿀 수 있다는 뜻과 같다.
- 어떤 serial schedule과 conflict equivalent한 스케줄을 conflict serializable이라고 한다.

S3의 conflict 쌍은 H에 대한 `r2(H)`와 `w1(H)`, `w2(H)`와 `r1(H)`, `w2(H)`와 `w1(H)`이고 세 쌍 모두 T2가 먼저다. 순서가 같은 S2와 conflict equivalent이므로 S3는 nonserial이지만 conflict serializable이다. S4는 `r1(H)`가 `w2(H)`보다 앞서고(T1이 먼저) `r2(H)`가 `w1(H)`보다 앞선다(T2가 먼저). 두 방향이 섞여 있어 어느 serial schedule과도 conflict equivalent하지 않다.

### Precedence graph로 판별하기

트랜잭션을 노드로 두고, Ti의 operation이 그와 conflict인 Tj의 operation보다 먼저 실행되면 Ti→Tj 간선을 긋는다. 이 그래프에 cycle이 없을 때만 스케줄이 conflict serializable이고, 위상 정렬한 순서가 대응하는 serial 순서다. S4는 T1→T2와 T2→T1 간선이 함께 있어 cycle이 생긴다.

### View serializability와의 관계

serializable은 어떤 serial schedule과 동등하다는 뜻이고 동등성을 정의하는 방법이 여럿이다. view equivalent는 각 데이터의 초기값을 읽는 트랜잭션, 누가 쓴 값을 읽는지(reads-from), 마지막 write를 하는 트랜잭션이 같으면 성립한다. 모든 conflict serializable 스케줄은 view serializable이지만 반대는 아니며, 그 차이는 읽지 않고 덮어쓰는 blind write에서 생긴다. view serializability 판정은 NP-complete라 실제 프로토콜은 주로 conflict serializability를 기준으로 삼는다.

read와 write만 보는 이 모델은 덧셈 두 번처럼 순서를 바꿔도 같은 결과를 내는 연산의 의미까지 보지 않는다. 결과는 serial 실행과 같지만 conflict serializable도 view serializable도 아닌 스케줄이 있을 수 있다.

## 회복 가능성: rollback이 다른 트랜잭션으로 번지는 경우

serializability는 commit된 결과만 따진다. 트랜잭션은 abort할 수 있으므로 누가 누구의 값을 읽고 덮어썼는지에 따라 rollback이 다른 트랜잭션까지 번진다.

- **unrecoverable**: 다른 트랜잭션이 쓴 값을 읽은 트랜잭션이 값을 쓴 트랜잭션보다 먼저 commit하는 스케줄이다. 쓴 쪽이 나중에 abort하면 되돌릴 방법이 없다. `r1(K) w1(K) r2(H) w2(H) r1(H) w1(H) c1 a2`에서 T1은 T2의 미커밋 값 230을 읽어 250을 commit했다. T2가 abort해 H를 200으로 되돌리면 K 80, H 200이 남아 20이 사라진다. commit된 T1은 durability 때문에 되돌릴 수 없으므로 DBMS는 이런 스케줄을 허용하면 안 된다.
- **recoverable**: 어떤 트랜잭션도 자신이 읽은 값을 쓴 트랜잭션보다 먼저 commit하지 않는다. 쓴 쪽이 abort하면 읽은 쪽도 abort한다.
- **cascading rollback**: 하나의 abort가 그 값을 읽은 트랜잭션들의 연쇄 abort로 이어지는 현상이다. recoverable 스케줄에서도 생기며 되돌릴 작업이 크게 늘 수 있다.
- **cascadeless**: commit되지 않은 트랜잭션이 쓴 값을 읽지 않는다. commit된 값만 읽으므로 연쇄 abort가 없고, cascadeless 스케줄은 recoverable하다.
- **strict**: commit되지 않은 트랜잭션이 쓴 값을 읽지도 덮어쓰지도 않는다.

strict가 따로 필요한 이유는 rollback을 보통 before image 복원으로 구현하기 때문이다. 가격이 3인 상품에 T1이 1을 쓰고, T2가 2를 쓰고 commit한 뒤 T1이 abort하는 `w1(p) w2(p) c2 a1`을 보자. 읽기가 없으니 cascadeless지만 T1의 before image 3을 복원하면 commit된 T2의 2가 사라진다. 두 트랜잭션이 모두 abort하는 `w1(p) w2(p) a1 a2`도 문제다. T2의 before image 1은 이미 abort된 T1의 값이라 원래 값 3으로 돌아가지 못한다. strict 스케줄은 T2의 write를 T1이 끝날 때까지 미뤄 before image 복원만으로 rollback이 맞게 한다.

포함 관계는 strict ⊂ cascadeless ⊂ recoverable이고, serial schedule은 세 성질을 모두 만족한다.

### 이상 현상과의 대응

- cascadeless의 조건인 미커밋 값을 읽지 않기는 dirty read 금지와 같다.
- strict가 더 막는 미커밋 값 덮어쓰기는 dirty write다. Berenson 등은 before image 복원이 깨지는 문제를 근거로 모든 격리 수준에서 dirty write를 금지해야 한다고 정리했다 ([[Isolation-Level-Beyond-ANSI#Dirty Write — 현상 목록만으로는 빠진 문제|Dirty Write]]).

## 이론과 실제 DBMS 사이

DBMS는 실행이 끝난 스케줄의 precedence graph를 검사하지 않는다. 사후 검사로는 이미 늦기 때문이다. 대신 위반 스케줄이 애초에 생기지 않게 하는 프로토콜을 강제한다.

- lock 기반: [[Two-Phase-Locking|2PL]]은 conflict serializable 스케줄을 보장하고, write lock을 commit까지 보유하는 strict 2PL은 strict 스케줄까지 보장한다.
- 다중 버전 기반: snapshot isolation은 commit된 version만 읽어 dirty read가 없고 같은 데이터의 동시 쓰기 중 하나를 abort한다. 하지만 서로 다른 데이터를 쓰는 write skew를 허용해 serializable은 아니다. PostgreSQL의 SERIALIZABLE은 read-write 의존을 추적하는 SSI로 이 틈을 막는다 ([[Isolation-Level-Beyond-ANSI#Snapshot Isolation — ANSI에 없는 실전 표준|Snapshot Isolation]], [[MVCC-Implementation-Tradeoffs#같은 격리 수준 이름에서 갈리는 쓰기 충돌|MySQL과 PostgreSQL 비교]]).

엄격한 serializability는 대기와 abort를 늘릴 수 있어 DBMS는 이상 현상 일부를 허용하는 격리 수준을 함께 제공한다. SQL 표준의 기본 격리 수준은 SERIALIZABLE이지만 PostgreSQL은 보통 READ COMMITTED, MySQL InnoDB는 REPEATABLE READ가 기본값이다. 운영 중인 DB가 serializable로 동작한다고 가정하지 않는다.

## 면접 체크포인트

- serial schedule만 허용하지 않는 이유와 nonserial을 허용하는 조건을 함께 설명한다.
- conflict의 세 조건을 말하고, 예시 스케줄이 conflict serializable인지 precedence graph의 cycle로 판별한다.
- serializable은 어떤 serial 순서와 같은 결과라는 뜻이지 실제 시각 순서를 지킨다는 뜻이 아니다 ([[Isolation-Level-Beyond-ANSI#Serializable의 진짜 정의|Serializable의 정의]]).
- recoverable, cascadeless, strict를 dirty read와 dirty write에 대응시키고, recoverable이어도 cascading rollback은 생길 수 있음을 구분한다.
- DBMS가 스케줄을 사후 검사하지 않고 2PL, SSI 같은 프로토콜로 보장하는 이유를 말한다.

## 출처

- [Database System Concepts 7th Ed., Chapter 17 Transactions 슬라이드 — Silberschatz, Korth, Sudarshan](https://www.db-book.com/slides-dir/PDF-dir/ch17.pdf)
- [Concurrency Control and Recovery in Database Systems, Chapter 1 — Bernstein, Hadzilacos, Goodman](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/05/chapter1.pdf)
- [A Critique of ANSI SQL Isolation Levels — SIGMOD 1995, Berenson et al.](https://arxiv.org/abs/cs/0701157)
- [PostgreSQL 18 Documentation, SET TRANSACTION](https://www.postgresql.org/docs/18/sql-set-transaction.html)
- [PostgreSQL 18 Documentation, Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [YouTube, 쉬운코드, concurrency control 기초 이론: schedule과 serializability](https://www.youtube.com/watch?v=DwRN24nWbEc)
- [YouTube, 쉬운코드, concurrency control 기초 이론: recoverability](https://www.youtube.com/watch?v=89TZbhmo8zk)

## 관련 문서

- [[Transactions|트랜잭션과 ACID]]
- [[Two-Phase-Locking|2단계 잠금 (2PL)]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계와 Snapshot Isolation]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Lock|DB Lock]]
