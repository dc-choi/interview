---
tags: [database, rdbms, mysql, innodb, lock, gap-lock, deadlock, next-key-lock]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL Gap Lock", "Gap Lock", "Next-Key Lock", "INSERT Intention Gap Lock"]
---

# MySQL Gap Lock

MySQL InnoDB의 **존재하지 않는 레코드 공간(간격)을 잠그는** 메커니즘. Repeatable Read 격리 수준·Replication 일관성·Foreign Key 무결성을 지키기 위한 필수 도구이지만 **데드락의 주 원인**이기도 하다. 기본 격리 수준은 [[Isolation-Level]], 고급 논의는 [[Isolation-Level-Beyond-ANSI]] 참조.

## 핵심 명제

- **Gap Lock = 레코드 사이 간격에 거는 잠금**. 실제 row가 없는 공간도 잠글 수 있음
- 세 가지 목적: **Repeatable Read 보장·바이너리 로그(STATEMENT/MIXED) 일관성·Foreign Key**
- **Next-Key Lock = Record Lock + Gap Lock** — InnoDB의 기본 잠금 단위
- **INSERT Intention Gap Lock** 이 데드락의 흔한 원인
- 회피 전략: 격리 수준을 `READ COMMITTED`로 낮추거나 binlog를 `ROW`로 변경

## 잠금 종류와 관계

| 잠금 | 대상 | 특징 |
|---|---|---|
| **Record Lock** | 인덱스 레코드 | 가장 기본. 단일 row |
| **Gap Lock** | 레코드 사이 간격 (row 없음) | Shared/Exclusive 구분 없이 여러 트랜잭션이 동시 보유 가능 |
| **Next-Key Lock** | Record + 바로 앞 Gap | InnoDB Repeatable Read의 기본 |
| **INSERT Intention Gap Lock** | 간격에 INSERT하려는 의도 표시 | 다른 Gap Lock과 충돌 → 대기 |

### Unique Index 여부에 따른 차이

- **Primary Key / Unique Index + 단일 결과**: Record Lock만 (Gap Lock 없음)
- **Primary Key / Unique Index + 복수 결과 가능성**: Record + Gap (Next-Key)
- **Non-Unique Secondary Index**: 항상 Record + Gap

## Gap Lock이 필요한 이유

### 1. Repeatable Read 격리 보장

```sql
-- T1: 같은 SELECT를 두 번 실행, 결과가 달라지면 안 됨
BEGIN;
SELECT * FROM orders WHERE user_id = 7;   -- (행 2개)

-- T2가 user_id=7에 INSERT → Phantom Read 발생 가능
-- Gap Lock이 T1의 범위를 잠가 T2의 INSERT를 차단 → 방지

SELECT * FROM orders WHERE user_id = 7;   -- (행 2개로 동일)
COMMIT;
```

### 2. Replication 일관성 (STATEMENT/MIXED binlog)

Source와 Replica가 같은 SQL을 실행할 때 **실행 순서가 다르면 결과가 달라질 수 있음** → Gap Lock이 이 순서를 강제로 맞춰 일관성 유지.

`ROW` 포맷이면 실제 변경된 row만 전파되므로 Gap Lock의 이 역할은 필요 없어짐.

### 3. Foreign Key 무결성

참조 관계가 있는 row의 간격까지 잠가 FK 위반 가능성을 예방.

## 데드락 시나리오 — INSERT Intention Gap Lock

실무에서 가장 흔한 Gap Lock 데드락 패턴:

```sql
-- 초기 상태: tb_gaplock에 id=1, 3, 6만 존재

-- T1
BEGIN;
SELECT * FROM tb_gaplock WHERE id = 2 FOR UPDATE;
-- id=2는 없음 → id=1~3 간격에 Gap Lock 획득

-- T2
BEGIN;
SELECT * FROM tb_gaplock WHERE id = 2 FOR UPDATE;
-- 같은 간격에 Gap Lock 획득 (Gap Lock은 공유 가능)

-- T1
INSERT INTO tb_gaplock VALUES (2, 'a');
-- INSERT Intention Gap Lock 필요 → T2의 Gap Lock과 충돌 → 대기

-- T2
INSERT INTO tb_gaplock VALUES (2, 'b');
-- INSERT Intention Gap Lock 필요 → T1의 Gap Lock과 충돌 → 대기

-- → 데드락
```

**원인**: Gap Lock은 서로 호환되지만, INSERT Intention은 기존 Gap Lock과 호환 안 됨. 두 트랜잭션이 서로의 릴리즈를 영원히 기다림.

## 위험한 패턴 — 빈 범위의 대량 잠금

```sql
-- 테이블이 비어있거나 조회 범위에 row가 거의 없을 때
UPDATE tb_gaplock SET name = 'x' WHERE id BETWEEN 1 AND 10;
-- 전체 범위를 Gap Lock으로 잠금
-- 다른 트랜잭션의 INSERT가 모두 차단됨
```

비어있는 테이블에서 `WHERE`가 걸린 UPDATE가 **Pseudo Infimum → Pseudo Supremum**(전체 범위)을 잠글 수 있음. 서비스 전체가 대기로 들어가는 대형 장애 유형.

## 진단 명령

```sql
-- 현재 보유 중인 Gap Lock 확인
SELECT * FROM performance_schema.data_locks WHERE LOCK_MODE LIKE '%GAP%';

-- 최근 데드락 정보
SHOW ENGINE INNODB STATUS;

-- 현재 잠금 대기
SELECT * FROM performance_schema.data_lock_waits;
```

## 회피·완화 전략

### 1. 격리 수준 낮추기

```sql
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
```

- Read Committed에서는 Gap Lock이 거의 사용되지 않음
- 트레이드오프: Phantom Read 허용, Non-Repeatable Read 허용
- 대부분의 OLTP 워크로드에서 충분

### 2. binlog 포맷 변경

```sql
SET GLOBAL binlog_format = 'ROW';
```

- STATEMENT → ROW 전환으로 Gap Lock의 Replication 보장 역할 불필요
- 바이너리 로그 크기는 커짐 (변경 row 전체 기록)
- **안전한 선택** — 금융처럼 엄격한 일관성이 필요한 경우에도 무해

### 3. 쿼리 패턴 수정

- `WHERE` 조건을 **PK·Unique Index + 단일 결과** 로 좁히기 → Gap Lock 생략
- 범위 쿼리(`BETWEEN`·`<`·`>`)를 점(`=`)으로 변경 가능한지 검토
- 빈 범위에 대한 UPDATE/DELETE 지양

### 4. 낙관적 잠금

```sql
-- version 컬럼 활용
UPDATE orders SET status='paid', version=version+1
WHERE id=? AND version=?;
-- 영향받은 row가 0이면 재시도
```

Gap Lock 없이도 동시 수정 문제 해결 가능.

### 5. FK 의존도 최소화

Foreign Key 제약이 Gap Lock을 유발할 수 있음. 애플리케이션 레벨 참조 무결성으로 대체하는 패턴도 있음 (트레이드오프 큼, 신중 판단).

## 트러블슈팅 단계

1. **데드락 로그 확인** — `SHOW ENGINE INNODB STATUS`의 LATEST DETECTED DEADLOCK 섹션
2. **대상 레코드 존재 여부 확인** — 없으면 Gap Lock 의심
3. **쿼리의 인덱스 사용 확인** — `EXPLAIN`으로 어느 인덱스·범위를 타는지
4. **격리 수준 확인** — `SELECT @@transaction_isolation`
5. **binlog 포맷 확인** — `SELECT @@binlog_format`
6. **재현 시도** — 테스트 환경에서 트랜잭션 두 개로 재현
7. **패턴 수정** — 쿼리 조건 좁히기 or 격리 수준 조정

## 흔한 오해

- **"Gap Lock은 MySQL 전용"** — 맞음. PostgreSQL에는 없음 (MVCC 방식이 달라 불필요)
- **"Repeatable Read에서만 Gap Lock 있음"** — 맞음. RC에서는 거의 사용 안 됨
- **"Read Committed로 바꾸면 Phantom Read만 포기하면 됨"** — 여러 다른 특성(Non-Repeatable Read)도 변함. 데이터 부정합 가능성 평가 필수
- **"Next-Key Lock = Gap Lock"** — 다름. Next-Key = Record + Gap
- **"Shared Gap Lock만 있다"** — MySQL 문서상 S/X 구분 있지만 실제로 모든 Gap Lock이 공유 모드처럼 동작
- **"Unique Index면 Gap Lock이 절대 없다"** — 결과가 1건이면 없음. 여러 건 가능성이면 있음

## 면접 체크포인트

- **Gap Lock의 정의**와 3가지 목적
- **Next-Key Lock = Record + Gap** 관계
- **INSERT Intention Gap Lock** 이 일으키는 데드락 시나리오
- 빈 범위 UPDATE가 **전체 범위 잠금**을 유발하는 현상
- 회피 전략 4종 (격리 수준·binlog 포맷·쿼리 수정·낙관적 잠금)
- 격리 수준 변경 시 **Phantom Read·Non-Repeatable Read** 허용의 의미
- 데드락 분석 도구 (`performance_schema`·`SHOW ENGINE INNODB STATUS`)

## 출처
- [당근마켓 — MySQL Gap Lock 다시보기](https://medium.com/daangn/mysql-gap-lock-%EB%8B%A4%EC%8B%9C%EB%B3%B4%EA%B8%B0-7f47ea3f68bc)

## 관련 문서
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Isolation-Level-Beyond-ANSI|ANSI 격리의 한계·Strict Serializable]]
- [[Lock|DB Lock (row/gap/next-key, Pessimistic vs Optimistic)]]
- [[Transactions|트랜잭션 ACID]]
- [[Execution-Plan|실행 계획]]
- [[Index|Index]]
