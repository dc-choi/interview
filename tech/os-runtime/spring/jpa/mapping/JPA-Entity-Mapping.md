---
tags: [jpa, entity, naming-strategy, column-mapping, inheritance]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Entity Mapping", "JPA 엔티티 매핑", "JPA 상속 매핑"]
---

# JPA 엔티티와 상속 매핑

Entity mapping은 객체 model의 identity와 관계형 schema의 key, column, inheritance 표현을 연결한다. Annotation은 운영 schema migration을 대신하지 않으며, 생성 DDL과 실제 constraint를 함께 검토한다. 식별자 전략과 `equals`, `hashCode`는 [[JPA-Entity-Mapping-Identity|식별자 전략과 엔티티 동등성]], schema 자동 생성은 [[JPA-Entity-Mapping-Schema-Generation|JPA schema 자동 생성]]에 둔다.

## portable entity 요건

Jakarta Persistence 3.2 기준 entity는 다음 조건을 지켜야 이식 가능하다.

- `@Entity`로 선언한 top-level class 또는 static nested class다. enum, record, interface는 entity가 될 수 없다.
- public 또는 protected no-argument constructor가 있어야 한다.
- entity class와 모든 method, persistent instance variable은 non-final이어야 한다.
- `@Id` 위치에 따라 field access와 property access가 정해지므로 한 hierarchy에서 일관되게 사용한다.
- record는 entity가 아니라 Jakarta Persistence 3.2의 embeddable로 사용할 수 있다.

Hibernate가 bytecode enhancement나 확장 기능으로 더 넓은 형태를 지원하더라도 표준 요건과 provider 확장을 구분한다.

### 생성 경로를 하나로 모은다

기본 생성자는 provider가 reflection으로 instance를 만들고 lazy loading proxy를 subclass로 만드는 데 쓴다. Hibernate는 생성자 visibility를 대부분 무시하지만 runtime proxy를 쓰려면 최소 package visibility가 필요하다고 안내한다. 명세를 지키면서 애플리케이션 코드에는 쓰지 말라는 신호를 주려면 `private`이 아니라 `protected`로 둔다.

```java
@Entity
@Table(name = "orders")
public class Order {
  protected Order() {} // Lombok: @NoArgsConstructor(access = AccessLevel.PROTECTED)

  public static Order create(Member member, Delivery delivery, List<OrderItem> items) {
    Order order = new Order();
    order.changeMember(member);
    order.delivery = delivery;
    for (OrderItem item : items) order.addItem(item);
    order.status = OrderStatus.ORDERED;
    order.orderedAt = LocalDateTime.now();
    return order;
  }
}
```

- 연관관계 연결, 초기 상태와 생성 시각처럼 함께 맞아야 하는 값은 정적 생성 method 한곳에서 만든다. 주문상품 생성과 재고 차감처럼 함께 일어나야 하는 규칙도 생성 method에 둔다. 생성 규칙이 바뀌면 이 method만 고친다.
- `new` 뒤 setter로 채우는 경로가 섞이면 생성 규칙이 흩어지므로 기본 생성자를 `protected`로 막는다. Java의 `protected`는 같은 package 접근을 허용하므로 compile 단계의 완전한 차단이 아니라 관례적 신호다.
- value type도 생성자에서만 값을 받고 setter를 두지 않는다([[JPA-Value-Types|JPA 값 타입]]). TypeScript의 정적 factory 예시는 [[Domain-Model]], 통합 model의 생성자 제약은 [[Domain-ORM-Mapper]]에 있다.

## 이름 매핑

- `@Entity(name)`은 JPQL이 쓰는 entity name이고 기본값은 package를 뺀 class 이름이다. `@Table(name)`의 기본값이 entity name이므로 table 이름을 바꾸려고 `@Entity(name)`을 바꾸면 JPQL의 entity 이름까지 바뀐다. table 이름은 `@Table(name)`으로 바꾸고 `catalog`와 `schema`도 `@Table` 속성으로 지정한다.
- `Order`, `User`, `Group`처럼 entity 이름이 DB 예약어와 겹치면 기본 table 이름도 예약어가 된다. Hibernate 7.4.11과 H2에서 `@Entity(name = "Order")`는 기동 때 DDL 실패를 WARN log로만 남기고 올라온 뒤(`hibernate.hbm2ddl.halt_on_error` 기본 false) 첫 INSERT에서 `SQLGrammarException`으로 실패했다. `@Table(name = "orders")`처럼 이름을 바꾸는 편이 단순하다. 명세의 delimited identifier나 Hibernate `hibernate.auto_quote_keyword`(기본 false)로 quote할 수도 있지만 DB별 대소문자 규칙이 따라온다. 예약어 목록은 대상 DB 문서로 확인한다.
- Hibernate는 이름을 두 단계로 정한다. 이름을 명시하지 않으면 implicit naming strategy가 logical name을 만들고, physical naming strategy는 명시한 이름과 암묵 이름 모두에 적용되어 실제 이름이 된다. Hibernate 자체 기본 physical strategy는 logical name을 그대로 쓴다.
- Spring Boot는 physical strategy를 따로 지정한다. Boot 4.1은 Hibernate 7의 `PhysicalNamingStrategySnakeCaseImpl`, Boot 2.6부터 3.5까지는 같은 동작의 `CamelCaseToUnderscoresNamingStrategy`(Hibernate 7에서 deprecated for removal), 2.5까지는 Boot 자체의 `SpringPhysicalNamingStrategy`(2.6에서 deprecated)를 쓰며, camelCase와 점을 underscore로 바꾸고 소문자로 만든다. 그래서 `@Column(name = "orderDate")`도 `order_date`가 된다(Hibernate 7.4.11 실측). 대소문자 혼합 이름을 유지해야 하는 legacy schema는 `spring.jpa.hibernate.naming.physical-strategy`로 Hibernate 기본인 `PhysicalNamingStrategyStandardImpl`을 지정하거나 전략을 직접 구현한다. quote한 identifier는 snake case 전략이 바꾸지 않는다.
- PK는 field를 `id`로 두고 column을 `member_id`처럼 `table명_id`로 지정하는 관례가 많다. table의 `id` column은 어느 entity의 식별자인지 드러나지 않지만 `member_id`는 FK column `orders.member_id`와 이름이 맞아 join을 읽기 쉽다. 어느 규칙이든 schema 전체에서 일관되게 쓴다([[Data-Modeling-Workflow]]).

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

| `@Column` 속성 | 의미 |
|---|---|
| `name` | field와 column 이름이 다를 때 지정한다. 생략하면 field 이름에 naming strategy가 적용된다 |
| `insertable`, `updatable` | 기본 true다. false면 그 column이 INSERT나 UPDATE SQL에서 빠진다. 같은 column을 두 field가 매핑할 때 한쪽을 읽기 전용으로 만든다 |
| `nullable = false` | DDL에 NOT NULL을 만든다. Hibernate는 Bean Validation이 없으면 저장 전에 null도 막는다 |
| `length` | 문자열 column 길이이며 기본 255다 |
| `columnDefinition` | DB 고유 DDL fragment를 직접 쓴다. DB 사이에서 portable하지 않다 |
| `unique = true` | 이름 없는 단일 column unique 제약을 만든다. 이름이 필요하면 `@Table(uniqueConstraints)`를 쓴다 |

- 제약 이름은 `@Table(uniqueConstraints = @UniqueConstraint(name = "uk_member_email", columnNames = "email"))`처럼 붙인다. 이름이 없으면 위반 message에 DB가 만든 이름이 나와 원인을 찾기 어렵다. 생성 DDL과 제약 이름은 [[JPA-Entity-Mapping-Schema-Generation]]에 둔다.
- enum의 기본값 `EnumType.ORDINAL`은 선언 순서 숫자를 저장한다. `@Enumerated`를 value 없이 붙여도, annotation을 아예 생략해도 ORDINAL이다. 3.2 명세는 annotation을 생략했을 때만 예외를 두어, enum에 `@EnumeratedValue`를 붙인 final `String` field가 있으면 STRING으로 추론한다. 하지만 Hibernate 7.4.11은 이 추론을 따르지 않고 ORDINAL로 해석해 기동 때 `MappingException`을 냈다. 일반 enum은 Hibernate 7.4.11에서도 두 경우 모두 `tinyint` column이 됐으므로 attribute를 빼는 순간 ORDINAL이 조용히 선택된다. 상수를 앞이나 중간에 추가하거나 순서를 바꾸면 이미 저장된 숫자가 다른 상수로 읽히고, 과거 row와 새 row를 구분할 정보도 남지 않아 복구가 어렵다. 그래서 보통 `EnumType.STRING`을 명시한다. Hibernate 7.4.11의 H2 DDL은 ORDINAL을 `tinyint check (status between 0 and 1)`, STRING을 `enum ('A','B')`로 만들었으므로 생성 DDL을 쓰는 환경에서는 상수 추가도 schema 변경이다.
- STRING은 상수 이름을 저장하므로 순서 변경에는 안전하지만 이름 변경에는 약하다. Hibernate 7.4.11에서 DB에 남은 옛 이름을 읽자 `IllegalArgumentException: No enum constant ...`로 조회 자체가 실패했다. 상수 rename은 기존 row를 바꾸는 data migration과 함께 배포하거나, Jakarta Persistence 3.2의 `@EnumeratedValue`를 붙인 final `String` field로 DB 값을 상수 이름과 분리한다. 이 field 값은 null이 아니고 상수마다 달라야 하며, 위 추론 차이 때문에 `@Enumerated(EnumType.STRING)`을 함께 명시한다. Hibernate 7.4.11에서 이렇게 매핑하면 code 값이 저장되어 상수 이름을 바꿔도 조회가 유지됐다. 대신 code 자체를 바꾸면 기존 row가 예외 없이 null로 읽혔다(명세는 이 경우를 정의하지 않는다). Code 변경도 data migration과 함께 한다.
- 새 date/time 코드는 `LocalDate`, `LocalDateTime`, `OffsetDateTime`, `Instant`, `Year` 같은 `java.time` type을 우선한다.
- `@Temporal`과 `TemporalType`은 `java.util.Date`/`Calendar`용이며 3.2에서 deprecated다.
- `@Lob`은 field type으로 LOB 종류를 추론한다. 문자열과 문자 type이면 CLOB, 그 밖의 type(`byte[]` 등)은 BLOB이 기본이다. 정확한 DB type은 provider와 DB에 의존하므로 큰 data의 storage 특성을 migration에서 결정한다.
- `@Transient`는 persistence 대상에서 제외한다. Java `transient`와 목적이 완전히 같지는 않다.

## schema 생성과 identifier

Schema 자동 생성은 개발 도구이며 운영 변경은 versioned migration으로 적용한다. 환경별 설정, `update`의 실제 동작과 DDL 권한 분리는 [[JPA-Entity-Mapping-Schema-Generation|JPA schema 자동 생성]]에 둔다.

`IDENTITY`, `SEQUENCE`, `TABLE`, `UUID`, `AUTO` 전략의 식별자 획득 시점, `allocationSize`와 entity 동등성 구현은 [[JPA-Entity-Mapping-Identity|식별자 전략과 엔티티 동등성]]에 둔다.

## 상속 관계 매핑

| 전략 | schema | 장점 | 비용 |
|---|---|---|---|
| `SINGLE_TABLE` | hierarchy 전체를 한 table에 저장 | query 단순, join 없음 | nullable column 증가, subtype constraint가 어려움 |
| `JOINED` | root와 subtype table을 PK로 join | 정규화, subtype column 분리 | 조회와 쓰기에 join 증가 |
| `TABLE_PER_CLASS` | concrete class마다 완전한 table | subtype 단독 조회 단순 | polymorphic query가 union이 되고 key 관리 복잡 |

Root entity에 `@Inheritance(strategy = ...)`를 선언하고, 생략하면 `SINGLE_TABLE`이다. 구분 column은 `@DiscriminatorColumn`(기본 이름 `DTYPE`, STRING, 길이 31), subtype별 값은 `@DiscriminatorValue`로 지정하며 생략하면 STRING type에서는 entity name이 들어간다. JPQL의 `TYPE(i) IN (Book, Movie)` 같은 다형성 조건은 이 값으로 번역된다. Hibernate 7.4.11과 H2 실측은 다음과 같았다.

- `SINGLE_TABLE`: `DTYPE varchar(31) not null`과 subtype entity name 목록의 check 제약(`check (DTYPE in ('Book','Movie'))` 형태)이 생기고, 부모 type 조회는 join 없는 SELECT 하나였다. subtype 전용 column은 모두 nullable이어야 해서 column 수준 NOT NULL을 쓸 수 없다.
- `JOINED`: 부모 type 조회는 자식 table outer join과 `case when ... is not null`로 subtype을 판별했다. 명세는 JOINED에서도 provider가 보통 구분 column을 쓴다고 설명하지만 Hibernate는 선언이 없으면 만들지 않았다. 운영 중 SQL로 row type을 바로 보려면 `@DiscriminatorColumn`을 명시한다.
- `TABLE_PER_CLASS`: 부모 type 조회가 subtype table의 `union all`이 됐다. 명세상 지원이 optional이고 Hibernate 문서도 효율적인 SQL을 만들지 못한다며 피하라고 한다.

기본 선택은 정규화와 subtype 제약이 중요하면 `JOINED`, subtype이 단순하고 확장 가능성이 낮으며 조회가 중요하면 `SINGLE_TABLE`이다. 전략은 annotation만 바꾸면 provider가 SQL을 바꿔 주지만 이미 쌓인 data의 table 구조는 migration이 필요하다. subtype 속성이 많고 자주 바뀌면 상속 mapping 대신 JSON 같은 유연 속성 model도 비교한다([[Flexible-Attribute-Modeling]]). DB 관점에서 concrete table 전략이 쓸 만한 조건은 [[Relational-Inheritance-Mapping]]이 다룬다.

부모 entity를 단독으로 저장할 일이 없으면 abstract class로 둔다. `@MappedSuperclass`는 공통 mapping을 code로 상속할 뿐 entity도 table도 polymorphic query 대상도 아니다. 등록일, 수정일, 등록자 같은 공통 column을 내려주는 BaseEntity 용도이며 직접 생성할 일이 없으니 abstract로 두고, 값 채우기는 [[Spring-Data-JPA-Auditing]]에 둔다. 한 entity hierarchy에서 전략을 섞는 것은 표준이 정의하지 않는다. 전략은 상속의 우아함보다 query shape, constraint, migration과 변경 빈도로 선택한다.

## 출처

- [Jakarta Persistence 3.2, Entity Classes](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a18)
- [Jakarta Persistence 3.2, Basic Types](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a486)
- [Jakarta Persistence 3.2, Primary Keys](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a132)
- [Jakarta Persistence 3.2, Inheritance Mapping](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a966)
- [Jakarta Persistence 3.2, Naming of Database Objects](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a988)
- [Jakarta Persistence 3.2, Column Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14330)
- [Jakarta Persistence 3.2, Table Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#table-annotation)
- [Jakarta Persistence 3.2, DiscriminatorColumn Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14530)
- [Jakarta Persistence 3.2, Lob Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a15087)
- [Jakarta Persistence 3.2, Enumerated Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14719)
- [Jakarta Persistence 3.2, EnumeratedValue Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14720)
- [Hibernate ORM 7.4, Introduction, Enumerated types](https://docs.hibernate.org/orm/7.4/introduction/html_single/#enums)
- [Hibernate ORM current User Guide, Domain Model](https://docs.hibernate.org/stable/orm/userguide/html_single/#domain-model)
- [Hibernate ORM 7.4 User Guide, Implement a no-argument constructor](https://docs.hibernate.org/orm/7.4/userguide/html_single/#entity-pojo-constructor)
- [Hibernate ORM 7.4 User Guide, Naming strategies](https://docs.hibernate.org/orm/7.4/userguide/html_single/#naming)
- [Hibernate ORM 7.4 User Guide, Best practices for inheritance](https://docs.hibernate.org/orm/7.4/userguide/html_single/#best-practices-inheritance)
- [Hibernate ORM 7.4 API, `PhysicalNamingStrategySnakeCaseImpl`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/boot/model/naming/PhysicalNamingStrategySnakeCaseImpl.html)
- [Spring Boot 4.1, Configure Hibernate Naming Strategy](https://docs.spring.io/spring-boot/how-to/data-access.html)
- [Spring Boot 4.1.1, `HibernateProperties` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-hibernate/src/main/java/org/springframework/boot/hibernate/autoconfigure/HibernateProperties.java)
- [Spring Boot 3.5.0, `HibernateProperties` source](https://github.com/spring-projects/spring-boot/blob/v3.5.0/spring-boot-project/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/orm/jpa/HibernateProperties.java)
- [Spring Boot 2.6.0, `SpringPhysicalNamingStrategy` source](https://github.com/spring-projects/spring-boot/blob/v2.6.0/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/orm/jpa/hibernate/SpringPhysicalNamingStrategy.java)
- 강의: [객체와 테이블 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21691), [스키마 자동 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21692), [필드와 컬럼 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21693), [기본 키 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21694), [실전 예제 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21695)
- 강의: [상속관계 매핑](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21705), [Mapped Superclass](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21706), [실전 예제 4](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21707)
- 강의: [기본 문법과 쿼리 API](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21719), [JPQL 타입 표현과 기타식](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21724), [다형성 쿼리](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21729)
- 강의: [도메인 모델과 테이블 설계](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24282), [엔티티 클래스 개발1](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24283), [엔티티 설계시 주의점](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24284), [엔티티 클래스 개발2](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24768), [주문, 주문상품 엔티티 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24297), [주문 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24299)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[JPA-Entity-Mapping-Identity|식별자 전략과 엔티티 동등성]]
- [[JPA-Entity-Mapping-Schema-Generation|JPA schema 자동 생성]]
- [[Primary-Key-Strategy|기본 키 전략]]
- [[Relational-Inheritance-Mapping|관계형 상속 모델링]]
- [[Schema-Design|스키마 설계]]
