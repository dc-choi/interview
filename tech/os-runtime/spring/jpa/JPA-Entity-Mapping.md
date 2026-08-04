---
tags: [jpa, entity, schema-generation, id-generation, inheritance]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA Entity Mapping", "JPA 엔티티 매핑", "JPA 상속 매핑"]
---

# JPA 엔티티와 상속 매핑

Entity mapping은 객체 model의 identity와 관계형 schema의 key, column, inheritance 표현을 연결한다. Annotation은 운영 schema migration을 대신하지 않으며, 생성 DDL과 실제 constraint를 함께 검토한다.

## portable entity 요건

Jakarta Persistence 3.2 기준 entity는 다음 조건을 지켜야 이식 가능하다.

- `@Entity`로 선언한 top-level class 또는 static nested class다. enum, record, interface는 entity가 될 수 없다.
- public 또는 protected no-argument constructor가 있어야 한다.
- entity class와 persistent field/method는 non-final이어야 한다.
- `@Id` 위치에 따라 field access와 property access가 정해지므로 한 hierarchy에서 일관되게 사용한다.
- record는 entity가 아니라 Jakarta Persistence 3.2의 embeddable로 사용할 수 있다.

Hibernate가 bytecode enhancement나 확장 기능으로 더 넓은 형태를 지원하더라도 표준 요건과 provider 확장을 구분한다.

## 테이블과 column

```java
@Entity
@Table(name = "members")
class Member {
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @Enumerated(EnumType.STRING)
  private MemberStatus status;
}
```

`@Column(nullable, unique, length, precision, scale)`은 mapping과 schema 생성 hint다. 운영 무결성은 실제 migration의 `NOT NULL`, `UNIQUE`, `CHECK`, FK와 index를 검증한다.

- enum은 ordinal 변경 위험 때문에 보통 `EnumType.STRING`을 사용한다. Jakarta Persistence 3.2의 `@EnumeratedValue`로 명시적인 DB 값을 정의할 수도 있다.
- 새 date/time 코드는 `LocalDate`, `LocalDateTime`, `OffsetDateTime`, `Instant`, `Year` 같은 `java.time` type을 우선한다.
- `@Temporal`과 `TemporalType`은 `java.util.Date`/`Calendar`용이며 3.2에서 deprecated다.
- `@Lob`의 정확한 DB type은 provider와 DB에 의존하므로 큰 data의 storage 특성을 migration에서 결정한다.
- `@Transient`는 persistence 대상에서 제외한다. Java `transient`와 목적이 완전히 같지는 않다.

## schema 생성은 개발 도구

표준 `jakarta.persistence.schema-generation.database.action`은 `none`, `create`, `drop-and-create`, `drop`, `validate`를 정의한다. Hibernate/Spring Boot의 `ddl-auto`에는 provider 고유의 `update`, `create-drop` 등도 있다.

Local 실험과 test에서는 빠른 feedback에 쓸 수 있지만 운영 변경은 Flyway/Liquibase 같은 versioned migration으로 적용한다. 자동 `update`가 rename, data backfill, lock 시간과 rollback 전략을 안전하게 결정해 주지는 않는다.

## identifier 전략

| 전략 | 식별자 획득 | 설계 포인트 |
|---|---|---|
| `IDENTITY` | insert 때 DB가 생성 | Hibernate batch insert와 쓰기 지연이 제한될 수 있음 |
| `SEQUENCE` | DB sequence에서 선할당 | `allocationSize`와 DB sequence increment를 맞춰 왕복을 줄임 |
| `TABLE` | 별도 generator table | portable하지만 contention과 추가 SQL을 측정 |
| `UUID` | UUID generator | Jakarta Persistence 3.1부터 표준, ID Java type과 저장 형식 확인 |
| `AUTO` | provider가 type과 DB에 맞춰 선택 | 생성되는 DB object와 실제 전략을 확인 |

Business key가 변경될 수 있으면 immutable surrogate key를 entity identity로 두고 business uniqueness는 별도 unique constraint로 표현하는 편이 안정적이다. Composite key는 `@EmbeddedId` 또는 `@IdClass`를 사용하며 equality와 DB equality가 일치해야 한다.

## 상속 관계 매핑

| 전략 | schema | 장점 | 비용 |
|---|---|---|---|
| `SINGLE_TABLE` | hierarchy 전체를 한 table에 저장 | query 단순, join 없음 | nullable column 증가, subtype constraint가 어려움 |
| `JOINED` | root와 subtype table을 PK로 join | 정규화, subtype column 분리 | 조회와 쓰기에 join 증가 |
| `TABLE_PER_CLASS` | concrete class마다 완전한 table | subtype 단독 조회 단순 | polymorphic query가 union이 되고 key 관리 복잡 |

`@MappedSuperclass`는 공통 mapping을 code로 상속할 뿐 entity도 table도 polymorphic query 대상도 아니다. 한 entity hierarchy에서 전략을 섞는 것은 표준이 정의하지 않는다. 전략은 상속의 우아함보다 query shape, constraint, migration과 변경 빈도로 선택한다.

## 출처

- [Jakarta Persistence 3.2, Entity Classes](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#the-entity-class)
- [Jakarta Persistence 3.2, Basic Types and Primary Keys](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#basic-types)
- [Jakarta Persistence 3.2, Inheritance Mapping](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#inheritance-mapping-strategies)
- [Hibernate ORM current User Guide, Domain Model](https://docs.hibernate.org/stable/orm/userguide/html_single/#domain-model)
- 강의: [객체와 테이블 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21691), [스키마 자동 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21692), [필드와 컬럼 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21693), [기본 키 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21694), [실전 예제 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21695)
- 강의: [상속관계 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21705), [Mapped Superclass](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21706), [실전 예제 4](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21707)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[Primary-Key-Strategy|기본 키 전략]]
- [[Relational-Inheritance-Mapping|관계형 상속 모델링]]
- [[Schema-Design|스키마 설계]]
