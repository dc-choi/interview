---
tags: [database, orm, mikroorm, migrations, schema, deployment]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Migrations", "MikroORM Schema", "MikroORM 마이그레이션"]
---

# MikroORM Migration과 Schema

MikroORM의 schema generator는 entity metadata와 현재 DB를 비교해 DDL을 만들 수 있지만, production schema 변경 도구가 아니다. 공식 문서도 table, index, sequence를 drop 또는 alter할 수 있으므로 개발에서만 쓰고, production에서는 검토된 migration SQL을 적용하라고 안내한다.

## 역할을 섞지 않는다

| 도구 | 적합한 곳 | production에서의 위치 |
|---|---|---|
| `orm.schema`와 `schema:*` | local 개발, 격리된 test DB, 생성 SQL 탐색 | 실행하지 않는다 |
| `migration:create` | entity 변경에서 초안 SQL 생성 | diff를 사람이 검토한 뒤 version control |
| `migration:up` | test, staging, production의 순차 적용 | 배포 artifact의 명시적 단계 |
| 수동 SQL | online index, 대용량 data backfill, DB 고유 기능 | migration 안에서 검토하고 실행 |

`schema:update --run`, `schema:drop --run`, `schema:fresh`는 편리해도 production 접근 권한으로 실행하지 않는다. 환경 변수나 CI job 이름만으로 이를 막지 말고, production 배포 경로에는 migration 실행 명령만 둔다.

## 설치와 기본 설정

SQL driver에서는 core, driver, migrations와 CLI의 monorepo version을 맞춘다. 여기서는 2026-08-13 기준 stable인 v7.1.11을 고정한 예시다.

```bash
npm install @mikro-orm/core@7.1.11 @mikro-orm/postgresql@7.1.11 \
  @mikro-orm/migrations@7.1.11
npm install -D @mikro-orm/cli@7.1.11
```

`@mikro-orm/nestjs`는 monorepo 밖 패키지라 version line이 독립적일 수 있다. core, driver, CLI, migrations의 version 정렬과 별도로 peer dependency를 확인한다.

```ts
// src/mikro-orm.config.ts
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

export default defineConfig({
  entities: ['dist/entities/**/*.js'],
  entitiesTs: ['src/entities/**/*.ts'],
  extensions: [Migrator],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    glob: '!(*.d).{js,ts,cjs}',
    transactional: true,
    allOrNothing: true,
    dropTables: false,
    snapshot: true,
  },
});
```

`path`는 production에서 image에 실제로 포함되는 compiled migration을 가리킨다. `pathTs`는 개발에서 TypeScript loader로 작업할 때만 사용한다. 빌드한 image에서 `migration:pending`을 실행해 두 경로가 맞는지 확인한다.

## 변경을 만드는 안전한 순서

1. entity와 필요한 domain code를 바꾼다.
2. local 또는 disposable DB에서 `npx mikro-orm migration:create`로 초안을 만든다.
3. 생성된 `up`, `down`, schema snapshot을 함께 review한다. snapshot도 version control에 둔다.
4. SQL이 nullable, default, FK, index, lock과 table rewrite에 미치는 영향을 실제 DB dialect에서 확인한다.
5. 빈 DB와 이전 release 데이터가 있는 DB 모두에서 `migration:up`을 실행한다.
6. staging에서 동일한 compiled artifact로 pending, apply, application boot와 대표 read/write를 확인한다.
7. production에는 승인된 artifact만 한 번 적용하고, 기록 table과 schema 결과를 관찰한다.

생성 diff는 출발점이다. ORM이 naming, DB extension, trigger, hand-written index 또는 대용량 operation의 의도를 완전히 알 수 있다고 가정하지 않는다.

## 자주 쓰는 CLI와 확인 목적

```bash
# 초안을 생성한다. 생성 직후에는 반드시 파일을 review한다.
npx mikro-orm migration:create

# 적용 전 pending 목록을 확인한다.
npx mikro-orm migration:pending

# staging 또는 production의 배포 단계에서만 적용한다.
npx mikro-orm migration:up

# 격리 환경에서만 down 경로를 검증한다.
npx mikro-orm migration:down

# 개발 DB에서 생성될 SQL만 본다. --run은 production에서 금지한다.
npx mikro-orm schema:update --dump
```

명령이 성공했다는 사실만 남기지 않는다. 실행한 config 파일, DB endpoint의 환경 구분, migration ID, image digest, 시작과 종료 시각, 실패 원문을 deployment record에 남긴다.

## Migration의 transaction과 SQL

기본값은 각 migration transaction과 전체 migration을 감싸는 master transaction이다. 어떤 DDL은 DB가 transaction을 지원하지 않거나 긴 lock을 만들 수 있으므로, `isTransactional()`을 끄기 전에 해당 DB의 DDL 동작과 중간 실패 복구를 따로 설계한다.

```ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20260813090000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "user" add column "display_name" varchar(120) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "user" drop column "display_name";');
  }
}
```

- `addSql()`과 `execute()`는 migration transaction context에서 실행된다.
- 오래된 migration에서 현재 entity class와 `EntityManager`를 쓰는 방식은 피한다. checkout한 현재 metadata가 과거 migration 당시의 metadata와 달라질 수 있으므로 raw SQL이 더 안정적이다.
- `down()`은 기본으로 오류를 낸다. 되돌릴 수 없는 data 삭제나 backfill은 무리하게 가짜 down을 만들지 말고, 복구 전략과 backup 복원 절차를 별도로 문서화한다.
- `dropTables: false`는 생성 단계에서 table drop을 피하는 안전장치지만, 모든 destructive SQL을 막지는 않는다. SQL review를 대체하지 않는다.

## Expand and Contract로 호환성을 유지한다

한 배포에 column rename, type narrowing, not-null 전환, code switch와 old column drop을 묶으면 rollback이 어려워진다. 대용량 또는 무중단 변경은 다음처럼 분리한다.

1. 새 nullable column 또는 새 table과 index를 추가한다.
2. 새 코드가 이전과 새 구조를 함께 읽고 쓴다.
3. bounded batch로 backfill하고 count, null 수, checksum 같은 검증 지표를 기록한다.
4. 새 구조만 읽도록 전환한 뒤 관찰 창을 둔다.
5. 이전 code가 더는 배포되지 않는 것이 확인된 뒤에 별도 migration으로 옛 구조를 제거한다.

이 과정의 기준선, 관찰 기간, 오류율 및 rollback 조건은 서비스와 DB에 따라 다르다. 여기의 순서는 안전한 형태이지 각 환경의 lock 시간이나 downtime을 보장하지 않는다.

## Runtime schema context의 제약

v7.1은 `migrator.up({ schema })`와 CLI `--schema`로 같은 migration을 대상 schema에 적용할 수 있다. 다만 다음 조건을 지킨다.

- migration은 transaction 안에서 실행해야 한다. transaction을 끄면 pooled connection이 schema 설정과 다른 statement를 분리할 수 있어 ORM이 오류로 막는다.
- 같은 ORM instance에서 여러 schema에 `Promise.all()`로 fan-out하지 않는다. runner와 storage가 대상 schema 상태를 공유한다.
- 병렬 실행이 필요하면 schema마다 별도 process와 별도 `MikroORM.init()`을 사용한다.
- `public`은 자동으로 search path에 포함되지 않는다. shared table이나 extension은 schema를 명시한다.
- `migrations.schema`는 `config.schema`를 자동 상속하지 않으며, MSSQL의 runtime schema context는 지원되지 않는다.

## 초기 도입과 schema drift

기존 DB와 entity가 이미 있을 때만 `migration:create --initial`을 검토한다. 공식 문서상 기존 migration이 생성되거나 실행된 뒤에는 initial migration을 만들 수 없다. initial을 만들었다고 schema drift가 사라지는 것은 아니다.

## Seed는 migration이 아니다

seed data는 개발, demo, test fixture를 만들기 위한 도구이고 production schema 이력을 나타내지 않는다. 기준 데이터가 production 기능에 꼭 필요하다면 migration 안의 review된 idempotent SQL 또는 별도 운영 job으로 lifecycle과 재실행 정책을 명시한다.

```ts
import { SeedManager } from '@mikro-orm/seeder';
extensions: [Migrator, SeedManager],
```

```bash
npm install -D @mikro-orm/seeder@7.1.11
npx mikro-orm seeder:create InitialData
npx mikro-orm seeder:run
```

- fixture seed는 격리 DB를 대상으로 하고 test 시작 전 schema reset과 함께 실행한다.
- production seed는 CI마다 무조건 재실행하지 않고, 필요하면 compiled seeder와 package를 artifact에 포함한다. duplicate, 순서, 권한과 운영 data 덮어쓰기 책임을 분리한다.

| 증상 | 먼저 볼 것 | 조치 |
|---|---|---|
| CLI가 migration을 0개로 인식 | `path`, `pathTs`, glob, image의 파일 확장자 | 실제 build artifact에서 `migration:pending` 재실행 |
| 생성 diff가 예상보다 큼 | naming strategy, DB extension, trigger, schema 선택 | `--dump` SQL과 DB metadata를 비교, 자동 실행 금지 |
| 적용 중 lock 또는 timeout | DDL 특성, table size, concurrent traffic | change를 expand/contract로 쪼개고 DB별 online 방식 검토 |
| 이전 app rollback이 실패 | 새 schema와 data를 old code가 읽지 못함 | destructive 단계 분리, restore 또는 forward-fix 계획 |
| tenant schema가 섞임 | shared ORM instance의 병렬 fan-out | schema별 process로 순차 또는 독립 실행 |

## 배포 전 체크리스트

- [ ] core, driver, migrations, CLI version이 7.1.11로 정렬되어 있다.
- [ ] migration SQL과 snapshot을 사람이 review했고 destructive operation을 표시했다.
- [ ] 실제 target DB engine과 대표 데이터량에서 apply를 검증했다.
- [ ] compiled `dist/migrations`가 image에 있고 production config가 그 경로를 가리킨다.
- [ ] pending 목록, 적용 순서, migration tracking table과 실패 복구 담당자가 정해져 있다.
- [ ] application rollback과 schema rollback 또는 forward-fix의 호환성을 검증했다.
- [ ] production job에는 `schema:* --run` 명령이 없다.

## 관련 문서

- [[MikroORM-Deployment|배포와 산출물]]
- [[MikroORM-Testing|테스트 전략]]
- [[MikroORM-v7-Upgrade|v7 업그레이드]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]

## 출처

- [Migrations — MikroORM v7.1](https://mikro-orm.io/docs/migrations)
- [Schema Generator — MikroORM v7.1](https://mikro-orm.io/docs/schema-generator)
- [Seeding — MikroORM v7.1](https://mikro-orm.io/docs/seeding)
- [Schema and Database — MikroORM v7.1](https://mikro-orm.io/docs/schema-database)
- [MikroORM v7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
