---
tags: [database, orm, typeorm, datasource, nestjs]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Overview", "TypeORM DataSource", "TypeORM 개요"]
---

# TypeORM 개요와 DataSource

TypeORM은 TypeScript와 JavaScript 애플리케이션에서 객체와 데이터베이스 row를 매핑하고, Repository, QueryBuilder, transaction과 migration API를 제공하는 ORM이다. 반복적인 매핑과 SQL 조립을 줄이지만 schema, constraint, isolation, index와 실행 계획을 대신 설계하지는 않는다.

## 이 vault의 버전 기준

- 모든 본문과 예제는 2026-08-13에 확인한 TypeORM `1.1.0`을 기준으로 한다.
- 1.1.0은 Node.js `^20.19.0 || ^22.13.0 || >=24.11.0`과 ES2023 실행 환경을 요구한다.
- NestJS 학습 조합은 TypeORM v1 지원이 명시된 `@nestjs/typeorm@11.0.1`로 고정한다.
- 기존 0.3 애플리케이션에 적용할 때는 [[TypeORM-Version-Guide|1.1.0 버전 가이드]]의 제거 API와 동작 변경을 먼저 확인한다.

MySQL 기반 NestJS 학습 환경이라면 필요한 package 집합은 다음처럼 작게 시작한다.

```bash
npm install typeorm@1.1.0 reflect-metadata mysql2
npm install @nestjs/typeorm@11.0.1
```

PostgreSQL 등 다른 DB를 쓰면 `mysql2` 대신 1.1.0 package metadata가 허용하는 해당 driver를 설치한다. 전역 TypeORM CLI를 따로 설치하기보다 프로젝트에 고정된 `npx typeorm`을 사용한다.

## 핵심 mental model

```text
DataSource
  ├─ 설정, driver, connection pool, metadata
  ├─ EntityManager: 등록된 모든 Entity 작업
  ├─ Repository<Entity>: 한 Entity 작업
  ├─ QueryRunner: 풀에서 점유한 한 connection
  └─ Migration, Subscriber, Query Result Cache
```

`DataSource`는 단순 설정 객체가 아니다. 어떤 Entity와 migration을 로드할지, 어느 driver와 pool을 쓸지, query를 어떻게 기록하고 cache할지를 묶는 실행 경계다. 같은 프로세스에 여러 DataSource를 둘 수 있지만 각 인스턴스는 별도 연결과 transaction 경계를 가진다.

## Data Mapper와 Active Record

TypeORM은 두 패턴을 지원한다.

| 패턴 | 호출 형태 | 특징 |
|---|---|---|
| Data Mapper | `repository.save(user)` | Entity와 저장 API가 분리되고 DI와 테스트 경계가 선명함 |
| Active Record | `user.save()` | `BaseEntity`를 상속해 작은 애플리케이션에서 호출이 짧음 |

NestJS에서는 `TypeOrmModule.forFeature()`와 `@InjectRepository()`를 쓰는 Data Mapper가 기본 선택이다. Entity가 전역 DataSource 상태를 직접 찾지 않아 module 경계, transaction 전용 Repository와 테스트 대역을 다루기 쉽다.

## 초기 설정

Decorator 기반 Entity를 쓰는 일반적인 TypeScript 설정은 다음 요소를 요구한다.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

앱 진입점에서는 metadata polyfill이 로드되어야 한다.

```ts
import "reflect-metadata"
```

Decorator를 원하지 않으면 `EntitySchema`로 매핑을 분리할 수 있다. 두 방식을 한 Entity에 중복 정의하지 않는다.

## DataSource 생명주기

```ts
import { DataSource } from "typeorm"

export const appDataSource = new DataSource({
  type: "mysql",
  url: process.env.DATABASE_URL,
  entities: [User, Order],
  migrations: [__dirname + "/migrations/*{.js,.ts}"],
  synchronize: false,
  logging: ["error", "warn"],
})

await appDataSource.initialize()
// 종료 hook에서 await appDataSource.destroy()
```

- 생성자는 설정과 metadata 후보를 보유할 뿐 DB 연결을 완료하지 않는다.
- `initialize()`가 초기 연결 또는 pool을 만들고 metadata를 구성한다.
- `isInitialized`로 현재 상태를 확인할 수 있다.
- `destroy()`는 pool의 연결을 닫는다. 장기 실행 서버에서는 종료 hook에서 호출한다.
- 같은 인스턴스를 요청마다 새로 만들지 않는다. pool을 재사용하는 애플리케이션 수명 객체다.

초기화 실패를 log만 남기고 정상 부팅처럼 계속 진행하면 첫 요청에서 늦게 실패한다. DB가 필수 의존성이면 부팅을 실패시키고 배포 시스템이 재시도하게 한다.

## 운영 기본값

```ts
const options: DataSourceOptions = {
  type: "mysql",
  url: process.env.DATABASE_URL,
  entities: [User, Order],
  migrations: [__dirname + "/migrations/*.js"],
  synchronize: false,
  dropSchema: false,
  migrationsRun: false,
  logging: ["error", "warn"],
  maxQueryExecutionTime: 1_000,
}
```

- `synchronize: true`는 시작 시 Entity에 맞춰 schema를 바꾸므로 운영에서 사용하지 않는다.
- `dropSchema: true`는 초기화할 때 schema를 삭제하므로 테스트 전용으로도 대상을 엄격히 격리한다.
- `migrationsRun`은 자동 적용 정책이다. 켠다면 여러 replica의 동시 부팅과 migration lock을 배포 설계에서 해결해야 한다.
- `logging: true`는 query와 error를 모두 기록한다. 운영에서는 필요한 종류와 민감정보 정책을 먼저 정한다.
- `extra`는 하부 driver 옵션을 그대로 전달하는 탈출구다. pool 옵션의 이름과 의미는 driver 버전에서 확인한다.

## Entity 등록과 산출물

`entities`, `migrations`와 `subscribers`에는 class 또는 glob을 등록할 수 있다. Source 환경의 `.ts` 경로가 빌드 image의 `.js` 경로에서도 맞는다는 보장은 없다.

```ts
entities: [__dirname + "/**/*.entity{.js,.ts}"]
```

두 확장자를 함께 쓰면 개발과 빌드 환경을 포괄할 수 있지만, 오래된 `.js`와 새 `.ts`가 같은 작업 디렉터리에 함께 남으면 같은 Entity가 중복 로드될 수 있다. 실제 배포 산출물에서 `entityMetadatas`와 migration 목록을 검증하는 편이 확실하다.

## API 선택 기준

| 요구 | 먼저 쓸 API |
|---|---|
| 한 Entity의 단순 CRUD | `Repository<Entity>` |
| 여러 Entity를 같은 범용 API로 처리 | `EntityManager` |
| 동적 조건, join, projection, aggregate | `QueryBuilder` |
| 여러 작업의 원자성 | `DataSource.transaction()` |
| connection, commit 시점과 복제 대상을 직접 제어 | `QueryRunner` |
| schema 변경 | versioned migration |

복잡한 SQL을 억지로 `FindOptions`에 넣는 것과 단순 PK 조회를 QueryBuilder로 길게 만드는 것 모두 비용이다. 가장 높은 수준에서 요구를 정확히 표현하는 API를 선택하고, 생성 SQL을 확인한다.

## NestJS에서의 위치

`@nestjs/typeorm`은 DataSource 생성과 Repository token 등록을 Nest DI에 연결한다.

- `TypeOrmModule.forRoot()` 또는 `forRootAsync()`가 DataSource를 만든다.
- `TypeOrmModule.forFeature([User])`가 현재 module에 `Repository<User>`를 등록한다.
- `@InjectRepository(User)`가 그 token을 주입한다.
- transaction 안에서는 주입받은 전역 Repository 대신 callback manager나 QueryRunner manager에서 Repository를 다시 얻는다.

설정 옵션, 다중 연결과 수동 배선은 [[NestJS-Database|NestJS Database]]와 [[NestJS-TypeORM-Manual-Wiring|TypeORM 수동 배선]]에서 다룬다.

## 추상화의 경계

- Entity decorator는 DB constraint의 의도를 표현하지만 실제 생성 schema를 검토해야 한다.
- `save()` 성공은 외부 API, Kafka와 Redis까지 원자적으로 반영됐다는 뜻이 아니다.
- relation property는 객체 탐색 경로이며, 목록 query의 비용을 자동으로 최적화하지 않는다.
- TypeScript 타입은 runtime 입력 검증과 DB constraint를 대신하지 않는다.
- ORM query가 타입 검사를 통과해도 SQL 의미와 결과 cardinality는 실제 DB에서 검증해야 한다.

## 첫 점검 체크리스트

- [ ] `typeorm@1.1.0`, Nest integration, driver와 Node.js 버전을 lockfile로 확인했다.
- [ ] 앱과 CLI가 같은 Entity, naming strategy와 migration 집합을 본다.
- [ ] 운영 설정에서 `synchronize`와 `dropSchema`가 꺼져 있다.
- [ ] transaction 안에서 전역 Repository를 섞지 않는다.
- [ ] 핵심 query의 SQL, parameter, 실행 계획과 반환 row 수를 볼 수 있다.
- [ ] 실제 DB engine으로 migration과 repository 통합 테스트를 한다.

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[TypeORM-Entities-and-Columns|TypeORM Entity와 Column]]
- [[TypeORM-Repository-and-Find-Options|TypeORM Repository]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]

## 출처

- [Getting Started - TypeORM](https://typeorm.io/docs/getting-started/)
- [DataSource - TypeORM](https://typeorm.io/docs/data-source/data-source/)
- [Data Source Options - TypeORM](https://typeorm.io/docs/data-source/data-source-options/)
- [Active Record vs Data Mapper - TypeORM](https://typeorm.io/docs/guides/active-record-data-mapper/)
- [Database - NestJS](https://docs.nestjs.com/techniques/database)
- [TypeORM 1.1.0 package metadata - TypeORM](https://github.com/typeorm/typeorm/blob/1.1.0/package.json)
