---
tags: [jpa, relationship, foreign-key, mappedby, association]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA Relationship Mapping", "JPA 연관관계 매핑", "연관관계의 주인"]
---

# JPA 연관관계 매핑

객체는 reference 방향마다 별도 관계가 있지만 relational table은 하나의 foreign key로 양방향 join이 가능하다. JPA의 owning side는 그 foreign key 또는 join table 변경을 기록하는 쪽이며, business owner나 aggregate root라는 뜻이 아니다.

## FK에서 시작한다

```java
@Entity
class Order {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "member_id", nullable = false)
  private Member member;
}
```

객체 탐색 방향보다 먼저 FK가 어느 table에 있고 nullable인지, unique와 delete policy가 무엇인지 결정한다. `@JoinColumn`의 mapping과 실제 migration의 FK, index와 constraint를 함께 확인한다.

## 방향과 소유권

| 관계 | 일반적인 owning side | 핵심 규칙 |
|---|---|---|
| N:1 / 1:N | FK가 있는 N쪽의 `@ManyToOne` | 반대 collection은 `mappedBy`로 읽기 방향 추가 |
| 1:1 | FK와 `@JoinColumn`을 둔 쪽 | 진짜 1:1이면 FK에 unique constraint 필요 |
| N:M | `@JoinTable`을 선언한 한쪽 | 관계에 속성이 생기면 link entity로 승격 |

Bidirectional mapping에서 inverse side만 바꾸면 FK가 갱신되지 않는다. Application은 runtime object graph의 양쪽을 일관되게 유지할 책임이 있다.

```java
public void assignMember(Member next) {
  if (member != null) member.removeOrder(this);
  member = next;
  if (next != null) next.addOrder(this);
}
```

Convenience method는 한곳만 관계 동기화를 책임지게 하고, 두 method가 서로를 무한 호출하지 않게 구현한다. Entity 전체 association을 `equals`, `hashCode`, `toString`에 넣으면 cycle, lazy loading과 hash collection 불변성 문제가 생길 수 있다.

## 매핑별 판단

### 다대일

가장 자연스러운 FK mapping이다. 먼저 단방향 `ManyToOne`으로 시작하고 실제 반대 방향 탐색이 필요할 때만 `OneToMany(mappedBy = ...)`를 추가한다.

### 일대다 단방향

Parent collection이 child table의 FK를 관리하는 단방향 1:N은 객체 방향과 FK 위치가 어긋나 추가 UPDATE 또는 provider-specific DML이 생길 수 있다. 특별한 이유가 없다면 child의 N:1을 owning side로 둔다.

### 일대일

어느 table에 FK를 둘지는 접근 방향, optional 여부, 향후 N:1 변화 가능성과 schema migration 비용으로 결정한다. Mapping만으로 1:1을 믿지 말고 DB unique constraint를 둔다.

### 다대다

단순 연결이라도 운영 model은 생성 시각, 상태, 역할, 순서 같은 관계 속성이 자주 생긴다. `@ManyToMany`가 이를 표현하지 못하면 join table을 `Membership` 같은 entity로 승격하고 두 개의 N:1로 매핑한다.

## JPA와 TypeORM의 공통 원리

TypeORM도 `@ManyToOne` 쪽 FK, 1:1의 `@JoinColumn`, N:M의 `@JoinTable`처럼 owner/inverse를 나눈다. Decorator 이름보다 migration에 생성된 FK와 unique constraint가 최종 증거라는 원칙은 같다. 다만 JPA의 `mappedBy`, persistence context와 cascade semantics를 TypeORM option과 일대일 대응시키지는 않는다.

## 점검 질문

- FK를 변경하는 owning side가 어디인지 설명할 수 있는가?
- 양쪽 reference를 한 method에서 함께 맞추는가?
- 조회 편의 때문에 불필요한 bidirectional relation을 추가하지 않았는가?
- N:M 관계 자체의 identity와 속성이 필요한가?
- DB FK, unique, nullability와 index가 mapping 의도와 일치하는가?

## 출처

- [Jakarta Persistence 3.2, Relationships](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#relationships-between-entities)
- [Jakarta Persistence 3.2, Relationship Mapping Defaults](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#relationship-mapping-defaults)
- [Hibernate ORM current User Guide, Associations](https://docs.hibernate.org/stable/orm/userguide/html_single/#associations)
- 강의: [단방향 연관관계](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21696), [양방향과 연관관계의 주인 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21697), [양방향과 연관관계의 주인 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21698), [실전 예제 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21699)
- 강의: [다대일](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21700), [일대다](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21701), [일대일](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21702), [다대다](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21703), [실전 예제 3](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21704)
- 김영한 강사, 활용 1 도메인 매핑: [도메인 모델과 테이블 설계](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24282), [엔티티 클래스 개발1](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24283), [엔티티 클래스 개발2](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24768)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[Relational-Relationship-Modeling|관계형 연관관계 모델링]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
