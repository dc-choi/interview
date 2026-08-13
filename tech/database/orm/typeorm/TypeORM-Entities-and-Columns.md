---
tags: [database, orm, typeorm, entity, column, nestjs]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["TypeORM Entity", "TypeORM Column", "TypeORM 엔티티와 컬럼"]
---

# TypeORM 엔티티와 컬럼

Entity는 TypeScript 객체 자체가 아니라 TypeORM이 table과 column metadata를 만들고 읽는 영속성 모델이다. decorator를 붙였다고 운영 DB가 즉시 바뀌지는 않으며, 실제 변경 단위는 review된 migration이다.

## 1.1.0 기준으로 읽기

- 이 문서는 TypeORM `1.1.0`을 학습과 구현 기준으로 삼는다.
- 2026-08-13에 공식 GitHub Releases에서 확인한 최신 릴리스도 `1.1.0`이다.
- 아래 decorator API와 기본값은 1.1.0 공식 문서를 기준으로 한다.
- DB driver와 DBMS가 column type, generated key와 날짜 변환을 결정한다. TypeScript type만 보고 schema를 추측하지 않는다.

## Entity를 table contract로 이해하기

`@Entity()`는 클래스를 table metadata로 등록한다. 기본 table 이름은 클래스명에서 만들어지며, 기존 schema를 쓸 때는 `@Entity("users")`처럼 물리 이름을 명시할 수 있다.

```ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "display_name", type: "varchar", length: 80 })
  displayName: string
}
```

- 모든 relational entity에는 primary column이 필요하다.
- `DataSource`의 `entities` 설정에 이 클래스 또는 빌드 산출물의 정확한 glob이 포함되어야 metadata가 만들어진다.
- property 이름 `displayName`과 DB column 이름 `display_name`은 다른 계약이다. Repository option의 key는 Entity property를 쓰고, QueryBuilder의 entity 표현은 property path로 표준화한다. 1.1.0 `addOrderBy()`는 물리 이름도 해석하지만 문자열 naming을 섞지 않으며 migration과 raw SQL에서는 실제 DB 이름을 확인한다.
- `@Entity`의 `schema`, `database`, `comment`, 기본 `orderBy` 같은 옵션은 DBMS 지원 범위가 다르다. 필요해진 경우에만 해당 driver의 migration 결과로 확인한다.
- Entity는 row의 저장 표현이다. 관계 탐색, validation, API 응답 shape까지 모두 맡기는 만능 객체로 만들지 않는다.

## primary key 선택

| 선택 | 적합한 경우 | 주의점 |
|---|---|---|
| `@PrimaryGeneratedColumn()` | DB가 증가 키를 생성 | 생성 방식은 DB와 설정에 따라 auto increment, serial, sequence, identity가 된다. |
| `@PrimaryGeneratedColumn("uuid")` | 분산 생성 가능한 문자열 식별자 | index 크기, 정렬 특성과 외부 노출 정책을 별도로 판단한다. |
| `@PrimaryColumn()` | 외부 시스템 ID나 자연 키를 직접 부여 | 저장 전 값이 반드시 있어야 하며 변경 가능성, 충돌과 입력 검증을 설계한다. |
| 복합 `@PrimaryColumn()` | 두 값이 함께 식별자여야 함 | 모든 PK 구성 요소를 repository 조회, relation과 migration에서 일관되게 쓴다. |

`save()`는 전달된 primary key로 기존 row를 찾고 있으면 update, 없으면 insert를 시도한다. 따라서 클라이언트 입력의 ID가 섞인 partial object를 무심코 `save()`에 넘기지 말고, 생성과 변경 use case의 권한 및 존재 확인을 분리한다.

`@Generated("uuid")`는 primary key가 아닌 column에도 한 번 생성값을 넣을 때 쓸 수 있다. `increment`, `identity`, `rowid`처럼 driver 제약이 있는 전략은 generated key 하나만으로도 migration 검증 항목이 된다.

## column type은 DB contract다

`@Column()` type을 생략하면 TypeScript reflect metadata에서 추론하려 하지만, portability와 schema 의도를 위해 운영 모델은 type을 명시하는 편이 안전하다. TypeORM의 column type은 DBMS마다 다르다.

| 목적 | 예시 | 확인할 것 |
|---|---|---|
| 짧은 문자열 | `varchar`, `length` | 최대 길이, collation, unique/index 필요성 |
| 긴 본문 | `text` | 검색과 정렬 요구, 무분별한 목록 조회 방지 |
| 정수 | `smallint`, `int`, `bigint` | 범위, unsigned 지원 여부와 직렬화 |
| 정확한 소수 | `decimal` 또는 `numeric` | `precision`, `scale`, 반올림 규칙 |
| boolean | DB driver의 boolean type | NULL과 false를 구분할지 |
| 구조화 값 | DB native `json`/`jsonb` | query, index, schema 변경 및 검증 책임 |
| 제한된 상태 | `enum` | PostgreSQL과 MySQL 지원, 값 추가와 rollback SQL |

`simple-array`는 comma로 값을 하나의 string column에 넣으므로 값 안에 comma를 둘 수 없다. `simple-json`은 JSON stringify/parse 편의 기능일 뿐 DB native JSON의 query와 index 특성을 대신하지 않는다.

## bigint, 금액과 날짜

SQL `bigint`는 JavaScript `number`의 안전 정수 범위를 넘을 수 있어 TypeORM은 entity property를 `string`으로 매핑한다. `number`로 선언하거나 암묵 변환하지 말고, 계산이 필요하면 경계에서 `BigInt` 또는 decimal 표현으로 명시 변환하고 JSON 응답 형식도 정한다.

날짜는 `Date` 하나로 충분하다고 가정하지 않는다.

- `date`는 날짜만 필요할 때, timestamp 계열은 시각이 필요할 때 선택한다.
- timezone 포함 여부, DB session timezone, API의 ISO 문자열 규칙을 함께 정한다.
- DBMS와 driver가 반환하는 값의 type과 offset을 integration test로 확인한다. 특히 자정 근처의 날짜와 DST가 있는 사용자 입력을 별도 fixture로 둔다.
- DB default timestamp와 application clock을 혼용하면 생성 시각의 기준이 흔들릴 수 있다. 하나의 책임을 선택한다.

## 자주 쓰는 column option

```ts
@Column({
  type: "varchar",
  name: "email",
  length: 254,
  nullable: false,
  unique: true,
  select: false,
  update: false,
})
email: string
```

- `name`은 기존 DB의 물리 이름을 맞출 때 쓴다.
- 1.1.0 기본값은 `nullable: false`, `select: true`, `insert: true`, `update: true`다. `default`, `unique`를 포함한 변경은 새 migration의 `NULL`, default, constraint를 읽는다.
- `length`, `precision`, `scale`, `unsigned`, `charset`, `collation`은 type과 DBMS가 지원할 때만 의미가 있다.
- 1.1.0에서 `select: false` column은 `find`와 QueryBuilder 읽기 결과에 포함되지 않는다. 필요하면 `addSelect`하고, 인증 또는 response mapper에서 누락을 명시적으로 다룬다.
- `insert: false`, `update: false`는 DB generated 또는 application이 수정하면 안 되는 값처럼 쓰기 권한을 좁힐 때 유용하지만, DB trigger와 application write 책임을 먼저 정한다.
- 복합 unique 또는 복합 index는 column option을 반복하지 말고 entity 수준 decorator와 migration SQL로 이름과 column 순서를 검토한다.

## special column과 생성값

| decorator | 의미 | 확인할 경계 |
|---|---|---|
| `@CreateDateColumn` | insert 시 자동 생성 시각 | DB default와 중복되지 않는지 |
| `@UpdateDateColumn` | `save` update 또는 update된 upsert 시각 자동 갱신 | raw update 경로도 같은 audit 규칙인지 |
| `@DeleteDateColumn` | soft delete 시각, 기본 조회에서 deleted row 제외 | 관리자 조회와 restore가 `withDeleted` 정책을 따르는지 |
| `@VersionColumn` | `save` 또는 update된 upsert 때 버전 증가 | 경쟁 쓰기를 막으려면 실제 optimistic lock 또는 조건부 update를 검증하는지 |
| `@Generated(...)` | insert 전 생성된 값 저장 | driver별 strategy와 migration DDL |

`@VirtualColumn`은 DB에 저장하지 않는 read-only 계산값이다. query 문자열과 alias에 의존하므로 목록 query와 성능을 실제 SQL로 검증한 뒤 사용한다.

## transformer는 storage boundary에만 둔다

`transformer`는 entity 값과 DB 지원 값 사이의 변환이다. 쓰기에는 `to`, 읽기에는 `from`이 적용되며 transformer 배열은 쓰기 순서대로, 읽기에는 역순으로 적용된다.

```ts
const trimTransformer = {
  to: (value: string) => value.trim(),
  from: (value: string) => value,
}

@Column({ type: "varchar", length: 80, transformer: trimTransformer })
name: string
```

- transformer는 HTTP validation이나 domain invariant의 대체물이 아니다.
- 암호화, 정규화, enum 변환은 equality search, unique index, sorting과 migration backfill에 미치는 영향을 먼저 확인한다.
- `from`은 오래된 row와 NULL도 처리해야 한다. 배포 전 구 데이터 fixture로 round trip test를 둔다.
- 변환 규칙을 바꾸면 새 코드만 배포해도 기존 저장값이 자동 재작성되지는 않는다. 별도 migration 또는 backfill 여부를 결정한다.

## embedded, inheritance와 constructor

Embedded entity는 주소처럼 함께 저장되는 value object field를 여러 column으로 펼쳐 중복을 줄이는 기능이다. 별도 lifecycle과 FK가 필요하면 embedded가 아니라 Entity/relation으로 모델링한다.

Entity inheritance는 공통 column을 재사용할 수 있지만 table 전략, nullable, discriminator와 migration diff가 복잡해진다. 공통 audit column 정도가 아닌 경우에는 먼저 생성 SQL과 query shape를 확인한다.

TypeORM은 DB row를 읽으며 Entity instance를 만들지만 constructor 인자를 알지 못한다. constructor 인자는 optional로 두고, I/O, 요청 정보, 필수 command validation 또는 외부 의존 작업을 constructor에 넣지 않는다.

`repository.create()`는 input을 entity instance 형태로 만들 뿐 저장하지 않는다. `save()`의 insert/update 판정과 relation cascade는 DB 작업이며, 1.1.0에서 `select: false`에 넣어 저장한 값은 반환된 in-memory entity에 남을 수 있다. DB default, trigger, generated value까지 최신 row가 필요하면 명시적으로 다시 읽는다.

## Entity, DTO와 domain model의 경계

- DTO는 외부 입력 validation과 응답 계약이다. Entity를 controller input/output으로 재사용하지 않는다.
- Entity는 persistence mapping과 제한된 persistence lifecycle 책임을 가진다.
- 단순 CRUD는 Entity에 가벼운 상태 전이를 둘 수 있지만, 복잡한 invariant와 여러 저장소가 얽히면 domain model 또는 application service로 분리한다.
- Entity를 분리하더라도 mapper를 추상화만으로 늘리지 않는다. 저장 표현과 domain 표현이 실제로 달라지는 지점에서만 변환한다.

[[ORM|ORM과 NestJS 영속성 선택]], [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]], [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]도 함께 본다.

## schema와 migration 검증 순서

1. Entity 변경 전후의 table, column, constraint와 기존 데이터 영향을 적는다.
2. 실제 DBMS에 연결한 DataSource로 migration을 생성하고, 생성 SQL을 사람이 읽는다.
3. rename, type 축소, `NOT NULL`, default, unique, enum 변경, generated column은 데이터 손실과 lock을 별도 검토한다.
4. test DB에서 migration `up`, 대표 repository query, rollback 가능 여부를 실행한다.
5. build 산출물에서 entities와 migrations glob이 실제 `.js` 또는 실행 환경의 파일을 찾는지 확인한다.
6. production에서는 `synchronize`나 `schema:sync`가 아닌 versioned migration을 사용하고, 적용 전 `schema:log`와 migration 상태를 확인한다.

`migration:generate`는 entity와 연결된 DB schema의 차이로 SQL 초안을 만들 뿐 설계 승인 도구가 아니다. FK, index, constraint 이름, lock 위험과 down migration을 검토한 뒤 커밋한다. 0.3.x에서 올릴 때는 [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]의 실제 산출물과 실DB 기준선을 다시 통과시킨다.

## 출처

- [TypeORM, Entities](https://typeorm.io/docs/entity/entities/)
- [TypeORM, Decorator reference](https://typeorm.io/docs/help/decorator-reference/)
- [TypeORM, Embedded Entities](https://typeorm.io/docs/entity/embedded-entities/)
- [TypeORM, Entity Inheritance](https://typeorm.io/docs/entity/entity-inheritance/)
- [TypeORM, Generating migrations](https://typeorm.io/docs/migrations/generating/)
- [TypeORM, Executing and reverting migrations](https://typeorm.io/docs/migrations/executing/)
- [TypeORM, Using CLI](https://typeorm.io/docs/using-cli/)
- [TypeORM, Release Notes 1.0](https://typeorm.io/docs/releases/1.0/release-notes/)
- [TypeORM GitHub Releases](https://github.com/typeorm/typeorm/releases)
