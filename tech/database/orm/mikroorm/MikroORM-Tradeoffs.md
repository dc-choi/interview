---
tags: [database, orm, mikroorm, tradeoffs, risks, adoption]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM 트레이드오프", "MikroORM 단점", "MikroORM Known Issues"]
---

# MikroORM 트레이드오프와 현행 주의점

범위는 2026-08-13에 확인한 stable `7.1.11`이다. 구조적으로 감수하는 비용, 현재 stable에 남은 결함, 아직 결함으로 확정되지 않은 제안을 구분한다. 공개 issue 수만으로 production 안정성을 판정하지 않는다.

## 결론 먼저

MikroORM의 장점과 단점은 같은 구조에서 나온다.

```text
요청 범위 Identity Map + Unit of Work
  -> 같은 row를 같은 객체로 다룸
  -> 객체 graph 변경, cascade, hook과 batching 가능
  -> 대신 EM 생명주기, flush 시점과 managed state를 통제해야 함
```

단순 CRUD API에는 이 상태 관리가 비용일 수 있다. 여러 entity의 관계와 불변식을 한 작업 단위로 바꾸는 domain workflow에는 같은 기능이 이점이 된다. result cache만을 이유로 도입하지 않는다.

## 이점과 대가를 함께 계산한다

| 필요한 능력 | 얻는 이점 | 함께 생기는 비용 | 검증 방법 |
|---|---|---|---|
| aggregate graph 변경 | 변경 감지, cascade, orphan removal과 batch flush | 암묵적 changeset과 flush 순서 | 대표 command의 SQL, constraint와 rollback 확인 |
| 요청 안 객체 동일성 | 동일 PK가 같은 managed object로 합쳐짐 | request별 EM 격리 필수 | 동시 요청과 queue job에서 별도 fork 확인 |
| 복잡한 relation loading | populate와 loading strategy 선택 | join fan-out, 추가 query와 partial state | 실제 cardinality에서 query 수와 row 수 측정 |
| entity lifecycle | hook, subscriber와 custom type 적용 | raw write와 lifecycle 우회 경계 증가 | managed path와 native path를 각각 테스트 |
| transaction propagation | nested savepoint와 선언적 boundary | API별 기본 propagation 차이 | inner failure와 outer commit 시나리오 테스트 |
| SQL escape hatch | QueryBuilder, Kysely와 raw SQL 사용 | Identity Map이 자동 동기화되지 않음 | direct write 뒤 같은 EM의 entity 값 확인 |
| result cache | 반복 query의 DB round trip 절감 | key, TTL, stale window와 invalidation 책임 | hit rate보다 stale read와 무효화 실패를 함께 측정 |

## 캐시는 두 계층이다

| 계층 | 범위 | cache hit 의미 | 일관성 경계 |
|---|---|---|---|
| Identity Map | 한 `EntityManager` | 같은 type과 PK를 같은 객체로 반환 | 요청이 끝나면 EM과 함께 버림 |
| Result cache | ORM instance 또는 custom adapter | query 결과를 TTL 동안 재사용 | write와 자동으로 연결된 invalidation이 아님 |

기본 result cache adapter는 한 ORM instance의 memory를 쓰고 기본 TTL은 1초다. 기본 설정에서는 query별 opt-in이고 `resultCache.global`로 전체 조회에 적용할 수도 있다. 어느 경우에도 여러 process나 pod가 자동으로 공유되지는 않는다.

명시 cache key는 query identity 자체다. 서로 다른 query에 같은 key를 주면 첫 결과가 재사용될 수 있다. write path는 관련 key를 알고 `em.clearCache(key)`를 호출하거나 허용 가능한 TTL을 정해야 한다. 자동 일관성 cache나 JPA/Hibernate의 entity-aware 2차 cache로 해석하지 않는다.

상세 운영 기준은 [[MikroORM-Performance-Troubleshooting|성능과 장애 진단]]을 따른다.

## 구조적으로 생기는 함정

### Stateful EntityManager

global EM을 요청과 job 사이에 공유하면 Identity Map과 snapshot도 공유된다. 이전 작업에서 populate한 relation, 수정 중인 entity와 rollback 뒤 객체가 다음 작업에 영향을 줄 수 있다. HTTP request, queue message, cron 실행마다 `RequestContext` 또는 명시적 `em.fork()`가 필요하다.

`allowGlobalContext`는 단발 script와 제한된 test 편의다. production에서 request context 누락을 숨기는 설정으로 사용하지 않는다.

### rollback은 JavaScript 객체를 되돌리지 않는다

DB transaction이 rollback되어도 메모리 entity property는 과거 값으로 복구되지 않는다. managed 또는 removed instance는 detached될 수 있으므로 같은 객체를 그대로 재시도하지 않는다. 실패 뒤 새 fork에서 다시 읽는 것이 기본 복구 경로다.

### 조회가 write를 먼저 실행할 수 있다

기본 `FlushMode.AUTO`는 query와 pending change가 겹칠 때 조회 전에 flush할 수 있다. `find()`가 항상 순수 read라는 전제로 latency와 실패 원인을 추적하면 실제 SQL 순서를 놓친다. 명시적 transaction과 flush boundary를 use case에 맞춰 둔다.

### native write와 Kysely는 managed state를 갱신하지 않는다

`nativeUpdate`, `nativeDelete`, QueryBuilder direct write와 Kysely write는 이미 읽은 entity를 자동 갱신하지 않는다. `tx.getKysely()`는 현재 transaction connection에는 묶이지만 transaction atomicity와 UoW 객체 일관성은 별개다. raw write 뒤에는 새 EM, `refresh()` 또는 `clear()` 경계를 둔다. raw query가 최신 row를 반환하고 그것을 managed entity로 연결하려는 경우에만 명시적 `em.map()`을 사용한다.

### relation은 값 외에 load 상태를 가진다

미초기화 `Collection`은 빈 collection이 아니다. relation에 per-parent `limit`을 적용해 일부만 읽은 collection은 read-only이고, `Collection.remove()`는 기본적으로 target row 삭제가 아니라 관계 해제다. partial field 조회에서 relation 연결에 필요한 FK를 빼면 객체 graph도 완성되지 않을 수 있다.

### transaction API의 기본값이 다르다

v7.1.11 source 기준 `em.transactional()`은 `NESTED`, `@Transactional()`은 `REQUIRED`가 기본이다. callback을 decorator로 바꾸는 refactor만으로 nested failure boundary가 달라질 수 있으므로 propagation을 중요한 use case에서 명시한다. 자세한 근거는 [[MikroORM-Transactions-Concurrency|트랜잭션과 동시성]]에 있다.

## v7.1.11에 남은 확인된 결함

아래 schema 관련 수정은 main에 병합됐지만 v7.1.11 release 뒤에 들어와 현재 stable에는 포함되지 않았다.

| 영역 | v7.1.11 증상 | 현재 상태 | 운영 대응 |
|---|---|---|---|
| [PostgreSQL check introspection](https://github.com/mikro-orm/mikro-orm/issues/8123) | 여러 항을 가진 check의 괄호가 깨져 재생성 SQL이 실패할 수 있음 | [#8125](https://github.com/mikro-orm/mikro-orm/pull/8125) 병합, stable 미배포 | 생성 SQL을 검토하고 영향 check를 target DB에서 재적용 |
| [PostgreSQL index introspection](https://github.com/mikro-orm/mikro-orm/issues/8124) | GIST, GIN, BRIN 등의 access method를 잃고 B-tree diff를 만들 수 있음 | [#8126](https://github.com/mikro-orm/mikro-orm/pull/8126) 병합, stable 미배포 | 특수 index DDL을 기준선과 비교하고 자동 적용 금지 |
| [decimal string default](https://github.com/mikro-orm/mikro-orm/issues/8131) | `'0.00'` 같은 기본값에 같은 ALTER가 반복 생성될 수 있음 | [#8132](https://github.com/mikro-orm/mikro-orm/pull/8132) 병합, stable 미배포 | numeric default 또는 `defaultRaw`를 검토하고 diff 회귀 테스트 |

custom DateTime 또는 Temporal 계열 type의 cursor는 sub-millisecond 값 복원 과정에서 경계 row를 놓칠 수 있고, bigint cursor는 직렬화에 실패할 수 있다. 후속 [PR #8103](https://github.com/mikro-orm/mikro-orm/pull/8103)은 아직 열려 있으므로 해당 type을 정렬 key로 쓰는 cursor pagination은 별도 회귀 테스트나 회피가 필요하다.

이 목록은 MikroORM 전체가 불안정하다는 결론이 아니다. 최신 stable에 존재한다고 재현 또는 source로 확인한 항목만 adoption risk에 포함하고, 수정 release가 나오면 다시 검증한다.

## 열린 제안과 확정 버그를 섞지 않는다

- [#8001](https://github.com/mikro-orm/mikro-orm/issues/8001)은 SQL 값을 driver bind parameter로 실행하지 않고 query text에 format하는 현재 경로가 prepared statement reuse와 관측성에 불리하다는 제안이다. reporter benchmark는 유용한 가설이지만 일반적인 production 성능 결론이나 보안 결함으로 확대하지 않는다.
- [#5962](https://github.com/mikro-orm/mikro-orm/issues/5962)는 filter name과 argument의 type safety를 강화하자는 제안이다. 존재하지 않는 filter가 조용히 무시될 수 있으므로 tenant isolation과 soft delete를 filter 이름 하나에만 맡기지 않고 integration test와 DB constraint를 둔다.

## v7 도입 비용

- MikroORM v7 package는 native ESM이며 Node.js `22.17+`, TypeScript `5.8+`와 exports-compatible `moduleResolution`이 필요하다. CJS application도 이 Node.js와 TypeScript 조합의 `require(esm)` 지원을 만족하면 소비할 수 있으므로 application 전체의 ESM 전환과 같은 요구로 해석하지 않는다.
- core, SQL driver, migrations와 CLI 같은 monorepo package는 같은 MikroORM version으로 고정한다.
- `@mikro-orm/nestjs`는 별도 repository와 version line을 가지므로 core와 숫자를 강제로 같게 만들지 않고 peer range와 실제 Nest application test로 호환성을 확인한다.
- 공식 guide에 과거 기본값 표현이 남은 구간이 있다. version-sensitive 동작은 현재 docs만 보지 않고 lockfile version의 source tag와 test를 함께 확인한다.
- 장기 지원 판단에서는 현재 release와 commit authorship의 집중도를 별도로 확인한다. 이는 방치 여부의 단정이 아니라 조직이 감당할 key-person risk를 평가하는 입력이다.

## 도입 판단 기준

### 도입 이점이 커지는 경우

- 한 use case에서 여러 entity와 relation을 함께 변경한다.
- aggregate invariant, cascade, hook과 optimistic version이 실제 문제를 해결한다.
- request별 EM과 transaction boundary를 framework에서 일관되게 보장할 수 있다.
- generated SQL, migration diff와 target DB integration test를 운영 절차에 넣을 수 있다.

### 보류가 합리적인 경우

- 대부분이 독립적인 CRUD, report query와 bulk update다.
- 팀이 모든 DB write를 호출 지점에서 명시적으로 보길 원한다.
- 자동 cache invalidation이나 cluster-wide cache를 ORM이 제공할 것으로 기대한다.
- 현재 runtime이 v7 요구사항과 멀고 전환 이익을 측정하지 못했다.
- production schema 변경을 generated diff에 검토 없이 맡겨야 한다.

최종 결정은 기능 개수로 하지 않는다. 동일 schema와 representative workload에서 query 수, p50/p95, peak memory, migration reproducibility, rollback 뒤 상태와 코드 복잡도를 비교한다. 측정된 문제가 Unit of Work와 Identity Map으로 직접 줄어들 때 작은 신규 module이나 별도 service부터 도입한다.

## 관련 문서

- [[MikroORM-Architecture|EntityManager와 managed state]]
- [[MikroORM-Unit-of-Work|flush와 native operation 경계]]
- [[MikroORM-SQL-QueryBuilder-Kysely|SQL API 선택 기준]]
- [[MikroORM-Migrations-Schema|운영 migration 절차]]
- [[MikroORM-Testing|target DB 검증 전략]]
- [[MikroORM-vs-TypeORM|현재 TypeORM 기준 비교]]

## 출처

- [Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [Unit of Work and Transactions](https://mikro-orm.io/docs/transactions)
- [Result cache](https://mikro-orm.io/docs/caching)
- [Result cache custom-key collision test, v7.1.11](https://github.com/mikro-orm/mikro-orm/blob/v7.1.11/tests/issues/GH6083.test.ts#L30-L48)
- [Using Kysely](https://mikro-orm.io/docs/kysely)
- [Schema Generator warning](https://mikro-orm.io/docs/schema-generator)
- [Upgrading from v6 to v7](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [Package version alignment](https://mikro-orm.io/docs/canary-builds)
- [NestJS integration repository](https://github.com/mikro-orm/nestjs)
- [MikroORM commit history](https://github.com/mikro-orm/mikro-orm/commits/master/)
- [MikroORM v7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
- [v7.1.11 source tag](https://github.com/mikro-orm/mikro-orm/tree/v7.1.11)
