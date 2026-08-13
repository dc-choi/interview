---
tags: [database, orm, typeorm, migration, ddl, deployment]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Migrations", "TypeORM 마이그레이션과 배포"]
---

# TypeORM 마이그레이션과 배포

TypeORM migration은 entity decorator의 변경을 운영 schema에 안전하게 전달하는 versioned SQL 계약이다. entity source만 맞아도 부족하다. 실제 DataSource, migration history table, compiled artifact, DB engine의 DDL 규칙과 deploy 순서가 함께 맞아야 한다.

## TypeORM 1.1.0 기준과 이행 주의

- 이 문서의 학습 기준은 TypeORM `1.1.0`이다. 2026-08-13에 공식 `1.1.0` tag의 `package.json`과 migration 문서를 대조했다.
- CLI와 DataSource 예시는 1.1.0 기준이다. 실제 deploy에서는 lockfile, CLI binary, DB driver와 build artifact를 함께 test한다.
- 0.3.x에서 올릴 때는 Node.js `^20.19.0 || ^22.13.0 || >=24.11.0`과 ES2023, 제거된 legacy API, migration glob의 `tinyglobby` 전환을 공식 upgrade guide로 점검한다.
- migration의 대상은 개발자의 local DB가 아니라 배포 환경과 같은 engine, version, collation, extension, 권한을 가진 DB다.

## DataSource를 migration 계약으로 고정한다

```ts
import { DataSource } from "typeorm"

export default new DataSource({
  type: "postgres",
  synchronize: false,
  dropSchema: false,
  migrations: [__dirname + "/migrations/**/*{.js,.ts}"],
  migrationsRun: false,
  migrationsTableName: "typeorm_migrations",
  migrationsTransactionMode: "all",
})
```

- `migrations`는 migration class 또는 glob 목록이다. source와 compiled image에서 각각 어떤 확장자와 path를 찾는지 명시한다.
- 공식 setup 예시는 `.js`와 `.ts` glob을 함께 허용하지만, production image에 TypeScript source와 ts-node가 실제로 있는지를 별도로 검증해야 한다.
- `migrationsTableName`의 기본값은 `migrations`다. 기존 환경에 같은 이름의 다른 migration tool table이 있으면 명시적 이름으로 충돌을 피한다.
- `migrationsRun`의 기본값은 `false`이며 app startup마다 pending migration을 자동 실행하는 option이다. 여러 app replica가 동시에 시작하는 production에서는 별도 deployment 단계 한 곳에서 실행할지 먼저 정한다.
- `migrationsTransactionMode`는 `all`, `each`, `none` 중 하나다. DB engine과 migration SQL의 transaction 가능 범위를 확인한 뒤 선택한다.

## `synchronize`와 `dropSchema`를 운영 변경 수단으로 쓰지 않는다

- `synchronize: true`는 앱 시작에 schema sync를 실행한다. 공식 문서는 production data loss 위험을 경고하므로 운영 schema의 source of truth는 versioned migration으로 둔다.
- `dropSchema: true`는 DataSource initialize 때 schema를 drop한다. test database를 명확히 격리한 경우 외에는 사용하지 않고 production에는 두지 않는다.
- `typeorm schema:sync`와 `schema:drop`도 DB에 직접 영향을 준다. 필요하면 disposable local DB에서 `schema:log`로 SQL을 먼저 확인한다.
- 실행 환경의 `NODE_ENV`만 믿기보다 production DataSource object에 위 두 boolean이 `false`인지 configuration test와 deploy review에서 확인한다.

## migration 파일의 `up`과 `down`

```ts
import { MigrationInterface, QueryRunner } from "typeorm"

export class AddOrderStatus1710000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ADD status varchar(20)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN status`)
  }
}
```

- `up`은 적용할 DB 변경, `down`은 마지막 적용 migration을 되돌릴 때 실행할 역방향 변경이다.
- TypeORM 1.1.0은 migration을 zero-argument constructor로 생성한다. 양쪽 DB 작업은 전달받은 `QueryRunner`로 수행하고 Nest DI, app service, 전역 repository에 의존하지 않는다.
- `down`이 문법상 존재해도 새 column에 이미 쓴 data, 삭제한 column, 변환한 data를 안전하게 복원할 수 있는지는 별도 문제다.
- destructive change는 억지 `down`보다 forward corrective migration, backup 복구, data ownership 판단이 더 안전할 수 있다.

## CLI의 역할과 최소 명령

| 명령 | 역할 | 운영 전 확인 |
| --- | --- | --- |
| `migration:create` | 빈 timestamp migration 생성 | 직접 작성할 SQL과 `up`/`down` 계획 |
| `migration:generate` | entity와 연결한 DB schema diff로 SQL 생성 | 대상 DB URL과 생성 SQL review |
| `migration:show` | 적용 여부 목록 표시 | target DB와 history table |
| `migration:run` | timestamp 순서의 pending migration 적용 | image, backup, lock, 관찰 창 |
| `migration:revert` | 가장 최근 실행 migration의 `down` 실행 | data compatibility와 restore plan |

```bash
npx typeorm migration:create src/db/migrations/add-order-status
npx typeorm migration:generate -d src/db/data-source.ts src/db/migrations/add-order-status
npx typeorm migration:show -- -d dist/db/data-source.js
npx typeorm migration:run -- -d dist/db/data-source.js
npx typeorm migration:revert -- -d dist/db/data-source.js
```

- `generate`는 entity와 접속한 DB를 비교한다. TypeORM 1.1.0 공식 문서 기준 변경이 없으면 exit code `1`이므로 CI에서 실패 의미를 구분한다.
- generated file은 정답이 아니라 review 시작점이다. rename을 drop and add로 인식했는지, FK, index, default, nullability, data conversion, table lock과 scan을 SQL 단위로 검토한다.
- `show`와 migration history table로 pending 목록을 배포 전후에 저장한다. command 성공만으로 target environment가 맞았다고 추정하지 않는다.

## TypeScript, JavaScript, CommonJS와 ESM

기본 `typeorm migration:run`과 `migration:revert`는 JavaScript migration file을 실행한다. TypeScript source를 직접 실행하려면 TypeORM이 제공하는 ts-node wrapper와 module 형식을 맞춘다.

```bash
# compiled JavaScript artifact
npx typeorm migration:run -- -d dist/db/data-source.js

# TypeScript, CommonJS project
npx typeorm-ts-node-commonjs migration:run -- -d src/db/data-source.ts

# TypeScript, ESM project
npx typeorm-ts-node-esm migration:run -- -d src/db/data-source.ts
```

- generate와 create는 기본적으로 `.ts`를 만들며 `-o` 또는 `--outputJs`로 JavaScript를 만들 수 있다.
- CommonJS의 `__dirname` glob은 ESM에서 그대로 동작하지 않는다. ESM DataSource가 실제 artifact path를 resolve하는지 build image 안에서 `migration:show`와 `migration:run`으로 검증한다.
- source tree에서 통과한 command가 image에서도 migration을 찾는다는 증거는 아니다. build 뒤 `dist`에 migration class와 DataSource export가 모두 포함됐는지 확인한다.
- package script가 wrapper, `-d` path와 environment variable을 숨기면 CI 로그에 실제 command와 resolved target을 남긴다.

## transaction mode와 DDL engine 경계

TypeORM은 기본적으로 모든 pending migration을 하나의 wrapping transaction으로 실행한다. `--transaction all`이 그 기본값이고 `each`는 migration마다, `none`은 wrapping transaction 없이 실행한다.

- 개별 migration의 `transaction = false` 또는 `true` override는 `each`나 `none` mode에서만 동작한다.
- PostgreSQL `CREATE INDEX CONCURRENTLY`처럼 transaction block에서 실행할 수 없는 SQL은 해당 migration의 transaction mode를 명시하고 production engine에서 dry run한다.
- MySQL의 많은 DDL은 implicit commit을 일으킨다. TypeORM wrapping transaction이 있더라도 DDL과 preceding DML이 모두 되돌아갈 것이라고 가정하지 않는다.
- `all`은 편리하지만 긴 DDL, non-transactional DDL, 여러 migration의 rollback 범위를 engine 규칙보다 강하게 만들지 못한다. migration별 SQL과 엔진 문서를 기준으로 `each` 또는 `none`을 선택한다.

## fake, revert와 실패 상태

`migration:run --fake`는 SQL을 실행하지 않고 migration table에 적용 기록만 남긴다. `migration:revert --fake`도 history만 되돌린다.

- fake는 동일한 schema 변경을 수동 또는 다른 tool로 이미 적용했고, target DB schema와 migration file의 의도가 정확히 일치한다고 검증한 경우에만 쓴다.
- 실패한 migration을 fake로 덮어 history를 맞추지 않는다. 부분 적용 SQL, transaction mode, engine implicit commit, data 상태를 먼저 조사하고 repair migration 또는 restore를 결정한다.
- `revert`는 한 번에 마지막 migration 하나의 `down`을 실행한다. 여러 개를 되돌리려면 반복 호출하며, application rollback과 schema rollback은 별개의 승인 항목이다.

## 배포 순서: expand, migrate, contract

1. **Expand**: nullable column, 새 table, additive index처럼 이전 app도 읽고 쓸 수 있는 schema를 먼저 적용한다.
2. **Deploy**: 새 code가 old schema와 new schema 모두에서 안전하게 동작하게 배포한다. 필요하면 dual read 또는 dual write의 종료 조건을 정한다.
3. **Backfill와 검증**: bounded batch로 data를 채우고 row count, constraint 위반, lag, lock wait를 관찰한다.
4. **Enforce**: backfill 완료 뒤 `NOT NULL`, FK, unique constraint 같은 불변식을 별도 migration으로 강제한다.
5. **Contract**: 이전 code가 사라지고 rollback window가 끝난 뒤에만 old column, index, table을 별도 release에서 제거한다.

이 순서는 app binary를 먼저 되돌려도 schema가 호환되게 만든다. 대용량 DDL의 lock, algorithm과 online migration 판단은 [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]을 따른다.

## 배포 전후 체크리스트와 관측

- [ ] production과 같은 DB engine, major version, extension, 권한으로 `up`과 필요한 `down`을 rehearsal했다.
- [ ] image 안의 DataSource와 migration glob이 실제 `.js` 또는 의도한 `.ts` file을 찾는지 확인했다.
- [ ] generated SQL의 destructive change, full scan, index build, FK validation, lock과 implicit commit을 review했다.
- [ ] `migration:show`, history table, applied timestamp와 deploy revision을 배포 기록에 남겼다.
- [ ] DDL duration, error, lock wait, DB CPU, connection, replica lag와 application error를 관찰할 dashboard와 중단 기준이 있다.
- [ ] app rollback, forward repair, schema restore 중 어느 경로를 쓸지와 의사결정자를 배포 전에 정했다.

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[Transactions|트랜잭션]]
- [[Replication|MySQL Replication]]

## 출처

- [TypeORM 공식 저장소, 1.1.0 package version](https://github.com/typeorm/typeorm/blob/1.1.0/package.json)
- [TypeORM, Migration setup](https://typeorm.io/docs/migrations/setup/)
- [TypeORM, Using CLI](https://typeorm.io/docs/using-cli/)
- [TypeORM, Creating migrations](https://typeorm.io/docs/migrations/creating/)
- [TypeORM, Generating migrations](https://typeorm.io/docs/migrations/generating/)
- [TypeORM, Executing and reverting](https://typeorm.io/docs/migrations/executing/)
- [TypeORM, Faking migrations and rollbacks](https://typeorm.io/docs/migrations/faking/)
- [TypeORM, Data Source Options](https://typeorm.io/docs/data-source/data-source-options/)
- [TypeORM, Upgrading from 0.3 to 1.0](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [PostgreSQL Documentation, CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [MySQL Reference Manual, Statements That Cause an Implicit Commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
