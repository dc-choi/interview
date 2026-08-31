---
tags: [database, orm, typeorm, transaction, replication]
status: done
verified_at: 2026-08-31
category: "Database - ORM"
aliases: ["TypeORM Transactions", "TypeORM Replication", "TypeORM 트랜잭션과 복제"]
---

# TypeORM 트랜잭션과 복제 라우팅

TypeORM의 transaction과 replication은 저장소 메서드에 옵션 하나를 붙이는 기능이 아니다. 어느 `EntityManager`가 어느 connection을 쓰는지, 읽기가 최신이어야 하는지, DB가 어떤 isolation과 DDL 규칙을 갖는지를 함께 계약하는 일이다.

## TypeORM 1.1.0 기준과 이행 주의

- 이 문서의 학습 기준은 TypeORM `1.1.0`이다. 2026-08-31에 공식 `1.1.0` tag의 `package.json`과 문서를 대조했다.
- 예시는 1.1.0의 `DataSource`, `EntityManager`, `QueryRunner` API를 사용한다. DB engine과 driver가 지원하는 범위는 integration test로 확인한다.
- 0.3.x에서 올릴 때는 Node.js `^20.19.0 || ^22.13.0 || >=24.11.0`과 ES2023 요구, 제거된 legacy API, glob과 DB driver 차이를 공식 upgrade guide로 점검한다.

## callback transaction: 전달받은 manager가 경계다

```ts
await dataSource.transaction("READ COMMITTED", async (manager) => {
  const orderRepository = manager.getRepository(Order)
  const auditRepository = manager.getRepository(AuditLog)

  await orderRepository.save(order)
  await auditRepository.insert(auditLog)
})
```

- callback이 정상 완료되면 TypeORM이 commit하고, callback이 throw 또는 reject하면 rollback 경로로 간다.
- transaction 안의 모든 DB 작업은 callback parameter인 `manager` 또는 여기서 얻은 repository로 수행한다.
- `dataSource.manager`, 평소 주입받은 repository, 그것에서 만든 QueryBuilder를 섞으면 같은 transaction connection이라는 보장이 사라진다.
- custom repository는 전역 instance 대신 `manager.withRepository(CustomRepository)`로 transaction scope instance를 얻는다.
- callback 안에서 시작한 Promise는 모두 `await`한다. callback이 먼저 끝나면 늦게 실행한 query는 transaction 밖으로 새어 나갈 수 있다.
- service가 transaction 안팎에서 모두 쓰이면 전역 repository를 몰래 참조하지 말고 필요한 `EntityManager`를 인자로 받거나 transaction 전용 함수를 분리한다.

`transaction()`은 하나의 `DataSource` 안에서 local transaction을 만드는 편의 API다. 여러 저장소 호출을 감쌌다는 사실만으로 read-modify-write 경쟁, 외부 API 성공이나 다른 DB의 변경까지 원자화하지는 않는다.

## QueryRunner: connection을 직접 소유할 때

`QueryRunner`는 pool에서 하나의 connection을 빌리고 자체 `manager`를 제공한다. lock 유지, 명시적 replica 목적지, migration 같은 경우에 사용한다.

```ts
const runner = dataSource.createQueryRunner("master")
let failure: unknown
let failed = false

try {
  await runner.connect()
  await runner.startTransaction("READ COMMITTED")

  const orderRepository = runner.manager.getRepository(Order)
  await orderRepository.save(order)

  await runner.commitTransaction()
} catch (error) {
  failed = true
  failure = error
  try {
    if (runner.isTransactionActive) await runner.rollbackTransaction()
  } catch (rollbackError) {
    failure = new AggregateError(
      [error, rollbackError],
      "Transaction and rollback failed",
    )
  }
  throw failure
} finally {
  try {
    await runner.release()
  } catch (releaseError) {
    if (failed) {
      throw new AggregateError(
        [failure, releaseError],
        "Transaction and cleanup failed",
      )
    }
    throw releaseError
  }
}
```

- lifecycle은 create, connect, start, 같은 `runner.manager`로 query, commit 또는 rollback, `finally` release 순서다.
- `release()`를 빼면 pool connection이 계속 checkout되어 결국 요청이 대기한다. release 뒤 runner는 재사용하지 않는다.
- rollback이나 release 실패가 원래 오류를 가리지 않도록 오류 계약에 둘 다 남긴다. 위 예시는 `AggregateError`로 묶으므로 caller의 분류와 로깅도 내부 `errors`를 확인해야 한다.
- `commitTransaction()`의 reject만으로 rollback됐다고 판단하지 않는다. 연결이 끊겨 결과를 모를 수도 있고, DB commit 뒤 `afterTransactionCommit` subscriber가 throw했을 수도 있다. caller는 business key나 idempotency로 결과를 조회하고 비멱등 작업을 그대로 재시도하지 않는다.
- `runner.manager`와 `dataSource.manager`는 교환할 수 없다. 전자는 runner connection에 묶이고 후자는 전역 manager다.
- transaction에서 `master` runner를 명시하면 locking read와 write, 그 뒤 최신 read가 하나의 writer connection에 고정된다.

## isolation은 DB와 driver의 계약이다

`dataSource.transaction("SERIALIZABLE", callback)` 또는 `runner.startTransaction("SERIALIZABLE")`처럼 지정할 수 있지만, TypeORM은 지원하지 않는 level을 요청하면 error를 낸다. 이름이 같아도 anomaly, MVCC, lock 범위와 default는 DB engine과 설정에 따라 다르다.

| DB 또는 driver | TypeORM 1.1.0 공식 문서에서 명시한 범위 |
| --- | --- |
| MySQL, MariaDB, PostgreSQL, `aurora-postgres` | `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE` |
| MS SQL Server | 위 네 단계와 `SNAPSHOT` |
| CockroachDB | `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`, 앞의 두 단계는 cluster setting에 따라 더 강한 단계로 실행될 수 있음 |
| Google Spanner | `REPEATABLE READ` preview, `SERIALIZABLE` |
| Oracle | `READ COMMITTED`, `SERIALIZABLE` |
| SAP HANA | `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE` |
| SQLite | 기본은 `SERIALIZABLE`, `READ UNCOMMITTED`는 shared-cache mode에서만 효과 |
| `aurora-mysql` | RDS Data API transport 때문에 per-transaction isolation level 미지원 |

- `DataSourceOptions.isolationLevel`을 설정하면 explicit level이 없는 transaction의 기본값이 된다. callback 또는 `QueryRunner`의 explicit level이 이를 override한다.
- isolation을 높여도 business invariant가 자동으로 생기지 않는다. 조건부 `UPDATE`, unique constraint, version CAS 또는 pessimistic lock 중 충돌 모델에 맞는 제어를 선택한다.
- engine별 현상은 [[Isolation-Level|트랜잭션 격리 수준]], InnoDB lock 세부는 [[Lock|DB Lock]]과 [[MySQL-InnoDB-Locking-and-Deadlocks|MySQL InnoDB Locking과 Deadlock]], 데드락 대응은 [[Lock-Deadlock|DB 데드락]]에서 확인한다.

## lock, deadlock과 retry 경계

- 선행 조회 뒤 수정하는 경합 경로는 같은 transaction manager의 QueryBuilder에 lock을 걸거나, 가능하면 조건을 `UPDATE ... WHERE` 안에 넣고 affected row를 확인한다.
- deadlock victim이나 serialization failure를 재시도할 때는 실패한 manager를 이어 쓰지 말고 전체 unit of work를 새 transaction으로 시작한다.
- retry는 DB error code를 좁게 분류하고, 제한 횟수, 짧은 backoff, idempotency key를 둔다. timeout, validation error, 외부 결제 실패를 같은 방식으로 재시도하지 않는다.
- MySQL은 deadlock을 감지해 한 transaction을 rollback하므로 애플리케이션이 retry할 수 있어야 한다. lock 순서 통일과 적절한 index는 발생 확률을 낮추지만 retry 경계를 대체하지 않는다.

## 긴 transaction, 외부 I/O와 subscriber

- 현재 DB 상태에 의존하지 않는 입력 검증과 외부 API 응답 대기는 가능한 transaction 밖에서 끝낸다. transaction 안에는 필요한 DB read, write와 invariant 확인만 둔다.
- commit 전에 메시지 발행이나 결제를 하면 DB rollback 뒤 외부 효과가 남고, commit 뒤 직접 발행만 하면 process failure 때 누락될 수 있다. 그런 write path는 [[Transactional-Outbox|Transactional Outbox]]로 분리한다.
- subscriber는 DataSource의 `subscribers` option으로 로드한다. event 안 DB 작업은 반드시 event의 `manager` 또는 `queryRunner`를 사용한다.
- `afterTransactionCommit`은 이미 DB commit을 되돌릴 수 없는 시점이다. 여기서 throw해도 DB 변경은 취소되지 않으므로 외부 전달 실패를 transaction rollback처럼 노출하지 않는다. 전달, 중복 제거와 재시도는 outbox consumer의 책임으로 둔다.

## 여러 DataSource는 하나의 transaction이 아니다

QueryRunner 하나는 connection 하나만 다룬다. 따라서 서로 다른 `DataSource`의 transaction을 각각 열어도 TypeORM이 둘을 atomic하게 commit 또는 rollback하지 않는다.

- 같은 DB라도 connection 경계가 다르면 local atomicity를 가정하지 않는다.
- 다른 DB, cache, message broker까지 한 use case에 포함되면 DB 고유 XA 같은 별도 coordinator를 명시적으로 채택하지 않는 한 saga, outbox, 보상과 idempotency를 설계한다.
- repository를 어느 DataSource에서 얻는지 dependency injection token과 integration test로 확인한다.

## replication routing과 read-after-write

`replication`에 slave를 설정하면 TypeORM 1.1.0 공식 문서 기준 `find*`와 `SelectQueryBuilder` read는 random slave, write와 schema update는 master, `.query()` raw query는 master로 라우팅한다. replica lag 때문에 이 기본값만으로 Read-Your-Own-Writes는 만족하지 않는다.

```ts
const masterRunner = dataSource.createQueryRunner("master")

try {
  const freshOrder = await masterRunner.manager.findOneByOrFail(Order, { id })
  return freshOrder
} finally {
  await masterRunner.release()
}
```

- write 직후 확인, 권한 변경, 결제 상태와 locking read는 master runner 또는 동일 write transaction에서 읽는다.
- stale read가 허용된 feed, 집계, 검색만 slave runner로 명시한다. replica freshness SLO와 장애 fallback은 TypeORM routing option 밖의 운영 계약이다.
- 처음 replication을 추가하면 기존 read runner가 slave로 갈 수 있다. 안전한 점진 전환은 `replication.defaultMode: "master"`로 시작하고 검증한 read만 `createQueryRunner("slave")`로 opt-in하는 방식이다.
- raw SQL의 `SELECT`도 기본적으로 master다. slave에서 raw query가 꼭 필요하면 `createQueryRunner("slave")`로 명시하고 release한다.
- primary, replica 각각의 pool 크기 합, query destination, replica lag, read-after-write error를 관측한다. DB 일반 원리는 [[Read-Replica-Routing|Read Replica 라우팅]]과 [[Replication|MySQL Replication]]을 참고한다.

## 구현 전 테스트 체크리스트

- [ ] 실제 DB engine과 driver에서 callback commit, throw rollback, QueryRunner release를 확인했다.
- [ ] transaction 안에 전역 manager 또는 주입 repository가 섞이지 않는 대표 경로를 test했다.
- [ ] lock conflict, deadlock 또는 serialization failure의 제한된 retry와 idempotency를 확인했다.
- [ ] write 직후 master read와 stale 허용 slave read를 분리해 test했다.
- [ ] replica 추가 전후 `defaultMode`, raw query, pool 사용량과 lag dashboard를 비교했다.
- [ ] TypeORM 1.1.0과 실제 DB driver 조합에서 같은 transaction, isolation, replication contract를 검증했다.

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[Transactions|트랜잭션]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[Lock|DB Lock]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[Transactional-Outbox|Transactional Outbox]]

## 출처

- [TypeORM 공식 저장소, 1.1.0 package version](https://github.com/typeorm/typeorm/blob/1.1.0/package.json)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM, QueryRunner](https://typeorm.io/docs/query-runner/)
- [TypeORM, Custom repositories](https://typeorm.io/docs/working-with-entity-manager/custom-repository/)
- [TypeORM, Multiple Data Sources and Replication](https://typeorm.io/docs/data-source/multiple-data-sources/)
- [TypeORM, Listeners and Subscribers](https://typeorm.io/docs/listeners-and-subscribers/)
- [TypeORM, Upgrading from 0.3 to 1.0](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [MySQL 8.4 Reference Manual, Deadlocks in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html)
