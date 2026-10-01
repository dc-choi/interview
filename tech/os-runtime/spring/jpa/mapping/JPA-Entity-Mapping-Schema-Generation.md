---
tags: [jpa, hibernate, schema-generation, ddl-auto, migration]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Schema Generation", "ddl-auto", "hbm2ddl", "JPA schema 자동 생성"]
---

# JPA schema 자동 생성

JPA provider는 기동 때 mapping metadata로 DDL을 만들어 table을 생성할 수 있다. DDL은 dialect에 맞춰 만들어지므로(가변 문자열이 Oracle은 `varchar2`, MySQL과 H2는 `varchar`) 초기 개발과 test의 feedback은 빠르지만, 생성 DDL은 운영 schema 변경 절차가 아니다. [[JPA-Entity-Mapping|JPA 엔티티와 상속 매핑]]에서 분리한 문서다.

## 설정 값

표준 `jakarta.persistence.schema-generation.database.action`은 `none`, `create`, `drop-and-create`, `drop`, `validate`를 정의한다. Hibernate의 `hibernate.hbm2ddl.auto`와 Spring Boot의 `spring.jpa.hibernate.ddl-auto`에는 provider 고유의 `update`, `create-drop` 등도 있다.

| 값 | 동작 |
|---|---|
| `create` | 기존 table을 drop한 뒤 생성 |
| `create-drop` | `create`와 같고 종료 때 drop |
| `update` | 없는 table과 column을 추가하고 dialect에 따라 column type을 변경. 삭제는 하지 않음 |
| `validate` | mapping과 schema를 비교하고 다르면 기동 실패 |
| `none` | 아무것도 하지 않음 |

Spring Boot 4.1은 embedded DB(H2, HSQLDB, Derby)이고 Flyway나 Liquibase가 없으면 `ddl-auto`를 `create-drop`, 그 밖에는 `none`으로 둔다. In-memory DB에서 되던 test가 실제 DB에서 table이 없어 실패하는 흔한 이유다. `create`와 `create-drop` 때 classpath의 `import.sql`이 실행되는 것도 Hibernate 기능이므로 운영 classpath에 두지 않는다.

`validate`는 table, column과 column type을 검사한다. Nullability는 검사하지 않고, unique 제약은 Hibernate 7.3부터 `hibernate.tooling.schema.unique_key_validation`(기본 `NONE`, `NAMED`, `ALL`)을 켜야 검사한다.

## update가 하는 일과 하지 않는 일

Hibernate 6.2부터 `update`는 없는 column을 `add column`으로 추가하고, dialect가 지원하면 type이나 length가 mapping과 다른 기존 column의 type을 바꾼다. H2와 PostgreSQL dialect는 `alter column ... set data type`만 실행하고 MySQL dialect는 `modify column`으로 column 정의 전체를 다시 쓴다. 기존 column 삭제, 이름 변경과 data backfill은 하지 않는다. Hibernate 6.1까지는 없는 column 추가만 했으므로 update가 기존 column을 전혀 바꾸지 않는다는 설명은 그 이전 기준이다.

Hibernate 7.4.11과 H2에서 nullable `name varchar(255)` column의 mapping을 `@Column(nullable = false, length = 50)`으로 바꾸고 `update`를 실행한 결과다.

- `alter table if exists widget alter column name set data type varchar(50)`로 길이가 줄었다. 더 긴 값이 이미 있으면 DB에 따라 실패하거나 값이 잘릴 수 있고, 큰 table에서는 ALTER lock이 길어진다([[Schema-Migration-Large-Table]]).
- NOT NULL은 추가되지 않아 column은 계속 nullable이었다. 새 field는 column으로 추가됐고, mapping에서 뺀 field의 column은 남았다.
- 같은 애플리케이션에서 null을 저장하면 Hibernate nullability 검사(`hibernate.check_nullability`)가 먼저 막아 test에서는 차이가 드러나지 않았다. 이 검사는 Bean Validation이 classpath에 있으면 기본으로 꺼지고, 다른 writer와 native SQL은 막지 못하므로 mapping과 DB 제약이 조용히 어긋난다.

## 환경별 기준

| 환경 | 선택 | 이유 |
|---|---|---|
| 개인 local, 초기 개발 | `create`, `update` | 빠른 feedback, data 손실 영향이 작음 |
| 여러 사람이 쓰는 개발, test server | `validate`, 불가피하면 `update` | `create`는 다른 사람의 data를 지운다 |
| staging, 운영 | `validate` 또는 `none` | `create`, `create-drop`, `update`는 쓰지 않는다 |

공유 서버부터는 자동 생성 대신 migration script를 적용하는 편이 안전하다. 운영 DDL은 Flyway나 Liquibase 같은 versioned migration으로 작성해 검토(필요하면 DBA 검수)를 거친다. Hibernate 문서도 `update`가 운영 환경에 맞지 않는다고 명시한다. `create-drop`은 종료 때 table을 지우므로 local에서도 data를 남겨야 하면 쓰지 않는다.

설정 실수 하나로 운영 table이 drop되거나, 운영 `update`가 큰 table에 ALTER를 실행하다 lock으로 서비스가 멈출 수 있다. 근본 예방은 애플리케이션 DB 계정에서 `CREATE`, `ALTER`, `DROP` 같은 DDL 권한을 빼고 migration 전용 계정을 따로 두는 것이다. 설정이 잘못 들어가도 DB가 거부한다.

## 생성 DDL과 제약 이름

- 기본 mapping의 `String`은 `varchar(255)` nullable column이다. 생성 시점부터 필요한 값은 `nullable = false`와 적절한 `length`를 명시한다.
- `@Column(unique = true)`와 `@NaturalId`는 이름 없는 unique 제약을 만들었고, 위반 message에는 DB가 붙인 `CONSTRAINT_INDEX_7` 같은 이름이 나왔다(Hibernate 7.4.11, H2). `@Table(uniqueConstraints = @UniqueConstraint(name = "uk_member_email", columnNames = "email"))`로 이름을 붙이면 DDL이 `constraint uk_member_email unique (email)`이 된다. Spring이 Hibernate 제약 위반을 번역한 `DataIntegrityViolationException` message에도 제약 이름이 들어가므로 오류 log에서 규칙을 바로 찾는다.
- Hibernate `@NaturalId`는 JPA 표준이 아니지만 생성 schema에 unique 제약을 만든다. Schema를 자동 생성하는 test에서도 중복 저장이 unique 위반으로 실패하므로 중복 검사 test가 DB 제약까지 검증한다.
- 애플리케이션의 중복 검사는 동시 요청이나 느슨한 격리 수준에서 검사와 INSERT 사이에 뚫릴 수 있다. DB unique 제약이 마지막 방어선이다([[Spring-Data-JPA-Entity-Persistence]]).
- 명세상 `uniqueConstraints`, index와 check는 table 생성이 켜져 있을 때만 쓰인다. 운영 DB의 제약은 migration이 만든다.

## 점검 질문

- 이 환경의 `ddl-auto` 실제 값은 무엇이고 누가 바꿀 수 있는가?
- 애플리케이션 계정에 DDL 권한이 남아 있지 않은가?
- mapping의 nullable, length, unique가 migration의 실제 제약과 같은가?
- 제약 위반 log만 보고 어느 business 규칙인지 알 수 있는가?

## 출처

- [Jakarta Persistence 3.2, Schema Generation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a12917)
- [Jakarta Persistence 3.2, UniqueConstraint Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a16403)
- [Hibernate ORM 7.4 User Guide, Best practices for schema management](https://docs.hibernate.org/orm/7.4/userguide/html_single/#best-practices-schema)
- [Hibernate ORM 7.4 User Guide, Schema Tooling Settings](https://docs.hibernate.org/orm/7.4/userguide/html_single/#settings-schema)
- [Hibernate ORM 7.4 User Guide, `hibernate.check_nullability`](https://docs.hibernate.org/orm/7.4/userguide/html_single/#settings-hibernate.check_nullability)
- [Hibernate ORM 7.4, Introduction, Natural id attributes](https://docs.hibernate.org/orm/7.4/introduction/html_single/#natural-id-attributes)
- [Hibernate ORM 7.4 API, `Action`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/tool/schema/Action.html)
- [Hibernate ORM 7.4.11, `StandardTableMigrator` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/tool/schema/internal/StandardTableMigrator.java)
- [Hibernate ORM 7.4.11, `AbstractSchemaValidator` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/tool/schema/internal/AbstractSchemaValidator.java)
- [Spring Boot 4.1, Initialize a Database Using Hibernate](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Framework 7.0.9, `HibernateExceptionTranslator` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/hibernate/HibernateExceptionTranslator.java)
- [인프런, 김영한, 데이터베이스 스키마 자동 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21692)
- [인프런, 토비, 엔티티 클래스와 JPA 매핑 정보 분리](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312327)
- [인프런, 토비, 엔티티의 자연키 지정](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301561)
- [인프런, 토비, Member 애플리케이션 추가 기능 개발](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=313421)

## 관련 문서

- [[JPA-Entity-Mapping|JPA 엔티티와 상속 매핑]]
- [[JPA-Entity-Mapping-Identity|식별자 전략과 엔티티 동등성]]
- [[Schema-Migration-Large-Table|대형 table schema migration]]
- [[Spring-Data-JPA-Repository-Abstraction|Spring Data JPA repository 추상화]]
