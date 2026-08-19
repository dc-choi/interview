---
tags: [database, orm, typeorm, repository, find-options]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Repository", "TypeORM Find Options", "TypeORM Repository와 FindOptions"]
---

# TypeORM Repository와 FindOptions

이 문서는 NestJS에서 Data Mapper 방식으로 TypeORM `Repository`와 `FindOptions`를 안전하게 쓰는 기준이다. 복잡한 read model은 [[TypeORM-QueryBuilder|TypeORM QueryBuilder]]로 넘기고, SQL의 의미와 lock 이론은 [[SQL]], [[Lock]], [[Transactions|트랜잭션]]을 따른다.

## 버전 기준

| 구분 | 이 문서에서의 의미 |
|---|---|
| 학습 기준 | TypeORM `1.1.0`, 2026-08-13 확인 |
| 이전 코드 이행 | 0.3.x는 migration 시에만 별도 검증 |
| 위험한 차이 | `where`의 `null`/`undefined`, 빈 mutation 조건의 방어 동작 |
이 문서는 1.1.0의 공식 API와 기본값을 기준으로 한다. 실제 서비스의 설치 버전은 별도로 확인하고, 0.3.x에서 올릴 때만 아래 migration 주의를 실행한다.

## Data Mapper로 보는 역할

TypeORM은 Active Record와 Data Mapper를 모두 지원하지만, 이 vault의 기준은 Data Mapper다. Entity는 table metadata와 mapping을 표현하고, 저장과 조회는 `Repository` 또는 `EntityManager`가 맡는다.

- `Repository<Order>`는 한 Entity target에 좁혀진 `EntityManager`다. 일반 CRUD와 해당 aggregate의 query를 이곳에서 시작한다.
- `EntityManager`는 여러 Entity target을 다룬다. 하나의 use case가 `Order`, `Stock`, `AuditLog`를 함께 변경하거나 transaction callback 안에 있을 때 적합하다.
- Entity instance는 DB의 최신 상태 보장이 아니다. partial select, 오래 보관한 instance, 다른 transaction의 변경을 구분하고 재조회 또는 조건부 mutation으로 계약을 명시한다.

```typescript
const orders = dataSource.getRepository(Order)
const order = await orders.findOneBy({ id: orderId })

const auditLogs = await dataSource.manager.find(AuditLog, {
  where: { orderId },
})
```
한 Entity만 다룬다는 이유로 전역 repository를 transaction 안에 재사용하면 안 된다. callback이 준 manager와 그것이 만든 repository가 connection, transaction, lock 범위를 보존한다.

```typescript
await dataSource.transaction(async (manager) => {
  const orders = manager.getRepository(Order)
  const stock = manager.getRepository(Stock)

  await stock.decrement({ sku }, "available", quantity)
  await orders.save({ id: orderId, status: "PAID" })
})
```

## create, preload, save와 직접 DML

| API | 하는 일 | 선택 기준과 주의점 |
|---|---|---|
| `create` | plain object를 Entity instance로 만든다 | DB I/O가 없다. 입력 validation과 DB 존재 확인을 대신하지 않는다. |
| `preload` | PK로 기존 row를 읽고 partial 값을 합친 Entity를 만든다 | 대상이 없으면 `undefined`다. 그 결과를 확인한 뒤 `save`한다. |
| `save` | 존재 여부에 따라 insert 또는 update하는 entity persistence 경로 | cascade, listener, subscriber가 필요한 aggregate 저장에 맞는다. 여러 entity 저장은 기본적으로 transaction으로 감싼다. |
| `insert` | entity graph를 읽지 않고 row를 직접 INSERT한다 | 대량 생성이나 단순 append에 쓴다. 반환값은 `InsertResult`이며 완성된 loaded entity가 아니다. |
| `update` | 조건에 맞는 row를 partial 값으로 직접 UPDATE한다 | read-modify-write가 아니므로 callback 기반 domain 규칙을 기대하지 않는다. 조건과 `affected`를 확인한다. |
| `upsert` | conflict target에 맞춰 insert 또는 update한다 | DB driver 지원과 unique key 또는 conflict path를 먼저 확인한다. idempotency key에 유용하다. |
| `remove` | 전달한 loaded entity를 hard delete한다 | entity persistence 경로가 필요할 때 쓴다. 배열도 가능하다. |
| `delete` | id 또는 조건으로 직접 DELETE한다 | 먼저 load할 필요가 없는 명시적 bulk 삭제다. 빈 조건은 호출 전에 막는다. |
| `softRemove` / `recover` | loaded entity의 soft delete / 복구 | `@DeleteDateColumn`과 entity persistence 경로가 필요할 때 쓴다. |
| `softDelete` / `restore` | id 또는 조건으로 soft delete / 복구 | row를 load하지 않는 direct DML이다. `@DeleteDateColumn`이 전제다. |
`save`는 편리한 기본값이지 모든 쓰기의 표준은 아니다. 단일 조건으로 재고를 줄이거나 상태를 바꾸는 일은 `update` 또는 QueryBuilder의 조건부 UPDATE가 더 직접적이다. 반대로 aggregate graph, cascade, entity callback이 의미를 가지면 직접 DML로 우회하지 않는다.

```typescript
const order = await orders.preload({ id: orderId, shippingMemo })
if (!order) throw new NotFoundException("order")
await orders.save(order)

const result = await orders.update(
  { id: orderId, status: "PENDING" },
  { status: "PAID" },
)
if (result.affected !== 1) throw new ConflictException("order state changed")
```
`InsertResult`, `UpdateResult`, `DeleteResult`의 `raw`는 driver별 원시 응답이다. `affected`는 driver가 제공할 때만 신뢰할 수 있는 변경 row 수이므로 `undefined`를 성공 수로 바꾸지 않는다. business invariant가 정확한 row 수를 요구하면 지원 driver에서 `affected === 기대값`을 검사하거나, 같은 transaction 안에서 별도 검증을 둔다.

`upsert`는 atomic conflict 처리 도구이지 모든 domain merge 정책을 구현하지 않는다. conflict path, 갱신 가능한 column, `@VersionColumn` 또는 `@UpdateDateColumn`의 변화와 driver별 `RETURNING`/`OUTPUT` 지원을 테스트한다.

## Custom repository와 transaction 범위

공통 query 하나가 실제로 여러 caller에게 의미 있는 경우에만 `dataSource.getRepository(Entity).extend({...})`로 custom repository를 만든다. 단일 service 전용 helper를 별도 repository class로 포장할 필요는 없다.

```typescript
export const OrderRepository = dataSource.getRepository(Order).extend({
  findPayable(id: string) {
    return this.findOneBy({ id, status: "PENDING" })
  },
})

await dataSource.transaction(async (manager) => {
  const orders = manager.withRepository(OrderRepository)
  await orders.findPayable(orderId)
})
```

전역 `OrderRepository`를 transaction callback 안에서 그대로 호출하면 다른 manager와 query runner를 탈 수 있다. `manager.withRepository(...)` 또는 `manager.getRepository(...)`만 transaction scope의 repository다.

## FindOptions의 읽기 계약

`find`, `findBy`, `findOne`, `findOneBy`, `count` 계열은 간단한 entity 조회에 `FindOptions`를 받는다. option object의 key는 DB column명이 아니라 **Entity property 이름**이다.

```typescript
const page = await orders.find({
  select: { id: true, status: true, createdAt: true },
  relations: { customer: true },
  where: [
    { tenantId, status: "PENDING" },
    { tenantId, status: "RETRY" },
  ],
  order: { createdAt: "DESC", id: "DESC" },
  skip: offset,
  take: limit,
})
```

| Option | 계약 |
|---|---|
| `select` | 필요한 main Entity property만 고른다. 반환 Entity는 partial일 수 있으므로 그대로 수정해 `save`하지 않는다. |
| `relations` | relation을 자동 load한다. 목록에서는 relation cardinality와 생성 SQL을 확인해 join fan-out을 피한다. |
| `where` | object 내부 property는 AND, object 배열의 각 항목은 OR다. embedded/relation 조건도 Entity property 계층으로 쓴다. |
| `order` | 페이지에는 stable order와 tie-breaker를 둔다. `createdAt DESC, id DESC`처럼 동률 순서를 고정한다. |
| `skip`, `take` | offset pagination이다. 함께 쓰고 `order`를 둔다. MSSQL은 `take`/`limit`에 order가 필요하다. |
| `withDeleted` | `@DeleteDateColumn`이 채워진 soft-deleted row도 포함한다. 관리 기능처럼 권한이 확인된 경로에서만 켠다. |
| `cache` | query result cache를 켠다. 권한, 최신성, 무효화 정책을 대신하지 않으며 쓰기 뒤 stale read를 허용할 때만 쓴다. |
| `lock` | `findOne`/`findOneBy`에서만 쓴다. 비관적 lock은 같은 transaction manager와 driver 지원을 전제로 한다. |

`relations`가 convenient하다고 목록 API의 기본값으로 두지 않는다. 반환 row의 grain, relation별 최대 건수, pagination과 count의 모양을 먼저 정한다. 대시보드나 집계처럼 entity graph가 아닌 결과가 필요하면 QueryBuilder 또는 SQL을 선택한다.

## Find operator와 AND/OR

값 비교에는 `Equal`, `Not`, `In`, `IsNull`, `LessThan`, `MoreThan`, `Between` 같은 `FindOperator`를 쓴다. `null` 비교는 JavaScript `null`이 아니라 `IsNull()`로 의도를 적는다.

```typescript
const rows = await orders.findBy({
  id: In(orderIds),
  cancelledAt: IsNull(),
  amount: MoreThan(0),
  status: Or(Equal("PENDING"), Equal("RETRY")),
})
```

같은 property 안의 조건은 `And(...)`, `Or(...)`로 묶고, row 전체의 OR는 `where: [{ ... }, { ... }]`로 표현한다. `Raw`가 필요하면 사용자가 준 값을 template string으로 이어 붙이지 않고 `Raw((alias) => \`${alias} > :date\`, { date })`처럼 parameter를 준다.

## null, undefined와 빈 조건의 버전 차이

| 상황 | TypeORM 1.1.0 기준 | 0.3.x에서 올릴 때 주의 |
|---|---|---|
| high-level `where`의 `null`/`undefined` | 기본값 `throw`다. `IsNull()`로 SQL NULL을 표현한다. | 0.3.x의 property 무시 동작에 의존한 호출은 예외가 된다. |
| QueryBuilder `.where()` | 이 설정의 보호 밖이다. `null`/`undefined` object 조건은 `= NULL`이 되어 결과가 없다. | API 변경이 아니라 저수준 SQL 계약을 명시할 기회다. |
| 빈 mutation 조건 | `update`, `delete`, `softDelete`, `restore`는 빈 criteria를 거부한다. 전체 변경은 `updateAll`/`deleteAll`을 쓴다. | 기존 `{}` 또는 `[{}]` write 호출은 실패하도록 고쳐야 한다. |

기본값이 맞더라도 `DataSourceOptions.invalidWhereValuesBehavior`를 `{ null: "throw", undefined: "throw" }`로 명시하면 intent가 configuration에 남는다. API DTO에서 optional filter를 만들 때도 `undefined` property를 그대로 repository에 넘기지 말고, 허용 필드를 조립한 뒤 최소 하나의 식별 또는 tenant 조건을 요구한다.

전체 table 변경이 의도된 작업은 `updateAll`/`deleteAll`처럼 이름부터 전체 범위임을 드러내는 API와 별도 운영 절차를 쓴다. `clear`는 `TRUNCATE TABLE` 경로이므로 FK와 transaction 제약을 별도 확인한다. 일반 요청 경로에서 `{}` 또는 빈 배열을 mutation 조건으로 전달하는 코드는 금지한다.

## 선택 순서와 점검표

1. 한 Entity의 단순 조회면 `FindOptions`를 사용한다.
2. relation graph persistence가 필요하면 `create`/`preload` 후 `save`를 사용한다.
3. 명확한 조건의 단일 DML이면 `insert`/`update`/`delete`/soft variant와 `affected` 검사를 사용한다.
4. join, aggregate, subquery, lock 또는 projection이 복잡하면 [[TypeORM-QueryBuilder|QueryBuilder]]로 전환한다.
5. 여러 DB 작업이 하나의 성공 또는 실패여야 하면 callback manager에서 전부 수행한다.

- [ ] Entity property와 물리 DB column명을 혼동하지 않았다.
- [ ] mutation의 조건은 비어 있지 않고 tenant 또는 ownership 범위를 포함한다.
- [ ] `null`은 `IsNull()`, optional input은 명시적인 filter 조립으로 처리했다.
- [ ] partial Entity, `raw`, `affected`의 계약을 caller가 확인한다.
- [ ] soft delete, cache, lock의 권한과 transaction 범위를 test했다.

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[TypeORM-QueryBuilder|TypeORM QueryBuilder]]
- [[SQL]]
- [[Lock]]
- [[Transactions|트랜잭션]]

## 출처

- [Repository API — TypeORM](https://typeorm.io/docs/working-with-entity-manager/repository-api/)
- [Repository — TypeORM](https://typeorm.io/docs/working-with-entity-manager/working-with-repository/)
- [Custom repositories — TypeORM](https://typeorm.io/docs/working-with-entity-manager/custom-repository/)
- [Find Options — TypeORM](https://typeorm.io/docs/working-with-entity-manager/find-options/)
- [Handling null and undefined values — TypeORM](https://typeorm.io/docs/data-source/null-and-undefined-handling/)
- [Transactions — TypeORM](https://typeorm.io/docs/transactions/)
- [Upgrading from 0.3 to 1.0 — TypeORM](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [TypeORM 1.1.0 release — TypeORM GitHub](https://github.com/typeorm/typeorm/releases/tag/1.1.0)
