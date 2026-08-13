---
tags: [database, orm, typeorm, relation, foreign-key, nestjs]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Relations", "TypeORM Relation", "TypeORM 관계 매핑"]
---

# TypeORM 관계 매핑

Relation decorator는 객체의 탐색 경로를 선언하고, migration은 DB의 FK, unique constraint, junction table을 만든다. 관계를 설계할 때는 먼저 어느 table이 FK를 가지고 어떤 삭제 규칙을 DB가 강제할지 결정하고, decorator는 그 결정을 표현한다.

## 1.1.0 기준으로 읽기

- 이 문서는 TypeORM `1.1.0`을 학습과 구현 기준으로 삼는다.
- 2026-08-13 기준 공식 최신 릴리스도 `1.1.0`이다.
- 아래 decorator API와 기본값은 1.1.0 공식 문서를 기준으로 한다.
- compile만으로 FK, unique constraint, `ON DELETE`, query 수가 증명되지는 않으므로 migration과 실DB query를 확인한다.

## 소유자, FK와 탐색 방향

관계의 핵심 질문은 한 문장으로 답할 수 있어야 한다. 어떤 row가 다른 row의 ID를 저장하는가? 그 column이 FK owner 쪽이다.

| 관계 | FK를 가진 쪽 | owner decorator | inverse decorator |
|---|---|---|---|
| 1:1 | 선택한 한 table | `@OneToOne` + `@JoinColumn` | 반대편 `@OneToOne` |
| N:1 / 1:N | N 쪽 table | `@ManyToOne` | `@OneToMany` |
| N:M | 자동 junction table | `@ManyToMany` + `@JoinTable` | 반대편 `@ManyToMany` |

- 1.1.0의 relation 기본값은 `eager: false`, `cascade: false`, `nullable: true`, `onDelete: "RESTRICT"`, `orphanedRowAction: "nullify"`다.
- `@JoinColumn`은 FK column이 있는 relation side를 지정하고 이름, referenced column, FK constraint 이름을 바꿀 수 있다.
- `@ManyToOne`은 FK owner이므로 `@JoinColumn`을 생략할 수 있다. 물리 이름을 고정하거나 기존 schema와 맞출 때만 명시한다.
- `@OneToMany`는 `@ManyToOne` 없이 단독으로 존재할 수 없다. 역방향 collection이 필요하지 않으면 `@ManyToOne`만 선언한다.
- `@JoinTable`은 many-to-many owner 한쪽에만 둔다. 양쪽에 두면 같은 관계를 두 개의 junction table로 모델링한다. 실제 무결성은 migration의 FK, NULL 여부, unique constraint, index가 보장한다.

## 단방향과 양방향은 탐색 요구로 고른다

단방향 relation은 한쪽 Entity에만 property가 있다. 예를 들어 `Photo.user`만 있으면 photo에서 user로 갈 수 있지만 user에서 photos를 직접 탐색하지는 않는다.

양방향 relation은 owner와 inverse 양쪽 property를 맞춘다. DB에 FK가 하나 더 생기는 것이 아니라 객체에서 양쪽 탐색 경로가 생기는 것이다.

```ts
export class Photo {
  @ManyToOne(() => User, (user) => user.photos, { nullable: false })
  user: User
}
export class User {
  @OneToMany(() => Photo, (photo) => photo.user)
  photos: Photo[]
}
```

## one-to-one: FK와 unique를 함께 확인한다

1:1은 FK를 둘 한쪽을 owner로 정하고 그곳에만 `@JoinColumn()`을 둔다. owner table의 relation ID/FK가 target table을 가리킨다.

```ts
export class User {
  @OneToOne(() => Profile, { nullable: false })
  @JoinColumn({ name: "profile_id" })
  profile: Profile
}
```

반대편 property를 쓴다면 `Profile`에도 `@OneToOne(() => User, (user) => user.profile)`을 둔다. DB가 정말 1:1인지 migration에서 `profile_id` FK와 unique constraint를 확인한다. `nullable: false`는 필수 관계를 표현하지만 unique를 대신하지 않는다.

## many-to-one / one-to-many: 보통은 N 쪽부터 시작한다

N:1은 child row마다 parent FK 하나를 저장한다. 그래서 order가 customer를 가진다면 `Order.customer`가 owner다.

```ts
@ManyToOne(() => Customer, (customer) => customer.orders, { nullable: false, onDelete: "RESTRICT" })
@JoinColumn({ name: "customer_id" })
customer: Customer
@OneToMany(() => Order, (order) => order.customer)
orders: Order[]
```

- 부모 삭제가 자연스럽게 child 삭제를 뜻하지 않는다. business lifecycle이 그런지와 DB FK policy를 분리해서 판단한다.
- FK로 filter, join, sort하는 query가 있으면 FK column index가 실제 plan에서 필요한지 확인한다.
- collection을 통째로 읽고 바꿔 저장하는 API는 동시 수정, 누락된 child, orphan 처리까지 test한다.

## many-to-many와 명시적 junction Entity

관계 자체에 속성이 없다면 `@ManyToMany(() => Role)`과 owner 쪽의 `@JoinTable({ name: "user_roles" })`로 자동 junction table을 쓴다.

`@JoinTable`은 table명, 양쪽 join column명, referenced column과 FK constraint 이름을 설정할 수 있다. composite PK target이면 join column 정의도 복합으로 맞춘다.

관계에 `assignedAt`, 정렬 순서, 권한, 상태, 감사 주체처럼 자체 column이 생기면 자동 M:N을 유지하지 않는다. junction을 일반 Entity로 승격한다.

```ts
@Entity("user_roles")
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User
  @ManyToOne(() => Role, { onDelete: "RESTRICT" })
  role: Role
  @CreateDateColumn({ name: "assigned_at" })
  assignedAt: Date
}
```

실제 코드에서는 composite key decorator, surrogate key 여부, unique constraint, 두 FK의 delete rule을 데이터 보존 규칙에 맞춰 명시한다. junction Entity가 되면 권한 검사, audit와 pagination을 개별 row 기준으로 다룰 수 있다.

## relation id는 읽기 표현이지 쓰기 API가 아니다

`@RelationId`는 relation 전체를 join해 가져오지 않고 ID 또는 ID 배열을 representation property로 로드할 수 있다.

```ts
@ManyToOne(() => Category)
category: Category
@RelationId((post: Post) => post.category)
categoryId: number
```

`categoryId`에 값을 대입해도 underlying relation을 추가, 제거, 변경하지 않는다. 쓰기는 `category` relation을 명시적으로 설정하거나 relation 전용 작업을 사용한다. 목록 query에 FK ID만 필요하다면 Entity decorator보다 `select` projection이 더 명확한지도 비교한다.

## relation을 어떤 query로 읽을지 선택한다

| 방법 | 사용할 때 | 확인할 위험 |
|---|---|---|
| `find`의 `relations` | 작은 graph를 명시적으로 읽을 때 | nested join의 row 증가와 pagination |
| `leftJoinAndSelect` | alias, 조건, projection을 직접 제어할 때 | 필요한 column만 선택했는지 |
| `relationLoadStrategy: "join"` | 한 SQL join의 shape가 적절할 때 | collection join fan-out |
| `relationLoadStrategy: "query"` | nested join이 너무 넓어 별도 batch query가 나을 때 | 실제 query 수와 latency |
| RelationQueryBuilder | relation binding 또는 ID 기준 load | transaction, 권한과 FK 오류 |

`join`은 기본 strategy이고 `query`는 relation을 별도 query로 읽는다. 어느 쪽이 빠른지는 relation cardinality, index, pagination과 DB plan에 달려 있다. 옵션 이름이 결과 성능을 보장하지 않으므로 query log, 반환 row 수와 `EXPLAIN`을 비교한다.

## eager와 lazy는 전역 해법이 아니다

`eager: true` relation은 `find*` 계열에서 자동 load되지만 QueryBuilder에서는 eager loading이 비활성화된다. QueryBuilder에서는 필요한 `leftJoinAndSelect`를 명시한다. 양쪽 relation에 동시에 eager를 둘 수 없다.

Lazy relation은 property type을 `Promise<T>` 또는 `Promise<T[]>`로 두고 property 접근 시 load한다. TypeORM은 Node.js lazy loading을 experimental, non-standard 방식으로 설명한다.

- eager는 모든 use case에서 불필요한 relation까지 읽을 수 있고, lazy는 loop 안의 `await entity.children`가 query를 반복할 수 있다. 목록 endpoint는 필요한 relation, column, page size를 query에 선언한다.
- 1.1.0에서 `relationLoadStrategy: "query"`를 설정하면 eager relation도 별도 query로 load된다. 필요한 relation만 읽을 때는 `loadEagerRelations: false`를 함께 사용한다.

## cascade, onDelete와 orphaned row를 섞지 않는다

`cascade`는 ORM graph 작업을 relation으로 전파하는 옵션이다. 1.1.0에서 `save()`는 `insert`/`update` cascade만, `remove()`는 remove cascade만 따른다. 신뢰되지 않은 요청 payload를 entity graph에 합쳐 `cascade: true`로 저장하지 말고 필요한 operation 범위를 명시한다.

`onDelete`는 parent row가 DB에서 delete될 때 FK가 수행할 `RESTRICT`, `CASCADE`, `SET NULL` 정책이다. raw SQL, 다른 서비스, 관리 도구가 row를 삭제해도 DB가 지켜야 하는 규칙은 `onDelete`와 실제 migration DDL에 둔다.

`orphanedRowAction`은 cascade save 중 DB에 있던 child가 새 parent graph에서 빠졌을 때의 정책이다. 기본값 `nullify`는 non-nullable FK를 null로 만들 수 없으면 child를 delete한다. relation이 Entity instance에 load되지 않아 `undefined`이면 TypeORM은 orphan을 탐지하지 않는다.

**0.3.x 업그레이드 주의:** 예전 constraint error를 안전장치로 이용했거나 collection replacement를 쓴다면, 1.1.0의 delete 동작 전에 `orphanedRowAction: "disable"` 여부와 실DB regression test를 검토한다.

## RelationQueryBuilder로 graph 전체를 읽지 않고 변경하기

관계 table만 바꾸려면 Entity graph를 load하고 array를 수정해 `save()`하는 것보다 RelationQueryBuilder가 더 작고 예측 가능하다.

```ts
await dataSource.createQueryBuilder().relation(User, "roles").of(userId).add(roleId)
```

M:N은 `add`와 `remove`, 1:1 또는 N:1은 `set`, relation 읽기는 `loadOne`/`loadMany`를 쓴다. 이 API도 FK constraint, duplicate relation, authorization과 transaction boundary를 대신 처리하지 않는다. 여러 변경을 원자적으로 묶을 때는 transaction callback의 manager에서 같은 작업을 수행한다.

## N+1은 relation 종류가 아니라 query shape 문제다

부모 목록 1회 뒤 loop에서 자식 relation을 N번 읽으면 총 `1 + N` query가 된다. eager 하나를 켜는 것으로 고정하지 말고 다음 중 실제 결과가 작은 방식을 고른다.

1. 필요한 parent와 relation을 한 query에 join하고, row 증가와 pagination을 검증한다.
2. parent ID를 모아 relation을 batch query로 읽고 application에서 묶는다.
3. read model이 복잡하면 Entity 전체가 아닌 projection QueryBuilder 또는 별도 read query를 쓴다.

검증은 request당 query count, DB duration, 반환 row 수, pagination의 중복 또는 누락, 실제 execution plan으로 한다. relation mapping만 보고 N+1이 없다고 결론 내리지 않는다.

## 관계 변경과 upgrade 체크리스트

- [ ] owner table, FK column, nullable, unique, FK 이름과 `onDelete`가 migration SQL과 일치한다.
- [ ] existing data와 fixture로 insert, relation 변경, parent delete, child delete를 실행했다.
- [ ] M:N junction의 duplicate 방지, relation 속성, collection replacement와 1.1.0 orphan policy를 regression test로 검증했다.
- [ ] 0.3.x에서 올린다면 orphan과 cascade remove의 변경 결과를 실DB fixture로 비교했다.
- [ ] 대표 목록 query의 SQL 수, row 수, page 결과와 plan을 비교했다.
- [ ] build 산출물에서 migration을 실행하고 rollback 경로를 확인했다.

[[ORM|ORM과 NestJS 영속성 선택]]은 ORM의 역할과 transaction 원칙을, [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]은 version 전환의 실DB gate를 다룬다.

## 출처
- [TypeORM, Relations](https://typeorm.io/docs/relations/relations/)
- [TypeORM, Eager and Lazy Relations](https://typeorm.io/docs/relations/eager-and-lazy-relations/)
- [TypeORM, Relations FAQ](https://typeorm.io/docs/relations/relations-faq/)
- [TypeORM, Working with Relations](https://typeorm.io/docs/query-builder/relational-query-builder/)
- [TypeORM, Find Options](https://typeorm.io/docs/working-with-entity-manager/find-options/)
- [TypeORM, Upgrading from 0.3 to 1.0](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [TypeORM, Release Notes 1.0](https://typeorm.io/docs/releases/1.0/release-notes/)
- [TypeORM GitHub Releases](https://github.com/typeorm/typeorm/releases)
