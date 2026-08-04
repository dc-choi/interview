---
tags: [database, orm, typeorm, prisma, nestjs]
status: done
verified_at: 2026-08-04
category: "Data & Storage"
aliases: ["ORM", "TypeORM vs Prisma", "NestJS ORM"]
---

# ORM과 NestJS 영속성 선택

ORM은 애플리케이션 모델과 관계형 schema 사이의 반복적인 변환, query 조립과 결과 매핑을 줄인다. SQL, index, transaction, constraint를 없애는 계층은 아니다. 생성된 SQL과 실행 계획을 확인하지 않으면 편의 뒤에 N+1, 넓은 lock과 불필요한 column 조회가 숨을 수 있다.

## 이 vault의 기준

NestJS의 현재 기준은 `@nestjs/typeorm`과 TypeORM이다.

- module은 `TypeOrmModule.forFeature()`로 repository를 등록한다.
- service는 `@InjectRepository()` 또는 application port를 통해 접근한다.
- transaction은 `QueryRunner`나 callback에 전달된 transaction 전용 `EntityManager`만 사용한다.
- 운영 schema 변경은 versioned migration으로 관리하고 `synchronize: true`를 사용하지 않는다.

Prisma 강의나 예제는 버리지 않고 **Prisma 고유 동작과 일반 영속성 원칙을 구분한 뒤 TypeORM 표현으로 번역**한다.

## TypeORM과 Prisma의 모델 차이

| 관점 | TypeORM | Prisma |
|---|---|---|
| schema 표현 | decorator가 붙은 Entity 또는 EntitySchema | `schema.prisma`의 model DSL |
| query API | Repository, EntityManager, QueryBuilder | schema에 맞춰 생성된 Prisma Client |
| NestJS 배선 | `@nestjs/typeorm`, `forRoot`, `forFeature` | `PrismaClient`를 감싼 provider를 직접 등록 |
| transaction handle | transaction 전용 EntityManager, QueryRunner | `$transaction` callback의 `tx` client |
| schema 변경 | TypeORM migration CLI | Prisma Migrate 또는 `db push` |

둘 다 DB의 isolation과 constraint 위에서 동작한다. API 모양이 다르다고 lost update, deadlock, dual write가 사라지지 않는다.

## TypeORM relation을 schema로 읽는다

Decorator는 객체 탐색 방향을 표현하지만 실제 무결성은 FK, `NULL` 여부와 unique constraint가 보장한다.

- N:1의 `@ManyToOne` 쪽이 FK를 소유한다. 반대편 `@OneToMany`는 탐색 경로이며 이것만 선언해도 새 FK가 생기는 것은 아니다.
- 1:1은 FK를 둘 table의 한쪽에만 `@JoinColumn`을 둔다. 실제 1:1 보장은 생성 migration의 FK와 unique constraint까지 확인한다.
- M:N은 소유 측 한곳에만 `@JoinTable`을 둔다. 관계에 수량, 역할, 생성 시각 같은 속성이 생기면 자동 junction table 대신 명시적 relation Entity로 승격한다.
- `cascade`는 Entity graph를 `save`나 `remove`할 때 ORM 작업을 전파하는 옵션이고, `onDelete`는 parent row 삭제 시 DB FK가 수행할 동작이다. 의미가 다르며 `cascade: true`보다 필요한 `insert`, `update` 등을 명시하는 편이 안전하다.
- TypeORM의 cascade remove는 메모리에 로드된 relation graph를 따라간다. DB 수준 삭제 정책은 migration에 생성된 `ON DELETE`를 기준으로 검증한다.
- eager relation은 `find*` 계열에서 자동 로드되지만 QueryBuilder에서는 명시적 join이 필요하다. 양방향 mapping이나 eager 설정이 N+1과 join fan-out을 자동 해결하지 않는다.

관계 변경도 `synchronize`에 맡기지 않고 migration SQL에서 FK 방향, constraint 이름, 삭제 정책과 index를 review한다.

## Prisma 명령을 정확히 구분한다

강의나 오래된 글에서 `generate`가 DB schema를 적용한다고 설명하는 경우가 있지만 역할은 다르다.

```text
prisma db pull   : 현재 DB schema를 읽어 Prisma schema에 반영
prisma generate  : Prisma schema로 type-safe client 자산 생성
prisma migrate   : versioned migration을 생성, 적용, 배포
prisma db push   : migration history 없이 schema 상태를 DB에 push
```

`db push`는 prototype과 local 개발에는 편하지만 변경 이력과 검토 가능한 SQL이 필요한 운영 배포에서는 migration이 기준이다. `generate`만 실행해도 DB table이 바뀌지는 않는다.

## Prisma 예제를 TypeORM으로 번역한다

| Prisma 예제 | TypeORM 기준 표현 |
|---|---|
| `PrismaService` 주입 | `DataSource`, `@InjectRepository()` 또는 persistence port 주입 |
| generated model query | Repository/EntityManager/QueryBuilder query |
| `$transaction(async tx => ...)` | `dataSource.transaction(async manager => ...)` 또는 QueryRunner |
| transaction 안의 `tx.model` | 전달받은 `manager.getRepository(Entity)` |
| raw `SELECT ... FOR UPDATE` | 같은 transaction manager의 QueryBuilder에서 `pessimistic_write` |
| Prisma Migrate | TypeORM migration generate/run/revert |

가장 중요한 번역 규칙은 transaction handle이다. TypeORM transaction 안에서 평소 주입받은 전역 Repository를 섞지 않고, callback manager나 QueryRunner manager가 만든 Repository만 사용한다.

`$transaction`과 TypeORM transaction은 여러 DB 작업의 commit/rollback 경계를 만든다. 단순히 감쌌다는 이유로 read-modify-write race가 해결되지는 않는다. 재고나 잔액은 조건부 UPDATE, 적절한 isolation, optimistic version 또는 pessimistic lock 중 충돌 특성에 맞는 제어가 필요하다.

## Entity, domain model과 DTO

ORM Entity를 domain model과 통합할지 mapper로 분리할지는 복잡도에 따른 선택이다.

- 단순 CRUD이고 schema와 domain 형태가 비슷하면 통합 모델이 비용이 낮다.
- 핵심 domain의 불변식과 저장 구조가 크게 다르거나 Redis, RDB처럼 adapter가 여럿이면 domain model과 persistence model을 분리할 이점이 커진다.
- 어느 쪽이든 HTTP DTO나 Redis record를 ORM Entity와 그대로 공유하지 않는다.
- controller는 입력 binding과 validation, response 변환을 맡고 application service가 use case를 조정한다.

## N+1과 query shape

N+1은 부모 N건을 읽은 뒤 각 부모의 relation을 따로 읽어 query가 `1 + N`개가 되는 문제다. 해결책을 eager loading 하나로 고정하지 않는다.

- 필요한 relation만 join하거나 batch query한다.
- 목록 API는 필요한 column만 projection하고 pagination을 명시한다.
- 복잡한 read model은 QueryBuilder, raw SQL 또는 별도 query service를 사용한다.
- 실제 SQL 수, 실행 계획과 반환 row 수로 개선 여부를 검증한다.

## 관련 문서
- [[SQL]]
- [[Transactions|트랜잭션]]
- [[NestJS-Persistence|NestJS 영속성 통합]]
- [[NestJS-Database|NestJS Database, TypeORM]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
- [[Lock|DB Lock]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[JPA|JPA와 Jakarta Persistence]]

## 출처
- [NestJS — Prisma](https://docs.nestjs.com/recipes/prisma)
- [NestJS — Database와 TypeORM](https://docs.nestjs.com/techniques/database)
- [TypeORM — Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM — Relations](https://typeorm.io/docs/relations/relations/)
- [TypeORM — One-to-one relations](https://typeorm.io/docs/relations/one-to-one-relations/)
- [TypeORM — Many-to-many relations](https://typeorm.io/docs/relations/many-to-many-relations/)
- [TypeORM — Eager and Lazy Relations](https://typeorm.io/docs/relations/eager-and-lazy-relations/)
- [Prisma — Introspection과 db pull](https://www.prisma.io/docs/orm/prisma-schema/introspection)
- [Prisma — Generating Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [Prisma — Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [Prisma — Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- 김빌 강사, [Prisma 기본](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273676), [Repository 구현](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273677), [서비스 로직](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273679), [비관적 락 개념](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273680), [비관적 락 구현](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273681)
- 강의: [도메인과 ERD](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=97057), [TypeORM Entity 관계](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=94369)
