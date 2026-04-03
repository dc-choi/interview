---
tags: [database, rdbms, lock, concurrency]
status: done
category: "Data & Storage - RDB"
aliases: ["DB Lock", "Lock", "락"]
---

# DB Lock

동시에 같은 데이터에 접근하는 트랜잭션들의 정합성을 보장하기 위한 메커니즘.

## Lock의 두 가지 전략

### Pessimistic Lock (비관적 잠금)
- **"충돌이 발생할 것"을 가정**하고 먼저 lock을 잡는 방식
- `SELECT ... FOR UPDATE` — 해당 행에 X Lock 획득, 트랜잭션 종료 시까지 보유
- 충돌 빈도가 높은 환경에 적합 (재고 차감, 좌석 예매, IoT 동시 데이터 수신)
- 옵션:
  - `NO WAIT` — lock 획득 실패 시 즉시 에러 (대기하지 않음)
  - `SKIP LOCKED` — 잠긴 행을 건너뛰고 다음 행 반환 (큐 패턴에 적합)

### Optimistic Lock (낙관적 잠금)
- **"충돌이 드물 것"을 가정**하고 lock 없이 진행, 커밋 시점에 충돌 감지
- version 컬럼을 사용: `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`
- 0 rows affected → 충돌 발생, 애플리케이션에서 재시도
- 읽기 중심, 충돌 빈도가 낮은 환경에 적합 (게시글 수정, 설정 변경, 프로필 업데이트)

### 선택 기준

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 | 높을 때 유리 |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 or 즉시 실패 후 재시도 |
| 동시성 | 높음 (lock 안 잡으므로) | 낮음 (lock 보유 기간 동안 차단) |
| 데드락 위험 | 없음 | 있음 (순서 통일로 예방) |
| 구현 복잡도 | version 컬럼 + 재시도 로직 | SELECT FOR UPDATE |

## InnoDB Lock 종류

### Row-level Locks

| Lock | 설명 |
|------|------|
| **Shared Lock (S)** | 읽기 잠금. 여러 트랜잭션이 동시에 S Lock 보유 가능. X Lock과는 호환 안 됨 |
| **Exclusive Lock (X)** | 쓰기 잠금. S Lock, X Lock 모두와 호환 안 됨 |

호환성 매트릭스:

|  | S | X |
|---|---|---|
| **S** | O | X |
| **X** | X | X |

### Index Record Locks

InnoDB의 row lock은 **인덱스 레코드**에 건다. 인덱스가 없으면 클러스터 인덱스(PK)의 모든 레코드에 lock → 사실상 테이블 lock.

| Lock | 설명 | 발생 상황 |
|------|------|----------|
| **Record Lock** | 인덱스 레코드 하나에 거는 lock | PK/유니크 인덱스로 정확히 1행 조회 |
| **Gap Lock** | 인덱스 레코드 사이의 "간격"을 잠금 (INSERT 방지) | RR에서 범위 조건 조회 시 |
| **Next-Key Lock** | Record Lock + Gap Lock 결합 | InnoDB RR의 기본 lock 단위. Phantom Read 방지 |
| **Insert Intention Lock** | Gap Lock의 특수 형태. 같은 gap의 다른 위치 INSERT는 서로 차단하지 않음 | INSERT 시 자동 획득 |

### 기타 Locks

| Lock | 설명 |
|------|------|
| **Table Lock** | 테이블 전체 잠금. DDL(ALTER TABLE)이나 LOCK TABLES로 발생 |
| **Intention Lock** | 테이블에 거는 S/X 의향 표시 (IS, IX). Row lock 전에 자동 획득. 테이블 lock과의 호환성 확인용 |
| **Auto-Inc Lock** | AUTO_INCREMENT 값 생성 시 사용하는 특수 테이블 lock |

## MVCC와 Lock의 관계

- **Consistent Read (일반 SELECT)**: MVCC 스냅샷 읽기 → lock 없음, 다른 트랜잭션 차단 안 함
- **Current Read (SELECT FOR UPDATE/SHARE, UPDATE, DELETE)**: 최신 커밋 데이터를 읽으면서 lock 획득
- RR에서 일반 SELECT는 트랜잭션 시작 시점 스냅샷 → SELECT FOR UPDATE는 최신 데이터 (이 차이가 면접에서 자주 출제)

## 데드락

### 발생 원인
- TX1: A행 lock → B행 lock 시도
- TX2: B행 lock → A행 lock 시도
- 상호 대기 → 데드락

### 왜 완전한 예방은 불가능한가
- 이론적으로 Lock 순서를 통일하면 Circular Wait를 제거하여 데드락을 예방할 수 있음
- 하지만 실무에서는 Gap Lock, Next-Key Lock이 **개발자가 의도하지 않은 순서로 암묵적으로 획득**됨
- 쿼리 실행 계획에 따라 InnoDB가 잡는 lock 범위가 달라질 수 있어 완벽한 순서 통일은 현실적으로 불가능
- 따라서 **데드락은 발생할 수 있다는 전제** 하에 감지 + 복구를 설계하는 것이 핵심

### 감지 + 자동 복구 (InnoDB 기본 전략)
- **Wait-for Graph** 알고리즘으로 순환 대기를 자동 탐지
- 비용이 적은 트랜잭션(수정한 행 수가 적은 쪽)을 자동 rollback
- 앱에서 `ER_LOCK_DEADLOCK` 에러를 catch하고 **재시도**하는 것이 정석 대응
- `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션에서 확인
- `innodb_print_all_deadlocks=ON`으로 모든 데드락을 에러 로그에 기록

### 발생 확률 완화 전략
완전한 예방은 불가능하지만, 발생 확률을 줄이는 전략:
1. **Lock 순서 통일**: 항상 동일한 순서(예: PK 오름차순)로 lock 획득 → Circular Wait 가능성 감소
2. **트랜잭션 범위 최소화**: lock 보유 시간을 줄여 교차 가능성 감소
3. **NO WAIT 사용**: lock 대기 자체를 하지 않으므로 상호 대기 상황 회피
4. **적절한 인덱스**: 인덱스 없으면 풀스캔 → 불필요한 행까지 lock → 경합 증가
5. **트랜잭션 안에서 외부 호출 금지**: API 호출, 파일 I/O 등은 트랜잭션 밖에서

## 관련 문서
- [[Transactions|트랜잭션]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Distributed-Lock|분산 락]]
- [[Transaction-Lock-Contention|트랜잭션 경합]]
- [[Index|인덱스]]
