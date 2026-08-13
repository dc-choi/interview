---
tags: [database, orm, mikroorm, sql, query-builder, kysely, raw-sql]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM QueryBuilder", "MikroORM Kysely", "MikroORM Raw SQL"]
---

# MikroORM SQL QueryBuilder와 Kysely

범위는 2026-08-13에 확인한 MikroORM stable `7.1.11`과 v7.1 공식 문서다. SQL QueryBuilder는 SQL driver 문서 기준으로 설명한다.

## 선택 사다리

1. `find()` 계열로 조건, populate, projection을 표현할 수 있으면 그것을 쓴다.
2. 복잡한 join, CTE, aggregate, vendor SQL expression처럼 entity query만으로 shape를 설명하기 어렵다면 SQL `QueryBuilder`를 쓴다.
3. Kysely의 lower-level SQL surface가 필요한 경우 `em.getKysely()`를 쓴다.
4. 정말 직접 SQL을 실행해야 할 때만 `em.execute(sql, params)`를 쓴다.

## QueryBuilder와 Kysely 선택 기준

둘 사이에 엄격한 기능 장벽이 있는 것은 아니다. 같은 query를 양쪽으로 작성할 수 있다면 결과의 생명주기와 코드가 사용하는 언어를 기준으로 고른다.

| 상황 | 기본 선택 | 이유 |
| --- | --- | --- |
| 조건, 정렬, populate로 충분한 CRUD | `em.find*()` | 별도 builder가 불필요하다. |
| relation path를 따라 join하고 managed entity가 필요함 | QueryBuilder `getResult()` | metadata로 관계를 해석하고 결과를 Identity Map에 등록한다. |
| entity property 중심의 부분 조회와 plain DTO | QueryBuilder `execute()` | ORM naming과 relation alias를 유지하면서 hydration만 피한다. |
| table, column, view 중심의 report와 projection | Kysely | SQL 구조와 반환 row type이 코드에 직접 드러난다. |
| CTE, window function, union, vendor SQL이 Kysely에서 더 명확함 | Kysely | ORM relation graph로 억지로 표현하지 않는다. |
| 많은 row를 직접 갱신하고 UoW를 의도적으로 우회함 | QueryBuilder 또는 Kysely | affected row와 stale managed state를 직접 처리한다. |
| 조회 뒤 domain method, cascade, orphan removal과 flush가 필요함 | EntityManager 또는 QueryBuilder `getResult()` | plain row가 아닌 managed entity workflow다. |

QueryBuilder도 CTE와 aggregate를 지원하고 Kysely도 MikroORM plugin으로 entity/property 이름을 쓸 수 있다. 따라서 “복잡하면 무조건 Kysely”가 아니라, relation과 entity가 query의 중심이면 QueryBuilder, SQL row shape가 중심이면 Kysely가 기본이다.

### 쓰지 않는 순간

- 단순 `findOne()`을 builder로 다시 작성하지 않는다.
- managed entity를 수정할 workflow에서 Kysely row를 entity처럼 취급하지 않는다.
- cascade, collection propagation, 전체 lifecycle 처리를 기대하는 write를 QueryBuilder나 Kysely direct update로 우회하지 않는다.
- 같은 EM이 이미 읽은 row를 직접 갱신한 뒤 stale entity를 그대로 사용하지 않는다. 별도 EM으로 격리하거나 `refresh()` 또는 `clear()` 경계를 둔다.

SQL `QueryBuilder`는 SQL driver용이다. MongoDB driver에서 같은 API를 전제로 설계하지 않는다. driver-specific EntityManager type을 import해야 `createQueryBuilder()`를 쓸 수 있다.

```ts
import { EntityManager } from '@mikro-orm/postgresql';

const em: EntityManager = requestEm;
const qb = em.createQueryBuilder(Order, 'o');
```

## QueryBuilder의 두 결과 경계

`execute()`와 `getResult()`는 이름이 비슷하지만 반환 contract가 다르다.

| API | 반환 | Identity Map과 hydration |
| --- | --- | --- |
| `qb.execute('all' | 'get' | 'run')` | plain object, 또는 write result | entity instance를 반환하지 않는다. `mergeResults: true`는 `joinAndSelect`의 중복 row를 중첩된 plain graph로 합칠 뿐 identity map에 managed entity를 등록하지 않는다. |
| `qb.getResult()` 또는 `getSingleResult()` | managed entity 또는 배열 | metadata 기반 hydration을 거쳐 identity map에 추적되는 entity를 얻는다. |

```ts
const rows = await em.createQueryBuilder(Order, 'o')
  .select(['o.id', 'o.status'])
  .where({ status: 'paid' })
  .execute('all');

const orders = await em.createQueryBuilder(Order, 'o')
  .select('*')
  .where({ status: 'paid' })
  .getResult();
```

첫 결과는 read DTO 또는 report row에 맞고, 둘째는 이후 relation loading, 변경과 `flush()`가 필요한 workflow에 맞다. join 결과를 합치지 않은 SQL row 그대로 받아야 할 때만 `mergeResults: false`를 쓴다. raw row를 entity로 올리고 싶으면 `em.map(Entity, row)`를 사용한다. map은 column/property mapping 후 entity를 merge해 managed로 만든다.

## QueryBuilder 예시와 확인 지점

```ts
const result = await em.createQueryBuilder(Order, 'o')
  .select(['o.id', 'o.total', 'c.name as customer_name'])
  .leftJoin('o.customer', 'c')
  .where({ status: 'paid' })
  .orderBy({ 'o.createdAt': 'desc' })
  .limit(50)
  .execute('all', { mergeResults: false });
```

QueryBuilder가 parameter binding과 naming strategy mapping을 도울 수 있어도, query shape의 비용은 사라지지 않는다. code review에서는 다음을 확인한다.

- `getQuery()`와 `getParams()`로 실제 SQL과 bind 값의 자리를 확인한다.
- to-many join이 root row를 증식시키는지, pagination이 join 전인지 후인지 대상 DB에서 확인한다.
- write의 `affectedRows`, insert ID와 constraint error를 business success 조건에 연결한다.
- entity update가 아니라 raw write를 골랐다면 hook, identity map, cache invalidation의 책임을 명시한다.

## raw fragment와 native SQL

v6부터 raw SQL fragment는 `raw()` helper로 표현한다. static SQL expression을 object condition이나 update 값에 넣을 때 사용한다.

```ts
import { raw } from '@mikro-orm/postgresql';

await em.nativeUpdate(
  Product,
  { id: productId },
  { viewCount: raw('view_count + 1') },
);

const active = await em.find(User, {
  [raw('lower(email)')]: email.toLowerCase(),
});
```

`raw()` string에 request 값이나 identifier를 이어 붙이지 않는다. 값은 EntityManager 조건 object, QueryBuilder parameter, 또는 `em.execute()`의 parameter 배열로 전달한다.

```ts
const rows = await em.execute(
  'select id, status from "order" where customer_id = ?',
  [customerId],
);
```

`em.execute()`는 ORM logging, exception mapping, 현재 transaction context를 존중한다. 그러나 결과는 DB row이며 UoW hydration과 lifecycle을 대신하지 않는다.

## Kysely는 ORM transaction context를 물려받는다

v7에서는 Knex 대신 Kysely가 SQL 실행 계층이다. `em.getKysely()`는 configured Kysely instance를 주며, 기본 instance에는 MikroORM plugin이 붙지 않는다. entity/property naming, lifecycle hook 처리, value conversion이 필요하면 옵션을 명시한다.

```ts
const kysely = em.getKysely({
  tableNamingStrategy: 'entity',
  columnNamingStrategy: 'property',
  processOnCreateHooks: true,
  processOnUpdateHooks: true,
  convertValues: true,
});

const rows = await kysely
  .selectFrom('Order')
  .select(['id', 'status'])
  .where('status', '=', 'paid')
  .execute();
```

가장 중요한 경계는 connection이다. `em.transactional()` callback 내부에서 `em.getKysely()`를 부르면 active transaction에 bound되고 Kysely `.execute()`도 함께 rollback된다.

```ts
await em.transactional(async tx => {
  await tx.getKysely()
    .insertInto('audit_log')
    .values({ action: 'order-paid' })
    .execute();

  throw new Error('rollback both ORM and Kysely work');
});
```

반대로 transaction 안에서 `em.fork().getKysely()`를 호출하면 fork에는 transaction context가 없어서 pool connection을 사용한다. 의도적으로 독립 read 또는 out-of-transaction write를 하려는 경우 외에는 이것이 atomicity를 깨는 원인이 된다. transaction 안에서는 `type: 'read' | 'write'` 선택도 이미 pin된 connection보다 우선하지 않는다.

Kysely row를 managed entity로 이어야 한다면 명시적으로 map한다.

```ts
const rows = await em.getKysely().selectFrom('user').selectAll().execute();
const users = rows.map(row => em.map(User, row));
```

## v7 전환 주의점

v7의 Kysely 전환은 Knex API를 그냥 이름만 바꾸는 migration이 아니다. `getKnex()` 의존, Knex dialect plugin, raw fragment 전달 방식, transaction binding을 실제 query마다 검토한다. 이전 Knex query builder를 유지해야 하면 공식 호환 패키지의 범위와 제거 계획을 별도로 확인한다.

## 검증 체크리스트

- [ ] `execute()` raw DTO와 `getResult()` managed entity 중 하나를 의도적으로 골랐는가
- [ ] `joinAndSelect` 결과를 `mergeResults`로 plain graph에 합칠지 flat row로 둘지 정했는가
- [ ] 모든 dynamic value가 bind parameter 또는 ORM condition으로 전달되는가
- [ ] Kysely는 transaction callback의 `tx.getKysely()`에서 가져오는가
- [ ] Kysely query가 필요한 hook, naming, value conversion 옵션을 명시했는가
- [ ] target driver에서 SQL, query plan, row multiplication과 write result를 확인했는가

## 출처

- [Using Query Builder](https://mikro-orm.io/docs/query-builder)
- [Using raw SQL query fragments](https://mikro-orm.io/docs/raw-queries)
- [Using Kysely](https://mikro-orm.io/docs/kysely)
- [v6에서 v7 업그레이드, raw fragment와 Kysely 전환](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [MikroORM 7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
