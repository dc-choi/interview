---
tags: [database, orm, mikroorm, querying, filters, cursor, stream]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Querying", "MikroORM Filter", "MikroORM Cursor Pagination"]
---

# MikroORM 조회, Filter, Cursor와 Stream

범위는 2026-08-13에 확인한 MikroORM stable `7.1.11`과 v7.1 공식 문서다.

## 조회 API를 결과 목적에서 고르기

| 목적 | API | 반환과 실패 규칙 |
| --- | --- | --- |
| PK 또는 조건 하나 | `findOne()` | 없으면 `null`이다. |
| 없으면 use case 실패 | `findOneOrFail()` | not-found error를 즉시 경계로 올린다. |
| 목록 | `find()` | managed entity 배열이다. |
| 목록과 전체 수 | `findAndCount()` | offset pagination의 total count가 필요할 때 쓴다. |
| 안정적인 다음 페이지 | `findByCursor()` | 명시적 `orderBy`가 필수다. |
| 큰 결과를 점진 처리 | `stream()` | 반환 entity는 EM identity map에 등록되지 않는다. |

기본 조회 surface는 `EntityManager`다. Repository는 그 위의 얇은 extension point이므로, custom query 이름이 domain 언어를 더 명확하게 만들 때만 추가한다.

## 조건은 object DSL로 먼저 표현한다

```ts
const books = await em.find(Book, {
  $and: [
    { price: { $gte: 10_000, $lt: 30_000 } },
    { status: { $in: ['published', 'preorder'] } },
    { author: { name: { $like: 'Kim%' } } },
  ],
}, {
  fields: ['id', 'title', 'price'],
  orderBy: { createdAt: 'desc', id: 'desc' },
  limit: 20,
  offset: 0,
});
```

주요 비교 연산자는 `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$like`다. `$and`, `$or`, `$not`으로 논리를 묶고, relation collection에는 `$some`, `$none`, `$every`, `$size`를 쓴다.

```ts
const authorsWithUnreadBooks = await em.find(Author, {
  books: { $some: { status: 'unread' } },
});

const authorsWithoutBooks = await em.find(Author, {
  books: { $none: {} },
});
```

PostgreSQL 전용 연산자와 driver별 full-text, regexp 동작은 portable API처럼 가정하지 않는다. 대상 DB에서 생성 SQL, index와 execution plan을 확인한다.

## Projection과 relation loading의 분리

`fields`와 `exclude`는 필요한 column을 줄이고, `populate`는 함께 읽을 relation을 정한다. 로딩 전략은 query의 `strategy`, 전역 config의 `loadStrategy`, 경로별 `populateHints`로 정하며 property-level decorator 설정이 우선한다. 목록 API에서 모든 field와 relation을 자동으로 읽는 기본값을 만들지 않는다.

```ts
const orders = await em.find(Order, { customer: customerId }, {
  fields: ['id', 'status', 'total', 'createdAt'],
  populate: ['customer'],
  orderBy: { createdAt: 'desc', id: 'desc' },
  limit: 50,
});
```

이 문서는 filtering과 page boundary를 다룬다. relation loading strategy와 serialization shape는 별도 모델링 문서에서 다룬다. 여기서 확인할 것은 API contract가 실제 SELECT column, join 수와 반환 row 수를 제한하는지다.

## Filter는 application query policy다

Filter는 entity-level decorator, `EntityManager`의 global filter 또는 ORM config에 정의하고 query에서 enable/disable 및 parameter를 정한다. soft delete와 tenant 조건처럼 반복되는 query policy에 유용하다.

```ts
@Filter({
  name: 'tenant',
  cond: args => ({ tenantId: args.tenantId }),
})
export class Invoice {}

const invoices = await em.find(Invoice, { status: 'open' }, {
  filters: { tenant: { tenantId } },
});
```

Filter callback은 `args`, operation type (`read`, `update`, `delete`)과 현재 `EntityManager`를 받을 수 있다. 공식 문서 기준 filter는 `find*`, `count()`, `nativeUpdate()`, `nativeDelete()`에 적용된다. v6부터 relation에도 JOIN `ON` 조건으로 적용되므로, filter를 켜거나 끌 때 relation 결과와 outer join 결과가 어떻게 바뀌는지 테스트한다.

Filter는 DB Row Level Security가 아니다. raw SQL이나 독립 Kysely query까지 동일한 정책이 강제된다고 문서화되어 있지 않다. tenant 격리가 보안 경계라면 DB policy, connection context와 raw query review를 별도로 둔다.

## Offset과 cursor pagination

offset은 읽기 쉽지만 뒤쪽 page로 갈수록 DB가 더 많은 row를 건너뛸 수 있고, 데이터가 바뀌면 page가 흔들릴 수 있다. 시간순 feed처럼 연속 페이지가 중요한 API에는 cursor를 쓴다.

```ts
const page1 = await em.findByCursor(Order, {
  where: { status: 'paid' },
  first: 20,
  orderBy: { createdAt: 'desc', id: 'desc' },
});

const page2 = await em.findByCursor(Order, {
  where: { status: 'paid' },
  first: 20,
  after: page1.endCursor,
  orderBy: { createdAt: 'desc', id: 'desc' },
});
```

`findByCursor()`는 opaque cursor와 `items`, `totalCount`, `startCursor`, `endCursor`, `hasNextPage`, `hasPrevPage`를 제공한다. `first`와 `after`는 forward, `last`와 `before`는 backward 방향이다. `limit`과 `offset`을 함께 쓰지 않으며 `orderBy`는 반드시 명시한다.

정렬 key가 동률일 수 있으면 PK를 tie-breaker로 추가한다. cursor가 정렬 순서를 encode하므로, API 배포 뒤 `orderBy` semantics를 바꾸는 일은 pagination contract 변경으로 취급한다.

## Stream은 export와 batch 처리용이다

```ts
for await (const book of em.stream(Book, {
  where: { price: { $gt: 100 } },
  populate: ['author'],
  orderBy: { id: 'asc' },
})) {
  await writeCsvRow(book.id, book.author.name);
}
```

`stream()`은 큰 결과를 array 전체로 들고 있지 않기 위한 async iterable이다. 하지만 일반 `find()`와 같은 UoW contract는 아니다.

- 반환 entity는 identity map에 등록되지 않는다. 한 stream 결과 내부의 identity만 유지된다.
- populate relation은 JOINED strategy가 강제된다. to-many populate는 완전히 hydrate된 entity가 반환될 때까지 row를 합친다.
- 안정적인 처리 순서를 위해 `orderBy`를 명시한다.
- `mergeResults: false`로 row-by-row에 가깝게 받으면 to-many join 때문에 root entity가 중복될 수 있다.
- raw row stream은 `QueryBuilder.stream()` 또는 driver stream API를 검토한다.

따라서 stream entity를 수정하고 마지막에 같은 EM으로 flush하는 설계를 기본값으로 삼지 않는다. export, migration-like read batch, ETL처럼 read pipeline 목적일 때 사용하고, write가 필요하면 chunk별 새 EM과 transaction 경계를 설계한다.

## native 변경과 조회 cache의 경계

```ts
const affected = await em.nativeUpdate(
  Invoice,
  { dueAt: { $lt: now }, status: 'open' },
  { status: 'overdue' },
);

if (affected === 0) return;
em.clear(); // 이 EM에 load된 Invoice가 있었다면 stale 상태를 피한다.
```

`nativeUpdate()`와 `nativeDelete()`는 UoW를 거치지 않고 identity map에 side effect가 없다. query policy는 적용될 수 있지만, 기존 managed object, lifecycle hook, relation graph의 동기화는 별도 책임이다.

## 검증 체크리스트

- [ ] not-found를 `null`로 처리할지 `findOneOrFail()` error로 처리할지 use case마다 정했는가
- [ ] list query에 필요한 field, relation, order와 page limit만 넣었는가
- [ ] filter enable/disable에 따른 JOIN 결과와 tenant leak 여부를 integration test로 확인했는가
- [ ] cursor 정렬에 unique tie-breaker를 넣고 next/previous page를 테스트했는가
- [ ] stream의 unmanaged 반환값과 to-many join 중복 가능성을 알고 있는가

## 출처

- [EntityManager, fetching, streaming과 native update](https://mikro-orm.io/docs/entity-manager)
- [Query Conditions](https://mikro-orm.io/docs/query-conditions)
- [Filters](https://mikro-orm.io/docs/filters)
- [Cursor API](https://mikro-orm.io/api/core/class/Cursor)
- [EntityManager.findByCursor source, v7.1.11](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/packages/core/src/EntityManager.ts#L907-L932)
- [MikroORM 7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [Relationship Loading Strategies](https://mikro-orm.io/docs/loading-strategies)
