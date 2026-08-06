---
tags: [database, rdbms, lock, concurrency]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["DB Lock", "Lock", "락"]
---

# DB Lock

동시에 같은 데이터에 접근하는 트랜잭션들의 정합성을 보장하기 위한 메커니즘.

## 동시성 제어가 없을 때: Lost Update

잔액이 100인 같은 행을 두 요청이 동시에 읽고 각각 50과 10을 더한다고 가정한다. 두 요청이 모두 최초 값 100을 기준으로 계산한 뒤 150, 110 순서로 저장하면 나중 쓰기가 먼저 쓴 값을 덮어 최종 잔액은 110이 된다. 정상 결과 160에서 한 요청의 변경이 사라지는 현상이 **Lost Update**다.

락 전략은 이 충돌을 언제 처리할지 결정한다. 비관적 잠금은 읽기 전에 충돌을 차단하고, 낙관적 잠금은 동시에 작업하도록 둔 뒤 쓰기 시점에 버전 충돌을 감지한다.

## Lock의 두 가지 전략

### Pessimistic Lock (비관적 잠금)
- 충돌이 발생할 가능성을 높게 보고 먼저 lock을 잡는 방식
- `SELECT ... FOR UPDATE` — 해당 행에 X Lock 획득, 트랜잭션 종료 시까지 보유
- 충돌 빈도가 높은 환경에 적합 (재고 차감, 좌석 예매, IoT 동시 데이터 수신)
- 옵션:
  - `NOWAIT` — lock 획득 실패 시 즉시 에러 (대기하지 않음)
  - `SKIP LOCKED` — 잠긴 행을 건너뛰고 다음 행 반환 (큐 패턴에 적합)

### Optimistic Lock (낙관적 잠금)
- 충돌이 드물다고 보고 lock 없이 진행한 뒤 쓰기 시점에 충돌 감지
- version 컬럼을 사용: `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?`
- 0 rows affected → 충돌 발생, 애플리케이션에서 재시도
- 읽기 중심, 충돌 빈도가 낮은 환경에 적합 (게시글 수정, 설정 변경, 프로필 업데이트)
- 물리적인 행 잠금을 미리 보유하지 않는다는 뜻이지 DB를 사용하지 않는다는 뜻은 아니다. 애플리케이션이 이전 version을 조건에 넣고, DB가 조건부 UPDATE를 원자적으로 실행한다.

### 선택 기준

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 | 높을 때 유리 |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 or 즉시 실패 후 재시도 |
| 동시성 | 높음 (lock 안 잡으므로) | 낮음 (lock 보유 기간 동안 차단) |
| 데드락 위험 | 낮음. 여러 행, 여러 자원을 함께 갱신하면 DB 데드락은 여전히 가능 | 있음 (순서 통일로 완화) |
| 구현 복잡도 | version 컬럼 + 재시도 로직 | SELECT FOR UPDATE |

### 잠금 읽기의 경계

`FOR SHARE`는 읽은 행에 S Lock을 걸어 다른 transaction의 변경을 막고, `FOR UPDATE`는 UPDATE와 같은 방식으로 검색 중 만난 index record에 X Lock을 건다. 둘 다 명시적 transaction 안에서 사용하며 commit 또는 rollback 때 해제한다.

- 부모 존재를 확인한 뒤 사용자 정의 자식 작업을 할 때 `FOR SHARE`를 쓸 수 있다. 표준 FK 무결성만 필요하다면 FK가 우선이다.
- `FOR SHARE`로 읽은 뒤 같은 행을 UPDATE하면 S에서 X로 올리는 과정에서 다른 transaction과 deadlock이 날 수 있다. 수정 가능성이 높으면 처음부터 `FOR UPDATE`를 검토한다.
- 바깥 SELECT의 `FOR UPDATE`는 nested subquery의 테이블까지 자동으로 잠그지 않는다. 그 행도 잠가야 하면 subquery에도 locking clause를 둔다.
- `NOWAIT`와 `SKIP LOCKED`는 대기 정책을 바꾸는 옵션이지 일관된 snapshot을 만드는 기능이 아니다. 특히 `SKIP LOCKED`는 queue 같은 패턴에 제한한다.
- `NOWAIT`와 `SKIP LOCKED`는 row-level lock에만 영향을 주며 metadata lock 같은 대기까지 없애지 않는다. Statement-based replication에는 안전하지 않으므로 binlog format도 확인한다.

## NestJS, TypeORM에서의 적용

TypeORM의 `pessimistic_write`는 MySQL에서 `FOR UPDATE`로 변환된다. 조회와 수정은 반드시 같은 트랜잭션과 커넥션에 있어야 하므로, NestJS 서비스에서도 전역 repository를 섞지 말고 transaction callback으로 받은 entity manager만 사용한다.

```typescript
await dataSource.transaction(async (manager) => {
  const stock = await manager
    .getRepository(Stock)
    .createQueryBuilder("stock")
    .setLock("pessimistic_write")
    .where("stock.id = :id", { id })
    .getOneOrFail()

  stock.decrease(amount)
  await manager.save(stock)
})
```

재고 차감처럼 한 문장으로 불변식을 표현할 수 있으면 락을 먼저 읽는 것보다 조건부 UPDATE가 단순하다. `quantity = quantity - :amount WHERE id = :id AND quantity >= :amount`를 실행하고 `affected === 1`인지 확인하면 읽기와 쓰기 사이의 틈이 사라진다.

`@VersionColumn`은 `save`와 `upsert` 때 버전을 증가시키는 특수 컬럼이다. 충돌 거부가 핵심이면 데코레이터만 보고 안심하지 말고 `WHERE id = :id AND version = :expectedVersion` 조건과 `affected` 결과로 CAS 경계를 명시한다. 실패 시 무제한 즉시 재시도하지 말고 횟수 제한과 backoff를 둔다.

## MySQL Named Lock

`GET_LOCK(name, timeout)`은 이름으로 획득하는 MySQL의 세션 범위 사용자 락이다. 내부적으로 MDL 하위 시스템을 사용하지만 특정 행이나 테이블을 자동으로 잠그는 락은 아니다. 같은 이름을 쓰는 참여자들이 모두 규약을 지킬 때만 상호 배제가 성립한다.

- 트랜잭션의 commit이나 rollback으로 해제되지 않는다. `RELEASE_LOCK()`을 호출하거나 세션이 끝나야 해제된다.
- 획득 대기와 보유 중에 커넥션 풀 한 칸을 계속 사용한다. lock name의 범위, timeout, 임계 구역을 작게 유지한다.
- TypeORM에서는 `QueryRunner`로 한 커넥션을 고정하고 같은 runner로 획득, 작업, 해제를 수행한다. `finally`에서 해제하고 마지막에 runner를 반환한다.
- 반환값 `1`, `0`, `NULL`은 각각 획득, timeout, 오류이므로 같은 실패로 뭉개지 않는다.

Named Lock은 임의의 업무 키를 잠글 수 있다는 장점이 있지만, 단일 행 갱신은 조건부 UPDATE나 `FOR UPDATE`가 더 직접적이다. Redis를 추가하지 않고 여러 앱 인스턴스가 같은 MySQL을 공유하는 경우에 선택지로 검토한다.

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

InnoDB의 row lock은 **인덱스 레코드**에 건다. 적절한 인덱스가 없으면 스캔한 클러스터 인덱스 레코드 다수에 lock을 걸 수 있어 사실상 테이블 전체가 막힌 것처럼 보인다.

| Lock | 설명 | 발생 상황 |
|------|------|----------|
| **Record Lock** | 인덱스 레코드 하나에 거는 lock | locking read, UPDATE, DELETE가 유니크 인덱스의 고유 조건으로 1행을 찾을 때 |
| **Gap Lock** | 인덱스 레코드 사이의 간격을 잠금 (INSERT 방지) | RR의 locking read, 범위 UPDATE/DELETE가 범위 또는 비고유 인덱스를 스캔할 때 |
| **Next-Key Lock** | Record Lock + Gap Lock 결합 | 같은 조건에서 스캔한 레코드와 그 앞 간격을 함께 잠가 phantom INSERT를 막을 때 |
| **Insert Intention Lock** | Gap Lock의 특수 형태. 같은 gap의 다른 위치 INSERT는 서로 차단하지 않음 | INSERT 시 자동 획득 |

여기서 조회는 `SELECT ... FOR UPDATE`나 `SELECT ... FOR SHARE` 같은 **locking read**를 뜻한다. RR과 RC의 일반 `SELECT`는 consistent nonlocking read로 스냅샷을 읽으며 Record, Gap, Next-Key Lock을 잡지 않는다. `SERIALIZABLE`에서는 `autocommit`이 꺼진 명시적 트랜잭션의 일반 SELECT가 `FOR SHARE`로 변환돼 공유 잠금을 잡을 수 있다. `autocommit`이 켜진 일반 SELECT는 문장 단위 nonlocking consistent read다.

### 기타 Locks

| Lock | 설명 |
|------|------|
| **Table Lock** | 테이블 전체 잠금. DDL(ALTER TABLE)이나 LOCK TABLES로 발생 |
| **Intention Lock** | 테이블에 거는 S/X 의향 표시 (IS, IX). Row lock 전에 자동 획득. 테이블 lock과의 호환성 확인용 |
| **Auto-Inc Lock** | AUTO_INCREMENT 값 생성 시 사용하는 특수 테이블 lock |

## MVCC와 Lock의 관계

- **Consistent Read (일반 SELECT)**: MVCC 스냅샷 읽기 → lock 없음, 다른 트랜잭션 차단 안 함
- **Current Read (SELECT FOR UPDATE/SHARE, UPDATE, DELETE)**: 최신 커밋 데이터를 읽으면서 lock 획득
- RR에서 일반 SELECT는 기본적으로 첫 consistent read 시점의 스냅샷을 유지하고, SELECT FOR UPDATE는 최신 상태를 읽으며 잠근다. `WITH CONSISTENT SNAPSHOT`이면 트랜잭션 시작 시점에 스냅샷을 만든다.
- **트랜잭션으로 묶었으니 안전하다는 오해**: Atomicity는 전부 반영하거나 전부 취소한다는 뜻일 뿐, plain SELECT와 이후 UPDATE 사이에 다른 트랜잭션이 끼어드는 것은 Isolation과 Lock의 문제다. RR에서는 재조회해도 같은 Read View의 스냅샷을 볼 수 있어 SELECT 기반 check-then-act 검증은 성립하지 않는다. 검증 조건을 UPDATE의 WHERE 안으로 옮기면 X Lock이 동일 행 변경을 직렬화하고, 대기하던 트랜잭션은 선행 트랜잭션 커밋 이후의 **현재 상태로 조건을 재평가**하므로 (affected rows 0 = 실패) 한도 초과 같은 불변식 위반을 막는다. 단 대상 행이 이미 존재한다는 전제에서다 — 행이 아직 없다면 동시 INSERT와 유니크 충돌의 영역이라 유니크 제약과 UPSERT 같은 별도 전략이 필요하다.
- **자기 변경은 즉시 보인다**: 같은 트랜잭션 안에서 자신이 변경한 데이터는 커밋 전에도 다음 SELECT에서 바로 보인다. Read View는 다른 트랜잭션 변경의 가시성을 결정하는 장치다 — COMMIT은 내 변경을 나에게 보이게 만드는 시점이 아니라 확정하는 시점이다.

## 데드락

### 발생 원인
- TX1: A행 lock → B행 lock 시도
- TX2: B행 lock → A행 lock 시도
- 상호 대기 → 데드락
- **같은 행에서도 난다 (S → X 업그레이드)**: 두 트랜잭션이 공유 가능한 S Lock을 함께 잡은 뒤 같은 행의 X Lock으로 올리려 할 때. 대표 경로는 `INSERT IGNORE`의 중복 키 확인과, 자식 INSERT의 FK 검증이 부모 인덱스 레코드에 잡는 S Lock — 부모 행이 발급마다 갱신되는 핫 카운터를 겸하면 뒤따르는 UPDATE의 X 요청과 충돌한다. 해법은 S를 거치지 않고 처음부터 X를 잡는 구조다: no-op ODKU로 UPDATE 경로를 태우거나, 부모 카운터 UPDATE를 자식 INSERT보다 앞으로 옮겨 X를 선점하거나, 실익 낮은 FK를 제거한다.

### 예방만으로 충분하지 않은 이유
- 이론적으로 Lock 순서를 통일하면 Circular Wait를 제거하여 데드락을 예방할 수 있음
- 하지만 실무에서는 Gap Lock, Next-Key Lock이 **개발자가 의도하지 않은 순서로 암묵적으로 획득**됨
- 쿼리 실행 계획에 따라 InnoDB가 잡는 lock 범위가 달라질 수 있어 완벽한 순서 통일은 현실적으로 불가능
- 따라서 **데드락은 발생할 수 있다는 전제** 하에 감지 + 복구를 설계하는 것이 핵심

### 감지 + 자동 복구 (InnoDB 기본 전략)
- **Wait-for Graph** 알고리즘으로 순환 대기를 자동 탐지
- 비용이 적은 트랜잭션(수정한 행 수가 적은 쪽)을 자동 rollback
- 앱에서 `ER_LOCK_DEADLOCK` 에러를 catch하고 **재시도**하는 것이 정석 대응. 재시도는 서버 안에서 데드락 예외만 좁게 잡아 제한 횟수와 짧은 랜덤 지연으로, 매 시도를 새 트랜잭션으로 수행한다 — 클라이언트의 무차별 재시도는 경합 중인 서버에 요청량과 동시성을 더하는 방향으로 작동할 수 있다. 재시도는 복구 전략이지 Lock 의존 관계를 바꾸는 구조 개선이 아니다
- `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션에서 확인
- `innodb_print_all_deadlocks=ON`으로 모든 데드락을 에러 로그에 기록

### 발생 확률 완화 전략
발생 확률을 줄이는 전략:
1. **Lock 순서 통일**: 일관된 순서(예: PK 오름차순)로 lock 획득 → Circular Wait 가능성 감소
2. **트랜잭션 범위 최소화**: lock 보유 시간을 줄여 교차 가능성 감소
3. **NOWAIT 사용**: lock 대기 자체를 하지 않으므로 상호 대기 상황 회피
4. **적절한 인덱스**: 인덱스 없으면 풀스캔 → 불필요한 행까지 lock → 경합 증가
5. **트랜잭션 안에서 외부 호출 금지**: API 호출, 파일 I/O 등은 트랜잭션 밖에서

## 출처
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 Reference Manual - Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual - Deadlocks in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html)
- [MySQL 8.4 Reference Manual - Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.4 Reference Manual - Locking Functions](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html)
- [TypeORM - Select using Query Builder, Set locking](https://typeorm.io/docs/query-builder/select-query-builder/)
- [TypeORM - Update using Query Builder](https://typeorm.io/docs/query-builder/update-query-builder/)
- [TypeORM - Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM - Entities, Special columns](https://typeorm.io/docs/entity/entities/)
- [재고시스템으로 알아보는 동시성이슈 해결방법, Pessimistic Lock 활용해보기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174914)
- [재고시스템으로 알아보는 동시성이슈 해결방법, Optimistic Lock 활용해보기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174917)
- [재고시스템으로 알아보는 동시성이슈 해결방법, Named Lock 활용해보기 - 인프런, 최상용](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174918)
- [인프런, Real MySQL 시즌 1 - Part 1, SELECT FOR UPDATE](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226567)
- [인프런, Real MySQL 시즌 1 - Part 2, SELECT FOR UPDATE NOWAIT와 SKIP LOCKED](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226578)
- [인프런, Real MySQL 시즌 1 - Part 2, 데드락](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226583)
- 김영한 강사, [DB 락, 개념 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110082)
- 김영한 강사, [DB 락, 변경](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110083)
- 김영한 강사, [DB 락, 조회](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110084)
- [Row Lock은 언제 걸리고 언제 풀릴까: 동시성 문제를 해결하며 파고든 MySQL MVCC와 Lock — velog](https://velog.io/@joona95/Row-Lock%EC%9D%80-%EC%96%B8%EC%A0%9C-%EA%B1%B8%EB%A6%AC%EA%B3%A0-%EC%96%B8%EC%A0%9C-%ED%92%80%EB%A6%B4%EA%B9%8C-%EB%8F%99%EC%8B%9C%EC%84%B1-%EB%AC%B8%EC%A0%9C%EB%A5%BC-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A9%B0-%ED%8C%8C%EA%B3%A0%EB%93%A0-MySQL-MVCC%EC%99%80-Lock)
- [DB Lock으로 동시성을 해결하려다 Deadlock을 만난 이야기 — velog](https://velog.io/@joona95/DB-Lock%EC%9C%BC%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-Deadlock%EC%9D%84-%EB%A7%8C%EB%82%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0)

## 관련 문서
- [[Transactions|트랜잭션]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Distributed-Lock|분산 락]]
- [[Transaction-Lock-Contention|트랜잭션 경합]]
- [[Index|인덱스]]
