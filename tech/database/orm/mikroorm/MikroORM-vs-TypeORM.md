---
tags: [database, orm, mikroorm, typeorm, comparison]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM vs TypeORM", "MikroORM TypeORM 비교"]
---

# MikroORM과 TypeORM 비교

두 ORM 모두 TypeScript application에서 entity mapping, relation, transaction, migration과 query API를 제공한다. 차이는 기능 유무의 승패보다 기본 programming model과 상태 경계에 있다.

이 vault의 NestJS 현재 기준은 [[ORM|TypeORM]]이다. 아래 비교는 전환 결정이 아니라 MikroORM의 개념을 기존 지식에 연결하고, 전환 시 바뀌는 계약을 찾기 위한 것이다.

비교 기준은 2026-08-13의 MikroORM stable `7.1.11`과 TypeORM stable `1.1.0`이다. 실제 도입 시에는 대상 lockfile version의 source, 생성 SQL과 integration test로 다시 검증한다.

## 핵심 차이

| 관점 | MikroORM 7.1.11 | TypeORM 1.1.0 | migration 시 질문 |
|---|---|---|---|
| 중심 pattern | Data Mapper, Identity Map, Unit of Work | Active Record와 Data Mapper 모두 지원 | entity method와 repository 책임이 어디에 있는가 |
| 상태 범위 | 요청별 stateful EM과 managed entity | DataSource, EntityManager, Repository 중심 | request context를 어디서 만드는가 |
| 쓰기 단위 | graph 변경을 모아 `em.flush()` | Repository와 EM의 `save`, `insert`, `update`, `remove` 등 | 기존 save 호출들을 어떤 flush 경계로 묶는가 |
| 객체 동일성 | EM별 Identity Map이 명시적 핵심 | 같은 query 결과의 객체 동일성을 migration 전제하지 않음 | 코드가 reference equality에 기대는가 |
| entity 정의 | `defineEntity`, decorator, EntitySchema | decorator class, EntitySchema | decorator와 metadata build 설정을 어떻게 바꾸는가 |
| repository | entity별 EM facade, flush method 없음 | entity별 persistence와 query method 제공 | custom repository가 write boundary를 숨기는가 |
| relation loading | populate와 joined, select-in, balanced | relation option, find relation, QueryBuilder join, eager/lazy | 기존 endpoint의 query shape가 어떻게 변하는가 |
| to-many wrapper | `Collection<T>`와 초기화 상태 | 보통 entity array 또는 Promise 기반 lazy relation | domain code의 collection API가 얼마나 바뀌는가 |
| transaction | callback EM, propagation과 UoW | callback에서 제공된 transactional manager만 사용 | 주입 repository를 callback 안에서 섞지 않는가 |
| raw SQL | SQL QueryBuilder, Kysely, `em.execute` | QueryBuilder, query runner, raw query API | managed state와 raw write 동기화를 어떻게 하는가 |
| schema 변경 | SchemaGenerator와 Migrator 분리 | synchronize와 migration 도구 | 운영에서 versioned migration만 쓰는가 |
| NestJS | `@mikro-orm/nestjs` | `@nestjs/typeorm` | DI token, context middleware, test provider가 어떻게 바뀌는가 |

TypeORM에 Identity Map이나 UoW가 전혀 없다고 단정하지 않는다. 여기서는 각 공식 문서가 application developer에게 약속하는 공개 programming model을 비교한다.

## 쓰기 mental model

### TypeORM

```ts
await dataSource.transaction(async manager => {
  const users = manager.getRepository(User);
  const user = await users.findOneByOrFail({ id });
  user.name = name;
  await users.save(user);
});
```

`save()`가 해당 entity persistence operation을 명시한다. transaction callback에서는 global manager나 평소 repository가 아니라 전달받은 manager를 사용한다.

### MikroORM

```ts
await em.transactional(async tx => {
  const user = await tx.findOneOrFail(User, id);
  user.name = name;
  tx.create(AuditLog, { user, action: 'rename' });
  // callback 종료 시 flush와 commit
});
```

managed graph의 변경을 UoW가 모으고 flush 경계에서 반영한다. 개별 entity마다 `save()`를 호출하는 방식으로 기계적으로 번역하면 MikroORM의 batching과 graph tracking 계약을 제대로 사용하지 못한다.

## relation을 옮길 때

mapping 이름만 치환하지 말고 네 층을 함께 비교한다.

1. DB schema: FK owner, nullability, unique, junction table, index, delete/update rule
2. object graph: 단방향과 양방향, owner와 inverse, `Ref`, `Collection`
3. query shape: joined와 select-in, fields, pagination, filter가 만든 join
4. API shape: populate된 relation만 노출할지, DTO와 serialization allowlist

TypeORM의 eager/lazy 설정을 MikroORM populate로 그대로 옮기거나, MikroORM `balanced`를 TypeORM의 특정 relation strategy와 동일하다고 가정하지 않는다. 대표 endpoint별 생성 SQL, row 수, query 수와 latency를 비교한다.

## transaction과 동시성

공통점이 더 중요하다.

- callback이 제공한 transaction handle을 일관되게 사용한다.
- DB isolation, unique/FK/check constraint와 lock 의미는 ORM이 바꾸지 않는다.
- transaction으로 감쌌다는 이유만으로 lost update가 사라지지 않는다.
- 두 DB와 외부 message를 하나의 local transaction으로 묶을 수 없다.
- generated SQL, lock 범위, deadlock과 retry는 실제 DBMS에서 확인한다.

MikroORM은 optimistic version과 pessimistic lock, propagation을 제공한다. TypeORM도 version column과 lock API를 제공한다. API 이름이 아니라 같은 race scenario에서 나온 SQL과 실패 contract를 비교한다.

## migration 비용

### source 변경

- entity import와 decorator package
- Repository와 EntityManager method
- relation property type과 collection operation
- transaction callback과 request context
- query builder, raw result, pagination
- serializer와 public DTO

### workflow 변경

- CLI configuration discovery
- migration snapshot과 build artifact path
- test DB bootstrap, seed와 schema setup
- NestJS DI token과 module wiring
- metadata cache, bundler와 native ESM
- log namespace, pool, replica와 shutdown

### data risk

- generated DDL이 기존 constraint, default, enum, timestamp를 같은 의미로 읽는지
- junction table과 naming strategy가 바뀌는지
- partial migration 동안 두 application version이 schema를 함께 쓸 수 있는지
- rollback이 code rollback만으로 가능한지, forward-fix가 필요한지

## 선택 사다리

1. 현재 문제를 SQL, index, query shape나 transaction 경계 수정으로 해결할 수 있는가?
2. TypeORM의 공개 API로 해결할 수 있고 운영 비용이 더 낮은가?
3. MikroORM의 request Identity Map, graph change tracking, batching, type-safe relation이 측정된 문제를 직접 해결하는가?
4. representative endpoint와 migration rehearsal에서 이점이 전환 비용보다 큰가?
5. canary, dual-read 또는 비교 가능한 rollback 경로가 있는가?

새 ORM을 배우고 싶다는 이유만으로 production을 옮기지 않는다. 반대로 현재 persistence model과 MikroORM의 UoW model이 잘 맞는다면 작은 신규 module이나 별도 service에서 먼저 검증한다.

## 평가 실험

같은 PostgreSQL schema와 dataset에서 최소 다섯 시나리오를 구현한다.

- 단순 entity CRUD와 validation error
- to-many 두 개가 있는 목록과 상세 조회
- 두 aggregate를 갱신하는 transaction과 의도적 rollback
- 1,000건 batch import와 flush memory
- 같은 PK를 다루는 동시 HTTP 요청 또는 queue job 두 개를 별도 EM에서 실행하고 객체 상태, pending write와 rollback 상태가 교차하지 않는지 확인

각 시나리오에서 query 수, SQL, returned row, p50/p95 latency, peak memory, context leak, code diff와 migration reproducibility를 기록한다. 한 번 실행한 microbenchmark를 일반적 우위로 확대하지 않는다.

## 결정 체크리스트

- [ ] 현재 ORM의 구체적 문제와 baseline이 있다.
- [ ] 공통 기능표가 아니라 실제 use case를 양쪽으로 구현했다.
- [ ] schema diff와 production migration을 rehearsal했다.
- [ ] request context, serializer와 test 전략 변경을 계산했다.
- [ ] 팀 학습, observability와 incident 대응 비용을 포함했다.
- [ ] 도입, 보류, 기각 기준을 실험 전에 정했다.

## 관련 문서

- [[ORM|Prisma, TypeORM, MikroORM 선택 기준]]
- [[MikroORM-Tradeoffs|MikroORM 트레이드오프와 현행 주의점]]
- [[TypeORM-Version-Guide|TypeORM 1.1.0 버전 가이드]]

## 공식 출처

- [MikroORM Architecture](https://mikro-orm.io/docs/architecture)
- [MikroORM Unit of Work](https://mikro-orm.io/docs/unit-of-work)
- [MikroORM Loading Strategies](https://mikro-orm.io/docs/loading-strategies)
- [MikroORM Transactions](https://mikro-orm.io/docs/transactions)
- [MikroORM Entity Repository](https://mikro-orm.io/docs/repositories)
- [MikroORM QueryBuilder](https://mikro-orm.io/docs/query-builder)
- [MikroORM Kysely](https://mikro-orm.io/docs/kysely)
- [MikroORM NestJS integration](https://mikro-orm.io/docs/usage-with-nestjs)
- [MikroORM v7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [TypeORM Active Record vs Data Mapper](https://typeorm.io/docs/guides/active-record-data-mapper/)
- [TypeORM Repository](https://typeorm.io/docs/working-with-entity-manager/working-with-repository/)
- [TypeORM Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM Eager and Lazy Relations](https://typeorm.io/docs/relations/eager-and-lazy-relations/)
- [TypeORM Migrations](https://typeorm.io/docs/migrations/why/)
- [TypeORM 1.1.0 release](https://github.com/typeorm/typeorm/releases/tag/1.1.0)
