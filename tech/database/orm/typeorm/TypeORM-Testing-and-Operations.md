---
tags: [database, orm, typeorm, testing, logging, cache, subscriber]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Testing", "TypeORM Operations", "TypeORM 운영 진단"]
---

# TypeORM 테스트와 운영 진단

ORM의 정상 동작은 method 호출이 오류 없이 끝났다는 사실만으로 증명되지 않는다. 실제 DB에서 생성 SQL, 반환 결과, transaction 경계, schema와 pool 상태까지 이어지는 증거가 필요하다.

이 문서의 API와 기본값은 TypeORM `1.1.0`을 기준으로 한다. 다른 버전이나 다른 DB driver를 적용할 때는 같은 테스트를 실제 조합에서 다시 실행한다.

## 검증 층

| 층 | 빠르게 확인할 것 | 잡지 못하는 것 |
|---|---|---|
| Unit | service 분기, Repository 호출 계약 | SQL, driver와 transaction |
| Metadata | Entity, column, relation과 migration 탐색 | 실제 DB dialect와 lock |
| Integration | 실제 engine의 SQL, constraint, commit과 rollback | 전체 HTTP와 배포 설정 |
| E2E | 요청부터 DB 결과까지 | 운영 traffic 분포와 장기 성능 |
| Canary | 실제 image, pool, latency와 오류율 | 관찰하지 않은 장기 edge case |

Mock Repository만 통과한 결과를 ORM 호환 증거로 쓰지 않는다. SQL 의미가 중요한 핵심 경로는 운영과 같은 DB engine에서 검증한다.

## NestJS 단위 테스트

`@nestjs/typeorm`은 Entity와 DataSource 이름으로 Repository token을 만든다.

```ts
const moduleRef = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: getRepositoryToken(User),
      useValue: {
        findOneBy: jest.fn(),
        save: jest.fn(),
      },
    },
  ],
}).compile()
```

- 실제 service가 호출하는 최소 method만 대역에 둔다.
- Named DataSource라면 `getRepositoryToken(User, name)`에도 같은 이름을 전달한다.
- `save()` mock이 DB의 unique, cascade와 listener 동작까지 흉내 낸다고 가정하지 않는다.
- QueryRunner를 직접 쓰는 service는 필요한 lifecycle만 노출한 작은 factory를 주입하면 대역이 단순해진다.

자세한 TestingModule 구성은 [[NestJS-Testing|NestJS Testing]]에서 다룬다.

## 실제 DB 통합 테스트

운영이 MySQL이면 SQLite in-memory로 dialect 고유 동작을 증명할 수 없다. 다음 계약은 실제 MySQL 또는 동일 major version의 격리 DB에서 확인한다.

- Entity metadata와 migration으로 빈 schema를 구성할 수 있는가
- `save`, `insert`, `update`, `upsert`가 의도한 row와 특수 컬럼을 바꾸는가
- FK, unique, nullable, precision과 collation이 migration대로 생성됐는가
- relation join과 pagination이 중복이나 누락 없이 정렬되는가
- transaction 중간 오류가 모든 변경을 rollback하는가
- lock wait, deadlock과 retry 정책이 호출자에게 올바르게 드러나는가
- soft delete의 기본 scope와 `withDeleted`가 일치하는가

테스트 자체를 바깥 transaction으로 감싸 매번 rollback하면 commit 후 subscriber나 별도 connection 경로를 숨길 수 있다. 검증 목표에 따라 TRUNCATE 또는 격리 database를 사용한다.

## SQL 회귀 증거

QueryBuilder는 실행 전 SQL과 parameter를 보여준다.

```ts
const [sql, parameters] = repository
  .createQueryBuilder("user")
  .where("user.id = :id", { id: 1 })
  .getQueryAndParameters()
```

문자열 전체 snapshot은 alias나 quoting의 무의미한 변화에도 깨진다. 다음을 함께 본다.

- SQL shape: join, predicate, order, limit와 lock 존재 여부
- Parameter: 값이 문자열 결합되지 않고 binding되는가
- Result shape: row 수, null, pagination 순서와 projection type
- Plan: scan row, 선택된 index, sort와 temporary table 여부

Upgrade 비교는 normalized SQL만으로 끝내지 않고 같은 fixture의 결과를 비교한다.

## Logging

```ts
new DataSource({
  // ...
  logging: ["error", "warn"],
  maxQueryExecutionTime: 1_000,
})
```

지원 log 종류는 `query`, `error`, `schema`, `warn`, `info`와 `log`다. `logging: true`는 query와 error를 활성화한다.

- 개발에서는 query log로 N+1과 parameter shape를 찾는다.
- 운영에서는 error와 slow query를 구조화해 trace, endpoint와 DataSource를 연결한다.
- 비밀번호, token과 개인정보가 parameter에 포함될 수 있으므로 무조건적인 query log를 피한다.
- `maxQueryExecutionTime`은 logger가 긴 query를 기록하는 기준이지 DB statement timeout이 아니다.
- 제품 관측 시스템과 연결하려면 `Logger` 또는 `AbstractLogger` 구현을 주입할 수 있다.

로그가 실제 DB 실행 시간, pool 대기와 entity hydration 시간을 어떻게 나누는지는 logger 구현과 계측 지점을 확인한다.

## Listener와 Subscriber

| 항목 | Entity listener | Subscriber |
|---|---|---|
| 위치 | Entity method | 별도 class |
| 범위 | 해당 Entity lifecycle | 특정 Entity 또는 전체 이벤트 |
| DB 호출 | 공식 문서는 피하도록 안내 | event manager 또는 QueryRunner 사용 |
| 적합한 책임 | 값 정규화 같은 로컬 동작 | audit, query/transaction 관찰과 교차 관심사 |

Listener decorator에는 `AfterLoad`, insert, update, remove, soft-remove와 recover 전후가 있다. `BeforeUpdate`와 `AfterUpdate`는 `save()` 대상 모델의 값이 실제로 바뀔 때 실행된다.

Subscriber의 event에는 해당 작업의 `dataSource`, `queryRunner`와 `manager`가 들어 있다. Subscriber 안에서 추가 DB 작업을 한다면 이 manager를 써야 현재 transaction에 참여한다.

```ts
afterUpdate(event: UpdateEvent<User>) {
  // event.entity는 update()에 넘긴 partial만 가질 수 있다.
}
```

`Repository.update()`는 전체 Entity를 hydrate하지 않으므로 event의 PK와 이전 값이 항상 있다고 가정하지 않는다. Subscriber에 핵심 business invariant를 숨기기보다 application service와 DB constraint에 경계를 둔다.

## Query result cache

```ts
const users = await repository.find({
  where: { isActive: true },
  cache: { id: "active-users", milliseconds: 5_000 },
})
```

- DataSource의 `cache`를 먼저 활성화해야 한다.
- 기본 TTL은 1,000ms이고 기본 저장소는 `query-result-cache` table이며 Redis와 ioredis도 선택할 수 있다.
- ID를 정하면 `dataSource.queryResultCache.remove([id])`로 명시 삭제할 수 있다.
- `ignoreErrors`는 cache 장애 때 DB query로 통과시킬지를 정한다.

```ts
if (!dataSource.queryResultCache) throw new Error("query result cache is not configured")
await dataSource.queryResultCache.remove(["active-users"])
```

Cache 창 안의 쓰기는 즉시 보이지 않을 수 있다. TypeORM이 domain write를 이해해 모든 관련 query cache를 자동 무효화한다고 가정하지 않는다. 허용 가능한 stale window, key, 삭제 시점과 cache 장애 정책을 먼저 정한다. 운영에서 cache table을 만들기 위해 `synchronize`를 켜지 않고 migration으로 관리한다. 0.3에서 1.1.0으로 올리면 hashing 변화로 기존 entry가 무효화될 수 있다.

## 자주 발생하는 실패

| 증상 | 먼저 확인할 경계 |
|---|---|
| Entity metadata not found | Entity 등록, import identity, build glob |
| Migration이 0개로 보임 | CLI DataSource, `.ts/.js`, image COPY와 cwd |
| 알 수 없는 column/property | QueryBuilder property path와 실제 column 이름 |
| 목록 중복 또는 누락 | to-many join, order tie-breaker와 pagination |
| Transaction 밖에서 일부 commit | callback manager, QueryRunner manager 혼용 |
| Pool 고갈 | QueryRunner `release()`, 긴 transaction과 pool 대기 |
| 쓰기 직후 옛 값 조회 | read replica routing과 master 강제 여부 |
| Subscriber 정보 부족 | `update()` partial, bulk DML과 lifecycle 차이 |
| 운영에서만 느림 | 실제 cardinality, plan, N+1과 hydration 비용 |

오류 message만 고치지 말고 DataSource, 호출 API, 생성 SQL, driver와 DB error 원문을 한 흐름으로 추적한다.

## 운영 체크리스트

- [ ] DataSource 초기화 실패가 배포 실패로 드러난다.
- [ ] QueryRunner를 모든 성공과 실패 경로에서 release한다.
- [ ] 오류 log에 query 종류, DataSource와 driver error code가 보존된다.
- [ ] Slow query 기준과 DB statement timeout을 구분해 설정했다.
- [ ] 핵심 query의 호출 수, latency와 반환 row 수를 관찰한다.
- [ ] Cache stale window와 무효화 owner가 정해져 있다.
- [ ] Migration 상태와 실제 schema drift를 별도로 확인한다.
- [ ] Upgrade 전후 실제 image와 DB로 같은 regression suite를 실행한다.

## 관련 문서

- [[NestJS-Testing|NestJS Testing]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[DB-Incident-Triage|DB 장애 분석 방법론]]

## 출처

- [Database, Testing - NestJS](https://docs.nestjs.com/techniques/database)
- [Select QueryBuilder, debugging - TypeORM](https://typeorm.io/docs/query-builder/select-query-builder/)
- [Logging - TypeORM](https://typeorm.io/docs/logging/)
- [Listeners and Subscribers - TypeORM](https://typeorm.io/docs/listeners-and-subscribers/)
- [Caching queries - TypeORM](https://typeorm.io/docs/query-builder/caching/)
- [Upgrading from 0.3 to 1.0 - TypeORM](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
