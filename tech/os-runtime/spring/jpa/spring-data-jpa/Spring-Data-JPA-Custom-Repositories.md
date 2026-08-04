---
tags: [jpa, spring-data-jpa, repository-fragment, querydsl]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Custom Repository", "Repository Fragment"]
---

# Spring Data JPA 사용자 정의 Repository

Derived query와 `@Query`가 읽기 어려워지거나 JPA 밖의 도구를 함께 써야 하면 repository fragment로 구현을 분리한다. 현재 권장 방식은 repository 이름에 `Impl`을 붙인 단일 구현이 아니라 재사용 가능한 fragment interface와 그 구현의 조합이다.

## Fragment 조합

```java
public interface MemberSearch {
    List<MemberSummary> search(MemberCondition condition);
}

@Repository
class MemberSearchImpl implements MemberSearch {
    private final EntityManager em;

    MemberSearchImpl(EntityManager em) {
        this.em = em;
    }

    @Override
    public List<MemberSummary> search(MemberCondition condition) {
        // Criteria, Querydsl, native query, JdbcTemplate 등
        return List.of();
    }
}

public interface MemberRepository
        extends JpaRepository<Member, Long>, MemberSearch {
}
```

탐색 convention은 fragment interface 이름과 postfix를 조합한다. 기본 postfix가 `Impl`이므로 `MemberSearch`의 구현은 `MemberSearchImpl`이다. 구현은 일반 Spring bean이며 `EntityManager`, `JdbcTemplate`, 다른 query component를 constructor로 주입할 수 있다.

## 과거 방식과 구분

```text
Legacy: MemberRepository + MemberRepositoryImpl
Current: MemberRepository + MemberSearch + MemberSearchImpl
```

Repository 자체 이름에서 단일 custom 구현을 찾는 legacy pattern은 deprecated다. Fragment model은 여러 기능을 조합하고 다른 repository에서 재사용할 수 있으며, 선언 순서로 동일 signature 충돌의 우선순위도 정한다.

## 언제 fragment를 쓰는가

- 동적 query가 derived method나 Specification보다 domain-specific하다.
- Querydsl, Criteria, JDBC, database function을 한 query component에 캡슐화한다.
- 여러 repository가 같은 custom behavior를 공유한다.
- 반환 DTO, fetch plan, pagination count를 함께 제어해야 한다.

구현 한 개만 쓰고 재사용도 조합도 없다면 별도 query service 또는 query repository가 더 단순할 수 있다. Fragment는 architecture 목표가 아니라 repository composition 도구다.

## Transaction과 persistence unit

Use case transaction은 service layer가 소유하는 것이 기본이다. Fragment가 독립 호출돼도 원자성을 가져야 하면 구현 method에 `@Transactional`을 명시한다. Read query는 `readOnly = true`를 검토하되 DB와 provider에서 실제 효과를 확인한다.

여러 `EntityManager`가 있으면 `@PersistenceContext(unitName = ...)`로 명시하거나 `JpaContext.getEntityManagerByManagedType()`으로 domain type의 manager를 선택한다. 한 domain type이 여러 persistence unit에 동시에 속하면 자동 선택에 의존하지 않는다.

## 전체 base repository 변경

모든 repository의 `save()` 등에 공통 정책을 적용해야만 한다면 `SimpleJpaRepository`를 상속한 base class와 `@EnableJpaRepositories(repositoryBaseClass = ...)`를 사용할 수 있다. 영향 범위가 전체 data access layer이므로 fragment보다 강한 결합과 upgrade 비용을 만든다.

Cross-cutting validation, authorization, event 발행이 정말 repository 기반 동작인지 먼저 확인한다. Service, domain event, interceptor가 더 맞을 수 있다.

## 검증 체크리스트

- fragment interface 이름과 구현 postfix가 scan convention에 맞는가
- query implementation을 통합 test로 실제 DB에서 검증했는가
- service와 fragment의 transaction 책임이 중복되지 않는가
- DTO mapping, count query와 fetch plan이 한 경계에서 보이는가
- legacy repository-name `Impl` pattern을 새 코드에 추가하지 않았는가

## 출처

- [Spring Data JPA 4.1, Custom Repository Implementations](https://docs.spring.io/spring-data/jpa/reference/repositories/custom-implementations.html)
- [Spring Data JPA 4.1, Transactionality](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html)
- [사용자 정의 repository 구현](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28022)

## 관련 문서

- [[Spring-Data-JPA-Repository-Abstraction|Repository proxy와 구성]]
- [[Spring-Data-JPA-Specification-and-QBE|동적 query 선택]]
- [[Querydsl-Repository-and-Paging|Querydsl repository와 paging]]
- [[Spring-Transactional|Spring transaction 경계]]
- [[JPA-API-DTO-Boundary|조회 DTO 경계]]
