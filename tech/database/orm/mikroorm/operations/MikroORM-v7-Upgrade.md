---
tags: [database, orm, mikroorm, upgrade, v7, esm, kysely]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM v7 Upgrade", "MikroORM v6 to v7", "MikroORM v7 업그레이드"]
---

# MikroORM v6에서 v7 업그레이드

이 문서는 v7.1.11을 목표 version으로 한 v6 코드베이스의 전환 checklist다. v7은 native ESM, Node.js 22.17 이상, TypeScript 5.8 이상을 요구하며 Knex를 Kysely로 교체했다. package update 뒤 typecheck가 끝나도 module loading, metadata discovery, flush timing, migration artifact와 query 결과를 실제 target DB에서 검증해야 한다.

## 전환 원칙

1. 현재 v6 release의 build, boot, 대표 read/write, transaction, migration과 SQL 계획을 기준선으로 남긴다.
2. Node, TypeScript, module format과 MikroORM package line을 먼저 올린다.
3. compiler error와 static search로 제거 API를 고친다.
4. dev TypeScript와 compiled production ESM을 각각 boot한다.
5. 같은 fixture에서 query 결과, flush, transaction, migration과 serialization을 비교한다.
6. staging에서 compiled image와 target engine으로 canary를 통과한 뒤 확장한다.

v7 API 변경과 대규모 schema 변경을 한 release에 섞지 않는다. 어느 변경이 SQL shape나 latency를 바꿨는지 분리할 수 있어야 rollback과 forward-fix가 가능하다.

## package와 runtime gate

```bash
npm install @mikro-orm/core@7.1.11 @mikro-orm/postgresql@7.1.11 \
  @mikro-orm/migrations@7.1.11
npm install -D @mikro-orm/cli@7.1.11 typescript@^5.8
node --version
npx tsc --version
```

- Node.js는 22.17 이상이어야 한다.
- TypeScript는 5.8 이상이어야 한다.
- TypeScript `moduleResolution`은 package exports map을 해석하는 `node16`, `nodenext`, `bundler` 중 하나여야 한다. `node20`은 TypeScript 5.9 이상의 `module` 옵션 값이며 `moduleResolution: nodenext` 또는 `node16`과 짝지어 쓴다.
- v7 core는 native ESM이다. package `type`, tsconfig module setting, compiled import extension과 test runner가 ESM을 해석하는지 확인한다.
- core, 사용하는 driver, migrations, CLI는 같은 v7.1.11 line으로 정렬한다.
- `@mikro-orm/nestjs`는 monorepo 외부 패키지다. version 숫자를 억지로 같게 맞추기보다 호환 peer dependency와 Nest boot test로 확인한다.

## 변경 항목과 치환

| v6 표면 | v7 치환 또는 영향 | 확인 |
|---|---|---|
| `@mikro-orm/knex` | `@mikro-orm/sql` | import, lockfile, bundler externals |
| `em.getKnex()` | `em.getKysely()` | raw query, type, transaction binding |
| `qb.getKnexQuery()` | 제거됨 | QueryBuilder 사용 방식을 재설계 |
| `persistAndFlush` | `await em.persist(entity).flush()` | service, subscriber, test helper |
| `removeAndFlush` | `await em.remove(entity).flush()` | delete flow와 error handling |
| `em.find('User', ...)` | `em.find(User, ...)` | string entity reference 전수 검색 |
| `MikroORM.init()` | `MikroORM.init(options)` | test, script, worker bootstrap |
| `MikroORM.initSync()` | constructor 사용 | sync bootstrap과 config loading |
| `connect` config | 제거, connection lazy | readiness와 first query behavior |
| `@mikro-orm/better-sqlite` | 제거됨 | SQLite driver와 native dependency |

`driverOptions`도 Knex option 구조가 아니라 underlying client option을 직접 받는다. 예를 들어 기존 `driverOptions.connection.ssl`은 `driverOptions.ssl`처럼 바꾼다. PostgreSQL, MySQL 계열의 TLS, pool, timeout option은 사용하는 client의 공식 문서와 함께 다시 확인한다.

## Knex에서 Kysely로 전환

```ts
// v6
const row = await em.getKnex()('user').where({ id: userId }).first();

// v7
const row = await em.getKysely()
  .selectFrom('user')
  .selectAll()
  .where('id', '=', userId)
  .executeTakeFirst();
```

Kysely API로 바꾼 뒤에는 단순 typecheck 외에 다음을 확인한다.

- active `EntityManager` transaction 안에서 실행되는 raw path가 같은 transaction을 사용하는가
- named parameter, array parameter, JSON, timezone과 DB function의 SQL shape가 유지되는가
- raw result가 managed entity hydration을 거치지 않는 path에서 serialize와 write가 달라지지 않는가
- 기존 Knex plugin, SQL formatter, query inspection code를 여전히 쓰고 있지 않은가

Kysely로 옮길 이유가 없는 고수준 CRUD는 `EntityManager`와 QueryBuilder로 남긴다. migration은 현재 entity metadata와 결합되지 않도록 raw SQL을 우선한다.

## Decorator와 metadata provider

legacy decorator와 `ReflectMetadataProvider`는 `@mikro-orm/decorators/legacy`로 이동했고 더는 기본 metadata provider가 아니다. legacy decorator를 유지한다면 provider와 `reflect-metadata`를 명시한다.

```ts
import 'reflect-metadata';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  metadataProvider: ReflectMetadataProvider,
});
```

새 코드에서는 `defineEntity`, EntitySchema 또는 ES decorator 중 한 방식을 팀 표준으로 정한다. migration, worker, CLI, test에서 같은 metadata provider와 entity import identity를 쓰는지 boot test로 확인한다.

## behavior change에서 놓치기 쉬운 항목

| 변경 | v7 동작 | 검증해야 할 사례 |
|---|---|---|
| loading 기본 | `balanced`, to-one join과 to-many select-in | list pagination, relation graph, query 수 |
| 환경설정 우선순위 | explicit options > env > config > defaults | secret override와 stale env |
| validation | `validate`, `strict` option 제거, validation은 항상 적용 | startup과 invalid metadata |
| flush AUTO | scalar 변경은 `persist` 없이 자동 변화 감지되지 않음 | query 전 auto flush에 의존하던 path |
| explicit flush | managed entity 변경은 `em.flush()`로 처리 | UoW regression test |
| CLI TypeScript | loader auto 탐색, `tsLoader` 설정 가능 | CI, migration script, local toolchain |
| request context decorator | `@CreateRequestContext` 대상 함수는 async여야 함 | queue, cron, worker handler |
| transaction events | nested transaction에도 발생 | audit, event subscriber 중복 처리 |

AUTO flush 변화는 특히 위험하다. managed entity의 scalar 값을 바꾼 뒤 후속 query가 자동 flush할 것이라고 기대했다면 `em.persist(entity)`를 명시해 tracking 대상임을 표시하거나 즉시 `await em.flush()`한다. 명시 `flush()` behavior와 query 전 auto flush behavior를 하나로 취급하지 않는다.

## CLI TypeScript loader를 고정한다

v7 CLI는 `tsx`, `jiti`, `tsimp`, `@swc-node/register`, `@oxc-node/core` 등을 자동 탐색할 수 있다. CI와 developer laptop의 dependency 조합이 다르면 같은 migration config가 다른 loader로 실행될 수 있으므로 한 가지를 명시한다.

```json
{
  "mikro-orm": {
    "tsLoader": "tsx"
  }
}
```

필요하면 `MIKRO_ORM_CLI_TS_LOADER`로도 지정한다. 이전 `tsNode`, `useTsNode`, `alwaysAllowTs` 설정과 관련 environment variable은 v7에서 이름이 바뀌거나 제거됐다. TypeScript CLI 실행은 편의 기능이고, production migration 검증은 여전히 compiled JavaScript artifact로 해야 한다.

## configuration 우선순위 전환

v6는 env가 명시 options도 덮을 수 있었다. v7은 explicit options, env, config file, defaults 순서다. config module을 import해 `MikroORM.init(config)`에 전달하면 그 config도 explicit options로 취급된다.

```ts
export default defineConfig({
  host: 'localhost',
  preferEnvVars: true,
});
```

`preferEnvVars: true`는 v6의 env-wins 동작이 의도일 때만 넣는다. 전환 중에는 실제 staging secret과 config를 가진 boot test를 실행해 host, database, user, TLS와 replica endpoint가 기대값인지 확인한다. 로그에는 secret 자체를 남기지 않는다.

## model과 query의 추가 breaking change

- raw SQL fragment은 string이 아니라 symbol 기반 fragment가 됐다. 일반 string key와 raw key를 한 `orderBy` object에 섞지 말고 ordered array로 분리한다.
- object embeddable 안의 array property는 기본적으로 JSON array로 취급된다. 이전 `ArrayType` 저장 형태를 유지해야 하면 type을 명시한다.
- nested embeddable의 prefix 기본은 `relative`가 됐다. column name과 migration diff를 검토한다.
- `em.addFilter`는 인자를 나열하는 형태 대신 options object 하나를 받는다.
- ORM extension이 metadata discovery보다 먼저 등록된다. metadata를 수정하던 extension은 `afterDiscovered` hook으로 이동한다.

이 항목은 API search만으로 끝내기 어렵다. entity fixture와 target DB에서 column type, generated migration, filter query, order와 result shape를 비교한다.

## 점진적 전환 checklist

### 1. 사전 조사

```bash
rg -n "getKnex|KnexQuery|persistAndFlush|removeAndFlush|initSync|em\.find\(['\"]|@mikro-orm/knex" src test
rg -n "ReflectMetadataProvider|CreateRequestContext|driverOptions|validate:|strict:" src test
```

search 결과는 후보 목록이다. 각 호출의 transaction, error handling, result hydration과 deployment entry를 읽어 실제 영향 범위를 분류한다.

### 2. local과 CI

- [ ] Node와 TypeScript version을 올리고 ESM build와 test runner를 고쳤다.
- [ ] package line을 7.1.11로 정렬하고 lockfile을 갱신했다.
- [ ] compiler error와 static search 결과를 치환했다.
- [ ] entity metadata, `MikroORM.init(options)`, CLI config와 migration discovery가 local에서 boot한다.
- [ ] same fixture에서 read/write, `flush`, rollback, filter, relation loading을 v6 기준선과 비교했다.

### 3. staging과 production

- [ ] compiled image에서 entity discovery, metadata cache, `migration:pending`과 application boot가 통과한다.
- [ ] target DB에서 query result와 plan, migration apply, rollback 또는 forward-fix를 검증했다.
- [ ] query count, slow query, error, transaction rollback, connection pool과 replica lag를 기준선과 비교한다.
- [ ] canary 관찰 기간, 확대 조건, 즉시 중단 조건과 담당자가 있다.

## 관련 문서

- [[MikroORM-Deployment|배포와 산출물]]
- [[MikroORM-Migrations-Schema|Migration과 Schema]]
- [[MikroORM-Performance-Troubleshooting|성능과 장애 진단]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]

## 출처

- [Upgrading from v6 to v7 — MikroORM](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [MikroORM 7 released](https://mikro-orm.io/blog/mikro-orm-7-released)
- [MikroORM v7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [Configuration — MikroORM v7.1](https://mikro-orm.io/docs/configuration)
- [TypeScript Handbook, Modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
