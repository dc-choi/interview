---
tags: [database, orm, mikroorm, nestjs, request-context]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["NestJS MikroORM", "MikroORM NestJS 통합"]
---

# MikroORM과 NestJS 통합

NestJS integration의 핵심은 DI 등록보다 request마다 Identity Map을 격리하는 것이다. HTTP middleware는 module이 처리하지만 queue, cron, consumer와 multiple connection은 별도 경계를 설계해야 한다.

## 설치와 version 경계

PostgreSQL 예시다.

```bash
npm install @mikro-orm/core@7.1.11 @mikro-orm/postgresql@7.1.11 @mikro-orm/decorators@7.1.11 @mikro-orm/nestjs
```

core와 driver는 같은 version으로 맞춘다. `@mikro-orm/nestjs`는 별도 repository에서 배포되므로 package의 peer dependency와 release note로 core 호환성을 확인한다.

## root module

v7부터 `forRoot()`에 configuration을 명시적으로 넘겨야 한다.

```ts
// mikro-orm.config.ts
import { defineConfig } from '@mikro-orm/postgresql';
import { User } from './users/user.entity.js';

export default defineConfig({
  entities: [User],
  clientUrl: process.env.DATABASE_URL,
});
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from './mikro-orm.config.js';

@Module({
  imports: [MikroOrmModule.forRoot(config), UsersModule],
})
export class AppModule {}
```

explicit entity reference는 bundler와 refactor에 가장 예측 가능하다. glob을 쓰면 source용 `entitiesTs`와 build artifact용 `entities`를 구분하고 `npx mikro-orm debug`로 실제 발견 결과를 확인한다.

## feature module과 repository

```ts
@Module({
  imports: [MikroOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
```

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  async rename(id: number, name: string) {
    const user = await this.users.findOneOrFail(id);
    user.name = name;
    await this.em.flush();
  }
}
```

driver-specific `EntityManager`와 `EntityRepository`는 driver package 또는 공통 SQL package에서 import해야 QueryBuilder type을 얻는다. repository는 조회 facade이고 flush는 EM 책임이다.

base entity는 repository 대상이 아니므로 `forFeature()`에 넣지 않지만, metadata discovery를 위해 root config에는 포함한다.

## `autoLoadEntities`의 정확한 범위

`autoLoadEntities: true`는 `forFeature()`로 등록된 entity를 application runtime config에 추가한다. 다음은 해결하지 않는다.

- relation target으로만 등장하고 어느 `forFeature()`에도 없는 entity
- base entity
- CLI가 읽는 config
- bundler 밖 migration discovery

CLI까지 같은 목록을 안정적으로 쓰려면 explicit barrel을 유지하거나 `npx mikro-orm discovery:export`로 생성한 entity list를 application과 CLI config가 공유한다.

## HTTP request context

integration module은 일반 HTTP handler를 위해 request context middleware를 등록한다. 하나의 request 안에서 주입된 EM은 같은 fork와 Identity Map을 사용하고, 다음 request는 새 map을 얻는다.

middleware ordering이 중요하다. request body parser 뒤, ORM을 쓰는 custom middleware와 handler 앞에 context가 있어야 한다. GraphQL integration이 body parser를 따로 등록하면 official NestJS integration 절차대로 parser 중복과 순서를 조정한다.

`allowGlobalContext: true`로 오류를 숨기면 요청 격리가 사라진다. production의 해결책으로 사용하지 않는다.

## queue, cron과 consumer

HTTP middleware가 실행되지 않는 top-level job method에는 새 context가 필요하다.

```ts
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';

@Injectable()
export class BillingJob {
  constructor(private readonly orm: MikroORM) {}

  @CreateRequestContext()
  async handle(jobId: string) {
    // 이 async call chain은 별도 EntityManager를 사용한다.
  }
}
```

- `@CreateRequestContext()`는 top-level에 한 번만 둔다. 중첩하지 않는다.
- 기존 context가 있으면 재사용하고 없을 때만 만들려면 같은 `@mikro-orm/decorators/legacy`의 `@EnsureRequestContext()`를 쓴다. ES decorator를 쓰는 프로젝트는 두 decorator를 `/es` subpath에서 가져온다.
- Bull 같은 method decorator와 실행 순서가 충돌할 수 있으면 queue handler와 ORM 작업 method를 분리한다.
- message 하나마다 context와 transaction의 성공, retry 경계를 맞춘다.

## transaction service

```ts
await this.em.transactional(async tx => {
  const user = await tx.findOneOrFail(User, userId);
  user.credit -= amount;
  tx.create(Payment, { user, amount });
});
```

callback 안에서는 전달받은 `tx`를 일관되게 사용한다. 평소 주입받은 repository가 어떤 context를 해석하는지 암묵적으로 기대하지 않는다. propagation과 lock은 [[MikroORM-Transactions-Concurrency]]에서 다룬다.

## 직렬화

Nest의 `ClassSerializerInterceptor`는 MikroORM의 `Reference`와 `Collection` wrapper 내부 relation을 알지 못한다. entity를 그대로 controller에서 반환하는 대신 MikroORM의 `serialize()`로 명시적 shape를 만들거나 application DTO로 mapping한다.

```ts
import { wrap } from '@mikro-orm/core';

return wrap(user).serialize({
  populate: ['profile'],
  fields: ['id', 'name', 'profile.avatarUrl'],
});
```
`hidden` property, partial loading, populate 상태가 응답 계약을 우연히 바꾸지 않게 [[MikroORM-Serialization|직렬화 경계]]를 적용한다.

## multiple connection

각 connection에 고유 `contextName`을 두고 automatic context middleware를 끈 뒤 공통 middleware를 한 번 등록한다.

```ts
MikroOrmModule.forRoot({ contextName: 'main', registerRequestContext: false, ...main })
MikroOrmModule.forRoot({ contextName: 'audit', registerRequestContext: false, ...audit })
MikroOrmModule.forMiddleware()
```

주입할 때 `@InjectMikroORM('main')`, `@InjectEntityManager('main')`, `@InjectRepository(User, 'main')`처럼 이름을 명시한다. 두 connection을 쓴다고 distributed transaction이 생기는 것은 아니다.

## 테스트와 종료

- service unit test는 `getRepositoryToken(User)` provider를 mock해 협력만 검증한다.
- hydration, relation, filter, flush, transaction은 실제 driver integration test로 검증한다.
- migration과 lock은 production과 같은 DBMS에서 검증한다.
- bootstrap에서 `app.enableShutdownHooks()`를 호출해 SIGTERM 때 pool을 닫는다.
- rollout에서는 readiness 전에 migration 정책과 DB connection 준비를 분리해 검증한다.

## 통합 체크리스트

- [ ] root config와 CLI config가 같은 entity와 migration을 본다.
- [ ] HTTP, GraphQL, queue, cron 각각의 context 생성 지점을 안다.
- [ ] service 쓰기는 같은 EM과 transaction handle을 사용한다.
- [ ] controller가 entity graph를 암묵적으로 직렬화하지 않는다.
- [ ] shutdown hook과 connection budget을 배포 환경에서 확인한다.

## 공식 출처

- [Using MikroORM with NestJS](https://mikro-orm.io/docs/usage-with-nestjs)
- [MikroORM NestJS integration repository](https://github.com/mikro-orm/nestjs)
- [Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [Folder-based Discovery](https://mikro-orm.io/docs/folder-based-discovery)
- [Serialization](https://mikro-orm.io/docs/serializing)
