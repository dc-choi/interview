---
tags: [database, rdbms, mysql, innodb, lock, gap-lock, deadlock, next-key-lock]
status: done
verified_at: 2026-08-11
category: "Data & Storage - RDB"
aliases: ["MySQL Gap Lock", "Gap Lock", "Next-Key Lock", "INSERT Intention Gap Lock"]
---

# MySQL Gap Lock

MySQL InnoDB의 **존재하지 않는 레코드 공간(간격)을 잠그는** 메커니즘. Repeatable Read 격리 수준에서 range update와 locking read의 phantom을 막고, Foreign Key와 중복 키 검사에도 사용된다. 범위 insert를 막는 대신 경합 범위가 넓어질 수 있다. 기본 격리 수준은 [[Isolation-Level]], 내부 계약은 [[MySQL-InnoDB-Locking-and-Deadlocks]] 참조.

## 핵심 명제

- **Gap Lock = 레코드 사이 간격에 거는 잠금**. 실제 row가 없는 공간도 잠글 수 있음
- 주요 목적: **Repeatable Read의 locking read/range write 보장, Foreign Key, 중복 키 검사**
- **Next-Key Lock = Record Lock + Gap Lock** — RR의 range scan에서 phantom insert를 막는 대표 방식
- **INSERT Intention Gap Lock** 은 기존 gap/next-key lock과의 wait 관계에 참여할 수 있음
- 회피 전략: 격리 수준을 `READ COMMITTED`로 낮추거나 쿼리 범위와 인덱스를 더 좁힘. binlog 포맷 변경만으로 Gap Lock이 일반적으로 사라진다고 보면 안 됨

## 잠금 종류와 관계

| 잠금 | 대상 | 특징 |
|---|---|---|
| **Record Lock** | 인덱스 레코드 | 가장 기본. 단일 row |
| **Gap Lock** | 레코드 사이 간격 (row 없음) | S/X mode가 있지만 서로 공존하며 insert를 억제 |
| **Next-Key Lock** | Record + 바로 앞 Gap | RR의 range scan에서 phantom insert를 막는 대표 방식 |
| **INSERT Intention Gap Lock** | 간격에 INSERT하려는 의도 표시 | 같은 gap의 다른 insert 위치끼리는 공존할 수 있고 기존 Gap Lock에는 대기 |

### Unique Index 여부에 따른 차이

- **Primary Key / Unique Index의 전체 key equality + 기존 record**: Record Lock만 (Gap Lock 없음)
- **존재하지 않는 unique key 또는 composite unique key 일부만 검색**: gap 또는 scan 범위 lock 가능
- **범위 조건 또는 비고유 인덱스 스캔**: 검색 중 스캔한 인덱스 범위에 Gap/Next-Key Lock이 걸릴 수 있음. 인덱스 종류만으로 항상 같은 잠금이 정해지는 것은 아님

## Gap Lock이 필요한 이유

### 1. Locking Read와 범위 쓰기의 삽입 방지

```sql
-- T1: 조회한 범위에 후속 쓰기를 하기 위해 locking read 실행
BEGIN;
SELECT * FROM orders WHERE user_id = 7 FOR UPDATE;   -- (행 2개)

-- T2가 user_id=7에 INSERT하면 후속 current range가 달라질 수 있음
-- Gap Lock이 T1의 범위를 잠가 T2의 INSERT를 차단

UPDATE orders SET status = 'checked' WHERE user_id = 7;
COMMIT;
```

Repeatable Read의 일반 `SELECT`는 consistent nonlocking read다. 첫 조회가 만든 snapshot을 다시 읽기 때문에 같은 결과를 볼 수 있지만, Gap Lock을 획득해 다른 트랜잭션의 INSERT를 차단하는 것은 아니다. 범위 삽입을 막아야 한다면 `FOR UPDATE`/`FOR SHARE` 같은 locking read나 범위 `UPDATE`/`DELETE`의 잠금 동작을 구분해야 한다.

### 2. Foreign Key와 중복 키 검사

참조 관계가 있는 row의 간격까지 잠가 FK 위반 가능성을 예방.
Unique index에 새 값을 넣을 때도 중복 여부를 안전하게 확인하기 위해 gap 계열 lock이 관여할 수 있다.

## INSERT Intention과 deadlock 경계

두 transaction의 gap lock은 공존할 수 있지만, 둘 다 같은 gap에 insert하려고 전환하면 각 insert intention이 상대의 gap lock을 기다리는 cycle이 생길 수 있다. 결과는 engine, isolation level, index와 key 존재 여부에 따라 달라지므로 schema 없는 SQL 조각을 확정적 재현으로 취급하지 않는다. DDL과 session 조건을 고정한 next-key wait 관찰 실험은 [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]]을 따른다.

## 위험한 패턴 — 빈 범위의 대량 잠금

```sql
-- 테이블이 비어있거나 조회 범위에 row가 거의 없을 때
UPDATE tb_gaplock SET name = 'x' WHERE id BETWEEN 1 AND 10;
-- 검색 가능한 넓은 구간을 Gap Lock으로 잠글 수 있음
-- 해당 구간의 INSERT가 차단됨
```

비어있는 index에서는 검색 range가 infimum과 supremum 사이의 넓은 gap이 될 수 있다. 조건과 access path에 따라 예상보다 많은 INSERT가 기다릴 수 있으므로 실제 lock data를 확인한다.

## 진단 명령

```sql
-- next-key를 누락하지 않도록 보유, 대기 중인 record-level lock 전체 확인
SELECT ENGINE_TRANSACTION_ID, OBJECT_SCHEMA, OBJECT_NAME,
       INDEX_NAME, LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks
WHERE ENGINE = 'INNODB' AND LOCK_TYPE = 'RECORD'
ORDER BY ENGINE_TRANSACTION_ID, OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_DATA;

-- 최근 데드락 정보
SHOW ENGINE INNODB STATUS;

-- 현재 잠금 대기
SELECT * FROM performance_schema.data_lock_waits;
```

`LOCK_MODE LIKE '%GAP%'`만으로 gap 계열 lock을 식별하면 안 된다. 일반 B-tree record lock에서 기본 `S`/`X` mode는 next-key lock일 수 있고, `REC_NOT_GAP`은 record-only인데도 문자열에 `GAP`이 포함된다. `LOCK_STATUS`의 `GRANTED`와 `WAITING`을 구분하고 실행 계획, `INDEX_NAME`, `LOCK_DATA`와 `data_lock_waits`를 함께 해석한다.

## 회피, 완화 전략

### 1. 격리 수준 낮추기

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

- Read Committed의 일반 search/index scan은 gap locking을 사용하지 않지만 Foreign Key와 duplicate-key 검사는 예외
- 불일치 record lock을 일찍 해제하고 UPDATE 조건 평가에는 semi-consistent read를 사용
- 트레이드오프는 Phantom Read와 Non-Repeatable Read를 포함하므로 session 단위 재현과 데이터 계약 검토가 먼저

### 2. 쿼리 패턴 수정

- optimizer가 사용하는 **full PK/unique key equality로 기존 record를 찾는 lookup**인지 확인한다. 한 row를 반환해도 range scan, composite key 일부와 없는 key 검색은 예외가 아니다.
- 범위 쿼리(`BETWEEN`, `<`, `>`)를 점(`=`)으로 변경 가능한지 검토
- 빈 범위에 대한 UPDATE/DELETE 지양

### 3. 낙관적 잠금

```sql
-- version 컬럼 활용
UPDATE orders SET status='paid', version=version+1
WHERE id=? AND version=?;
-- 영향받은 row가 0이면 재시도
```

조건부 UPDATE는 충돌 검증을 쓰기 문장에 넣어 선행 잠금 읽기를 피한다. 다만 full PK/unique key equality access path로 기존 row를 찾을 때만 record-only 예외가 적용된다. 대상이 없거나 composite key 일부, range/nonunique scan이면 gap/next-key lock이 걸릴 수 있으므로 실행 계획과 실제 lock을 확인한다.

### 4. Foreign Key 경로의 transaction 단축

Foreign Key 검사는 RC에서도 gap 계열 lock을 사용할 수 있다. lock 회피만을 이유로 무결성 제약을 제거하지 말고 parent/child 접근 순서와 transaction 길이를 먼저 줄인다.

## 트러블슈팅 단계

1. **데드락 로그 확인** — `SHOW ENGINE INNODB STATUS`의 LATEST DETECTED DEADLOCK 섹션
2. **대상 레코드 존재 여부 확인** — 없으면 Gap Lock 의심
3. **쿼리의 인덱스 사용 확인** — `EXPLAIN`으로 어느 인덱스, 범위를 타는지
4. **격리 수준 확인** — `SELECT @@transaction_isolation`
5. **재현 시도** — 테스트 환경에서 트랜잭션 두 개로 재현
6. **패턴 수정** — 쿼리 조건 좁히기 or 격리 수준 조정

## 흔한 오해

- **"Gap Lock은 모든 DBMS에서 같은 방식으로 동작"** — 아님. Gap/Next-Key Lock은 InnoDB의 용어와 구현이며, 다른 DBMS는 row lock, predicate lock, 직렬화 실패 같은 다른 방식으로 동시성을 제어한다
- **"Repeatable Read에서만 Gap Lock 있음"** — 주로 RR에서 많이 보이지만, RC에서도 Foreign Key나 duplicate key 검사에는 gap 계열 lock이 사용될 수 있음
- **"Read Committed로 바꾸면 Phantom Read만 포기하면 됨"** — 여러 다른 특성(Non-Repeatable Read)도 변함. 데이터 부정합 가능성 평가 필수
- **"Next-Key Lock = Gap Lock"** — 다름. Next-Key = Record + Gap
- **"Shared Gap Lock만 있다"** — MySQL 문서상 S/X 구분 있지만 실제로 모든 Gap Lock이 공유 모드처럼 동작
- **"Unique Index면 Gap Lock이 절대 없다"** — full unique key equality로 기존 record를 찾는 경우가 예외다. 없는 key, 부분 key와 range는 다름

## 면접 체크포인트

- **Gap Lock의 정의**와 주요 목적
- **Next-Key Lock = Record + Gap** 관계
- **INSERT Intention Gap Lock** 이 deadlock cycle에 참여하는 조건
- 빈 범위 UPDATE가 예상보다 **넓은 검색 gap**을 잠그는 조건
- 회피 전략 (격리 수준 검토, 쿼리와 인덱스 범위 축소, 낙관적 잠금)
- 격리 수준 변경 시 **Phantom Read, Non-Repeatable Read** 허용의 의미
- 데드락 분석 도구 (`performance_schema`, `SHOW ENGINE INNODB STATUS`)

## 출처
- [MySQL 8.4 Reference Manual — Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual — Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual — InnoDB Locking](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — The data_locks Table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html)
- [MySQL 8.4 Reference Manual — An InnoDB Deadlock Example](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-example.html)

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리의 한계, Strict Serializable]]
- [[Lock|DB Lock (row/gap/next-key, Pessimistic vs Optimistic)]]
- [[Lock-Deadlock|DB 데드락]]
- [[Transactions|트랜잭션 ACID]]
- [[Execution-Plan|실행 계획]]
- [[Index|Index]]
- [[MySQL-InnoDB-Locking-and-Deadlocks|MySQL 8.4 InnoDB Locking과 Deadlock]]
