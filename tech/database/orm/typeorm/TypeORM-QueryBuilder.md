---
tags: [database, orm, typeorm, query-builder, sql]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM QueryBuilder", "TypeORM 쿼리 빌더"]
---

# TypeORM QueryBuilder

`QueryBuilder`는 join, projection, aggregate, subquery, lock처럼 `FindOptions`를 넘는 SQL shape를 조립한다. SQL의 결과 grain과 실행 계획은 [[SQL]], [[SQL-Query-Composition]], [[Execution-Plan]]을 먼저 따른다.
## 버전 기준과 선택 경계

| 구분 | 기준 |
|---|---|
| 학습 기준 | TypeORM `1.1.0`, 2026-08-13 확인 |
| 이전 코드 이행 | 0.3.x는 migration 시에만 별도 검증 |
| 기본 선택 | 단순 entity 조회는 Repository `FindOptions`, 복잡한 query shape는 QueryBuilder |
1.1.0에서 high-level `FindOptions`의 `null`/`undefined` 기본값은 예외다. QueryBuilder의 직접 `.where()`는 그 보호를 받지 않는다. 0.3.x에서 올릴 때에는 null 처리와 빈 mutation criteria test를 추가한다.
## 다섯 QueryBuilder와 생성 위치

| Builder | 주된 실행 메서드 | 사용할 때 |
|---|---|---|
| `SelectQueryBuilder` | `getOne`, `getMany`, `getRawOne`, `getRawMany` | entity 조회, projection, join, aggregate |
| `InsertQueryBuilder` | `execute` | 직접 INSERT와 대량 insert |
| `UpdateQueryBuilder` | `execute` | 조건부 UPDATE, expression update |
| `DeleteQueryBuilder` | `execute` | DELETE, soft delete, restore |
| `RelationQueryBuilder` | `add`, `remove`, `set`, `loadOne`, `loadMany` | relation row만 직접 변경 또는 조회 |
Builder는 `DataSource`, `EntityManager`, `Repository`에서 만들 수 있다. transaction 안에서는 callback manager 또는 QueryRunner manager에서 시작해 같은 connection을 유지한다. `.insert()`, `.update()`, `.delete()`, `.relation()` 전환은 새 Builder instance를 돌려준다.
```typescript
const order = await dataSource
  .getRepository(Order)
  .createQueryBuilder("order")
  .where("order.id = :orderId", { orderId })
  .getOne()
```
## Alias, property path, 물리 column name

`createQueryBuilder("order")`의 `order`는 SQL alias다. Entity를 가리키는 일반 식은 `order.productionYear`처럼 alias와 Entity property path로 표준화한다.
```typescript
@Entity("orders")
class Order {
  @Column({ name: "ProductionYear" })
  productionYear: number
}
const row = await orders
  .createQueryBuilder("order")
  .where("order.productionYear = :year", { year: 2026 })
  .getOne()
```
`FindOptions` object key도 `productionYear`다. 1.0부터 `addOrderBy()`는 `ProductionYear` 같은 물리 DB column 이름도 metadata에서 해석하지만, 문자열 표현은 compile-time 검증 대상이 아니므로 Entity query에서는 property path로 통일한다. 반면 `COUNT(*)`, CTE output alias, SQL function과 raw table join 조건은 DB SQL scope의 이름을 쓴다. 외부 정렬 키는 `createdAt -> order.createdAt` 같은 allowlist로 매핑한다. table, column과 direction은 parameter binding할 수 없다.
## Parameter binding과 조건 묶기

값은 named parameter로 넘긴다. 같은 Builder에서 다른 값에 같은 parameter name을 재사용하면 뒤 값이 앞 값을 덮는다.
```typescript
const rows = await orders
  .createQueryBuilder("order")
  .where("order.tenantId = :tenantId", { tenantId })
  .andWhere("order.id IN (:...orderIds)", { orderIds })
  .andWhere(
    new Brackets((qb) =>
      qb.where("order.status = :pending", { pending: "PENDING" })
        .orWhere("order.status = :retry", { retry: "RETRY" }),
    ),
  )
  .getMany()
```
`.where()`를 다시 호출하면 앞 조건을 교체한다. 이후에는 `.andWhere()` 또는 `.orWhere()`를 쓰고, 복합 OR는 `Brackets`, 그룹 부정은 `NotBrackets`로 precedence를 명시한다. 사용자 값을 SQL fragment에 이어 붙이지 않는다.
`null`은 `= :value`에 넣지 않고 `IS NULL` 또는 `IsNull()`을 쓴다. 직접 object predicate를 넘기면 high-level null/undefined guard를 거치지 않는다. `null` 비교는 효과 없는 `= NULL` 형태가 되고, `undefined`는 parameter로 전달돼 driver에 따라 오류나 다른 동작이 날 수 있으므로 `.where()` 전에 값을 검증한다.
## Join, mapping과 결과 grain

| API | 결과와 용도 |
|---|---|
| `leftJoin` / `innerJoin` | join과 filter만 추가한다. relation property를 hydrate하지 않는다. |
| `leftJoinAndSelect` / `innerJoinAndSelect` | 선언된 relation을 join하고 Entity property에 map한다. |
| `leftJoinAndMapOne` / `leftJoinAndMapMany` | query 전용 결과를 지정 property에 map한다. persistable relation 변경으로 오해하지 않는다. |
1:N join은 parent 하나를 child 수만큼 SQL row로 증폭한다. `getMany()`가 중복 parent를 숨겨도 aggregate, count, pagination은 달라질 수 있다. 결과 한 row의 의미와 페이지 대상이 parent인지 join row인지를 먼저 정한다.
```typescript
const page = await dataSource
  .getRepository(Order)
  .createQueryBuilder("order")
  .leftJoinAndSelect("order.customer", "customer")
  .leftJoinAndSelect("order.items", "item")
  .where("order.tenantId = :tenantId", { tenantId })
  .orderBy("order.createdAt", "DESC")
  .addOrderBy("order.id", "DESC")
  .skip(offset)
  .take(limit)
  .getMany()
```
join 또는 subquery가 있으면 raw `limit`/`offset`보다 `take`/`skip`을 우선한다. 그래도 generated SQL, parent 수, 중복, `getCount()` 의미를 실제 DB data로 검증한다. 큰 offset은 [[Pagination-Optimization|pagination 최적화]]를 따른다.
## Entity 결과, raw 결과와 projection

`getOne`/`getMany`는 Entity metadata로 hydrate하고, `getRawOne`/`getRawMany`는 select alias를 key로 하는 raw shape를 돌려준다. 집계, window function, DTO projection은 raw 결과가 더 명확하다.
```typescript
const summary = await orders
  .createQueryBuilder("order")
  .select("order.status", "status")
  .addSelect("COUNT(*)", "count")
  .where("order.tenantId = :tenantId", { tenantId })
  .groupBy("order.status")
  .getRawMany<{ status: string; count: string }>()
```
partial Entity는 읽기 DTO로 변환하고, 필요한 상태를 다시 읽은 뒤 변경한다. `select: false` property는 필요한 경우에만 `addSelect`하며 password와 token을 API response나 query log에 싣지 않는다. aggregate type과 alias casing은 driver별이므로 DTO 경계에서 변환하고 test한다.
## Subquery와 CTE는 결과 shape가 필요할 때만

subquery는 outer filter, scalar select, derived table에 쓰고 CTE는 같은 중간 결과에 이름을 줄 때만 쓴다. 단순 relation filter를 CTE로 포장하지 않는다.
```typescript
const recentIds = dataSource
  .getRepository(Order)
  .createQueryBuilder("recent")
  .select("recent.id", "id")
  .where("recent.createdAt >= :from", { from })
const rows = await dataSource
  .createQueryBuilder()
  .addCommonTableExpression(recentIds, "recent_ids")
  .select("order")
  .from(Order, "order")
  .where("order.id IN (SELECT id FROM recent_ids)")
  .getMany()
```
CTE와 recursive CTE의 지원, quoting, materialization은 DB driver와 DB version에 따라 다르다. TypeORM method가 있어도 모든 target DB에 같은 SQL 또는 성능이 보장되지는 않는다.
## Lock과 transaction context

비관적 lock은 lock select와 후속 write가 같은 transaction, manager, connection 안에 있을 때만 의미가 있다. mode, isolation, deadlock, retry는 [[Lock]]과 [[Transactions|트랜잭션]]에서 결정한다.
```typescript
await dataSource.transaction(async (manager) => {
  const order = await manager
    .getRepository(Order)
    .createQueryBuilder("order")
    .setLock("pessimistic_write")
    .setOnLocked("nowait")
    .where("order.id = :orderId", { orderId })
    .getOneOrFail()
  await manager.getRepository(Order).save(order)
})
```
지원하지 않는 mode 또는 `nowait`/`skip_locked` 조합은 driver별 오류가 될 수 있다. lock 획득 뒤 외부 HTTP 호출을 넣지 말고, lock 범위와 transaction 시간을 작게 유지한다.
## Bulk mutation과 RelationQueryBuilder

직접 mutation은 Entity를 load하지 않고 `execute()` 결과를 돌려준다. `affected`와 `raw`의 의미는 driver별이므로 business rule에는 정확한 `affected` 검사를 둔다.
```typescript
const result = await dataSource
  .createQueryBuilder()
  .update(Order)
  .set({ status: "EXPIRED" })
  .where("status = :pending", { pending: "PENDING" })
  .andWhere("expiresAt < :now", { now })
  .execute()
if (result.affected === 0) return
```
1.1.0은 update, delete, softDelete, restore의 빈 criteria를 거부한다. 의도적인 전체 변경은 Repository의 `updateAll()`/`deleteAll()`로 경로를 분리하고, 일반 요청에서는 tenant와 ownership 조건을 검증한다.
```typescript
await dataSource
  .createQueryBuilder()
  .relation(Post, "categories")
  .of(postId)
  .add(categoryId)
```
relation id만 바꿀 때는 graph 전체를 읽고 `save`하는 대신 RelationQueryBuilder를 쓴다. 다른 entity write와 원자적이어야 하면 transaction manager에서 만들고 FK, unique constraint, 권한 조건을 확인한다.
## 생성 SQL, logging과 실패 점검

- 개발과 test에서는 `getSql()`/`getQuery()`로 SQL 형태를, 필요할 때만 `getQueryAndParameters()`로 값을 확인한다.
- `logging: ["query"]`는 실행 query 관찰에 쓰되 production에서는 parameter, PII, log volume을 통제한다.
- 생성 SQL은 DB의 `EXPLAIN` 또는 `EXPLAIN ANALYZE`로 index, row estimate, 실제 time을 확인한다.
- raw alias, NULL, numeric conversion과 join pagination은 integration test로 확인한다.
- alias와 parameter name, `Brackets` precedence, mutation 조건, transaction manager를 review한다.
## 관련 문서

- [[TypeORM-Repository-and-Find-Options|TypeORM Repository와 FindOptions]]
- [[SQL]]
- [[SQL-Query-Composition]]
- [[Execution-Plan]]
- [[Pagination-Optimization|pagination 최적화]]
- [[Lock]]
- [[Transactions|트랜잭션]]
## 출처

- [Select using Query Builder - TypeORM](https://typeorm.io/docs/query-builder/select-query-builder/)
- [Insert using Query Builder - TypeORM](https://typeorm.io/docs/query-builder/insert-query-builder/)
- [Update using Query Builder - TypeORM](https://typeorm.io/docs/query-builder/update-query-builder/)
- [Delete using Query Builder - TypeORM](https://typeorm.io/docs/query-builder/delete-query-builder/)
- [Relation Query Builder - TypeORM](https://typeorm.io/docs/query-builder/relational-query-builder/)
- [Transactions - TypeORM](https://typeorm.io/docs/transactions/)
- [Handling null and undefined values - TypeORM](https://typeorm.io/docs/data-source/null-and-undefined-handling/)
- [Upgrading from 0.3 to 1.0 - TypeORM](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [Release Notes 1.0 - TypeORM](https://typeorm.io/docs/releases/1.0/release-notes/)
- [TypeORM 1.1.0 release - TypeORM GitHub](https://github.com/typeorm/typeorm/releases/tag/1.1.0)
