---
tags: [jpa, spring-data-jpa, persist, merge, id-generation]
status: done
verified_at: 2026-08-04
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

## 기본 `isNew()` 판별 순서

1. non-primitive `@Version` property가 있으면 `null`인지 검사한다.
2. 그런 version property가 없으면 ID가 `null`인지 검사한다.
3. entity가 `Persistable`을 구현하면 그 `isNew()` 결과에 위임한다.

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

- [Spring Data JPA 4.1, Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
- [Jakarta Persistence 3.2 Specification, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)
- [Hibernate ORM 7.4 User Guide, Natural IDs](https://docs.hibernate.org/stable/orm/userguide/html_single/#naturalid)
- [매일메일, Spring Data JPA의 새 엔티티 판단](https://www.maeil-mail.kr/question/27)
- [매일메일, JPA ID Generation](https://www.maeil-mail.kr/question/69)
- [새로운 entity를 구별하는 방법](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28028)
- [Natural Identifier](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301561)
- [NaturalIdCache 정정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=443352)
- [JPA 기본 개념](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49597)
- [Spring Data JPA 기본 개념](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49598)

## 관련 문서

- [[JPA-Persistence-Context|영속성 컨텍스트와 merge]]
- [[Primary-Key-Strategy|Primary key 전략]]
- [[Schema-Migration-Large-Table|Schema migration]]
- [[Spring-Data-JPA-Auditing|Auditing callback]]
