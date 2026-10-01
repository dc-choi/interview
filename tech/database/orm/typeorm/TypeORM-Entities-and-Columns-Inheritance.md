---
tags: [database, orm, typeorm, entity, inheritance, audit-column, nestjs]
status: done
verified_at: 2026-09-30
category: "Database - ORM"
aliases: ["TypeORM Entity Inheritance", "TypeORM 엔티티 상속", "CommonEntity 공통 감사 컬럼"]
---

# TypeORM 엔티티 상속과 공통 감사 컬럼

여러 Entity가 식별자와 생성, 수정, 삭제 시각을 똑같이 가질 때 공통 class로 묶는 방법과 그 선택이 table 구조에 미치는 영향을 다룬다. column 옵션과 special column의 의미는 [[TypeORM-Entities-and-Columns|TypeORM 엔티티와 컬럼]]을 따른다. TypeORM `1.1.0` 문서를 기준으로 하고, driver 기본 type은 `1.1.1` 소스로 확인했다.

## 공통 감사 컬럼은 abstract class로 모은다

```ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm"

export abstract class CommonEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date

  @DeleteDateColumn({ type: "timestamptz" })
  deletedAt: Date | null
}

@Entity("blogs")
export class BlogEntity extends CommonEntity {
  @Column({ type: "varchar", length: 200 })
  title: string
}
```

- `@Entity`가 없는 abstract class를 상속하는 방식은 공식 문서의 Concrete Table Inheritance다. 부모의 column, relation, embedded가 자식 Entity마다 복사되어 `blogs`, `tags` 같은 별도 table이 생긴다. 공용 table이나 discriminator column은 생기지 않는다.
- 식별자 전략과 type은 [[Primary-Key-Strategy|Primary Key 전략]]을 따른다. `bigint` PK는 JavaScript 안전 정수 범위를 넘을 수 있어 string으로 매핑한다.
- `deletedAt`은 soft delete 시각이다. hard delete는 row를 지우고, soft delete는 삭제 시각을 남겨 기본 조회에서 뺀다. scope, restore와 보존 정책은 [[Soft-Delete-and-Data-Lifecycle|Soft delete와 데이터 수명주기]]를 따른다.

## 이름을 `BaseEntity`로 짓지 않는다

TypeORM은 Active Record 패턴용 `BaseEntity`를 export한다. 이를 상속한 Entity는 `user.save()`나 정적 `find()`처럼 자기 자신을 저장하고 조회한다. 공통 컬럼 class를 같은 이름으로 만들면 import가 충돌하거나 Active Record를 쓰는 코드로 오해받는다. NestJS에서 Repository를 주입하는 Data Mapper가 이 vault의 기준이므로([[TypeORM-Overview-and-DataSource|TypeORM 개요와 DataSource]]) 공통 class는 `CommonEntity`처럼 다른 이름을 쓴다.

## PostgreSQL에서는 날짜 type을 명시한다

TypeORM `1.1.1` PostgreSQL driver는 `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn`의 기본 type을 `timestamp`로, 생성과 수정 시각의 기본값을 `now()`로 둔다. PostgreSQL에서 `timestamp`만 쓰면 `timestamp without time zone`이다. MySQL driver의 기본은 `datetime(6)`이다.

- `timestamp without time zone`과 `timestamptz` 사이 변환은 `timestamp` 값을 세션 `TimeZone`의 지역 시각으로 보고 이뤄진다. `now()`를 `timestamp` column에 넣으면 세션 설정에 따라 같은 순간이 다른 값으로 저장될 수 있다.
- `timestamptz`는 입력을 UTC 절대 시점으로 저장하고 출력할 때 세션 `TimeZone`으로 변환한다. 원래 오프셋이나 지역 이름은 보존하지 않으므로 시간대 정보까지 저장한다는 설명은 틀리다. 의미와 변환 규칙은 [[PostgreSQL-SQL-Patterns|PostgreSQL SQL 패턴]]의 timestamptz 절을 따른다.
- 사건 발생 시각을 남기는 감사 컬럼은 `timestamptz`를 명시한다. 이미 `timestamp`로 만든 table을 바꿀 때는 기존 값이 어느 시간대 기준인지 확인한 뒤 `AT TIME ZONE`으로 변환하는 migration을 쓴다.

## 상속 전략 선택

| 전략 | TypeORM 표현 | table 구조 | 적합한 경우 | 비용 |
|---|---|---|---|---|
| Concrete Table | `@Entity` 없는 abstract class 상속 | 자식마다 별도 table, 공통 column 복사 | 감사 컬럼, 공통 식별자 | 공통 column 변경이 모든 table의 migration으로 번지고, 부모 타입으로 한 번에 조회할 수 없음 |
| Single Table | 부모 `@Entity`와 `@TableInheritance`, 자식 `@ChildEntity` | 한 table과 discriminator column | 다형 조회가 잦고 하위 타입의 column 차이가 작음 | 하위 타입 전용 column이 nullable이 되어 제약 표현이 약해짐 |
| 합성 | embedded column | 한 table 안의 column 묶음 | 주소 같은 값 묶음 | 별도 lifecycle과 FK가 필요하면 relation으로 모델링 |

Entity inheritance는 공통 column을 재사용할 수 있지만 table 전략, nullable, discriminator와 migration diff가 복잡해진다. 공통 audit column 정도가 아닌 경우에는 먼저 생성 SQL과 query shape를 확인한다. 공식 문서도 중복을 줄이는 방법으로 상속보다 embedded column을 이용한 합성을 함께 소개한다. 관계형 모델에서 상속을 표현하는 전략의 일반론은 [[Relational-Inheritance-Mapping|관계형 상속 매핑]]에 있다.

## 출처

- [TypeORM, Entity Inheritance](https://typeorm.io/docs/entity/entity-inheritance/)
- [TypeORM, Active Record vs Data Mapper](https://typeorm.io/docs/guides/active-record-data-mapper/)
- [TypeORM, Decorator reference](https://typeorm.io/docs/help/decorator-reference/)
- [TypeORM, Embedded Entities](https://typeorm.io/docs/entity/embedded-entities/)
- [PostgresDriver.ts mappedDataTypes — TypeORM GitHub 1.1.1](https://github.com/typeorm/typeorm/blob/1.1.1/src/driver/postgres/PostgresDriver.ts)
- [MysqlDriver.ts mappedDataTypes — TypeORM GitHub 1.1.1](https://github.com/typeorm/typeorm/blob/1.1.1/src/driver/mysql/MysqlDriver.ts)
- [PostgreSQL 18 Documentation, Date/Time Types](https://www.postgresql.org/docs/18/datatype-datetime.html)
- [인프런, 윤상석, 요구사항에 맞는 도메인 설계, ERD 모델링에 대하여](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=97057)

## 관련 문서

- [[TypeORM|TypeORM 허브]]
- [[TypeORM-Entities-and-Columns|TypeORM 엔티티와 컬럼]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 데이터 수명주기]]
- [[Relational-Inheritance-Mapping|관계형 상속 매핑]]
- [[Domain-Model|Domain Model]]
