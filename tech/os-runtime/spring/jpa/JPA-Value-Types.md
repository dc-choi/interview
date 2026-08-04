---
tags: [jpa, value-object, embeddable, element-collection, immutability]
status: done
verified_at: 2026-08-04
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

## 불변성과 동등성

Mutable value instance를 여러 owner가 공유하면 한쪽 변경이 다른 entity의 상태도 바꾸는 aliasing bug가 생긴다. Setter보다 constructor/factory로 valid state를 만들고 변경은 새 value로 교체한다.

```java
member.changeAddress(member.address().withCity("Seoul"));
```

Value의 `equals()`와 `hashCode()`는 의미를 구성하는 같은 field 집합을 사용한다. JPA proxy가 개입하는 entity equality 규칙을 value equality에 그대로 가져오지 않는다. Java record는 component 기반 equality를 제공하므로 value에 잘 맞지만 mutable component를 넣으면 안전성이 깨질 수 있다.

## element collection

`@ElementCollection`은 basic 또는 embeddable 값의 collection을 별도 collection table에 저장한다. 기본 fetch는 `LAZY`이고 row의 lifecycle은 owner에 종속된다.

```java
@ElementCollection
@CollectionTable(name = "member_addresses", joinColumns = @JoinColumn(name = "member_id"))
private Set<Address> addresses = new HashSet<>();
```

- Collection row는 entity identity가 없으므로 개별 reference와 독립 repository 대상이 아니다.
- 값 수정은 기존 value를 제거하고 새 value를 넣는 replacement로 표현한다.
- Provider와 collection 형태에 따라 일부 변경이 collection row의 delete/reinsert를 만들 수 있으므로 SQL을 측정한다.
- 중복 허용과 순서가 중요하면 `List`, `@OrderColumn`, key/unique constraint를 함께 설계한다.
- 큰 collection, 잦은 부분 수정, audit 또는 다른 entity의 reference가 필요하면 child entity와 1:N을 고려한다.

## 값 타입을 잘못 쓰는 신호

- surrogate ID를 붙여야만 수정과 추적이 편하다.
- 다른 aggregate가 같은 row를 참조해야 한다.
- collection에서 한 원소만 lock하거나 versioning해야 한다.
- 값 하나 변경에 예상보다 넓은 DELETE/INSERT가 발생한다.
- owner 전체를 읽지 않고 값만 독립적으로 page/query해야 한다.

이 경우 annotation tuning보다 model 경계를 다시 판단한다.

## 출처

- [Jakarta Persistence 3.2, Basic Types](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#basic-types)
- [Jakarta Persistence 3.2, Embeddable Classes](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#embeddable-classes)
- [Jakarta Persistence 3.2, Collections of Values](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#collections-of-entity-and-embeddable-types)
- [Hibernate ORM current User Guide, Embeddables](https://docs.hibernate.org/stable/orm/userguide/html_single/#embeddables)
- 강의: [기본값 타입](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21712), [임베디드 타입](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21713), [값 타입과 불변 객체](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21714)
- 강의: [값 타입의 비교](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21715), [값 타입 컬렉션](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21716), [실전 예제 6](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21717)

## 관련 문서

- [[JPA-Entity-Mapping|JPA 엔티티 매핑]]
- [[JPA-Aggregate-Collection-Mapping|JPA 애그리거트 컬렉션 매핑]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
