---
tags: [database, orm, typeorm, prisma, mikroorm, nestjs, comparison, adoption]
status: done
verified_at: 2026-08-13
category: "Data & Storage"
aliases: ["ORM", "TypeORM vs Prisma", "Prisma vs TypeORM vs MikroORM", "NestJS ORM"]
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

## Prisma, TypeORM, MikroORM에서 TypeORM의 위치

지원하는 관계형 DB를 기준으로 세 ORM 모두 relation, transaction, migration과 복잡 SQL 탈출구를 제공한다. MikroORM도 SQL QueryBuilder, Kysely와 `em.execute()`까지 내려가므로 SQL 접근 깊이를 TypeORM의 고유 강점으로 보지 않는다. TypeORM이 중간처럼 보이는 이유는 schema 생성 client와 요청별 Unit of Work 사이에서 Entity와 명시적 persistence API를 중심으로 삼기 때문이다.

| 관점 | Prisma 공식 문서 | TypeORM 1.1.0 | MikroORM 7.1.11 |
|---|---|---|---|
| 중심 모델 | schema DSL에서 생성한 client | Entity와 Repository, EntityManager | 요청별 EntityManager, Identity Map과 Unit of Work |
| 쓰기 경계 | `create`, `update` 같은 client 호출 | `save`, `insert`, `update`, `remove`를 명시 | managed graph 변경을 모아 `flush()` |
| 타입 보장 | 선택, 입력과 결과 타입을 schema에서 생성 | FindOptions는 typed API, QueryBuilder는 문자열 property path와 raw 경계 존재 | Entity metadata와 populate 타입, raw 경계는 별도 확인 |
| SQL 탈출구 | TypedSQL, `$queryRaw` | QueryBuilder, QueryRunner, `query()` | SQL QueryBuilder, Kysely, `em.execute()` |
| 요청 상태 | Entity 객체 동일성 계약 없음 | 요청별 Identity Map을 기본 계약으로 요구하지 않음 | 요청마다 격리된 EntityManager가 필요 |
| NestJS 배선 | `PrismaClient` provider와 recipe | Nest가 관리하는 `@nestjs/typeorm` 통합 | `@mikro-orm/nestjs` 통합과 request context |

### TypeORM의 이점과 함께 생기는 비용

| 구조 | 이점 | 함께 생기는 비용 |
|---|---|---|
| 명시적 persistence | 영속화 호출과 선택한 transaction handle이 코드에 드러남 | 요청 범위 graph 변경 추적과 flush batching은 중심 계약이 아님 |
| Repository에서 QueryRunner까지 이어지는 API | 단순 CRUD부터 connection 제어까지 한 도구로 이동 | API가 많아 `save`와 direct DML, `DataSource.manager`와 transaction manager를 섞기 쉬움 |
| Active Record와 Data Mapper 지원 | 작은 앱과 NestJS DI 구조 중 상황에 맞는 패턴 선택 | 한 코드베이스에서 두 패턴을 섞으면 책임 경계가 흐려짐 |
| 넓은 driver와 platform 범위 | 공식 목록에 SAP HANA, Google Spanner와 여러 mobile runtime 포함 | DB별 SQL, isolation과 migration 동작의 이식성은 별도 검증 |
| NestJS 통합과 기존 자산 호환 | Repository 주입, 테스트 대체와 기존 Entity, migration 재사용 | TypeORM 계약이 넓게 퍼질수록 교체와 major upgrade 비용 증가 |

Prisma보다 schema 기반 query 타입 보장이 약하고, MikroORM보다 요청 안 객체 동일성, graph change tracking과 flush batching이 덜 중심적이다. QueryBuilder의 alias, property path와 raw SQL fragment는 문자열이라 컴파일 단계에서 column 존재 여부를 모두 검증하지 못한다. 1.1.0의 `addOrderBy()`는 Entity property와 물리 DB column 이름을 모두 해석하지만 한 규칙으로 표준화하고 integration test를 둔다. 반대로 generated client workflow나 요청별 managed state가 필요하지 않은 CRUD API, batch와 queue worker에서는 명시적 API가 더 단순할 수 있다.

### TypeORM 선택이 제한되는 조건

보편적으로 TypeORM을 반드시 도입해야 하는 기능은 없다. 세 ORM 안에서 후보가 하나로 좁혀지는 제약과, 기존 TypeORM을 유지하는 편이 싼 상황을 구분한다.

#### 세 ORM 중 후보가 사실상 하나로 좁혀지는 경우

- **필수 DB가 SAP HANA 또는 Google Spanner다.** 2026-08-13 공식 지원 목록을 대조하면 Prisma와 MikroORM은 두 DB를 명시하지 않고 TypeORM은 공식 driver를 제공한다. 세 ORM만 비교하면 TypeORM이 유일한 공식 지원 후보지만, native driver나 다른 data access 도구까지 포함하면 선택은 다시 열릴 수 있다. 필요한 isolation, type, migration과 핵심 query는 실제 DB에서 검증한다.
- **변경할 수 없는 외부 계약이 TypeORM Entity, Repository 또는 DataSource를 직접 요구한다.** adapter로 격리할 수도 없고 해당 계약을 그대로 구현해야 할 때만 hard constraint다.

#### TypeORM 유지가 기본값이 되는 경우

- 기존 NestJS 시스템의 Entity, migration, custom Repository, subscriber와 QueryRunner 자산이 크다.
- 측정된 전환 이득이 migration 비용, 회귀 위험과 팀 학습 비용보다 작다.

이는 TypeORM만 가능한 기능이 아니라 전환을 보류하는 경제성 판단이다. NestJS 사용, PostgreSQL/MySQL, 복잡 SQL, transaction이나 migration 필요만으로도 후보가 제한되지는 않는다. 세 ORM 모두 해결 경로가 있으므로 실제 workload와 운영 비용을 비교한다.

### 선택 규칙

1. SAP HANA나 Spanner가 필수이면 TypeORM을 첫 후보로 검증한다.
2. 요청별 객체 동일성, graph 변경 감지와 `flush()` batching이 측정된 문제를 해결하면 MikroORM을 검증한다.
3. schema에서 생성되는 query 입력과 결과 타입이 가장 중요한 계약이면 Prisma를 검증한다.
4. 어느 조건도 없다면 기존 자산을 유지하고 SQL, index, query shape와 transaction 경계를 먼저 개선한다.

TypeORM을 선택할 때의 근거는 기능 수가 아니라 `필수 driver 또는 기존 계약 + 명시적 write 경계 + 전환 비용`이어야 한다. 1.1.0 runtime과 upgrade gate는 [[TypeORM-Version-Guide|TypeORM 1.1.0 버전 가이드]]에서 따로 확인한다.

세 ORM 모두 DB의 isolation과 constraint 위에서 동작한다. API 모양이 다르다고 lost update, deadlock과 dual write가 사라지지 않는다.

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
- 복잡한 read model은 QueryBuilder, raw SQL 또는 별도 query service를 사용한다. raw SQL로 내려갈 때는 ORM이 대신 해주던 파라미터 바인딩이 사라지므로 값을 문자열로 이어붙이지 않는다([[SQL-Injection]]).
- 실제 SQL 수, 실행 계획과 반환 row 수로 개선 여부를 검증한다.

### 본인 실무 사례 — Prisma relationLoadStrategy

실무에서 직접 겪은 사례다. IoT 재고관리(VMI) 서비스에서 relation join이 필요한 기능을 추가한 뒤 특정 목록 API가 평균 100ms에서 최대 약 1,000ms까지(약 10배) 느려졌다. query log를 보니 ORM이 join 하나를 만드는 대신 relation마다 별도 query를 순차 발행해 한 요청에 4개가 나가고 있었다.

raw query로 내려가는 선택지를 먼저 검토했지만 type 안전성과 유지보수 비용을 잃는 대가가 커서 보류하고, 공식 문서에서 `relationLoadStrategy` 옵션을 찾았다. `join`으로 바꾸면 DB 수준 join이 될 것이라 예상했는데 실제 생성 SQL은 subquery와 JSON 함수로 relation을 묶는 형태였다. 예상과 달랐기 때문에 생성되는 SQL 형태를 먼저 확인하고, 두 형태의 실행 계획을 비교해 순차 4-query 방식보다 낫다는 것과 실측 응답 시간이 줄어드는 것을 확인한 뒤 적용했다.

결과는 요청당 4개 query가 1개 복합 subquery로 통합되고, 적용 전 대비 실측 응답 시간이 82~90% 줄었다. raw query로 내려가지 않고 ORM 안에서 끝났다.

배운 점은 옵션 이름이 생성 SQL의 형태를 보장하지 않는다는 것이다. `join`이라는 이름만 믿었다면 검증 없이 적용했을 것이고, 반대로 예상과 다르다는 이유로 되돌렸다면 더 나은 계획을 버릴 뻔했다. 판단 근거는 옵션 이름이 아니라 실행 계획이다.

## 관련 문서
- [[Prisma-Query-Performance|Prisma 쿼리 계측과 relation 로딩 전략]]
- [[TypeORM|TypeORM 실무 가이드]]
- [[MikroORM|MikroORM 학습 지도]]
- [[SQL]]
- [[Transactions|트랜잭션]]
- [[NestJS-Persistence|NestJS 영속성 통합]]
- [[NestJS-Database|NestJS Database, TypeORM]]
- [[Domain-Model|Domain Model]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
- [[Lock|DB Lock]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[JPA|JPA와 Jakarta Persistence]]

## 출처
- [NestJS — Prisma](https://docs.nestjs.com/recipes/prisma)
- [NestJS — Database와 TypeORM](https://docs.nestjs.com/techniques/database)
- [TypeORM — Getting Started](https://typeorm.io/docs/getting-started/)
- [TypeORM — Data Source Options](https://typeorm.io/docs/data-source/data-source-options/)
- [TypeORM — Active Record vs Data Mapper](https://typeorm.io/docs/guides/active-record-data-mapper/)
- [TypeORM — Release Notes 1.0](https://typeorm.io/docs/releases/1.0/release-notes/)
- [TypeORM — Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM — Relations](https://typeorm.io/docs/relations/relations/)
- [TypeORM — One-to-one relations](https://typeorm.io/docs/relations/one-to-one-relations/)
- [TypeORM — Many-to-many relations](https://typeorm.io/docs/relations/many-to-many-relations/)
- [TypeORM — Eager and Lazy Relations](https://typeorm.io/docs/relations/eager-and-lazy-relations/)
- [Prisma — Introspection과 db pull](https://www.prisma.io/docs/orm/prisma-schema/introspection)
- [Prisma — Generating Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [Prisma — Databases supported by Prisma ORM](https://www.prisma.io/docs/orm/reference/supported-databases)
- [Prisma — Type safety](https://docs.prisma.io/docs/orm/prisma-client/type-safety)
- [Prisma — Raw queries](https://docs.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [Prisma — Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [Prisma — Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [MikroORM — Configuration과 driver](https://mikro-orm.io/docs/configuration)
- [MikroORM — Unit of Work](https://mikro-orm.io/docs/unit-of-work)
- [MikroORM — Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [MikroORM — QueryBuilder와 native SQL](https://mikro-orm.io/docs/query-builder)
- 본인 블로그: [Prisma 한방 쿼리로 성능 개선](https://dc-choi.tistory.com/92)
- 김빌 강사, [Prisma 기본](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273676), [Repository 구현](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273677), [서비스 로직](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273679), [비관적 락 개념](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273680), [비관적 락 구현](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273681)
- 강의: [도메인과 ERD](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=97057), [TypeORM Entity 관계](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=94369)
