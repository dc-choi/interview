---
tags: [database, orm, mikroorm, typescript, unit-of-work]
status: index
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM", "MikroORM 학습 지도"]
---

# MikroORM 학습 지도

MikroORM은 TypeScript와 JavaScript용 Data Mapper ORM이다. 핵심은 query method의 개수가 아니라 요청마다 분리된 `EntityManager`, Identity Map, Unit of Work가 한 객체 그래프의 조회와 변경을 추적하고 `flush()`에서 SQL 또는 MongoDB 작업으로 바꾸는 방식이다.

이 문서 묶음은 API 목록이 아니라 다음 흐름을 이해하고 검증하는 순서로 구성했다.

```text
request 또는 job
  -> 요청 전용 EntityManager
  -> 조회와 hydration
  -> Identity Map의 managed entity
  -> 객체 그래프 변경
  -> Unit of Work가 changeset 계산
  -> transaction 안에서 flush
  -> driver와 database
```

## 검증 기준

- 확인일: 2026-08-13
- 최신 안정판: `7.1.11`, 공식 문서 계열은 `7.1`
- v7 최소 요구사항: Node.js `22.17+`, TypeScript `5.8+`
- package 형식: native ESM, CJS consumer는 지원되는 Node.js와 TypeScript의 `require(esm)` 조건에서 사용 가능
- SQL 내부 기반: Knex가 아니라 Kysely
- 현재 기본 relation loading: `balanced`, to-one은 joined, to-many는 select-in

공식 페이지 일부에는 v7 전환 전 설명이 남아 있다. 충돌할 때는 최신 릴리스, v6에서 v7 업그레이드 가이드, `v7.1.11` 태그 소스를 우선했다. 특히 loading 기본값과 transaction propagation은 이 원칙으로 판정했다.

## 지원 저장소와 패키지

공통으로 `@mikro-orm/core`와 저장소별 driver를 설치한다. SQL 전용 QueryBuilder와 Kysely 기능은 SQL driver에서만 사용할 수 있다.

| 저장소 | driver package | 경계 |
|---|---|---|
| PostgreSQL, CockroachDB | `@mikro-orm/postgresql` | PostgreSQL dialect를 공유하되 CockroachDB 차이는 별도 검증 |
| PGlite | `@mikro-orm/pglite` | WASM 기반 embedded PostgreSQL |
| MySQL | `@mikro-orm/mysql` | MariaDB 연결도 가능 |
| MariaDB | `@mikro-orm/mariadb` | MySQL 연결도 가능 |
| SQLite | `@mikro-orm/sqlite` | local 학습과 격리 테스트에 편리 |
| libSQL, Turso | `@mikro-orm/libsql` | local 또는 remote 연결 |
| MSSQL | `@mikro-orm/mssql` | 기능별 dialect 차이 확인 필요 |
| Oracle | `@mikro-orm/oracledb` | driver와 운영 환경 별도 검증 |
| MongoDB | `@mikro-orm/mongodb` | join, SQL QueryBuilder, schema diff 모델이 SQL과 다름 |

CLI, migration, seeding, NestJS integration은 각각 별도 package다. core, driver, CLI, migrations package는 같은 MikroORM 버전으로 맞춘다. `@mikro-orm/nestjs`는 별도 repository에서 배포되므로 호환 범위를 릴리스 노트로 확인한다.

## 한 장으로 보는 핵심 개념

| 개념 | 하는 일 | 오해하기 쉬운 경계 |
|---|---|---|
| Entity | DB row나 document에 mapping되는 객체 | DTO나 공개 API 응답 그 자체는 아니다 |
| EntityManager | 조회, 생성, persist, remove, flush의 facade | stateful이므로 요청 사이에 공유하지 않는다 |
| Identity Map | 현재 EM에서 같은 type과 PK를 같은 객체로 유지 | cross-request query cache가 아니다 |
| Unit of Work | snapshot과 현재 상태를 비교해 changeset 생성 | 모든 raw write를 자동 추적하지 않는다 |
| `persist()` | 새 객체를 UoW의 쓰기 후보로 등록 | 즉시 INSERT하거나 commit하지 않는다 |
| `flush()` | pending change를 계산하고 DB에 반영 | 외부 API와 여러 DB까지 원자적으로 만들지는 않는다 |
| `Ref<T>` | to-one relation의 load 상태를 드러내는 wrapper | relation을 읽었다는 뜻은 아니다 |
| `Collection<T>` | to-many relation과 초기화 상태를 관리 | `remove()`가 대상 row 삭제를 뜻하지 않는다 |
| `populate` | 어떤 relation graph를 읽을지 선언 | 무제한 eager loading이나 API 응답 계약이 아니다 |
| Repository | 특정 entity용 EntityManager facade | transaction과 aggregate 경계를 자동 강제하지 않는다 |

## 단계별 로드맵

### 시작 전: 객체 동일성과 flush를 직접 본다

- 읽기: [[MikroORM-Basics|기초]], [[MikroORM-Local-Quickstart|SQLite 실습]]
- 아웃풋: 같은 EM과 다른 EM에서 같은 PK를 조회해 객체 동일성을 비교하고, 속성 변경 후 `flush()`에서 나온 SQL을 기록한다.
- [ ] 통과: `persist`, `flush`, Identity Map, result cache의 차이를 설명한다.

### 1단계: 실행 모델을 그린다

- 읽기: [[MikroORM-Architecture|아키텍처]], [[MikroORM-Unit-of-Work|Unit of Work]]
- 아웃풋: HTTP 요청 하나가 fork된 EM을 얻고 entity를 hydrate한 뒤 changeset을 만들어 commit하는 흐름을 한 장으로 그린다.
- [ ] 통과: global EM 공유가 stale state, 메모리 증가, 경쟁 상태로 이어지는 이유를 설명한다.

### 2단계: domain graph와 query shape를 함께 설계한다

- 읽기: [[MikroORM-Modeling|모델링 지도]], [[MikroORM-Querying|조회 API]], [[MikroORM-SQL-QueryBuilder-Kysely|SQL 경계]]
- 아웃풋: 익숙한 aggregate 하나를 entity와 relation으로 만들고, 목록과 상세 API의 populate, fields, pagination을 각각 설계한다.
- [ ] 통과: cascade, orphan removal, DB FK rule의 차이와 joined, select-in 선택 비용을 설명한다.

### 3단계: transaction과 운영 절차를 통제한다

- 읽기: [[MikroORM-Transactions-Concurrency|트랜잭션과 동시성]], [[MikroORM-Operations|운영 지도]]
- 아웃풋: migration 배포, rollback 또는 forward-fix, request context, pool, replica lag, slow query 대응을 포함한 runbook을 작성한다.
- [ ] 통과: lock이나 transaction wrapper만으로 해결되지 않는 race를 식별하고 DB별 검증 항목을 제시한다.

### 4단계: 실제 framework나 기존 ORM에 적용한다

- NestJS: [[MikroORM-NestJS|NestJS 통합]]
- 기존 TypeORM 프로젝트: [[MikroORM-vs-TypeORM|TypeORM 비교]], [[MikroORM-v7-Upgrade|v7 호환성]]
- 도입 판단: [[MikroORM-Tradeoffs|트레이드오프와 현행 주의점]]
- 아웃풋: 현재 서비스 기준 도입 ADR을 쓴다. 해결할 문제, 기존 대안, migration 비용, 관측 지표, 되돌릴 조건을 포함한다.
- [ ] 통과: 기능 표가 아니라 현재 codebase와 운영 문제를 근거로 도입 여부를 결정한다.

## 레퍼런스 지도

### 기초와 framework

- [[MikroORM-Basics|용어와 첫 CRUD]]
- [[MikroORM-Architecture|EntityManager, Identity Map, Unit of Work]]
- [[MikroORM-Tradeoffs|구조적 비용, 현행 결함과 도입 기준]]
- [[MikroORM-Local-Quickstart|실행 가능한 SQLite 실습]]
- [[MikroORM-NestJS|NestJS request context와 DI]]
- [[MikroORM-vs-TypeORM|TypeORM과 계약 비교]]

### 모델링

- [[MikroORM-Entity-Modeling|entity 정의, metadata, value object와 상속]]
- [[MikroORM-Relationships|relation, Collection, cascade와 orphan removal]]
- [[MikroORM-Loading-Relations|populate와 loading strategy]]
- [[MikroORM-Serialization|직렬화와 API 보안 경계]]

### 영속화와 조회

- [[MikroORM-Persistence|영속성, 조회와 트랜잭션 지도]]
- [[MikroORM-Unit-of-Work|상태, changeset, batching과 flush]]
- [[MikroORM-Querying|조건, filter, pagination과 streaming]]
- [[MikroORM-SQL-QueryBuilder-Kysely|QueryBuilder, raw SQL과 Kysely]]
- [[MikroORM-Transactions-Concurrency|transaction, propagation과 lock]]

### 운영

- [[MikroORM-Migrations-Schema|migration, schema와 seed]]
- [[MikroORM-Performance-Troubleshooting|query 수, flush, cache와 진단]]
- [[MikroORM-Testing|단위, 통합, migration 테스트]]
- [[MikroORM-Deployment|discovery, metadata cache, pool과 종료]]
- [[MikroORM-v7-Upgrade|v6에서 v7 변경점]]

## 이 vault에서의 위치

현재 NestJS 영속성 기준은 [[ORM|TypeORM]]이다. MikroORM 문서는 학습과 대안 평가를 위한 상세 reference이며, 이 문서가 기존 프로젝트의 ORM 전환 결정을 뜻하지 않는다. 전환은 생성 SQL, migration, transaction, 운영 도구와 팀 학습 비용을 실제 서비스에서 측정한 뒤 결정한다.

## 공식 출처

- [Documentation versions](https://mikro-orm.io/versions)
- [Changelog](https://mikro-orm.io/changelog)
- [Quick Start](https://mikro-orm.io/docs/quick-start)
- [Architecture Overview](https://mikro-orm.io/docs/architecture)
- [MikroORM 7 Released](https://mikro-orm.io/blog/mikro-orm-7-released)
- [Upgrading from v6 to v7](https://mikro-orm.io/docs/upgrading-v6-to-v7)
- [v7.1.11 source tag](https://github.com/mikro-orm/mikro-orm/tree/v7.1.11)
