---
tags: [querydsl, spring-data-jpa, repository, spring-mvc, data-binding]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Data Querydsl", "QuerydslPredicateExecutor", "QuerydslRepositorySupport"]
---

# Querydsl과 Spring Data JPA 통합

Spring Data의 Querydsl 확장은 짧은 predicate 실행과 web parameter binding을 줄여준다. 복잡한 join, fetch plan, DTO projection, count query와 public search contract까지 대신 설계하는 도구는 아니다.

## `QuerydslPredicateExecutor`

```java
public interface MemberRepository
        extends JpaRepository<Member, Long>,
                QuerydslPredicateExecutor<Member> {
}
```

현재 interface는 `findOne`, 여러 `findAll` overload, `count`, `exists`, `findBy`를 제공한다. `findBy`의 fluent callback에서는 projection, sort와 result operation을 선택할 수 있고 query object는 callback 밖으로 반환할 수 없다.

```java
Predicate activeAdults = member.active.isTrue()
    .and(member.age.goe(20));

Iterable<Member> result = repository.findAll(
    activeAdults,
    member.username.asc()
);
```

다음 요구가 생기면 custom fragment나 query repository가 보통 더 명확하다.

- Association join type과 `ON` 조건을 제어한다.
- Fetch join, entity graph와 DTO projection을 함께 설계한다.
- Content와 count query를 다르게 최적화한다.
- 검색 조건을 persistence `Predicate`가 아닌 application contract로 유지한다.
- 여러 aggregate를 조합하거나 provider-specific HQL을 격리한다.

Application service가 Querydsl `Predicate`를 입력으로 받으면 persistence DSL이 use case API가 된다. 단순 내부 관리 기능이 아니라면 이름 있는 condition DTO와 repository method를 선호한다.

## Querydsl web binding

`@EnableSpringDataWebSupport`가 활성화되고 Querydsl이 classpath에 있으면 request parameter를 `@QuerydslPredicate`로 받을 수 있다.

```java
@GetMapping("/members")
Page<MemberView> search(
        @QuerydslPredicate(root = Member.class) Predicate predicate,
        Pageable pageable) {
    return repository.findAll(predicate, pageable)
        .map(MemberView::from);
}
```

기본 binding은 simple property의 단일 값에 `eq`, collection property의 단일 값에 `contains`, simple property의 여러 값에 `in`을 적용한다. 편리하지만 entity property가 HTTP filter surface로 드러난다.

```java
interface MemberRepository
        extends JpaRepository<Member, Long>,
                QuerydslPredicateExecutor<Member>,
                QuerydslBinderCustomizer<QMember> {

    @Override
    default void customize(QuerydslBindings bindings, QMember member) {
        bindings.excludeUnlistedProperties(true);
        bindings.including(member.username, member.status);
        bindings.bind(member.username)
            .first((path, value) -> path.containsIgnoreCase(value));
        bindings.excluding(member.passwordHash);
    }
}
```

Allowlist가 기본이다. Credential, authorization flag, soft-delete field와 내부 identifier를 제외하고, association traversal과 wildcard 비용을 제한한다. `Pageable` size와 sort도 별도로 검증한다. 복잡한 API에서는 explicit request DTO가 validation, versioning과 documentation에 더 적합하다.

## `QuerydslRepositorySupport`

Spring Data JPA 4.1의 `QuerydslRepositorySupport`는 deprecated가 아닌 abstract base class다. Domain class를 constructor에 받고 다음 helper를 제공한다.

- Injected `EntityManager`와 domain `PathBuilder`
- Entity path에서 시작하는 `from`
- `update`와 `delete` clause 생성
- `Querydsl.applyPagination`과 `applySorting`에 접근 가능한 helper

현재 single-path `from(path)`는 해당 entity를 select하는 typed query를 반환한다. 하지만 상속과 하나의 domain class에 결합되고, `getEntityManager()`와 `getQuerydsl()`은 nullable signature이며 DTO-select factory와 count policy는 application이 여전히 설계해야 한다.

작은 repository에서는 `JPAQueryFactory` composition이 dependency와 query 흐름을 더 직접적으로 보여준다. 공통 paging boilerplate가 여러 repository에서 반복될 때만 작은 project-specific support를 고려한다.

## 직접 만든 support abstraction의 기준

특정 major version 이름이 붙은 support class를 그대로 framework처럼 복사하지 않는다. 현재 API와 요구에 맞춰 다음 최소 기능만 추출한다.

- `Pageable`의 offset과 limit 적용
- 검증된 `Sort`에서 `OrderSpecifier`로의 allowlist 변환
- Content와 count supplier 분리
- `Page`, `Slice` 중 명시적인 반환 정책

Abstraction이 join, projection과 predicate를 lambda 안에 숨겨 debugging을 어렵게 하면 각 repository의 명시적 query가 낫다. Base class보다 composition을 우선하고, 공통화 전후 SQL과 stack trace 가독성을 비교한다.

## 선택 지도

| 상황 | 선택 |
|---|---|
| 내부의 단순 Q predicate 실행 | `QuerydslPredicateExecutor` 검토 |
| 제한된 admin filter | Web binding과 strict allowlist 검토 |
| 공개 검색 API | Condition DTO와 custom query repository |
| 반복적인 offset, sort 적용 | 작은 composition helper |
| 복잡 projection, join, count | 명시적 `JPAQueryFactory` query |

## 출처

- [Spring Data JPA 4.1, Querydsl extension and web support](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- [Spring Data Commons 4.1, QuerydslPredicateExecutor](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/querydsl/QuerydslPredicateExecutor.html)
- [Spring Data JPA 4.1, QuerydslRepositorySupport](https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/support/QuerydslRepositorySupport.html)
- [`QuerydslPredicateExecutor`](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30155)
- [Querydsl web 지원](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30156)
- [`QuerydslRepositorySupport`](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30157)
- [직접 만드는 Querydsl support](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30158)

## 관련 문서

- [[Spring-Data-JPA-Custom-Repositories|Spring Data repository fragment]]
- [[Spring-Data-JPA-Specification-and-QBE|Specification과 QBE]]
- [[Spring-Data-JPA-Paging-and-Web|Paging과 web 입력 경계]]
- [[Querydsl-Repository-and-Paging|Querydsl repository와 paging]]
