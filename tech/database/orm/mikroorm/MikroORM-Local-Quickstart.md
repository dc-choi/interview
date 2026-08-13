---
tags: [database, orm, mikroorm, sqlite, quickstart]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 로컬 실습", "MikroORM Quickstart"]
---

# MikroORM Local SQLite Quickstart

이 실습의 목적은 CRUD 완성이 아니라 Identity Map과 Unit of Work를 query log로 확인하는 것이다. in-memory SQLite를 사용하므로 별도 DB 설치 없이 끝나고 process가 종료되면 data도 사라진다.

## 준비

- Node.js `22.17+`
- npm
- 빈 실습 directory

```bash
node --version
npm --version
mkdir mikroorm-lab
cd mikroorm-lab
npm init -y
npm pkg set type=module
npm install @mikro-orm/core@7.1.11 @mikro-orm/sqlite@7.1.11
npm install --save-dev typescript@^5.8 tsx
mkdir src
```

버전을 고정한 이유는 문서와 실행 결과를 같은 release contract에 맞추기 위해서다. 실제 project에서는 core, driver, CLI, migrations package의 MikroORM version을 함께 올린다.

## `src/main.ts`

```ts
import { defineEntity, p } from '@mikro-orm/core';
import { defineConfig, MikroORM } from '@mikro-orm/sqlite';

const UserSchema = defineEntity({
  name: 'User',
  properties: {
    id: p.integer().primary(),
    email: p.string().unique(),
    name: p.string(),
  },
});

class User extends UserSchema.class {}
UserSchema.setClass(User);

const orm = await MikroORM.init(defineConfig({
  entities: [User],
  dbName: ':memory:',
  debug: true,
}));

try {
  // SchemaGenerator는 local/test 전용이다.
  await orm.schema.create();

  const em = orm.em.fork();
  const user = em.create(User, {
    id: 1,
    email: 'mark@example.com',
    name: 'Mark',
  });

  // create는 v7 기본값에서 auto-persist하며 flush에서 INSERT된다.
  await em.flush();

  const same = await em.findOneOrFail(User, 1);
  console.log('same EM:', user === same);

  user.name = 'Updated Mark';
  await em.flush();

  const other = await orm.em.fork().findOneOrFail(User, 1);
  console.log('other EM:', user === other);
  console.log('stored name:', other.name);
} finally {
  await orm.close(true);
}
```

실행한다.

```bash
npx tsx src/main.ts
```

## 기대 결과

일반 log의 핵심은 다음과 같다.

```text
same EM: true
other EM: false
stored name: Updated Mark
```

query log에서는 대략 다음 종류를 찾는다. SQL 문자열의 quoting과 반환 절은 version과 SQLite 구현에 따라 달라질 수 있다.

```sql
create table ...
insert into user ...
update user set name = ... where id = ...
select ... from user where id = ...
```

같은 EM의 PK 조회에서는 SELECT가 없을 수 있다. Identity Map에 `User:1`이 이미 있기 때문이다. 새 fork는 map이 비어 있으므로 SELECT하고 별도 object instance를 만든다.

## 코드를 한 줄씩 읽기

### `defineEntity`

`defineEntity`는 decorator와 reflection 없이 metadata와 TypeScript type을 함께 만든다. `Schema.setClass()`로 이름 있는 class를 schema에 연결한다.

### `MikroORM.init`

connection만 여는 함수가 아니다. configuration validation, entity discovery와 metadata 준비, driver와 extension 초기화를 포함한다. 동기식 `new MikroORM()`은 folder discovery와 extension auto-loading에 제한이 있어 일반 application은 async init이 기본이다.

### `orm.em.fork()`

root EM을 request처럼 직접 사용하지 않고 깨끗한 Identity Map을 가진 EM을 만든다. web server와 worker에서는 실제 request 또는 job마다 이 경계가 필요하다.

### `em.create()`와 `flush()`

v7의 `create()`는 기본적으로 entity를 persist 대상으로 등록한다. 호출 시점에 INSERT하지 않고 `flush()`가 changeset을 계산해 실행한다.

### scalar 변경

managed `user`의 `name`을 바꾸면 snapshot과 현재 값이 달라진다. 명시적 `flush()`에서 UPDATE changeset이 된다. `save(user)` 같은 개별 저장 method를 호출하지 않는다.

## 변형 실험

### 1. query cache와 구분하기

PK 대신 일반 조건으로 두 번 조회하고 query 수를 본다.

```ts
const a = await em.findOneOrFail(User, { email: 'mark@example.com' });
const b = await em.findOneOrFail(User, { email: 'mark@example.com' });
console.log(a === b);
```

객체는 같아도 일반 조건 SQL은 다시 실행될 수 있다. 이것이 Identity Map과 query result cache의 차이다.

### 2. detached 상태 보기

```ts
em.clear();
const loadedAgain = await em.findOneOrFail(User, 1);
console.log(user === loadedAgain); // false
```

`clear()` 이전 object는 현재 UoW에서 detached된다.

### 3. rollback 뒤 객체 상태 보기

명시 transaction 안에서 값을 바꾸고 예외를 던진 뒤 JavaScript object 값을 확인한다. DB는 rollback돼도 in-memory property가 자동 복원되지 않음을 관찰한다. 다음 작업은 새 fork에서 시작한다.

## production으로 옮길 때 바꿀 것

- `orm.schema.create()`를 제거하고 reviewed migration을 배포한다.
- 실제 DB driver와 connection option을 사용한다.
- credential은 환경별 secret에서 주입한다.
- request/job마다 context를 만든다.
- `debug: true` 대신 구조화된 log와 slow query threshold를 사용한다.
- SQLite 결과로 PostgreSQL, MySQL의 lock, JSON, DDL, execution plan을 대신 판단하지 않는다.

## 통과 기준

- [ ] INSERT와 UPDATE가 어느 줄에서 실제 실행되는지 설명한다.
- [ ] 같은 EM과 다른 EM의 비교 결과를 예측한다.
- [ ] 일반 조건 query가 객체를 재사용하면서도 SQL을 실행할 수 있는 이유를 설명한다.
- [ ] `schema.create()`를 production에서 사용하면 안 되는 이유를 설명한다.

통과하면 [[MikroORM-Architecture|아키텍처]]와 [[MikroORM-Unit-of-Work|Unit of Work]]로 이어간다.

## 공식 출처

- [Quick Start](https://mikro-orm.io/docs/quick-start)
- [Schema Generator](https://mikro-orm.io/docs/schema-generator)
- [Entity Manager](https://mikro-orm.io/docs/entity-manager)
- [Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [Defining Entities via defineEntity](https://mikro-orm.io/docs/define-entity)
