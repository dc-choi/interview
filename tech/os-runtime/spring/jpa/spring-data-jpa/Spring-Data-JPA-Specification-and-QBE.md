---
tags: [jpa, spring-data-jpa, specification, query-by-example, criteria]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA Specification", "Query by Example", "QBE"]
---

# Spring Data JPA Specification과 Query by Example

두 기능은 runtime 조건 조합을 줄이지만 표현력이 다르다. Specification은 Criteria predicate를 코드로 조합하고, Query by Example은 값이 채워진 probe를 검색 조건으로 해석한다.

## 선택 기준

| 요구 | 우선 검토 |
|---|---|
| Equality와 단순 string 검색 form | Query by Example |
| AND, OR, range, subquery와 join 제어 | Specification |
| Type-safe 동적 query와 복잡 projection | Querydsl 또는 custom repository |
| 고정된 복잡 query | `@Query` |

## Specification 구성

```java
public interface MemberRepository
        extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> {
}
```

Spring Data JPA 4.1에는 두 predicate entry point가 있다.

- `PredicateSpecification<T>`: Spring Data JPA 4.0에 추가된 query-type-agnostic predicate
- `Specification<T>`: select `CriteriaQuery`에 결합된 기존 형태
- `UpdateSpecification<T>`, `DeleteSpecification<T>`: Criteria update와 delete 전용 형태

```java
static PredicateSpecification<Member> ageGoe(Integer age) {
    if (age == null) {
        return PredicateSpecification.unrestricted();
    }
    return (from, cb) -> cb.greaterThanOrEqualTo(from.get("age"), age);
}

static PredicateSpecification<Member> teamName(String teamName) {
    if (teamName == null || teamName.isBlank()) {
        return PredicateSpecification.unrestricted();
    }
    return (from, cb) -> cb.equal(from.join("team").get("name"), teamName);
}

List<Member> result = repository.findAll(ageGoe(20).and(teamName("platform")));
```

Spring Data 4.0부터 `where(null)`에 의존하지 않고 `unrestricted()`로 조건 없음 표현을 명시한다. String property name은 refactoring에 약하므로 static metamodel이나 검증된 property path를 고려한다.

## Fluent execution

`JpaSpecificationExecutor.findBy()`의 query function은 sort, limit, projection과 종료 연산을 조합한다.

```java
Page<MemberView> page = repository.findBy(
    ageGoe(20),
    q -> q.as(MemberView.class)
          .page(PageRequest.of(0, 20, Sort.by("id")))
);
```

현재 API는 `first`, `one`, `all`, `page`, `slice`, `scroll`, `stream`, `count`, `exists`를 제공한다. Page에서 count가 비싸면 별도 count Specification을 받을 수 있는 overload도 검토한다.

`UpdateSpecification`과 `DeleteSpecification` 실행은 bulk operation이다. Managed entity state와 callback을 우회하므로 flush와 clear, audit metadata 정책을 함께 처리한다.

## Query by Example의 네 요소

1. Probe: 검색값을 채운 domain object
2. `ExampleMatcher`: field별 matching 규칙
3. `Example`: probe와 matcher의 불변 조합
4. `FetchableFluentQuery`: sort, projection과 결과 처리

`JpaRepository`는 이미 `QueryByExampleExecutor`를 상속한다.

```java
Member probe = new Member();
probe.setUsername("kim");

ExampleMatcher matcher = ExampleMatcher.matchingAll()
    .withIgnoreCase("username")
    .withMatcher("username", ExampleMatcher.GenericPropertyMatchers.contains())
    .withIgnorePaths("id", "age");

Example<Member> example = Example.of(probe, matcher);
List<Member> result = repository.findAll(example);
```

기본적으로 null property는 무시되고 non-string property는 exact match다. Primitive field는 기본값도 항상 조건에 포함되므로 wrapper type을 쓰거나 matcher에서 명시적으로 제외한다.

## QBE의 표현 한계

- `a OR (b AND c)` 같은 nested 또는 grouped logical constraint를 표현하지 못한다.
- Collection과 map matching을 지원하지 않는다.
- String matching 지원은 store별로 다르며 JPA에서는 regex를 지원하지 않는다.
- Association path를 지정할 수는 있어도 join type과 fetch plan을 명시적으로 설계하는 도구가 아니다.
- Range, aggregate, subquery와 outer join 의미가 필요하면 Specification 또는 custom query가 낫다.

QBE를 entity 전체의 generic search API로 노출하면 새 field 추가가 뜻밖의 검색 조건이 될 수 있다. API request를 allowlist한 probe와 matcher로 변환한다.

## 검증 체크리스트

- 조건 조합 자체에 domain 의미가 있으면 이름 있는 predicate로 만들었는가
- Nullable 조건에 `unrestricted()`를 사용했는가
- QBE primitive default가 의도치 않게 포함되지 않는가
- Join과 pagination이 만든 SQL을 확인했는가
- Bulk update/delete 뒤 context와 auditing을 동기화하는가

## 출처

- [Spring Data JPA 4.1, Specifications](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html)
- [Spring Data JPA 4.1, Query by Example](https://docs.spring.io/spring-data/jpa/reference/repositories/query-by-example.html)
- [Specification](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28030)
- [Query by Example](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28031)

## 관련 문서

- [[Spring-Data-JPA-Query-Methods|Query method 선택]]
- [[Spring-Data-JPA-Custom-Repositories|Custom repository fragment]]
- [[Spring-Data-JPA-Projections-and-Native-Queries|Projection]]
- [[Spring-Data-JPA-Paging-and-Web|Paging과 scrolling]]
- [[Querydsl-Dynamic-Queries-and-Bulk-DML|Querydsl 동적 query와 bulk DML]]
