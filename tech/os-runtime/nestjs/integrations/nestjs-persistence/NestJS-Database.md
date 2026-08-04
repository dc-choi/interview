---
tags: [nestjs, typeorm, database, transaction, repository]
status: done
verified_at: 2026-08-04
category: "OS & Runtime - NestJS"
aliases: ["NestJS Database", "@nestjs/typeorm", "TypeOrmModule"]
---

# NestJS Database — @nestjs/typeorm

`TypeOrmModule.forRoot()`는 TypeORM `DataSource` 생성자의 모든 옵션을 받고, 그 위에 Nest 전용 옵션을 얹는다. forRoot가 끝나면 `DataSource`와 `EntityManager`는 모듈 import 없이 **프로젝트 전역에서 주입 가능**하다.

## forRoot의 Nest 전용 옵션

| 옵션 | 기본값 | 의미 |
|------|--------|------|
| `retryAttempts` | 10 | DB 연결 재시도 횟수 |
| `retryDelay` | 3000ms | 재시도 간격 |
| `autoLoadEntities` | false | forFeature 등록 엔티티 자동 수집 |

- `synchronize: true`는 **운영 금지** — 스키마를 엔티티에 맞춰 바꾸면서 운영 데이터를 잃을 수 있다.

## Repository 등록 — forFeature

- `TypeOrmModule.forFeature([User])`가 **현재 모듈 스코프**에 Repository를 등록 → `@InjectRepository(User)`로 주입. 모듈 밖에서 쓰려면 `exports: [TypeOrmModule]`로 재export.
- **autoLoadEntities 함정**: forFeature로 등록된 엔티티만 자동 수집된다. 관계(relation)로만 참조되고 forFeature에 안 올라간 엔티티는 포함되지 않는다.
- 루트 모듈 entities 배열에 손으로 나열하면 도메인 경계가 새므로 autoLoadEntities가 권장 경로. glob 패턴 나열은 webpack(HMR, monorepo 빌드)과 비호환이라는 이유도 있다.

## Custom Repository 버전 경계

오래된 TypeORM 예제의 `@EntityRepository()`, `AbstractRepository`와 `getCustomRepository()`는 현재 TypeORM에서 제거됐다. 기본 경로는 `TypeOrmModule.forFeature([User])`와 `@InjectRepository(User)`이고, domain 전용 query는 두 방식 중 하나로 둔다.

- Nest provider class가 주입받은 `Repository<User>`를 감싸고 의미 있는 query method를 노출한다. DI, mock과 application port 연결이 단순하다.
- TypeORM repository object 자체를 확장해야 하면 `dataSource.getRepository(User).extend({ ... })`를 쓴다. transaction 안에서는 전역 custom repository를 재사용하지 않고 callback의 `manager.withRepository(UserRepository)`로 transaction 전용 instance를 얻는다.

두 방식 모두 transaction 안에서 평소 주입받은 전역 repository를 섞지 않는다. callback manager의 `getRepository()` 또는 QueryRunner의 `manager`에서 시작해야 같은 connection과 transaction 경계를 공유한다.

## 트랜잭션

- **QueryRunner 방식 (공식 권장)** — 완전한 제어: `dataSource.createQueryRunner()` → `connect()` → `startTransaction()` → 작업 → `commitTransaction()`/`rollbackTransaction()` → **finally에서 `release()` 필수** (수동 생성한 QueryRunner는 반납 안 하면 커넥션 누수).
- **콜백 방식** — `dataSource.transaction(async manager => { ... })`. manager로 수행한 작업이 한 트랜잭션.
- 테스트 관점: QueryRunner를 그대로 쓰면 DataSource 전체를 mock해야 하므로, 트랜잭션에 필요한 메서드만 노출하는 `QueryRunnerFactory` 헬퍼로 감싸는 것이 공식 권장.

## Subscriber

- `@EventSubscriber()` + `EntitySubscriberInterface<User>` 구현, 생성자에서 `dataSource.subscribers.push(this)`로 등록. `listenTo()`가 대상 엔티티, `beforeInsert` 등 이벤트 훅.
- **request-scoped 불가** (공식 경고).

## Migration

- TypeORM CLI가 생성, 실행, 롤백을 전담. 마이그레이션 클래스는 **Nest 앱 소스와 분리**되어 TypeORM CLI가 수명주기를 관리하므로 **DI 등 Nest 기능을 쓸 수 없다**.

## 다중 데이터베이스

- `forRoot({ name: 'albumsConnection', ... })` — name 미지정 시 `default`. **이름 없는(또는 같은 이름) 커넥션이 여럿이면 서로 덮어써진다.**
- `forRootAsync`에서는 `name`을 **useFactory 밖에도** 지정해야 한다.
- 주입 시 커넥션 이름 전달: `@InjectRepository(User, 'albumsConnection')`, `@InjectDataSource('albumsConnection')`, `@InjectEntityManager('albumsConnection')`.

## 테스트와 비동기 설정

- 단위 테스트에서는 `getRepositoryToken(Entity)`을 provide 토큰으로 mock Repository를 바인딩 — 상세는 [[NestJS-Testing]].
- `forRootAsync({ useFactory, inject })`로 ConfigService 의존 설정. `dataSourceFactory`를 함께 주면 TypeOrmModule 대신 **직접 DataSource를 생성해 반환**할 수 있다 (커스텀 초기화, 래핑).

## 관련 문서

- [[NestJS-TypeORM-Manual-Wiring|TypeORM 수동 배선 (커스텀 프로바이더 — 하부 원리)]]
- [[ORM|ORM (Sequelize, TypeORM, Prisma 비교)]]
- [[NestJS-Testing|NestJS Testing (getRepositoryToken mock)]]
- [[NestJS-Module-Dynamic|Dynamic Module (forRoot/forFeature 컨벤션)]]
- [[NestJS-Configuration|Configuration (asProvider로 forRootAsync 연결)]]

## 출처
- [NestJS — Database](https://docs.nestjs.com/techniques/database)
- [NestJS — Hot Reload](https://docs.nestjs.com/recipes/hot-reload)
- [TypeORM — Custom repositories](https://typeorm.io/docs/working-with-entity-manager/custom-repository/)
- [TypeORM — 0.3에서 1.0으로 업그레이드](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- John Ahn 강사 커리큘럼: [Repository 생성하기](https://www.inflearn.com/courses/lecture?courseId=327527&unitId=87234)
