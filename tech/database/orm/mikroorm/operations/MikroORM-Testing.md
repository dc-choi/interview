---
tags: [database, orm, mikroorm, testing, integration, migrations]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Testing", "MikroORM 테스트"]
---

# MikroORM 테스트 전략

MikroORM test는 service mock이 통과하는지와 ORM 계약이 맞는지를 분리한다. mock은 application 분기를 빠르게 확인하지만 metadata discovery, generated SQL, driver, FK, transaction과 migration은 증명하지 못한다. SQL 의미가 중요한 path는 target DB engine에서 별도 통합 테스트가 필요하다.

## 검증 층과 증명 범위

| 층 | 빠르게 확인할 것 | 증명하지 못하는 것 |
|---|---|---|
| Unit | service 분기, repository 또는 EM 호출 계약 | SQL, metadata, DB constraint |
| Metadata boot | entity 등록, decorator 또는 schema, discovery | target dialect, migration result |
| ORM integration | UoW, populate, filters, flush와 transaction | 배포 image, 운영 traffic |
| DB integration | FK, unique, index, lock, migration SQL | 전체 HTTP와 장기 운영 부하 |
| E2E/canary | request부터 결과와 error mapping | 관찰하지 않은 workload |

테스트 이름이 integration이어도 SQLite in-memory만 쓴다면 PostgreSQL enum, JSON, collation, lock, partial index와 transaction isolation은 확인되지 않는다. SQLite는 빠른 ORM feedback에 유용하고 target DB는 dialect contract의 증거에 필요하다.

## 가장 작은 ORM 통합 fixture

공식 guide는 setup이 간단한 SQLite in-memory DB를 test에 사용한다. 아래 fixture는 entity discovery와 실제 `flush()`를 함께 지나가게 하는 최소 형태다.

```ts
import { MikroORM } from '@mikro-orm/sqlite';
import { User } from '../src/entities/User.js';

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
  });
  await orm.schema.create();
});

beforeEach(async () => {
  await orm.schema.clear();
});

afterAll(async () => {
  await orm.close(true);
});
```

`schema.create()`과 `schema.clear()`는 이 fixture의 격리 DB에만 사용한다. production DB, shared development DB 또는 병렬 test가 같은 DB를 공유하는 환경에 적용하면 data를 지우거나 test끼리 간섭할 수 있다.

각 test는 `orm.em`의 전역 상태를 공유하지 않는다. request 또는 test마다 `orm.em.fork()`를 만들면 Identity Map의 이전 entity와 변경 추적이 다음 test에 남는 것을 피할 수 있다.

```ts
it('같은 fork 안에서는 PK identity를 유지한다', async () => {
  const em = orm.em.fork();
  const user = em.create(User, { email: 'a@example.com' });
  await em.flush();

  const loaded = await em.findOneOrFail(User, user.id);
  expect(loaded).toBe(user);
});
```

## migration 기반 DB test

schema generator로 만든 DB는 빠르지만 migration artifact를 검증하지 않는다. release 전에는 빈 target DB와 이전 migration 상태를 가진 target DB 양쪽에서 다음을 확인한다.

```bash
npx mikro-orm migration:pending
npx mikro-orm migration:up
npx mikro-orm migration:pending
```

- 첫 `pending`은 적용할 migration과 순서를 확인한다.
- `up` 뒤의 두 번째 `pending`은 tracking table과 discovery가 기대대로 동작하는지 확인한다.
- compiled production 경로를 사용하는 test는 `dist/migrations`와 compiled ESM config로 실행한다.
- rollback을 지원한다면 disposable DB에서 `migration:down`과 이전 app compatibility를 검증한다. destructive change는 restore 또는 forward-fix 계획을 함께 시험한다.

entity metadata와 migration의 생성 SQL이 다를 수 있는 trigger, routine, extension, manually managed index가 있다면 migration을 source of truth로 두고 DB introspection assertion을 추가한다.

## transaction과 동시성 test

UoW의 happy path만 확인하지 말고 commit, rollback, isolation과 lock의 경계를 만든다.

```ts
await expect(orm.em.transactional(async em => {
  em.create(User, { email: 'duplicate@example.com' });
  await em.flush();
  throw new Error('force rollback');
})).rejects.toThrow('force rollback');

const found = await orm.em.fork().findOne(User, {
  email: 'duplicate@example.com',
});
expect(found).toBeNull();
```

이 예시는 transaction rollback의 기본 계약을 확인한다. unique violation, deadlock, lock timeout, retry와 pessimistic lock은 target driver와 DB engine에서 별도 테스트한다. SQLite 결과만으로 PostgreSQL 또는 MySQL의 lock 동작을 추정하지 않는다.

병렬 test에서 같은 row를 수정하는 경우에는 각 worker가 독립 `EntityManager` fork와 connection을 쓰도록 하고, test framework의 parallelism이 DB pool을 고갈시키지 않는지 관찰한다.

## NestJS unit test의 경계

`@mikro-orm/nestjs`를 쓰는 service는 repository injection token 또는 EntityManager를 작은 mock으로 대체할 수 있다. 이는 service가 올바른 method를 호출하는지 확인하는 unit test다.

```ts
const userRepository = {
  findOne: jest.fn(),
};

await Test.createTestingModule({
  providers: [
    UserService,
    { provide: getRepositoryToken(User), useValue: userRepository },
  ],
}).compile();
```

이 mock은 cascade, filter, SQL parameter binding, `flush`, lifecycle hook, transaction propagation 또는 relation loading을 흉내 내지 않는다. ORM behavior를 검증해야 한다면 실제 `MikroORM.init()`과 driver를 쓰는 별도 test를 둔다.

## regression fixture 설계

| 위험 | fixture에 넣을 데이터 | assertion |
|---|---|---|
| to-many pagination | parent마다 child 수가 다른 데이터 | parent 중복, 누락, tie-break order 없음 |
| N+1 의심 | parent 수를 1, 10, 100으로 바꾼 데이터 | query 수와 latency 기울기 |
| partial loading | 누락될 수 있는 FK와 primary key | relation 연결과 serialize 결과 |
| filter/tenant | 서로 다른 tenant와 soft-delete row | 다른 tenant 노출 없음, disable case 명시 |
| migration | 이전 버전 row와 null/default 경계값 | apply 후 read/write 및 old-code 호환성 |
| cache/replica | write 뒤 read와 TTL 경계 | 허용 stale window를 넘지 않음 |

문자열 전체 SQL snapshot은 alias나 quoting 같은 비본질 변화에 취약하다. SQL shape, parameter binding, 반환 row, order와 execution plan을 조합해 assertion한다. 필요하면 query logger를 test 전용으로 켜되 credential과 민감 fixture가 output에 남지 않게 한다.

## test isolation에서 자주 생기는 문제

| 증상 | 원인 후보 | 조치 |
|---|---|---|
| 이전 test entity가 보임 | shared EM의 Identity Map | test마다 `em.fork()` 또는 명시적 clear |
| test는 통과하지만 production boot 실패 | TS source와 dist entity/migration 경로 차이 | compiled artifact boot test 추가 |
| SQLite만 통과하고 target DB 실패 | dialect, collation, JSON, lock 차이 | target DB container 또는 격리 database suite |
| migration이 0개 | CLI config, glob, pathTs/path 혼동 | image에서 pending 명령 실행 |
| test가 간헐적으로 timeout | shared DB, pool 부족, parallel transaction | worker 수와 pool을 조정하고 DB별 격리 |
| rollback 뒤 객체 상태가 이상함 | rollback된 entity를 계속 사용 | 실패 후 fresh fork에서 재조회 |

## release gate

- [ ] unit test와 ORM integration test의 주장 범위를 분리했다.
- [ ] entity discovery와 `MikroORM.init()`이 실제 module format에서 boot한다.
- [ ] core read/write, relation loading, transaction rollback이 ORM integration에서 통과한다.
- [ ] migration은 빈 DB와 이전 상태 DB에서 target engine으로 검증했다.
- [ ] unique, FK, index, lock, JSON 또는 enum 같은 dialect 의존 계약을 target DB에서 확인했다.
- [ ] test fixture의 `schema:*` 명령이 production endpoint를 향할 수 없다.
- [ ] query log와 test artifact에 credential 또는 개인정보가 남지 않는다.

## 관련 문서

- [[MikroORM-Migrations-Schema|Migration과 Schema]]
- [[MikroORM-Transactions-Concurrency|트랜잭션과 동시성]]
- [[MikroORM-Performance-Troubleshooting|성능과 장애 진단]]
- [[MikroORM-Deployment|배포와 산출물]]

## 출처

- [Getting Started Guide — MikroORM v7.1](https://mikro-orm.io/docs/guide)
- [Project Setup Guide — MikroORM v7.1](https://mikro-orm.io/docs/guide/project-setup)
- [Migrations — MikroORM v7.1](https://mikro-orm.io/docs/migrations)
- [Schema Generator — MikroORM v7.1](https://mikro-orm.io/docs/schema-generator)
