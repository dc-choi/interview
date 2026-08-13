---
tags: [database, orm, mikroorm, entity-manager, identity-map]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 기초", "MikroORM Basics"]
---

# MikroORM 기초

MikroORM을 이해하는 가장 짧은 길은 `save()` 호출을 찾는 것이 아니라 객체가 어느 `EntityManager`에 속하고 언제 SQL이 실행되는지를 추적하는 것이다.

## 최소 어휘

```text
database row
  -> driver가 읽음
  -> hydrator가 entity로 만듦
  -> Identity Map에 type + primary key로 등록
  -> application이 객체를 변경
  -> Unit of Work가 snapshot과 비교
  -> flush가 INSERT, UPDATE, DELETE를 실행
```

| 표현 | 의미 |
|---|---|
| `em.create(Entity, data)` | 새 entity를 만들고 v7 기본값에서는 persist 대상으로 등록 |
| `em.persist(entity)` | 새 entity나 auto-flush 대상 변경을 UoW에 명시적으로 등록 |
| `em.find*()` | DB 결과를 managed entity로 hydrate |
| `em.getReference(Entity, id)` | SELECT 없이 PK만 아는 참조 생성 |
| `em.remove(entity)` | 다음 flush에서 삭제하도록 예약 |
| `em.flush()` | 현재 UoW의 changeset을 계산하고 DB에 반영 |
| `em.clear()` | 현재 Identity Map과 managed 상태를 비움 |
| `em.fork()` | 깨끗한 Identity Map을 가진 새 EM 생성 |

`persist()`와 `remove()`는 보통 바로 SQL을 실행하지 않는다. `flush()`가 SQL 실행 경계다. 반대로 `nativeUpdate()` 같은 native operation은 UoW의 객체 변경 경로와 다른 계약을 가진다.

## entity 하나 정의하기

v7은 `defineEntity`, decorator class, `EntitySchema`를 지원한다. 아래는 decorator 설정 없이 타입 추론을 얻는 방식이다.

```ts
import { defineEntity, p } from '@mikro-orm/core';

const UserSchema = defineEntity({
  name: 'User',
  properties: {
    id: p.integer().primary(),
    email: p.string().unique(),
    name: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
```

모든 entity에는 primary key가 필요하다. DB에서 hydrate할 때 constructor는 호출되지 않으므로 DB에서 읽을 때도 반드시 지켜야 하는 불변식을 constructor에만 두면 안 된다.

## 쓰기 흐름

```ts
const em = orm.em.fork();

const user = em.create(User, {
  id: 1,
  email: 'mark@example.com',
  name: 'Mark',
});

await em.flush();

user.name = 'New Mark';
await em.flush();

em.remove(user);
await em.flush();
```

v7의 `em.create()`는 기본적으로 auto-persist한다. 이미 조회된 managed entity의 scalar를 바꾸고 명시적으로 `flush()`하면 `persist()`를 다시 부르지 않아도 변경 감지가 작동한다.

하지만 `FlushMode.AUTO`에 기대어 다음 query 전에 자동 flush시키려면 dirty entity를 `em.persist(entity)`로 표시해야 하는 경우가 있다. 쓰기 경계가 중요한 application service에서는 명시적 `flush()`가 더 읽기 쉽다.

## 조회와 객체 동일성

```ts
const first = await em.findOneOrFail(User, 1);
const second = await em.findOneOrFail(User, 1);

console.log(first === second); // 같은 EM에서는 true

const otherEm = orm.em.fork();
const third = await otherEm.findOneOrFail(User, 1);

console.log(first === third); // 다른 EM에서는 false
```

Identity Map은 `type + primary key`에 대한 객체 동일성을 보장한다. PK lookup은 이미 가진 객체를 재사용해 query를 생략할 수 있다. 그러나 `email` 같은 일반 조건 query를 반복하면 SQL 자체는 다시 실행될 수 있고, 결과를 hydrate할 때 기존 객체에 합친다.

따라서 Identity Map은 다음이 아니다.

- 모든 조건 query 결과를 저장하는 query cache
- process 전체가 공유하는 cache
- Redis 같은 분산 cache
- DB의 최신 값을 영구히 대신하는 저장소

## entity 상태

| 상태 | 의미 | 전이 예시 |
|---|---|---|
| New | 생성됐지만 DB 반영 전 | `em.create()` 또는 `new` 뒤 persist |
| Managed | 현재 EM이 추적 | `find*()`, flush된 새 entity |
| Detached | 현재 UoW가 추적하지 않음 | `em.clear()`, 다른 fork, identity map 비활성 조회 |
| Removed | 다음 flush에서 삭제 예정 | `em.remove()` |

`getReference()`로 만든 미초기화 참조는 lifecycle 상태가 아니라 loading 상태다. PK는 알지만 다른 property를 읽을 데이터가 아직 없다는 뜻이다.

## relation 읽기

to-one은 일반 entity reference나 `Ref<T>`를, to-many는 `Collection<T>`를 사용한다. mapping이 있다는 사실과 data가 load됐다는 사실은 다르다.

```ts
const books = await em.find(Book, { published: true }, {
  populate: ['author'],
  fields: ['id', 'title', 'author.name'],
});
```

- `populate`는 relation을 어느 깊이까지 가져올지 정한다.
- `fields`는 필요한 column shape를 좁힌다. PK는 자동 포함된다.
- v7 기본 `balanced`는 SQL에서 to-one을 join하고 to-many를 별도 select-in query로 읽는다.
- 부분 로딩 entity를 모든 field가 있는 수정 모델처럼 사용하지 않는다.

## 삭제와 관계 끊기

```ts
author.books.remove(book);
```

위 코드는 보통 관계 연결을 끊는다. `book` row 삭제가 아니다. 대상 entity 삭제는 `em.remove(book)`를 사용하고, parent 소유 child가 collection에서 빠질 때 삭제해야 하는 모델이면 `orphanRemoval`을 명시한다.

ORM cascade와 DB FK의 `ON DELETE`도 다른 계층이다. application graph를 따라 실행되는지, DB constraint가 직접 실행하는지 migration까지 확인한다.

## Repository의 역할

`EntityRepository<User>`는 특정 entity type에 묶인 EM facade다. v6부터 repository의 persist, remove, flush 계열 method는 제거됐고 영속화 경계는 EM에 있다.

```ts
const users = em.getRepository(User);
const active = await users.find({ active: true });
await em.flush();
```

Repository가 aggregate나 transaction 경계를 자동 보장하지는 않는다. 여러 entity의 원자적 변경은 같은 EM과 transaction에서 조정한다.

## 흔한 오해 점검

- [ ] `persist()`가 즉시 INSERT라고 설명하지 않는다.
- [ ] global `orm.em`을 web request들이 공유하지 않는다.
- [ ] relation 선언과 populate 완료를 구분한다.
- [ ] `Collection.remove()`와 row delete를 구분한다.
- [ ] raw result와 managed entity를 같은 방식으로 수정하지 않는다.
- [ ] generated SQL, query 수, transaction과 constraint를 확인한다.

## 통과 기준

- [ ] 같은 EM과 다른 EM의 객체 동일성 결과를 예측한다.
- [ ] 새 entity, managed entity, detached entity의 flush 결과를 설명한다.
- [ ] Identity Map과 result cache가 해결하는 문제를 구분한다.
- [ ] `persist`, `flush`, transaction commit의 경계를 설명한다.

다음은 [[MikroORM-Local-Quickstart|SQLite 실습]]에서 이 흐름을 직접 확인하고, [[MikroORM-Architecture|아키텍처]]에서 내부 구성요소를 연결한다.

## 공식 출처

- [Quick Start](https://mikro-orm.io/docs/quick-start)
- [Architecture Overview](https://mikro-orm.io/docs/architecture)
- [Entity Manager](https://mikro-orm.io/docs/entity-manager)
- [Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [Unit of Work](https://mikro-orm.io/docs/unit-of-work)
- [Defining Entities](https://mikro-orm.io/docs/defining-entities)
- [Repositories](https://mikro-orm.io/docs/repositories)
