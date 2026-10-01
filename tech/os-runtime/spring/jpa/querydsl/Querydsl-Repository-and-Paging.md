---
tags: [querydsl, jpa, spring-data-jpa, repository, pagination]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Querydsl Repository", "Querydsl Paging", "Querydsl Custom Repository"]
---

# Querydsl repository 구성과 paging

Querydsl query는 persistence adapter 안에 두고 application에는 의미 있는 search method와 DTO를 제공한다. `JPAQueryFactory` composition을 기본으로 삼고, Spring Data JPA repository와 결합할 때는 현재 fragment model을 사용한다.

## Query component 구성

```java
@Repository
@Transactional(readOnly = true)
public class MemberQueryRepository {
    private final JPAQueryFactory queryFactory;

    public MemberQueryRepository(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    public List<MemberView> search(MemberCondition condition) {
        return queryFactory
            .select(new QMemberView(member.username, member.age))
            .from(member)
            .where(
                usernameEq(condition.username()),
                ageGoe(condition.ageGoe())
            )
            .fetch();
    }
}
```

`JPAQueryFactory`는 매 호출마다 새 query를 만들고 Spring의 shared `EntityManager` proxy는 현재 transaction의 manager로 위임하므로 singleton 주입이 가능하다. 작성 중인 `JPAQuery` instance나 실제 `EntityManager` instance를 field에 저장해 thread 사이에서 공유하지 않는다.

Query 실행의 transaction은 use case service가 소유하는 것이 기본이다. 독립적으로 사용되는 query repository에는 `readOnly = true`를 명시하고, 실제 provider와 DB에서 어떤 최적화가 적용되는지 확인한다.

## Spring Data repository fragment

```java
public interface MemberSearch {
    Page<MemberView> search(MemberCondition condition, Pageable pageable);
}

class MemberSearchImpl implements MemberSearch {
    private final JPAQueryFactory queryFactory;

    MemberSearchImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    // search 구현
}

public interface MemberRepository
        extends JpaRepository<Member, Long>, MemberSearch {
}
```

현재 방식은 fragment interface `MemberSearch`와 `MemberSearchImpl`의 조합이다. 오래된 예제가 필수 규칙처럼 쓰는 `MemberRepositoryCustom`과 `MemberRepositoryImpl` 조합, 즉 repository 자체 이름에 붙인 `Impl` 하나를 자동 결합하는 과거 pattern은 Spring Data 공식 문서가 deprecated로 보고 fragment model로 옮기라고 권한다. Spring Data Commons 4.1.1 runtime은 이 이름의 class를 여전히 찾아 등록하므로 기존 code는 동작하지만 새 code에는 쓰지 않는다([[Spring-Data-JPA-Custom-Repositories]]). CRUD와 복잡 query의 변경 이유가 다르거나 여러 aggregate를 함께 읽으면 독립 query repository가 더 명확할 수 있다.

## Content와 count 분리

```java
List<MemberView> content = queryFactory
    .select(new QMemberView(member.username, member.age))
    .from(member)
    .leftJoin(member.team, team)
    .where(searchPredicate(condition))
    .orderBy(toOrders(pageable.getSort()))
    .offset(pageable.getOffset())
    .limit(pageable.getPageSize())
    .fetch();

JPAQuery<Long> countQuery = queryFactory
    .select(member.count())
    .from(member)
    .where(countPredicate(condition));

return PageableExecutionUtils.getPage(
    content,
    pageable,
    () -> Optional.ofNullable(countQuery.fetchOne()).orElse(0L)
);
```

Deprecated `fetchResults()`로 content와 count 생성을 맡기지 않는다. Content에는 projection, fetch plan과 sort가 필요하지만 count에는 불필요할 수 있다. 다만 join을 제거해도 matching root 집합이 같을 때만 count query를 단순화한다.

To-many join은 root를 중복시킬 수 있으므로 `countDistinct` 필요 여부를 검증한다. Content와 count의 predicate를 별도 복사하다가 의미가 어긋나지 않도록 공통 조건과 count 전용 join을 test로 비교한다.

## `PageableExecutionUtils`

`org.springframework.data.support.PageableExecutionUtils.getPage`는 content가 page size보다 작아 total을 추론할 수 있는 경우 count supplier 실행을 생략한다. 현재 구현은 첫 partial page에서 content size를, 비어 있지 않은 이후 partial page에서 offset과 content size의 합을 total로 사용한다. 빈 이후 page나 full page에서는 supplier가 실행될 수 있다.

이 최적화는 count 결과가 content query와 같은 root 집합을 센다는 전제 위에 있다. Supplier에 side effect를 두지 않고, 실행 여부에 의존하지 않는다. Total이 필요 없으면 `Page`를 만들기보다 `Slice`를 위해 한 건 더 조회하는 전략도 비교한다.

## Count 최적화에 투자할 기준

Data가 많지 않으면 content와 count를 단순하게 함께 다뤄도 비용 차이가 작다. Count가 content의 join과 조건을 그대로 끌고 와 느려지는 규모에서는 count query를 완전히 분리해야 불필요한 join 제거 같은 최적화가 가능하다. 수천만 건 같은 경험적 규모보다 count의 실행 계획과 latency 측정으로 기준을 정한다.

반대 방향의 최적화도 있다. Count를 먼저 실행해 0건이면 content query를 생략한다.

| 전략 | 생략하는 query | 유리한 조건 | 비용 |
|---|---|---|---|
| `PageableExecutionUtils` | content로 total을 추론할 수 있을 때의 count | 결과가 page 크기보다 작은 요청이 많을 때 | full page에서는 count도 실행 |
| Count-first | count가 0일 때의 content | 0건 검색 비율이 높을 때 | 0건이 아닌 요청은 항상 count 비용을 먼저 치름 |

두 전략은 서로 다른 query를 생략하므로 실제 검색 결과 분포를 보고 고른다.

## Sort 변환

```java
private OrderSpecifier<?> toOrder(Sort.Order order) {
    boolean asc = order.isAscending();
    return switch (order.getProperty()) {
        case "username" -> asc ? member.username.asc() : member.username.desc();
        case "age" -> asc ? member.age.asc() : member.age.desc();
        case "id" -> asc ? member.id.asc() : member.id.desc();
        default -> throw new IllegalArgumentException("Unsupported sort field");
    };
}
```

Client property를 `Expressions.path()`나 string template로 직접 만들지 않는다. API sort name을 Q path로 매핑하고 마지막에는 unique key를 추가한다. Null precedence, case-insensitive sort와 association sort는 index와 join을 바꿀 수 있어 field별 정책으로 둔다.

## API와 test 경계

- Controller는 condition과 `Pageable`을 typed input으로 받고 size와 sort를 검증한다.
- Entity나 `PageImpl`을 공개 응답 계약으로 직접 노출하지 않는다.
- Local sample seed는 profile로 격리하고 production startup에서 실행하지 않는다.
- Repository integration test는 content, total, 빈 page, 마지막 page와 duplicate join을 검증한다.
- SQL log뿐 아니라 반환 row 수와 execution plan을 확인한다.

## 출처

- [Spring Data JPA 4.1, Custom Repository Implementations](https://docs.spring.io/spring-data/jpa/reference/repositories/custom-implementations.html)
- [Spring Data Commons 4.1, PageableExecutionUtils](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/support/PageableExecutionUtils.html)
- [Spring Data Commons 4.1.1, `RepositoryBeanDefinitionBuilder` source](https://github.com/spring-projects/spring-data-commons/blob/4.1.1/src/main/java/org/springframework/data/repository/config/RepositoryBeanDefinitionBuilder.java)
- [OpenFeign Querydsl 7.5, JPAQueryFactory](https://github.com/OpenFeign/querydsl/blob/7.5/querydsl-libraries/querydsl-jpa/src/main/java/com/querydsl/jpa/impl/JPAQueryFactory.java)
- [순수 JPA repository와 Querydsl](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30144)
- [`BooleanBuilder`를 사용한 search DTO 조회](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30145)
- [`where` parameter를 사용한 search DTO 조회](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30146)
- [조회 API controller](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30147)
- [Spring Data JPA repository로 전환](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30149)
- [사용자 정의 repository](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30150)
- [Paging](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30127)
- [Querydsl paging 연동](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30151)
- [Count query 최적화](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30152)
- [Paging controller](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30153)
- [Querydsl 적용](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114670)
- [Querydsl 활용 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114671)

## 관련 문서

- [[Spring-Data-JPA-Custom-Repositories|Spring Data repository fragment]]
- [[Spring-Data-JPA-Paging-and-Web|Spring Data paging과 web 경계]]
- [[Querydsl-Projections|Querydsl projection]]
