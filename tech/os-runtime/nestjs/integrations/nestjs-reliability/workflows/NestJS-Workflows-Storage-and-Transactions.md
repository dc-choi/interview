---
tags: [nestjs, workflow, postgres, mysql, transaction]
status: done
verified_at: 2026-11-09
category: "OS & Runtime - NestJS"
aliases: ["NestJS Workflow 저장소와 transaction"]
---

# NestJS Workflow 저장소와 transaction

Workflow instance 생성 또는 signal 기록을 업무 DB transaction에 참여시켜야 업무 row와 orchestration 사이의 dual write를 닫는다. persistent store를 등록한 것과 transaction handle을 올바르게 넘긴 것은 서로 다른 조건이다.

## 저장소 등록과 데이터

PostgresWorkflowStore/MySqlWorkflowStore를 root의 ordinary singleton provider로 만들고 `WorkflowStorage.registerSource()`에 등록한다. module init에 registry가 lock되므로 request-scoped, lazy module 또는 lifecycle hook의 늦은 등록은 맞지 않는다. store에는 instances, journal, waits, signals, schedules, rate_limits와 migrations가 있고, MySQL 저장소에는 잠금용 `<schema>_locks`가 더 있다.

기본 in-memory는 restart/multi-process 공유를 지원하지 않고 transaction에도 참여하지 못한다. tx 옵션을 줘도 바로 기록되며 warning이 난다. production은 미등록을 거부하며 allowInMemoryStorage로 명시적으로 완화할 수 있다.

## Start/signal과 업무 transaction

`WorkflowClient.start(workflow, input, { id, transaction: tx })`를 업무 row 쓰기와 같은 callback에서 await한다. 안정적인 business ID에서 instance ID를 정하면 같은 input/workflow의 재시작은 existing instance와 created:false를 반환한다. 다른 input 또는 workflow는 WorkflowIdConflictError다.

signal도 업무 상태 변경과 `{ transaction: tx }`로 같이 commit한다. 응답 2xx는 commit 후에 반환한다. startAndWait는 commit 전 결과를 기다릴 수 없으므로 transaction 옵션을 거부한다. start는 tx 안, result는 commit 밖이다.

| Client | transaction 인자 |
|---|---|
| Drizzle | db.transaction callback의 tx |
| TypeORM | dataSource.transaction의 EntityManager 또는 active QueryRunner |
| node-postgres | pool에서 얻어 BEGIN한 client |
| mysql2 | beginTransaction한 connection |
| Prisma | interactive transaction client |
| Kysely | transaction callback 또는 controlled transaction |

store executor는 root client를 받아 pool로 내부 작업을 수행하고, client API에 넘기는 업무 handle은 위 transaction 객체다. root DB/manager는 store가 거부한다.

PostgreSQL은 DB default READ COMMITTED가 필요하다. signalInTransaction도 READ COMMITTED만 허용한다. 더 높은 isolation의 snapshot이 나중에 commit한 wait를 못 보고 wake-up을 놓칠 수 있기 때문이다. signal과 suspension은 store lock으로 경쟁을 제어하므로 signal transaction은 짧게 유지한다.

MySQL 8.4/9.x는 READ COMMITTED/REPEATABLE READ에서 locking read로 새 wait를 본다. SERIALIZABLE은 불필요한 locking으로 다른 signal을 오래 막을 수 있다. deadlock 1213으로 업무 tx가 rollback되면 caller가 업무 transaction 전체를 retry한다. store 내부 transaction retry가 업무 writes까지 되살리지 않는다.

## 공통 기반: @nestjs/store-kit

위 executor와 migration은 공식 패키지들이 함께 쓰는 `@nestjs/store-kit` 위에 있다. 이 패키지는 공식 SQL 저장소(2026-11-09 기준 `@nestjs/workflows/postgres`의 `PostgresWorkflowStore`와 `@nestjs/workflows/mysql`의 `MySqlWorkflowStore`. README는 저장소가 더 추가될 예정이라고 적는다)가 쓰는 기반이다. 애플리케이션이 직접 설치하거나 import하지 않고 저장소를 제공하는 패키지가 일반 의존성으로 가진다. 피어 의존성이 아니어서 kit의 패치 릴리스가 애플리케이션의 여러 패키지 사이에서 하나로 합쳐진다(2026-11-09 저장소 README 0.1.3 기준).

| 진입점 | 담는 것 |
|---|---|
| `@nestjs/store-kit` | 방언 공통 executor 타입(`SqlExecutor`, `SqlTransaction`, 격리 수준 등)과 transaction이 아닌 객체를 거르는 판정 |
| `@nestjs/store-kit/postgres` | node-postgres, Drizzle, TypeORM, Prisma, Kysely용 executor(`fromPg`, `fromDrizzle`, `fromTypeOrm`, `fromPrisma`, `fromKysely`), 버전 붙은 migration과 readiness를 담는 `StoreSchema` |
| `@nestjs/store-kit/mysql` | 같은 구성의 MySQL 8.4 LTS, 9.x용. MariaDB는 저장소가 선택할 때만 허용 |
| `@nestjs/store-kit/testing` | 다른 클라이언트용 executor가 계약을 지키는지 보는 `sqlExecutorContract()` |

`SqlTransaction`은 클라이언트 고유의 transaction 객체(Drizzle의 `tx`, TypeORM의 `EntityManager`, Prisma transaction client 등)를 그대로 들고 있어, 업무 변경과 저장소 기록이 애플리케이션이 이미 연 transaction 하나에 들어간다. workflows의 MySQL 저장소(0.0.5)는 MariaDB를 시작 시 거부한다. MariaDB를 허용하는 다른 저장소에 대해서는 키 컬럼 정렬(`utf8mb4_0900_bin`)의 지원 버전, `innodb_snapshot_isolation` 기본값이 REPEATABLE READ의 잠금 읽기에 주는 영향, JSON 중첩 깊이 한도(MariaDB 32, MySQL 100)를 README가 따로 경고한다.

## Migration과 배포

PostgreSQL 기본 schema는 nest_workflows이며 MySQL은 database 안의 table prefix다. 개발/test startup migrate는 기본 true, production은 false다. deploy 전에 `npx @nestjs/workflows migrate` 또는 version bookkeeping을 포함한 migrationSql을 적용한다. status는 schema가 뒤처지면 exit 1이다. down migration은 없고 additive migration으로 이전 app과 rolling deploy 호환을 유지한다.

PostgreSQL은 advisory lock과 transaction, MySQL은 GET_LOCK 아래 statement별 DDL과 중단 지점 재개를 쓴다. MySQL migration 도구도 statement별 실행을 유지한다. MariaDB, non-strict sql_mode, database 미선택은 거부한다. NO_BACKSLASH_ESCAPES를 끄고 matched row 수를 위해 mysql2 FOUND_ROWS를 유지한다.

MySQL indexed key는 instance/name/signal/concurrency/rate key 255자, schedule ID 230자, journal entry name 512자다. child ID와 schedule occurrence ID에 붙는 부분까지 제한에 포함되며 SQL 전에 RangeError로 거부한다.

## Custom store의 경쟁 조건

claim은 한 instance를 한 owner에만 lease하고 write는 유효한 lease owner만 바꾼다. signal은 suspension 등록을 지나치지 않아야 한다. cancel/retry/purge/schedule도 서로 경쟁하므로 조건부 statement 또는 lock transaction으로 구현한다.

`createInTransaction`/`signalInTransaction`은 선택적 contract지만 구현하면 받은 tx를 그대로 사용하고 root handle을 거부한다. `workflowStoreContract(factory, { concurrent: true, transaction })`는 claims, limits, signals/suspensions, child finish, cancel/terminate, retry, purge와 schedule 경쟁을 검증한다. 단일 connection의 PGlite 통과는 동시 DB transaction 경쟁의 증거가 아니며 실제 server/pool 검증을 추가한다.

## 출처

- [nestjs/store-kit README — GitHub](https://github.com/nestjs/store-kit) — 2026-11-09 README와 npm 0.1.3 대조. MySQL 저장소는 npm `@nestjs/workflows` 0.0.5의 `dist/mysql`이 `@nestjs/store-kit/mysql`을 쓰는 것으로 확인. 저장소 생성 2026-10-01

- [NestJS Documentation, Durable workflows](https://docs.nestjs.com/reliability/workflows) — 2026-11-09 저장소 등록, transaction과 isolation, migration, MySQL 제약과 store contract 절을 npm `@nestjs/workflows` 0.0.5 소스와 대조

## 관련 문서

- [[NestJS-Workflows-Replay-and-Steps]]
- [[NestJS-Testing-Durable-Processes]]
