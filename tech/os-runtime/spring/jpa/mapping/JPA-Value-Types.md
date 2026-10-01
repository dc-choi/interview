---
tags: [jpa, value-object, embeddable, element-collection, immutability]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Value Types", "JPA 값 타입", "JPA Embeddable"]
---

# JPA 값 타입

Entity는 독립 identity와 lifecycle을 갖고 value는 속성의 조합으로 의미가 정해진다. Address, Money, DateRange 같은 개념을 embeddable로 만들면 column 수는 같아도 validation과 behavior가 한 type에 모인다.

## entity와 value의 경계

| 질문 | Entity | Value |
|---|---|---|
| 같은 값이어도 개별 추적이 필요한가? | 예 | 아니오 |
| 독립 lifecycle이 있는가? | 예 | owner에 종속 |
| equality 기준 | identity 중심 | 구성 값 전체 |
| 공유 후 내부 변경 | model에 따라 가능 | 피하고 replacement 사용 |

Value가 나중에 개별 수정, audit, reference 또는 독립 query 대상이 되면 entity로 승격할 신호다.

## basic과 embeddable

Jakarta Persistence의 basic type에는 primitive/wrapper, `String`, number, enum, UUID와 여러 `java.time` type 등이 포함된다. 여러 basic field를 하나의 value로 묶을 때 `@Embeddable`과 `@Embedded`를 사용한다.

```java
@Embeddable
public record Address(String city, String street, String zipcode) {}

@Entity
class Member {
  @Embedded
  private Address address;
}
```

Jakarta Persistence 3.2는 record embeddable을 표준으로 지원한다. 사용하는 Hibernate/Spring Boot 조합이 이 표준 버전을 지원하는지 확인한다. 일반 class embeddable은 no-arg constructor 등 해당 명세 요건을 따른다.

같은 embeddable을 한 entity에 두 번 쓰거나 기본 column명이 충돌하면 `@AttributeOverride(s)`로 column을 명시한다. Embeddable 안의 association은 `@AssociationOverride` 대상이 될 수 있다.

### table은 그대로, class만 나눈다

Embedded type을 쓰기 전과 후에 매핑하는 table은 같다. Table은 그대로 두고 객체만 세밀하게 나누는 기법이므로 잘 설계한 model은 매핑한 table 수보다 class 수가 많다. 한 entity에서만 쓰여도 의미가 있다. `Period.isWork()`, `Address.fullAddress()`처럼 값에 맞는 method를 두고, `@Column(length = 10)` 같은 column 규칙과 검증을 한 type에 모아 `Member`와 `Delivery`처럼 여러 entity가 같은 규칙을 공유한다.

Embedded 값 자체를 null로 두면 그 type에 매핑된 column이 모두 null로 저장된다. 반대로 Hibernate 7.4.11에서 매핑 column이 모두 null인 row를 읽으면 embedded 값이 null이 됐다. 모든 field가 null인 빈 값 객체를 저장해도 다시 읽으면 null이므로 빈 값과 값 없음을 DB에서 구분할 수 없다. 이 구분이 domain 의미라면 NOT NULL인 구성 field나 별도 상태 column을 둔다. 명세는 이 변환을 정의하지 않고 JPQL의 embeddable null 비교도 지원하지 않으므로 provider를 바꿀 때 다시 확인한다.

## 불변성과 동등성

Mutable value instance를 여러 owner가 공유하면 한쪽 변경이 다른 entity의 상태도 바꾸는 aliasing bug가 생긴다. Setter보다 constructor/factory로 valid state를 만들고 변경은 새 value로 교체한다.

```java
member.changeAddress(member.address().withCity("Seoul"));
```

Value의 `equals()`와 `hashCode()`는 의미를 구성하는 같은 field 집합을 사용한다. JPA proxy가 개입하는 entity equality 규칙([[JPA-Entity-Mapping-Identity]])을 value equality에 그대로 가져오지 않는다. Java record는 component 기반 equality를 제공하므로 value에 잘 맞지만 mutable component를 넣으면 안전성이 깨질 수 있다.

## element collection

관계형 DB는 table 안에 collection을 담을 수 없으므로 `@ElementCollection`은 basic 또는 embeddable 값의 collection을 owner FK를 가진 별도 collection table에 저장한다. 기본 fetch는 `LAZY`다. 값 collection은 자기 lifecycle이 없어 owner만 persist해도 함께 INSERT되고 owner에서 빠지면 DELETE된다. Cascade ALL과 orphan removal을 항상 켠 자식처럼 동작한다.

```java
@ElementCollection
@CollectionTable(name = "favorite_food", joinColumns = @JoinColumn(name = "member_id"))
@Column(name = "food_name", nullable = false)
private Set<String> favoriteFoods = new HashSet<>();

@ElementCollection
@CollectionTable(name = "member_addresses", joinColumns = @JoinColumn(name = "member_id"))
private Set<Address> addresses = new HashSet<>();
```

- Basic 값 collection은 `@Column`으로 값 column 이름을 정한다.
- Collection row는 entity identity가 없으므로 개별 reference와 독립 repository 대상이 아니다.
- 값 수정은 내부 field를 setter로 바꾸지 않고 기존 value를 `remove()`한 뒤 새 value를 `add()`하는 replacement로 표현한다. `remove()`는 `equals()`와 `hashCode()`로 원소를 찾으므로 embeddable에 둘을 구현하지 않으면 제거되지 않는다.
- Provider와 collection 형태에 따라 일부 변경이 collection row의 delete/reinsert를 만들 수 있으므로 SQL을 측정한다.
- 중복 허용과 순서가 중요하면 `List`, `@OrderColumn`, key/unique constraint를 함께 설계한다.
- 큰 collection, 잦은 부분 수정, audit 또는 다른 entity의 reference가 필요하면 child entity와 1:N을 고려한다.

### collection table의 key와 변경 SQL

식별자가 없는 row는 owner FK와 값 자체로 구분된다. 실제 key와 변경 SQL은 collection 형태와 값 column의 nullability에 따라 달랐다. Hibernate 7.4.11과 H2 실측이다.

| 형태 | 생성 DDL의 key | 원소 하나를 바꿀 때 |
|---|---|---|
| `Set`, 값 column 모두 NOT NULL | owner FK와 값 전체의 PK | 해당 row DELETE와 새 row INSERT |
| `Set`, nullable 값 column | 같은 조합의 UNIQUE만 생성 | basic 값은 row 단위, nullable column이 있는 embeddable은 owner의 row 전체 DELETE 후 재INSERT |
| `List`(bag, `@OrderColumn` 없음) | key 없음 | owner의 row 전체 DELETE 후 재INSERT |
| `List`와 `@OrderColumn` | owner FK와 순서 column의 PK | 앞 원소 제거 시 마지막 위치 row DELETE와 뒤쪽 row UPDATE |

- 값에 식별자가 없어 바뀐 row를 특정할 수 없으면 provider는 전체 재삽입으로 간다. 값 collection 변경이 언제나 전체 재삽입이라고 일반화하지 않지만, bag과 nullable column이 있는 embeddable Set에서는 실제로 그렇게 됐다.
- `Set`에 넣은 null 원소는 값 column의 nullability와 관계없이 오류 없이 SQL에서 빠졌다. 값 column이 NOT NULL인 Set은 PK가 같은 값의 중복 저장도 막는다.
- `@OrderColumn`으로 전체 재삽입을 피하면 중간 삭제가 뒤쪽 row UPDATE를 만든다. 순서가 domain 의미일 때만 쓴다([[JPA-Aggregate-Collection-Mapping]]).

### entity로 승격하는 기준

좋아하는 음식 여러 개 선택(멀티 체크박스)처럼 단순하고 개별 추적이나 수정이 필요 없는 값에만 값 collection을 쓴다. 주소 이력처럼 조회, 변경, 추적이 필요하면 값을 감싼 entity로 승격한다.

```java
@Entity
class AddressEntity {
  @Id @GeneratedValue
  private Long id;

  @Embedded
  private Address address;
}

// Member
@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
@JoinColumn(name = "member_id")
private List<AddressEntity> addressHistory = new ArrayList<>();
```

Owner가 생명주기를 관리하는 성격은 cascade와 orphan removal로 유지하면서 식별자로 row를 추적하고 수정할 수 있다. 이 형태는 단방향 1:N이라 저장 때 child FK UPDATE가 더 나가므로, 쓰기가 많으면 child에 N:1 owner를 두는 형태와 비교한다([[JPA-Relationship-Mapping]]). Hibernate 전용 `@CollectionId`(id bag)로 collection row에 식별자만 붙이는 방법도 있지만 표준이 아니다.

## 값 타입을 잘못 쓰는 신호

- surrogate ID를 붙여야만 수정과 추적이 편하다.
- 다른 aggregate가 같은 row를 참조해야 한다.
- collection에서 한 원소만 lock하거나 versioning해야 한다.
- 값 하나 변경에 예상보다 넓은 DELETE/INSERT가 발생한다.
- owner 전체를 읽지 않고 값만 독립적으로 page/query해야 한다.

이 경우 annotation tuning보다 model 경계를 다시 판단한다.

## 출처

- [Jakarta Persistence 3.2, Basic Types](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a486)
- [Jakarta Persistence 3.2, Embeddable Classes](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a487)
- [Jakarta Persistence 3.2, Collections of Values](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a494)
- [Jakarta Persistence 3.2, CollectionTable Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14250)
- [Hibernate ORM current User Guide, Embeddables](https://docs.hibernate.org/stable/orm/userguide/html_single/#embeddables)
- [Hibernate ORM 7.4 User Guide, @ElementCollection](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collections-elemental)
- [Hibernate ORM 7.4 User Guide, Collection Semantics](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collections-semantics)
- 강의: [기본값 타입](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21712), [임베디드 타입](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21713), [값 타입과 불변 객체](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21714)
- 강의: [값 타입의 비교](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21715), [값 타입 컬렉션](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21716), [실전 예제 6](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21717)

## 관련 문서

- [[JPA-Entity-Mapping|JPA 엔티티 매핑]]
- [[JPA-Aggregate-Collection-Mapping|JPA 애그리거트 컬렉션 매핑]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
