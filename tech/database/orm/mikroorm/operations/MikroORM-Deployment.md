---
tags: [database, orm, mikroorm, deployment, esm, metadata, migrations]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Deployment", "MikroORM 배포", "MikroORM Metadata Cache"]
---

# MikroORM 배포와 산출물

MikroORM v7 core는 native ESM이다. local TypeScript 실행이 된다는 사실은 compiled image에서 entity discovery, migration path, metadata cache와 config import가 동작한다는 증거가 아니다. 배포 검증은 source tree가 아니라 실제로 실행할 artifact를 기준으로 한다.

## 고정해야 하는 배포 계약

| 표면 | release 전에 확인할 계약 |
|---|---|
| Runtime | Node.js 22.17 이상, TypeScript 5.8 이상, ESM entry와 import extension |
| TypeScript resolver | `moduleResolution`은 `node16`, `nodenext`, `bundler` 중 하나. `node20`은 `module` 옵션 값 |
| Dependencies | core, SQL driver, CLI, migrations가 같은 7.1.11 line |
| Entity discovery | image 안의 compiled entity가 config에 명시되거나 탐색 경로에 존재 |
| Migration | `dist/migrations`의 실제 파일과 CLI config가 일치 |
| Metadata | source 없이도 discovery 가능한 cache/bundle 또는 명시 entity 목록 |
| Connection | config precedence, secret injection, replica와 timeout policy |
| Shutdown | traffic 중단 뒤 ORM connection이 정상적으로 닫힘 |

`@mikro-orm/nestjs`는 monorepo 밖 패키지라 core와 같은 release number를 전제로 하지 않는다. Nest integration의 peer dependency와 boot test를 따로 확인한다.

## production config의 기본 형태

```ts
// dist 또는 build 과정에서 ESM으로 해석되는 config
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

export default defineConfig({
  entities: ['dist/entities/**/*.js'],
  extensions: [Migrator],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    glob: '!(*.d).{js,ts,cjs}',
    transactional: true,
    allOrNothing: true,
    dropTables: false,
  },
  slowQueryThreshold: 200,
});
```

이 예시는 경로의 형태를 보이는 것이지 모든 bundler에 그대로 맞는 처방은 아니다. image를 만들고 난 뒤에 production entry로 `MikroORM.init(config)`, `migration:pending`, representative query, 종료 처리를 실행해 확인한다.

## 설정 우선순위와 secret

v7 우선순위는 명시적 options, environment variables, config file, defaults 순서다. `MikroORM.init(config)`에 import한 config를 전달하면 그 값은 명시적 options로 취급되어 environment variables가 덮어쓰지 않는다.

```ts
export default defineConfig({
  host: 'db.internal',
  preferEnvVars: true,
});
```

`preferEnvVars: true`는 v6처럼 env가 config 값을 덮어야 할 때만 사용한다. 어떤 방식이든 deploy manifest, secret injection과 config의 우선순위를 한 계약으로 정한다. stale `MIKRO_ORM_HOST`가 예상치 못한 DB로 연결시키거나, 반대로 기대한 secret override가 무시되는 상황을 startup log와 environment-specific boot test로 잡는다.

데이터베이스 연결은 v7에서 lazy다. application boot 성공만으로 credential, DNS, firewall과 DB 권한이 모두 맞았다고 단정하지 않는다. readiness가 실제 대표 DB operation을 요구하는지, 아니면 연결 실패를 첫 request에서 허용하는지 서비스 차원에서 결정한다.

## Metadata discovery와 cache

`TsMorphMetadataProvider`는 TypeScript entity source를 읽어 metadata를 얻을 수 있고 이 과정은 느릴 수 있다. compiled JS만 배포하거나 source를 포함하지 않는 image에서는 discovery가 실패할 수 있다.

```bash
# build stage에서 생성한다.
npx mikro-orm cache:generate --combined
```

```ts
import metadata from './temp/metadata.json' with { type: 'json' };
import { GeneratedCacheAdapter } from '@mikro-orm/core';

export default defineConfig({
  metadataCache: {
    enabled: true,
    adapter: GeneratedCacheAdapter,
    options: { data: metadata },
  },
});
```

- folder discovery cache는 source file modified time과 environment에 의존할 수 있다. branch 전환 또는 entity가 달라진 build에서 cache를 재생성한다.
- generated cache bundle은 bundler에서 static import하기 좋다.
- bundle deployment는 folder scan 대신 `entities`에 class 목록을 명시하고 property type 또는 entity option을 채워야 한다. bundler가 dynamic discovery 파일을 포함한다고 가정하지 않는다.
- metadata cache가 빠르게 한다고 해서 runtime schema가 검증된 것은 아니다. boot과 representative query를 actual image에서 실행한다.

## eval 금지 runtime과 compiled functions

MikroORM은 hydration과 comparison의 최적화된 함수를 runtime에 생성할 수 있다. Cloudflare Workers 같은 `new Function` 또는 `eval` 금지 runtime은 build에서 미리 생성한다.

```bash
npx mikro-orm compile --out ./dist/compiled-functions.js
```

```ts
import compiledFunctions from './compiled-functions.js';

export default defineConfig({
  compiledFunctions,
});
```

entity 정의나 driver config가 바뀌면 compiled functions도 반드시 다시 생성한다. cache bundle과 compiled functions를 생성했어도 지원 driver, network API, native module과 DB connection이 edge runtime에 맞는지는 별도 검증 항목이다.

## migration을 application startup에 묶을지 결정한다

여러 replica가 동시에 뜨는 service에서 모든 process가 startup 중 `migration:up`을 실행하면 migration lock, 롤백과 readiness가 복잡해진다. 기본 선택은 한 번만 실행되는 deploy job 또는 release phase에서 compiled artifact로 migration을 적용하고, application process는 pending migration이 없다는 상태에서 시작하는 것이다.

자동 실행을 택한다면 적어도 leader 선택, duplicate invocation, timeout, 실패가 traffic을 막는 방식, migration tracking table, schema lock과 rollback 책임자를 명시한다. 이 문서는 startup migration을 안전하다고 보증하지 않는다.

## graceful shutdown과 NestJS

HTTP server가 새 request를 받지 않게 한 뒤 in-flight request를 마무리하고 `orm.close(true)` 또는 integration의 shutdown hook으로 connection을 정리한다. NestJS에서는 `enableShutdownHooks()`와 MikroORM integration의 shutdown 동작을 실제 signal로 테스트한다.

shutdown 중 새 request가 기존 request context와 connection을 쓰지 않도록 load balancer drain 기간, request timeout과 DB transaction 최대 시간을 정렬한다. 이 값들은 서비스 traffic과 DB timeout에 따라 정해야 하며 문서의 예시값으로 정하지 않는다.

## image 검증 예시

```bash
# source checkout이 아니라 release image/container 안에서 실행한다.
npx mikro-orm debug
npx mikro-orm migration:pending
```

그 뒤 service의 실제 start command와 health check로 ORM 초기화, 대표 read와 shutdown을 확인한다. 핵심은 developer laptop의 `tsx`가 아니라 production module format, working directory, env injection, files와 driver로 검증하는 것이다.

## 배포 전 체크리스트

- [ ] Node.js 22.17 이상과 TypeScript 5.8 이상으로 build와 boot를 검증했다.
- [ ] package lock에서 core, driver, migrations, CLI가 v7.1.11로 정렬되어 있다.
- [ ] image에 compiled entity와 migration이 있고 config의 `entities`, `path`, `glob`와 일치한다.
- [ ] ESM entry와 config import가 source tree 없이 동작한다.
- [ ] metadata cache 또는 explicit entity 목록이 bundler/image 방식과 맞고 entity 변경 때 재생성된다.
- [ ] config, env, secret의 우선순위와 실제 target DB가 startup 검증으로 확인됐다.
- [ ] migration은 한 번만 실행되는 승인된 deploy 단계에 있고 `schema:* --run`은 없다.
- [ ] slow query log는 민감 parameter를 노출하지 않고 shutdown이 signal에서 connection을 정리한다.

## 관련 문서

- [[MikroORM-Migrations-Schema|Migration과 Schema]]
- [[MikroORM-Performance-Troubleshooting|성능과 장애 진단]]
- [[MikroORM-v7-Upgrade|v7 업그레이드]]
- [[MikroORM-NestJS|NestJS 통합]]

## 출처

- [Deployment — MikroORM v7.1](https://mikro-orm.io/docs/deployment)
- [Metadata Cache — MikroORM v7.1](https://mikro-orm.io/docs/metadata-cache)
- [Configuration — MikroORM v7.1](https://mikro-orm.io/docs/configuration)
- [Upgrading from v6 to v7 — MikroORM](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [TypeScript TSConfig Reference, moduleResolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html)
