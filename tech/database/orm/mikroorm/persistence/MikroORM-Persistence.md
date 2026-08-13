---
tags: [database, orm, mikroorm, persistence, unit-of-work]
status: index
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 영속성", "MikroORM Persistence", "MikroORM 저장과 조회"]
---

# MikroORM 영속성 지도

범위는 2026-08-13에 확인한 MikroORM stable `7.1.11`과 v7.1 공식 문서다. driver별 SQL, lock과 execution plan은 이 공통 API 문서만으로 확정하지 않는다.

MikroORM의 영속성 API는 `EntityManager` 하나에서 시작하지만, 실제로는 네 층이 함께 움직인다.

```text
요청 또는 job 전용 EntityManager
  → Identity Map과 Unit of Work
  → flush 또는 transaction 경계
  → driver와 DB connection
```

핵심은 객체 변경을 곧바로 SQL 한 문으로 생각하지 않는 것이다. 같은 `EntityManager` 안에서 엔티티를 읽거나 생성하면 Unit of Work가 상태와 원본 snapshot을 관리하고, `flush()`가 필요한 SQL을 계산해 DB에 반영한다. 반대로 bulk SQL, QueryBuilder와 Kysely는 이 관리 경계를 일부 또는 전부 벗어난다.

## 먼저 정할 것

| 의도 | 기본 선택 | 이유와 경계 |
| --- | --- | --- |
| 한 엔티티를 읽고 수정 | `findOne()` 또는 `findOneOrFail()` → 속성 변경 → `flush()` | managed entity의 변경을 Unit of Work가 계산한다. |
| 새 aggregate를 만들기 | `em.create()` → `flush()` | v7의 `em.create()`는 기본적으로 persist 예약까지 한다. |
| 목록과 관계 조건 조회 | `find()`, `findAndCount()`, `findByCursor()` | metadata, filter, populate와 타입 정보를 유지한다. |
| 대량 즉시 변경 | `nativeUpdate()` 또는 `nativeDelete()` | Unit of Work와 identity map 부작용이 없으므로 기존 객체를 갱신하거나 비운다. |
| 복잡한 SQL shape | SQL `QueryBuilder` 또는 Kysely | 반환값이 raw row인지 managed entity인지 명시적으로 고른다. |
| 여러 읽기와 쓰기를 하나로 묶기 | `em.transactional(async em => ...)` | callback의 `em`과 그 transaction context를 끝까지 사용한다. |

## 읽는 순서

1. [[MikroORM-Unit-of-Work|Unit of Work와 Identity Map]]에서 객체가 managed가 되는 시점과 `flush()`를 이해한다.
2. [[MikroORM-Querying|조회, filter, cursor와 stream]]에서 읽기 API와 결과 shape를 고른다.
3. [[MikroORM-SQL-QueryBuilder-Kysely|SQL QueryBuilder와 Kysely]]에서 ORM 경계 밖으로 내려가는 조건을 정한다.
4. [[MikroORM-Transactions-Concurrency|트랜잭션과 동시성]]에서 commit, propagation, lock과 rollback 뒤 상태를 다룬다.

## 요청 하나의 실행 흐름

```ts
await requestEm.transactional(async em => {
  const order = await em.findOneOrFail(Order, orderId);
  const stock = await em.findOneOrFail(Stock, { sku });

  order.status = 'paid';             // 아직 DB SQL이 아니다
  if (stock.quantity < 1) throw new Error('out of stock');
  stock.quantity -= 1;

  // callback 종료 전 transactional()이 inner EM을 flush하고 commit한다.
});
```

위 예시는 API 경계를 보여 줄 뿐이다. 재고 차감의 성공 여부는 영향을 받은 row 수, 적절한 constraint와 transaction isolation을 함께 검증해야 한다. 단순히 transaction으로 감쌌다고 경쟁 요청의 business rule이 자동으로 보장되지는 않는다.

## 이 문서군의 공통 규칙

- `EntityManager`는 stateful하다. HTTP 요청, queue consumer, cron 실행마다 context 또는 fork를 분리한다.
- managed entity를 수정한 뒤에는 `flush()` 시점을 코드에서 보이게 한다. 읽기 직전 자동 flush에 의존하지 않는다.
- raw SQL과 `nativeUpdate()` 뒤에는 이미 메모리에 있던 entity가 낡았을 수 있다. 필요한 경우 `refresh()`, `clear()` 또는 새 fork를 선택한다.
- DB 방언마다 lock SQL, isolation 지원, cursor 실행 계획이 다르다. production 판단은 대상 driver와 실제 DB에서 query log, affected row, 실행 계획으로 확인한다.

## 검증 체크리스트

- [ ] 요청 또는 job마다 독립된 EntityManager context가 있는가
- [ ] 새 entity, managed 변경, 즉시 bulk 변경을 구분했는가
- [ ] `flush()` 또는 `transactional()`의 commit 지점을 테스트에서 관찰했는가
- [ ] raw 결과를 DTO로 쓸지, `em.map()` 또는 `getResult()`로 managed entity가 필요한지 정했는가
- [ ] concurrency-sensitive write에 version, conditional update 또는 pessimistic lock의 이유가 있는가

## 출처

- [MikroORM 7.1.11 stable versions](https://mikro-orm.io/versions)
- [MikroORM 7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [EntityManager](https://mikro-orm.io/docs/entity-manager)
- [Unit of Work](https://mikro-orm.io/docs/unit-of-work)
- [Transactions and Concurrency](https://mikro-orm.io/docs/transactions)
