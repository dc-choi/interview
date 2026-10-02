---
tags: [nestjs, drizzle, prisma, mikroorm, sequelize, transaction]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 데이터 클라이언트와 요청 컨텍스트"]
---

# NestJS 데이터 클라이언트와 요청 컨텍스트

Nest는 DB에 종속되지 않는다. 드라이버를 provider로 공개하는 기본 배선 위에 각 라이브러리가 모델 주입, 풀 수명, transaction과 요청별 컨텍스트를 더한다. 아래 계약은 2026-10-01 Nest 공식 문서 기준이며 전체 ORM API를 복제하지 않는다.

| 통합 | Nest 배선 | 별도로 확인할 경계 |
|---|---|---|
| TypeORM | `@nestjs/typeorm`, module-scoped repository | transaction의 manager, 자동 entity 수집 |
| Mongoose | `@nestjs/mongoose`, module-scoped model | schema compilation, session, 오류 변환 |
| Drizzle | `@nestjs/drizzle`, global database | 앱별 pool, tx와 injected db 구분 |
| Prisma | 생성 client를 직접 provider로 공개 | client 생성, driver adapter, runtime 검증 |
| MikroORM | MikroORM 팀의 `@mikro-orm/nestjs` | request별 Identity Map, Unit of Work |
| Sequelize | `@nestjs/sequelize`, model injection | Active Record, sync와 transaction 옵션 |

## Drizzle: 함수 등록과 풀의 소유권

현재 Nest 가이드는 Drizzle v1 `rc`의 `defineRelations()`/relational query API를 사용한다. 통합 패키지는 v0.35 이상도 지원하지만 v0.x relation 예제를 그대로 섞지 않는다.

- `DrizzleModule.forRoot({ drizzle, connection, ... })`에는 driver의 `drizzle()` **함수**를 전달한다. 앱마다 한 번 호출되어 e2e의 각 Nest 앱도 자기 pool을 갖고 종료 때 닫는다. `@InjectDrizzle()`는 전역 database를 주입하며 TypeORM과 달리 `forFeature()`가 없다.
- import 시 이미 생성한 `db` 인스턴스를 여러 앱이 공유하면 첫 앱 종료가 다른 앱의 pool까지 닫는다. `forRootAsync()` 안에서 앱별로 생성하거나 `autoCloseConnection: false`와 외부 종료 소유자를 정한다.
- 종료는 pool의 `end()` 또는 client의 `close()`를 사용한다. replica 접근이 노출되는 Drizzle v0.44.6 이상은 primary와 replicas를 모두 닫으며 같은 client는 중복으로 닫지 않는다. 신호 종료에는 Nest shutdown hook 활성화가 필요하다.
- `forRoot()` 옵션은 module import 때 평가된다. `process.env`의 준비 시점이 다르면 ConfigService를 주입받는 `forRootAsync()`를 사용한다. 이름은 factory 밖에 지정하고 `getDrizzleToken(name)`과 `@InjectDrizzle(name)`을 맞춘다.
- `$inferSelect`/`$inferInsert`는 schema에서 컴파일 타입을 만들고, `defineRelations()`는 nested query 탐색을 정의한다. 실제 foreign key는 table의 `references()`로 정의한다. 어느 쪽도 HTTP 입력 validation을 대신하지 않는다.
- `db.transaction(async tx => ...)` 안의 query는 모두 `tx`로 보내야 한다. 다른 provider가 주입받은 `db`로 query하면 다른 connection에서 transaction 밖으로 실행될 수 있다. tx 전달 또는 검증된 CLS transaction adapter가 필요하다.
- Drizzle Kit는 Nest DI 밖에서 실행된다. 동시 인스턴스의 startup migration 경쟁을 피하려면 배포 단계에서 한 번 실행한다. chainable query mock은 호출 chain을 모두 흉내 내야 하므로 복잡한 SQL은 repository 단위 mock 또는 실제 DB 검증이 낫다.

## Prisma: 생성 코드, adapter와 transaction client

현재 Nest 예제는 Prisma ORM **7**을 명시 설치한다. 문서가 npm `latest`를 Prisma 8 사전 버전으로 경고하므로 프로젝트의 CLI/client major를 맞추고 설치 시 실제 버전을 확인한다. 이 예제의 MongoDB 통합은 Prisma 6 범위다.

- 생성 경로는 schema 기준 상대 경로다. client를 `src` 안에 두고 CI에서 `prisma generate`를 **build 전에** 실행한다. 이 문서의 v7 `migrate dev`는 client를 자동 생성하지 않는다.
- ESM 앱은 ESM client를 사용한다. CommonJS에서는 generator의 `moduleFormat: "cjs"`를 명시한다. Prisma 7.10 전에는 nodenext 설정 때문에 CJS 앱도 ESM으로 생성할 수 있다.
- v7.10의 config 이름은 `prisma7.config.ts`이며 이전 `prisma.config.ts`도 인식한다. CLI config의 `dotenv/config`와 Nest 런타임 env 로딩은 별개다. ConfigModule이나 Node `--env-file`로 앱의 URL을 준비한다.
- Prisma 7 client에는 DB별 driver adapter 또는 Accelerate URL이 필요하다. `PrismaService`를 provider로 등록/exports하고 필요한 module에서 import한다. 여러 module의 imports만으로 singleton을 중복 생성하지 않는다.
- 기본 lazy 연결 대신 `onModuleInit()`의 `$connect()`로 연결 오류를 startup에 드러낼 수 있다. `$disconnect()`는 adapter/pool도 닫는다. 옛 `$on('beforeExit')` 통합은 v7에서 사용하지 않는다. DB를 요청보다 먼저 닫지 않도록 [[NestJS-Lifecycle-Shutdown]]의 drain 순서와 연결한다.
- nested write, query 배열 `$transaction([...])`, interactive `$transaction(async tx => ...)`는 서로 다른 사용 형태다. interactive 안에서는 모든 query를 `tx`로 보내야 한다. injected PrismaService를 다시 사용하면 transaction 밖으로 빠진다.
- 생성 input/model 타입은 TS 전용이므로 ValidationPipe가 runtime schema로 읽을 수 없다. class DTO 또는 Standard Schema로 외부 입력을 검증한다. `findUnique()`의 null과 update/delete의 오류를 API 계약에 맞게 번역한다.

## MikroORM: 요청별 Identity Map

현재 가이드는 MikroORM v7과 Nest 통합 v7을 대상으로 한다. Nest의 legacy decorator는 `@mikro-orm/decorators/legacy`에서, driver별 `EntityManager`/`MikroORM`은 해당 driver package에서 가져온다. `ReflectMetadataProvider`는 v7 기본값이 아니므로 명시하며 `forRoot()`에 config를 전달한다.

- 기본 singleton EntityManager는 HTTP middleware가 만든 `RequestContext` 안에서 요청별 fork로 위임한다. 이를 concurrent 요청 전체가 하나의 Identity Map을 공유하는 구조로 설명하지 않는다. context 밖의 find/flush는 global EntityManager 사용 오류가 날 수 있다.
- HTTP 밖 queue/cron에는 `@CreateRequestContext()` 또는 기존 context를 재사용하는 `@EnsureRequestContext()`가 필요하다. `@CreateRequestContext()`를 method에 가장 가까이, `@Cron()` 등보다 아래에 둬야 wrapper에 Nest metadata가 남는다.
- `scope: Scope.REQUEST` + `registerRequestContext: false`는 대안이지만 repository와 의존 provider도 request scope로 전파된다. identity isolation과 Nest DI scope를 구분한다.
- repository에는 persist/flush가 없다. `em.flush()`가 Unit of Work의 pending write를 transaction으로 반영한다. `em.transactional()`은 callback fork를 flush/commit하고 실패를 rollback한다. 내부 호출은 nested savepoint, `@Transactional()`은 기본으로 기존 transaction 참여라는 차이가 있다.
- `autoLoadEntities`는 forFeature 등록만 수집하고 base/relation-only entity와 CLI 목록은 자동 해결하지 않는다. CLI config에는 전체 entity를 별도로 둔다.
- 여러 DB는 각각 `contextName`과 `registerRequestContext: false`, 공통 `forMiddleware()`를 사용한다. async 설정의 `contextName`과 `driver`는 factory 밖에 둬야 DI token을 사전에 등록한다.
- `ClassSerializerInterceptor`는 MikroORM Reference/Collection의 내부 구조를 이해하지 못해 재귀 오류가 날 수 있다. entity serialization의 hidden/serializer 또는 `serialize(entity, { fields, ... })`로 DTO 경계를 만든다. ESM circular relation type은 `Rel<T>`/`Ref<T>`로 metadata의 즉시 class 참조를 피한다.

## Sequelize: 모델 등록과 transaction 옵션

- Sequelize integration은 `sequelize-typescript`의 Active Record model을 `forFeature()`/`@InjectModel()`로 주입한다. 다른 module에서는 SequelizeModule을 재export한다. connection 이름과 `getModelToken(model, name)`을 테스트 mock에서도 맞춘다.
- `autoLoadModels`는 forFeature 등록 model만 수집하고 association-only model은 빠진다. 현재 Nest wrapper의 `synchronize` 기본값은 **true**이므로 운영에서는 명시적으로 false와 migration 절차를 둔다.
- managed transaction callback의 각 query에 `{ transaction: t }`를 전달한다. callback 오류가 rollback을 만든다. catch해서 오류를 숨기면 호출자는 실패를 알 수 없으므로 업무 계약대로 재전파하거나 변환한다.
- `keepConnectionAlive: true`이면 Nest shutdown이 connection을 닫지 않는다. 그 경우 pool 소유자가 따로 필요하다. Sequelize CLI migration은 Nest DI를 사용하지 않는다.

## 관련 문서

- [[NestJS-Database|TypeORM 통합]]
- [[NestJS-MongoDB|Mongoose 통합]]
- [[NestJS-Configuration|환경 설정의 평가 시점]]
- [[Injection-Scopes|Nest DI 스코프]]
- [[NestJS-Lifecycle-Shutdown|종료와 리소스 소유권]]

## 출처

- [NestJS — Data overview](https://docs.nestjs.com/data/overview)
- [NestJS — Drizzle](https://docs.nestjs.com/data/drizzle)
- [NestJS — Prisma](https://docs.nestjs.com/data/prisma)
- [NestJS — MikroORM](https://docs.nestjs.com/data/mikroorm)
- [NestJS — Sequelize](https://docs.nestjs.com/data/sequelize)
