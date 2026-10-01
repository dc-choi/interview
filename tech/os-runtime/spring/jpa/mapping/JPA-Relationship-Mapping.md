---
tags: [jpa, relationship, foreign-key, mappedby, association]
status: done
verified_at: 2026-09-30
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

객체 탐색 방향보다 먼저 FK가 어느 table에 있고 nullable인지, unique와 delete policy가 무엇인지 결정한다. `@JoinColumn`의 mapping과 실제 migration의 FK, index와 constraint를 함께 확인한다. `@JoinColumn(referencedColumnName)`은 FK가 대상의 PK가 아닌 다른 column을 참조할 때만 지정한다.

## 방향과 소유권

| 관계 | 일반적인 owning side | 핵심 규칙 |
|---|---|---|
| N:1 / 1:N | FK가 있는 N쪽의 `@ManyToOne` | 반대 collection은 `mappedBy`로 읽기 방향 추가 |
| 1:1 | FK와 `@JoinColumn`을 둔 쪽 | 진짜 1:1이면 FK에 unique constraint 필요 |
| N:M | `@JoinTable`을 선언한 한쪽 | 관계에 속성이 생기면 link entity로 승격 |

`@ManyToOne`에는 `mappedBy` 속성이 없다. 명세가 1:N/N:1 양방향의 owner를 N쪽으로 고정하므로 다대일 쪽은 항상 owning side다. Owner는 비즈니스 중요도가 아니라 FK 위치로 정한다.

### 한쪽만 설정했을 때

Bidirectional mapping에서 inverse side만 바꾸면 FK가 갱신되지 않는다. Application은 runtime object graph의 양쪽을 일관되게 유지할 책임이 있다. Hibernate 7.4.11과 H2에서 두 방향의 실패를 확인했다.

- Inverse만 설정: `team.getMembers().add(member)`만 하고 저장하면 `mappedBy` collection은 읽기 전용이라 무시되어 `member.team_id`가 null로 저장됐다. 원리를 알아도 운영 code에서 흔히 반복되는 실수다.
- Owner만 설정: `member.changeTeam(team)`만 하면 DB는 맞다. 하지만 같은 persistence context에서 `em.find(Team.class, id)`는 SQL 없이 persist했던 그 instance를 돌려줘 `members`가 비어 있었다. JPQL로 다시 조회하면 SQL은 실행되지만 이미 관리 중인 instance를 돌려줘 역시 비어 있었고, `flush()`와 `clear()` 뒤에야 DB에서 채워졌다. 실행 흐름에 따라 결과가 달라지며 JPA 없이 도는 순수 객체 test에서도 같은 불일치가 난다.

그래서 순수 객체 상태까지 고려해 양쪽을 한 method에서 함께 설정한다.

```java
public void assignMember(Member next) {
  if (member != null) member.removeOrder(this);
  member = next;
  if (next != null) next.addOrder(this);
}
```

Convenience method는 한곳만 관계 동기화를 책임지게 하고, 두 method가 서로를 무한 호출하지 않게 구현한다. 이름은 단순 setter가 아님이 드러나도록 `assignMember`, `changeTeam`처럼 짓는다. Entity 전체 association을 `equals`, `hashCode`, `toString`에 넣으면 cycle, lazy loading과 hash collection 불변성 문제가 생길 수 있다. 식별자 기준 구현은 [[JPA-Entity-Mapping-Identity|식별자 전략과 엔티티 동등성]]에 둔다.

## 매핑별 판단

### 다대일

가장 자연스러운 FK mapping이다. 먼저 단방향 `ManyToOne`으로 설계를 끝내고 실제 반대 방향 탐색이 필요할 때만 `OneToMany(mappedBy = ...)`를 추가한다. 양방향을 추가해도 table은 바뀌지 않으므로 나중에 붙이는 비용이 작고, 반대 방향 탐색은 주로 JPQL 작성 편의 때문에 필요해진다. 특정 회원의 주문은 `Order.member` FK로 조회할 수 있으므로 `Member.orders` collection이 꼭 필요한지 먼저 묻고, 상품에서 주문상품으로 가는 참조처럼 탐색할 일이 드문 방향은 두지 않는다.

### 일대다 단방향

Parent collection이 child table의 FK를 관리하는 단방향 1:N은 객체 방향과 FK 위치가 어긋난다. 1쪽이 owner인데 FK는 항상 N쪽 table에 있으므로 반대편 table의 FK를 관리하는 구조가 된다. Hibernate 7.4.11에서 `Team`이 member 두 명을 담아 저장되자 member INSERT 2번과 team INSERT 뒤에 `update member set team_id=? where id=?`가 2번 더 나갔고, collection에서 하나를 빼자 `update member set team_id=null ...`이 나갔다.

- `@OneToMany`와 함께 `@JoinColumn`을 지정한다. 생략하면 명세 기본값인 join table이 생긴다. 7.4.11 DDL은 owner table과 대상 table 이름을 이은 join table을 만들고 대상 FK에 unique를 걸었다.
- 운영상 비용은 추적이다. 개발자는 `Team`만 고쳤다고 생각하는데 `member` UPDATE가 나가므로 table이 많은 system에서 SQL의 원인을 찾기 어렵다.
- 일대다 양방향은 명세가 정의하지 않는다. N쪽에 `@ManyToOne @JoinColumn(name = "team_id", insertable = false, updatable = false)`를 두면 읽기 전용 참조를 흉내 낼 수 있지만, 이 field는 INSERT와 UPDATE에서 빠지므로 FK는 여전히 1쪽 collection의 추가 UPDATE가 쓴다. 7.4.11에서 `member.team`만 설정하고 collection에 넣지 않은 row는 `team_id`가 null로 남았다.

객체 설계가 조금 덜 깔끔해지고 참조를 하나 더 두더라도 child의 N:1을 owning side로 둔 다대일 단방향이나 양방향을 기본으로 한다. 복잡한 mapping은 팀 전체가 동작을 예측하기 어렵게 만든다.

### 일대일

FK에 DB UNIQUE 제약이 있어야 1:1이 된다. Mapping만으로 1:1을 믿지 말고 DB unique constraint를 둔다. FK는 주로 조회하는 주 table(member)과 대상 table(locker) 어느 쪽에도 둘 수 있으며, 접근 방향, optional 여부, 향후 N:1 변화 가능성과 schema migration 비용으로 정한다.

| FK 위치 | 장점 | 비용 |
|---|---|---|
| 주 table (`member.locker_id`) | 단방향 N:1과 schema가 같아 mapping이 단순하다. 주 table만 읽어도 대상 존재 여부를 알 수 있어 LAZY proxy가 동작한다 | 대상이 없으면 FK가 null이어야 한다 |
| 대상 table (`locker.member_id`) | null FK가 없고 관계가 1:N으로 바뀌어도 table 구조를 유지하기 쉽다 | 주 entity에서 단방향으로 매핑할 수 없고, bytecode enhancement 없이는 inverse 쪽이 즉시 로딩된다 |

명세의 단방향 1:1 기본값은 참조를 가진 entity의 table에 FK가 있는 형태다. FK가 대상 table에 있으면 대상 entity의 `Locker.member`를 owner로 둔 양방향으로 매핑하고 `Member.locker`는 `mappedBy`가 된다. 대상 table FK를 주 entity에서 단방향으로 매핑하는 방법은 표준에 없다.

이때 inverse 쪽 `@OneToOne(mappedBy = "member", fetch = FetchType.LAZY)`는 지연 로딩되지 않는다. 주 table에는 FK가 없어 proxy를 넣을지 null을 넣을지 판단하려면 대상 table을 조회해야 하기 때문이다. Hibernate 7.4 문서도 lazy initialization bytecode enhancement 없이는 이 요청을 지킬 수 없다고 설명한다. Hibernate 7.4.11과 H2에서 member 3건을 JPQL로 읽자 locker가 없는 member까지 locker SELECT가 member마다 한 번씩 3번 더 나갔고, 반환된 locker는 proxy가 아닌 실제 객체였다. `em.find()`도 SELECT 2번이었다. 같은 데이터를 주 table FK로 매핑하면 SELECT 한 번에 locker는 초기화되지 않은 proxy였다. 목록 조회에서는 이 차이가 그대로 N+1이 된다.

- 성능과 mapping 편의를 우선하면 주 table FK가 단순하다. null FK를 꺼리는 DB 설계 관점이 있으므로 schema 소유자와 함께 정한다.
- 대상 table FK를 유지해야 하면 대상 PK를 주 entity PK로 공유하는 `@MapsId` 단방향(Hibernate 문서의 권장안), bytecode enhancement, 목록 조회의 fetch join이나 DTO projection을 비교한다.

### 다대다

단순 연결이라도 운영 model은 생성 시각, 상태, 역할, 순서 같은 관계 속성이 자주 생긴다. `@ManyToMany`가 이를 표현하지 못하면 join table을 `Membership` 같은 entity로 승격하고 두 개의 N:1로 매핑한다.

## JPA와 TypeORM의 공통 원리

TypeORM도 `@ManyToOne` 쪽 FK, 1:1의 `@JoinColumn`, N:M의 `@JoinTable`처럼 owner/inverse를 나눈다. Decorator 이름보다 migration에 생성된 FK와 unique constraint가 최종 증거라는 원칙은 같다. 다만 JPA의 `mappedBy`, persistence context와 cascade semantics를 TypeORM option과 일대일 대응시키지는 않는다.

## 점검 질문

- FK를 변경하는 owning side가 어디인지 설명할 수 있는가?
- 양쪽 reference를 한 method에서 함께 맞추는가?
- 조회 편의 때문에 불필요한 bidirectional relation을 추가하지 않았는가?
- 일대다 단방향 mapping이 child table에 추가 UPDATE를 만들지 않는가?
- 대상 table FK인 1:1의 inverse 쪽이 목록 조회마다 추가 SELECT를 만들지 않는가?
- N:M 관계 자체의 identity와 속성이 필요한가?
- DB FK, unique, nullability와 index가 mapping 의도와 일치하는가?

## 출처

- [Jakarta Persistence 3.2, Relationships](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a516)
- [Jakarta Persistence 3.2, Relationship Mapping Defaults](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a538)
- [Jakarta Persistence 3.2, Unidirectional OneToOne Relationships](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a640)
- [Jakarta Persistence 3.2, Unidirectional OneToMany Relationships](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a764)
- [Jakarta Persistence 3.2, JoinColumn Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14922)
- [Hibernate ORM current User Guide, Associations](https://docs.hibernate.org/stable/orm/userguide/html_single/#associations)
- [Hibernate ORM 7.4 User Guide, @OneToOne](https://docs.hibernate.org/orm/7.4/userguide/html_single/#associations-one-to-one)
- [Hibernate ORM 7.4 User Guide, Bidirectional @OneToOne lazy association](https://docs.hibernate.org/orm/7.4/userguide/html_single/#associations-one-to-one-bidirectional-lazy)
- 강의: [단방향 연관관계](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21696), [양방향과 연관관계의 주인 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21697), [양방향과 연관관계의 주인 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21698), [실전 예제 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21699)
- 강의: [다대일](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21700), [일대다](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21701), [일대일](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21702), [다대다](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21703), [실전 예제 3](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21704)
- 김영한 강사, 활용 1 도메인 매핑: [도메인 모델과 테이블 설계](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24282), [엔티티 클래스 개발1](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24283), [엔티티 클래스 개발2](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24768)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[Relational-Relationship-Modeling|관계형 연관관계 모델링]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
