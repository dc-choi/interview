---
tags: [jpa, spring-data-jpa, persist, merge, id-generation]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Spring Data save", "Persistable isNew", "JPA ID Generation"]
---

# Spring Data JPA 엔티티 저장과 신규 판별

`JpaRepository.save()`는 단순한 INSERT API가 아니다. entity가 새것이면 `EntityManager.persist()`, 기존 것으로 판단하면 `merge()`를 호출한다. 판별 규칙과 반환 instance를 모르면 수동 ID에서 불필요한 조회가 생기거나 detached instance를 계속 사용할 수 있다.

## `save()`의 실제 분기

개념적인 구현은 다음과 같다.

```java
@Transactional
public <S extends T> S save(S entity) {
    if (entityInformation.isNew(entity)) {
        entityManager.persist(entity);
        return entity;
    }
    return entityManager.merge(entity);
}
```

`persist()`는 전달한 instance를 managed 상태로 만든다. `merge()`는 전달 상태를 별도의 managed instance에 복사해 그 instance를 반환한다. 전달한 객체 자체는 계속 detached일 수 있으므로 반환값을 사용한다.

transaction 안에서 이미 조회한 managed entity를 수정할 때는 `save()`를 반복 호출하지 않아도 dirty checking이 반영한다. 명시적 save가 domain 의도를 더 잘 드러내는지는 팀 규칙으로 정하되, 생명주기를 먼저 이해한다.

### managed entity에도 save를 호출하는 이유

명시적 save를 팀 규칙으로 고를지 판단할 때는 다음 두 근거를 함께 본다.

- Repository는 저장 기술과 무관한 계약이다. Spring Data는 dirty checking이 없는 저장소에도 같은 repository 추상화를 제공하고, 그런 저장소에서는 save가 있어야 변경이 저장된다. 변경 뒤 save를 부르면 application code가 JPA persistence context의 동작에 기대지 않는다.
- Aggregate root가 `@DomainEvents` method나 `AbstractAggregateRoot.registerEvent()`로 모은 domain event는 `save()`, `saveAll()`, `delete()`, `deleteAll()`, `deleteAllInBatch()`, `deleteInBatch()` 호출 때 발행된다. 이 method들이 aggregate instance를 인자로 받기 때문이며, instance를 얻지 못할 수 있는 `deleteById()`는 빠진다. Dirty checking만으로 끝내면 event가 나가지 않는다.

Managed entity에 대한 save는 `merge()`로 가지만 명세상 managed entity는 merge에서 무시되고 `cascade = MERGE` 관계로만 전파되므로, save 호출 자체가 별도 UPDATE를 만들지는 않는다. 반영 여부는 test에서 `flush()`와 `clear()` 뒤 다시 조회해 확인한다.

## `isNew()` 판별 전략

Entity가 `Persistable`을 구현하면 version과 ID를 검사하지 않고 그 `isNew()` 결과에 위임한다. 구현하지 않은 entity에만 기본 전략을 적용한다.

1. non-primitive `@Version` property가 있으면 `null`인지 검사한다.
2. 그런 version property가 없으면 ID를 검사한다. 참조 type은 `null`, primitive 숫자 ID는 `0`이면 신규로 본다.

primitive version의 `0`은 JPA에서 첫 version으로 유효하므로 신규 판별에 쓸 수 없다. generated ID는 nullable wrapper type으로 두는 편이 신규 상태를 가장 분명하게 표현한다.

## 수동 ID에는 `Persistable`

애플리케이션이 저장 전에 UUID나 domain ID를 직접 할당하면 ID가 이미 non-null이다. 기본 판별은 기존 entity로 보고 `merge()`를 선택할 수 있으며, provider는 존재 여부 확인을 위해 조회한 뒤 새 row면 INSERT할 수 있다. 이것을 항상 정확히 SELECT 1회 또는 UPDATE라고 단정해서는 안 된다.

```java
@Entity
public class Order implements Persistable<String> {
    @Id
    private String id;

    @Transient
    private boolean newEntity = true;

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        newEntity = false;
    }
}
```

`@PostPersist`와 `@PostLoad` 뒤 flag를 내리면 신규 저장은 `persist()`로, 다시 읽은 entity는 기존 것으로 처리된다. 상속 hierarchy에서 공통으로 쓰면 callback method가 우연히 override되지 않게 설계한다.

### auditing 생성 시각으로 판별하기

이미 auditing을 쓰는 entity라면 새 여부의 신호로 생성 시각을 재사용할 수 있다.

```java
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Item implements Persistable<String> {
    @Id
    private String id;

    @CreatedDate
    private LocalDateTime createdDate;

    protected Item() {
    }

    public Item(String id) {
        this.id = id;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return createdDate == null;
    }
}
```

새로 만든 객체는 `createdDate`가 null이라 `isNew()`가 true이고 `persist()`가 선택되며, `AuditingEntityListener`의 `@PrePersist` callback이 그때 생성 시각을 채운다. DB에서 읽은 entity는 값이 있어 기존 것으로 판단된다. Transient flag와 callback을 따로 두지 않는 대신 판별이 auditing 설정에 묶인다.

- Auditing이 꺼져 있거나(`@EnableJpaAuditing` 또는 listener 누락) `created_date`가 null인 과거 row가 있으면 기존 data도 새것으로 판단된다. 그 row를 detached instance나 같은 ID의 새 instance로 save하면 `persist()`가 선택되어 `EntityExistsException`이나 flush 때 중복 key 오류가 난다. 이미 managed인 instance라면 명세상 persist가 무시되어 드러나지 않는다. Column을 NOT NULL로 두고 migration으로 backfill한다([[Spring-Data-JPA-Auditing]]).
- 생성자나 field 초기화에서 `createdDate`를 직접 채우면 새 entity도 `merge()`로 간다.

`merge()`는 detached instance의 상태를 managed instance로 복사할 때 쓰는 기능이다. 일반 수정은 transaction 안에서 조회한 entity의 변경 감지로 하고, 수동 ID 저장이 merge 경로로 빠지지 않게 한다([[JPA-Persistence-Context]]).

## ID 생성 전략

| 전략 | 의미 | 확인할 점 |
|---|---|---|
| `IDENTITY` | INSERT 때 DB가 ID 생성 | ID 확보 때문에 INSERT가 앞당겨져 batch insert에 불리할 수 있음 |
| `SEQUENCE` | sequence에서 ID 선할당 | allocation size와 실제 DB sequence increment 일치 |
| `TABLE` | 별도 table로 sequence 흉내 | lock과 추가 I/O 병목 |
| `UUID` | Jakarta Persistence 3.1부터 표준 UUID 생성 | Java type, DB 저장 형식과 index 크기 |
| `AUTO` | provider가 전략 선택 | 실제 generator와 생성 schema 확인 |

`IDENTITY`는 `persist()` 시점에 ID가 필요해 INSERT가 즉시 실행될 수 있다. 대량 저장에서는 sequence pre-allocation 또는 애플리케이션 할당 ID 등 실제 DB에 맞는 전략을 benchmark한다.

## 대체 키와 자연 키

JPA ID는 변경되지 않는 대체 키로 두고, 이메일이나 ISBN 같은 domain 식별 규칙은 DB `UNIQUE` 제약으로 별도 표현할 수 있다. Hibernate의 `@NaturalId`와 `@NaturalIdCache`는 JPA 표준이 아니다.

`@NaturalIdCache`는 natural ID에서 primary key로 가는 해석 결과를 공유 second-level cache에 저장한다. session 내부 해석 map과는 구분하고, second-level cache 활성화 및 조회 빈도를 측정한 뒤 사용한다.

## 저장 경계 체크리스트

- aggregate 생성과 수정이 같은 transaction 안에서 일어나는가
- assigned ID라면 `isNew()` 계약을 명시했는가
- `merge()` 반환 instance를 사용하는가
- unique constraint로 business key의 경합을 막는가
- batch 저장이 필요하면 ID 전략과 실제 JDBC batching을 함께 확인했는가
- schema는 운영에서 migration으로 관리하고 `ddl-auto`는 `validate` 또는 `none`으로 제한했는가

## 출처

- [Spring Data Commons, AbstractEntityInformation](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/repository/core/support/AbstractEntityInformation.html)

- [Spring Data JPA 4.1, Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
- [Spring Data JPA 4.1, Publishing Events from Aggregate Roots](https://docs.spring.io/spring-data/jpa/reference/repositories/core-domain-events.html)
- [Spring Data Commons 4.1, AbstractAggregateRoot API](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/AbstractAggregateRoot.html)
- [Spring Data JPA 4.1.1, `AuditingEntityListener` source](https://github.com/spring-projects/spring-data-jpa/blob/4.1.1/spring-data-jpa/src/main/java/org/springframework/data/jpa/domain/support/AuditingEntityListener.java)
- [Jakarta Persistence 3.2 Specification, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)
- [Jakarta Persistence 3.2, Merging Detached Entity State](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a1983)
- [Hibernate ORM 7.4 User Guide, Natural IDs](https://docs.hibernate.org/stable/orm/userguide/html_single/#naturalid)
- [매일메일, Spring Data JPA의 새 엔티티 판단](https://www.maeil-mail.kr/question/27)
- [매일메일, JPA ID Generation](https://www.maeil-mail.kr/question/69)
- [새로운 entity를 구별하는 방법](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28028)
- [스프링 데이터 JPA 구현체 분석](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28027)
- [회원 애플리케이션 기능 추가](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306690)
- [JPA와 도메인 모델 패턴](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312138)
- [Natural Identifier](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301561)
- [NaturalIdCache 정정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=443352)
- [JPA 기본 개념](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49597)
- [Spring Data JPA 기본 개념](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49598)

## 관련 문서

- [[JPA-Persistence-Context|영속성 컨텍스트와 merge]]
- [[Primary-Key-Strategy|Primary key 전략]]
- [[Schema-Migration-Large-Table|Schema migration]]
- [[Spring-Data-JPA-Auditing|Auditing callback]]
