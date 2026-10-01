---
tags: [jpa, spring-data-jpa, auditing, entity-listener]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Auditing", "EnableJpaAuditing", "AuditorAware"]
---

# Spring Data JPA Auditing

Auditing은 entity 생성 및 변경 시각과 행위자를 JPA lifecycle callback으로 채운다. 현재 row의 metadata를 편하게 유지하는 기능이며, 모든 변경 이력을 보존하는 감사 log와는 목적이 다르다.

## 기본 구성

```java
@Configuration
@EnableJpaAuditing(
    auditorAwareRef = "auditorAware",
    dateTimeProviderRef = "dateTimeProvider"
)
class JpaConfig {
}
```

```java
@Entity
@EntityListeners(AuditingEntityListener.class)
class Order {
    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @CreatedBy
    private ActorId createdBy;

    @LastModifiedBy
    private ActorId updatedBy;
}
```

날짜만 기록하면 `AuditorAware`는 필요 없다. Listener는 entity별 `@EntityListeners`로 등록하거나 `orm.xml`로 전체 persistence unit에 등록할 수 있다. 현재 공식 구성 요구사항에 따라 `spring-aspects.jar`가 classpath에 있는지도 확인한다.

`@EnableJpaAuditing`을 빠뜨리면 listener가 호출돼도 연결된 `AuditingHandler`가 없어 아무 일도 하지 않는다(Spring Data JPA 4.1.1 `AuditingEntityListener` source). 예외 없이 audit field가 비어 저장되므로 첫 저장 test에서 값이 채워졌는지 단언한다.

공통 field는 `@MappedSuperclass`의 `BaseTimeEntity`와 `BaseEntity`로 나누거나 `@Embeddable` audit metadata로 합성할 수 있다. 등록일과 수정일은 운영 중 data 추적과 장애 분석의 기본 단서라 사실상 모든 entity에 두고, 등록자와 수정자는 필요한 entity에만 둔다. 그래서 시간만 가진 `BaseTimeEntity`를 기본으로 두고 `BaseEntity extends BaseTimeEntity`에 `@CreatedBy`, `@LastModifiedBy`를 더해 entity마다 필요한 쪽을 상속한다. Mapping 재사용을 domain의 is-a 상속으로 오해하지 않는다.

- 기반 class에 `@MappedSuperclass`를 빠뜨리면 명세상 non-entity superclass의 state는 persistent가 아니고 그 annotation도 무시되어 column이 생기지 않는다. Hibernate 7.4.11 DDL에서도 해당 field가 빠졌다.
- 생성 시각 field에는 `@Column(updatable = false)`를 둔다. Provider가 만드는 UPDATE문에서 그 column이 빠져 이후 변경이 생성 시각을 덮지 않는다. Hibernate 7.4.11에서 UPDATE는 `update item set name=?,updatedAt=? where id=?`였고 memory에서 바꾼 생성 시각은 반영되지 않았다.
- Spring Data가 필요 없는 단순 정책은 JPA callback으로 직접 구현할 수도 있다. `@PrePersist`에서 생성 시각과 수정 시각을 함께, `@PreUpdate`에서 수정 시각을 채운다.

## 행위자 결정

```java
@Bean
AuditorAware<ActorId> auditorAware(CurrentActor currentActor) {
    return () -> currentActor.id();
}
```

인증 principal에서 변경되지 않는 내부 식별자만 반환한다. Access token, session token, 전체 authentication 객체나 불필요한 개인정보를 entity에 저장하지 않는다. Batch와 system job에는 명시적인 system actor 정책을 둔다.

## 시간을 통제하기

기본 provider는 현재 시간을 사용한다. Test 재현성과 clock 정책이 중요하면 `DateTimeProvider`를 주입한다.

```java
@Bean
DateTimeProvider dateTimeProvider(Clock clock) {
    return () -> Optional.of(Instant.now(clock));
}
```

DB timestamp와 application timestamp 중 하나를 source of truth로 정한다. 여러 region에서 절대 시각을 비교한다면 `Instant`가 단순하며, 사용자 timezone 변환은 API 경계에서 처리한다.

## 생성 시 수정 시각 정책

`@EnableJpaAuditing.modifyOnCreate`의 기본값은 `true`다. 따라서 생성 때 `@CreatedDate`와 `@LastModifiedDate`가 모두 채워질 수 있다. 생성 당시 `updatedAt`을 비워야 하는 domain이면 `modifyOnCreate = false`를 명시하고 API nullability까지 맞춘다. 그런 요구가 없으면 기본값을 유지하는 편이 단순하다. 수정 시각에 null이 섞이면 최근 수정순 정렬과 기간 조회마다 null 분기나 `coalesce`가 필요해지고, 생성 직후 수정 시각이 생성 시각과 같다는 의미는 대부분의 조회에서 자연스럽다.

## Lifecycle callback의 한계

- JPQL 또는 native bulk UPDATE는 managed entity callback을 우회한다.
- DB 외부에서 직접 수정하면 application auditing이 실행되지 않는다.
- 행위자 field 변경을 막는 DB 제약이나 권한이 자동 생기지는 않는다.
- 생성 및 최종 수정 metadata만 남으므로 중간 변경 내용은 복구할 수 없다.

규제 또는 분쟁 대응처럼 누가 무엇을 어떤 값에서 어떤 값으로 바꿨는지 모두 필요하면 append-only audit log, domain event, CDC 또는 Hibernate Envers를 별도로 설계한다. 삭제 이력과 tamper resistance, 보존 기간, 접근 제어도 포함한다.

## 검증 체크리스트

- 날짜만 필요한데 불필요한 `AuditorAware`를 만들지 않았는가
- `@EnableJpaAuditing`이나 listener 등록 누락으로 값이 조용히 비지 않는지 test했는가
- 생성 시각 column이 `updatable = false`로 보호되는가
- 생성 시 `updatedAt` 정책을 명시했는가
- Test clock과 production clock이 같은 timezone 기준을 쓰는가
- Bulk update 경로가 audit metadata를 함께 갱신하는가
- Actor에는 최소한의 안정적인 ID만 저장하는가
- 현재 metadata와 전체 변경 이력 요구를 구분했는가

## 출처

- [Spring Data JPA 4.1, Auditing](https://docs.spring.io/spring-data/jpa/reference/auditing.html)
- [Spring Data JPA 4.1, EnableJpaAuditing API](https://docs.spring.io/spring-data/jpa/reference/api/java/org/springframework/data/jpa/repository/config/EnableJpaAuditing.html)
- [Spring Data JPA 4.1.1, `AuditingEntityListener` source](https://github.com/spring-projects/spring-data-jpa/blob/4.1.1/spring-data-jpa/src/main/java/org/springframework/data/jpa/domain/support/AuditingEntityListener.java)
- [Jakarta Persistence 3.2, Non-Entity Classes in the Entity Inheritance Hierarchy](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#non-entity-classes-in-the-entity-inheritance-hierarchy)
- [Jakarta Persistence 3.2, Column Annotation](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a14330)
- [Auditing](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28023)

## 관련 문서

- [[Spring-Data-JPA-Entity-Persistence|Entity lifecycle과 save]]
- [[Spring-Data-JPA-Query-Methods|Bulk DML의 callback 우회]]
- [[JPA-Persistence-Context|Flush와 dirty checking]]
- [[Spring-Transactional|Transaction 경계]]
