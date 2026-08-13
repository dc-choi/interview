---
tags: [database, orm, typeorm, migration, version, nestjs]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Version Guide", "TypeORM 1.1.0", "TypeORM 0.3 to 1.x"]
---

# TypeORM 1.1.0 버전 가이드

이 vault의 학습 기준은 TypeORM `1.1.0`이다. 1.x는 0.3의 핵심 모델을 버린 새 ORM이 아니라, 오래 deprecated된 API를 제거하고 platform과 안전 기본값을 올린 major release다. 아래에서는 1.1.0의 현재 계약을 먼저 설명하고, 기존 0.3 애플리케이션이 확인할 차이를 함께 표시한다.

## 2026-08-13 기준선

| 대상 | 확인한 버전 | 의미 |
|---|---|---|
| 학습 기준 | `typeorm@1.1.0` | 이 문서 묶음의 API와 기본 동작 |
| 공식 v1 호환 Nest integration | `@nestjs/typeorm@11.0.1` | 이 문서가 고정한 NestJS DI 조합 |
| Node.js engine | `^20.19.0 || ^22.13.0 || >=24.11.0` | package manager와 실행 환경이 만족해야 할 범위 |
| 0.3 유지보수 태그 | `0.3.31` | 기존 애플리케이션의 migration 비교용 legacy 계열 |

최신 버전은 시간이 지나면 바뀐다. 업그레이드 시에는 이 표보다 해당 시점의 package metadata와 lockfile을 다시 확인한다.

## 왜 1.1.0을 명시하는가

- 최신 학습 자료는 현재 지원 API와 안전 기본값을 먼저 익혀야 한다.
- 오래된 0.3 예제에는 제거된 API와 느슨한 기본값이 남아 있을 수 있다.
- TypeORM 버전만 같아도 DB driver, DBMS와 build artifact에 따라 생성 SQL이 달라질 수 있다.
- 실제 프로젝트 적용 시에는 Node.js, Nest integration, driver와 migration을 한 호환 집합으로 검증해야 한다.

따라서 본문에서는 1.1.0 API만 사용한다. 0.3 표기는 오래된 코드나 자료를 읽고 옮길 때만 등장한다.

## Platform과 driver

| 항목 | 0.3.29 | 1.1.0 |
|---|---|---|
| Node.js engine | `>=16.13.0` | `^20.19.0 || ^22.13.0 || >=24.11.0` |
| JavaScript target | 구 runtime 호환 | ES2023 |
| MySQL client | `mysql2`, 구 `mysql` 선택 경로 존재 | `mysql2`만 지원 |
| SQLite | `sqlite3`, `better-sqlite3` | `better-sqlite3` |
| MongoDB driver | 5.x와 6.x | 7.x 이상 |
| glob 구현 | `glob` | `tinyglobby` |

공식 업그레이드 문서의 Node.js 20+ 요약보다 실제 `engines` 범위가 더 엄격하다. CI, base image와 Lambda runtime은 package manager가 실제로 판정하는 범위로 확인한다.

## 1.1.0의 DataSource와 제거된 전역 API

1.1.0의 연결 경계는 명시적인 `DataSource`다. 0.3에서 deprecated 상태로 남아 있던 다음 호환 API는 1.x에서 제거됐다.

- `Connection`, `ConnectionOptions`와 `createConnection()` 호환 경로
- 전역 `getRepository()`, `getManager()`와 `createQueryBuilder()`
- `ConnectionManager`와 이름 기반 전역 connection lookup
- `TYPEORM_*` 환경변수, `ormconfig.env`와 TypeORM 자체 `.env` 자동 로딩

명시적 `DataSource` 인스턴스를 생성하고 애플리케이션 DI에 등록한다. NestJS의 named DataSource token은 Nest integration이 관리하는 기능이며, 제거된 TypeORM 전역 `ConnectionManager`와 구분한다.

## where의 null과 undefined

가장 위험한 runtime 차이다.

```ts
await repository.findBy({ id: undefined })
```

| 계열 | 기본 동작 |
|---|---|
| 0.3.29 | 해당 property를 무시해 넓은 조회가 될 수 있음 |
| 1.1.0 | 오류를 던짐 |

1.1.0의 기본값이 안전하지만, 정책을 설정에 명시하면 의도가 선명하고 이전 버전에서도 실패를 앞당길 수 있다.

```ts
invalidWhereValuesBehavior: {
  null: "throw",
  undefined: "throw",
}
```

SQL `NULL`을 찾을 때는 `null` 대신 `IsNull()`을 쓴다. 이 옵션은 high-level find와 mutation API, `setFindOptions()`를 다루지만 직접 작성한 `QueryBuilder.where()` 문자열의 값을 검증해 주지는 않는다.

## 1.1.0 Repository API

| 제거된 legacy API | 1.1.0 표현 |
|---|---|
| `findOneById(id)` | `findOneBy({ id })` |
| `findByIds(ids)` | `findBy({ id: In(ids) })` |
| `exist(options)` | `exists(options)` |
| `@EntityRepository`, `AbstractRepository`, `getCustomRepository()` | `repository.extend()` 또는 Nest provider |

학습 문서와 새 코드는 오른쪽 표현만 사용한다. Custom Repository를 transaction 안에서 쓸 때는 `manager.withRepository()`로 transaction 전용 인스턴스를 얻는다.

## 1.1.0 Find Options와 QueryBuilder

1.1.0에서는 deprecated된 문자열 기반 API가 제거됐다.

- `select: ["id", "name"]` 대신 `select: { id: true, name: true }`
- `relations: ["profile", "photos"]` 대신 중첩 객체 형태
- Find Options의 구 `join` 옵션 대신 `relations` 또는 QueryBuilder join
- `printSql()`, `onConflict()`와 deprecated lock mode 제거

동적 SQL은 parameter binding을 사용하고 Entity expression은 property path로 표준화한다. 1.0부터 `addOrderBy()`가 물리 DB column 이름도 해석하므로 `movie.productionYear`와 실제 column 이름이 모두 동작할 수 있지만, 한 query에서 naming 규칙을 섞지 않고 생성 SQL을 확인한다. 이는 물리 이름을 잘못 해석하던 구 0.3 경로의 주의를 1.1.0 절대 규칙으로 옮기지 않기 위한 구분이다.

1.1.0의 `count({ select })`는 선택한 column을 대상으로 driver별 distinct-count SQL을 만든다. PostgreSQL/MySQL 계열은 native multi-column `DISTINCT`를 쓰지만 `NULL` 계약까지 같지는 않다. MySQL은 하나라도 `NULL`인 조합을 count에서 제외한다. MSSQL, Spanner와 fallback driver는 여러 값을 고정 구분자로 연결하므로 `NULL`뿐 아니라 값 안의 구분자가 조합을 합치거나 제외할 수 있다. 따라서 nullable 다중 column은 모든 대상 DB에서 fixture로 검증하고, 정확한 tuple count가 필요하면 DB에 맞는 `GROUP BY` subquery나 raw projection을 사용한다. `select`가 없으면 기존 row count 의미를 유지하며, join과 relation-id가 없을 때 `COUNT(1)`, 중복 제거가 필요할 때 primary column 기준 distinct count를 사용한다.

## 1.1.0의 추가 안전 변화

1.1.0은 1.0의 major 변경 위에 write 경로의 방어를 보강한 release다.

- `update`, `delete`, `softDelete`, `restore`는 빈 criteria를 거부한다. 전체 변경은 의도가 드러나는 `updateAll()` 또는 `deleteAll()`을 사용한다.
- high-level write와 `increment`/`decrement`도 `invalidWhereValuesBehavior`의 기본 `throw`를 적용한다.
- QueryBuilder의 직접 `.where()`, `.andWhere()`, `.orWhere()`는 여전히 이 설정의 보호 밖이므로 값 검증과 parameter binding이 필요하다.
- bundler를 깨뜨리던 내부 `require()` 호출과 platform hashing 위치가 수정됐다. 실제 artifact로 smoke test한다.

## 1.1.0 관계 동작

- `nullable: false`인 owning `ManyToOne`과 `OneToOne`은 relation load에서 `INNER JOIN`을 사용할 수 있다.
- 기본 `orphanedRowAction: "nullify"`인데 FK가 non-null이면 고아 row를 삭제할 수 있다.
- one-to-many cascade remove와 soft-deleted many-to-many junction 처리도 보강됐다.

이 변경은 단순 API compile test로 잡히지 않는다. 누락된 related row, soft delete, empty collection과 non-null FK fixture로 결과와 SQL을 비교한다.

## 1.1.0 Column과 naming

- `readonly: true`는 제거되며 반대 의미의 `update: false`를 쓴다.
- MySQL integer display `width`와 `zerofill` option은 제거된다.
- `@RelationCount`는 제거됐다. 필요한 count는 `@VirtualColumn` subquery나 명시적 query projection으로 표현한다.
- 1.x naming과 hashing 변화로 특수문자가 포함된 이름과 query cache key가 달라질 수 있다.
- 필요하면 공식 legacy naming strategy를 임시 호환층으로 쓸 수 있지만 최종 schema와 migration diff를 확인한다.

## Cache와 파일 탐색

- 1.x hashing 변화는 0.3의 기존 query result cache를 무효화한다. 전환 시 일시적인 cache miss 증가를 예상한다.
- 1.1.0은 `tinyglobby`를 사용한다. 기존 0.3 애플리케이션은 Entity와 migration glob 결과를 양 버전에서 비교한다.
- Source tree의 파일 수가 아니라 실제 image의 resolved file과 `entityMetadatas` 집합을 증거로 삼는다.

## NestJS 호환

TypeORM 공식 안내는 v1과 함께 `@nestjs/typeorm@11.0.1`을 사용하라고 명시한다. 그러나 integration package 하나만 맞췄다고 호환 검증이 끝나지는 않는다.

- Nest, TypeORM, driver와 Node.js peer dependency를 함께 해석한다.
- `forRootAsync()`의 DataSource factory와 named token이 부팅되는지 확인한다.
- Repository injection, subscriber 등록과 migration CLI는 별도 경로로 검증한다.
- `typeorm-transactional` 같은 제3자 확장은 공식 TypeORM 호환과 따로 확인한다.

## 0.3에서 1.1.0으로 올리는 순서

1. 현재 0.3의 lockfile, Node.js, driver와 대표 SQL을 기준선으로 저장한다.
2. `invalidWhereValuesBehavior`를 명시하고 null과 undefined 호출부를 먼저 정리한다.
3. Deprecated API, 문자열 Find Options와 custom repository를 현재 버전에서 교체한다.
4. 공식 codemod를 `--dry`로 실행하고 diff를 검토한다.
5. 실제 DB에서 metadata, query 결과, transaction, migration run과 revert를 양 버전 비교한다.
6. 같은 build image로 제한 배포하고 query error, latency, pool과 rollback을 관찰한다.

Codemod는 기계적인 변경을 줄일 뿐 의미 보존을 증명하지 않는다. 운영 gate는 [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]을 따른다.

## 완료 조건

- [ ] package metadata의 정확한 Node.js engine과 peer dependency를 만족한다.
- [ ] null, undefined, relation과 ordering 회귀 fixture가 실제 DB에서 통과한다.
- [ ] Entity와 migration glob 결과가 실제 image에서 일치한다.
- [ ] API, worker와 batch의 대표 query shape와 결과를 비교했다.
- [ ] cache miss, canary 지표와 application/schema rollback 조건이 있다.

## 관련 문서

- [[TypeORM-Overview-and-DataSource|TypeORM 개요와 DataSource]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]

## 출처

- [TypeORM 1.1.0 release - TypeORM](https://github.com/typeorm/typeorm/releases/tag/1.1.0)
- [TypeORM 1.1.0 package metadata - TypeORM](https://github.com/typeorm/typeorm/blob/1.1.0/package.json)
- [TypeORM 1.0 is here - TypeORM](https://typeorm.io/blog/typeorm-1-0/)
- [Upgrading from 0.3 to 1.0 - TypeORM](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/)
- [Release Notes 1.0 - TypeORM](https://typeorm.io/docs/releases/1.0/release-notes/)
- [Distinct count pull request - TypeORM](https://github.com/typeorm/typeorm/pull/11965)
- [Null and undefined handling - TypeORM](https://typeorm.io/docs/data-source/null-and-undefined-handling/)
