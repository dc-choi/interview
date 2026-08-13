---
tags: [database, orm, mikroorm, transactions, concurrency, locking]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Transactions", "MikroORM Concurrency", "MikroORM Locking"]
---

# MikroORM 트랜잭션과 동시성

범위는 2026-08-13에 확인한 MikroORM stable `7.1.11`과 v7.1 공식 문서다. driver별 isolation과 lock SQL은 대상 DB에서 별도 검증한다.

## mental model

`flush()`는 pending change set을 DB transaction 안에서 반영한다. 그러나 여러 read, 조건 판정, raw SQL, lock과 write를 같은 atomic boundary로 묶어야 하면 `em.transactional()` 또는 명시적 `begin()/commit()/rollback()`이 필요하다.

```ts
await requestEm.transactional(async em => {
  const order = await em.findOneOrFail(Order, orderId, {
    lockMode: LockMode.PESSIMISTIC_WRITE,
  });

  if (order.status !== 'pending') throw new Error('invalid state');
  order.status = 'paid';
  // callback 끝에서 inner EM이 flush되고 commit된다.
});
```

transaction은 DB atomicity 경계다. HTTP request와 사용자 think time 전체를 transaction으로 잡지 않는다. 긴 편집 workflow의 lost update는 optimistic version 또는 conditional write로 별도 제어한다.

## 기본 API와 callback 규칙

| API | 적합한 경우 | 주의점 |
| --- | --- | --- |
| `em.transactional(async tx => ...)` | 일반적인 application transaction | callback의 `tx`를 모든 ORM, QueryBuilder, Kysely 작업에 사용한다. |
| `begin()`, `commit()`, `rollback()` | try/catch와 commit 시점을 세밀하게 제어 | 예외 경로에서 즉시 rollback하고 다시 throw한다. |
| `@Transactional()` | service method boundary를 annotation으로 선언 | propagation 기본값이 callback API와 다르다. |

```ts
const em = requestEm.fork();
await em.begin();

try {
  const account = await em.findOneOrFail(Account, accountId);
  account.balance -= amount;
  await em.commit(); // commit 전에 flush한다.
} catch (error) {
  await em.rollback();
  throw error;
}
```

`em.transactional()`과 decorator는 async context를 만들고 callback inner EM을 commit 전에 flush한다. DI container의 global EM을 context-aware하게 쓸 수 있어도, code review와 test에서는 callback parameter `tx`를 사용하는 편이 connection 경계가 분명하다.

## propagation 기본값은 API마다 다르다

v7.1.11 source와 현재 Transactions 문서 기준으로 다음이 현재 동작이다.

| 호출 방식 | 기본 propagation | 이미 transaction이 있을 때 |
| --- | --- | --- |
| `em.transactional()` | `NESTED` | savepoint를 만든다. |
| `@Transactional()` | `REQUIRED` | 기존 transaction에 join하고 savepoint를 만들지 않는다. |

```ts
await em.transactional(async outer => {
  await outer.transactional(async inner => {
    // 기본 NESTED, active transaction이면 savepoint
  });
});

class PaymentService {
  constructor(private readonly em: EntityManager) {}

  @Transactional() // 기본 REQUIRED
  async pay() {
    await this.reserve(); // 같은 transaction에 join
  }

  @Transactional()
  async reserve() {}
}
```

### 공식 문서의 상충 표현

v6→v7 업그레이드 문서에는 `@Transactional()`의 이전 기본값이 `REQUIRES_NEW`였고 `em.transactional()`도 `REQUIRES_NEW`를 계속 기본으로 둔다는 문장이 남아 있다. 이는 현재 Transactions 문서, v7.1.11 `TransactionManager` 소스의 `options.propagation ??= NESTED`, decorator 소스의 `??= REQUIRED`와 충돌한다.

이 문서에서는 현재 docs와 tag `v7.1.11` source를 우선해 `em.transactional() = NESTED`, `@Transactional() = REQUIRED`로 기록한다. upgrade 중에는 dependency lockfile의 실제 version과 아래 source tag를 함께 대조한다.

## propagation을 명시해야 하는 때

| 값 | 의미 | 사용 기준 |
| --- | --- | --- |
| `NESTED` | 기존 transaction이면 savepoint, 아니면 새 transaction | inner 실패를 outer와 분리해 처리할 때 |
| `REQUIRED` | 기존 transaction에 join, 없으면 새 transaction | 한 use case가 전부 성공하거나 실패해야 할 때 |
| `REQUIRES_NEW` | outer를 suspend하고 독립 transaction | audit처럼 outer rollback과 분리해야 하는 짧은 DB 작업만 |
| `SUPPORTS` | 있으면 join, 없으면 non-transactional | transactional consistency가 필수가 아닌 read |
| `MANDATORY` | 기존 transaction 없으면 error | 호출자가 transaction을 열어야 하는 domain write |
| `NOT_SUPPORTED` | existing transaction을 suspend하고 non-transactional | 긴 report처럼 lock을 잡지 말아야 할 때 |
| `NEVER` | transaction이 있으면 error | transaction 밖 실행이 명시 계약일 때 |

`REQUIRES_NEW`를 outbox 대체물이나 외부 API 호출 성공 보장으로 쓰지 않는다. outer transaction이 rollback되어도 inner write는 남을 수 있어 일관성 계약이 달라진다.

## context, fork와 병렬 실행

`transactional()` inner EM은 기본 `clear: false` fork라서 상위 context의 managed entity가 공유될 수 있고, callback 변경은 상위 context에도 전파된다. 병렬 request 또는 job transaction에는 fresh fork를 쓰거나 `{ clear: true }`를 준다.

```ts
await Promise.all(
  orderIds.map(id => requestEm.transactional(async tx => {
    const order = await tx.findOneOrFail(Order, id);
    order.status = 'checked';
  }, { clear: true })),
);
```

이것은 EntityManager state isolation을 위한 조건이다. DB row 경쟁 자체는 version, lock, unique constraint나 conditional update로 별도 제어한다.

## isolation과 lock 선택

지원 isolation level은 `READ_UNCOMMITTED`, `READ_COMMITTED`, `SNAPSHOT`, `REPEATABLE_READ`, `SERIALIZABLE`이며, 실제 지원과 효과는 driver와 DB engine마다 다르다.

```ts
await em.transactional(async tx => {
  // work
}, { isolationLevel: IsolationLevel.SERIALIZABLE });
```

### Optimistic lock

version property를 `integer` 또는 `datetime`으로 지정한다. high concurrency에서는 timestamp resolution 충돌 가능성이 없는 integer version을 우선 검토한다. flush의 version 비교가 실패하면 `OptimisticLockError`가 나고 transaction은 rollback된다.

```ts
const order = await em.findOneOrFail(Order, orderId, {
  lockMode: LockMode.OPTIMISTIC,
  lockVersion: clientVersion,
});

order.memo = input.memo;
await em.flush();
```

client가 읽었던 version을 update request에 돌려 보내야 한다. update 시점의 최신 version만 다시 읽어 비교하면 긴 user workflow의 lost update를 막지 못한다.

### Pessimistic lock

pessimistic lock에는 active transaction이 필수다. MikroORM은 transaction 없이 lock을 요청하면 error를 낸다. `PESSIMISTIC_READ`, `PESSIMISTIC_WRITE`, `SKIP LOCKED` 계열과 `NOWAIT` 계열의 실제 SQL은 PostgreSQL, MySQL 등 dialect에 따라 다르다.

```ts
await em.transactional(async tx => {
  const job = await tx.findOneOrFail(Job, jobId, {
    lockMode: LockMode.PESSIMISTIC_WRITE_OR_FAIL,
  });
  job.status = 'running';
});
```

lock은 transaction을 짧게 유지할 때만 유용하다. network call, large file processing, 사용자 입력 대기를 lock 보유 구간에 넣지 않는다. deadlock, timeout, nowait failure의 retry policy와 observability를 DB별로 설계한다.

## rollback 뒤 객체는 신뢰하지 않는다

flush에서 예외가 나면 implicit transaction은 rollback된다. explicit transaction에서는 catch 경로가 rollback을 수행해야 한다. rollback 뒤에는 이전 managed 또는 removed instance가 detached되고, 객체의 값은 rollback 시점에 남아 DB와 어긋날 수 있다.

복구는 새 fork 또는 새 request context에서 재조회하는 방식이 가장 안전하다. 같은 detached object를 그대로 `persist()`해 재시도하면 실패 전의 stale 값을 다시 쓰거나 relation graph를 잘못 반영할 수 있다.

## 검증 체크리스트

- [ ] transaction callback 안의 모든 DB 작업이 callback EM 또는 그 `getKysely()`를 쓰는가
- [ ] API별 기본 propagation 차이를 테스트했는가
- [ ] nested failure가 savepoint rollback인지 outer 전체 rollback인지 의도적으로 정했는가
- [ ] 병렬 transaction에는 fresh fork 또는 `clear: true`가 있는가
- [ ] version conflict, lock timeout, deadlock과 conditional update `affectedRows = 0`의 처리 경로가 있는가
- [ ] rollback 후 entity를 새 EM에서 재조회하는가

## 출처

- [Transactions and Concurrency](https://mikro-orm.io/docs/transactions)
- [v6에서 v7 업그레이드, propagation 상충 문장 포함](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [v7.1.11 TransactionManager source](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/packages/core/src/utils/TransactionManager.ts)
- [v7.1.11 ES Transactional source](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/packages/decorators/src/es/Transactional.ts)
- [MikroORM 7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
