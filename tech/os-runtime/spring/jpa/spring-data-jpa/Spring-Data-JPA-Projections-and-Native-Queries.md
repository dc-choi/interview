---
tags: [jpa, spring-data-jpa, projection, native-query, dto]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Data Projection", "NativeQuery"]
---

# Spring Data JPA Projection과 Native Query

Projection은 use case에 필요한 column과 응답 shape를 명시한다. Native query는 JPQL로 표현하기 어려운 database 기능을 사용할 탈출구다. 둘 다 편의보다 mapping 계약과 SQL 검증이 먼저다.

## Projection 선택

| 방식 | 장점 | 주의점 |
|---|---|---|
| Closed interface | getter 목록으로 top-level select 최적화 가능 | proxy 기반, nested association join 비용 |
| Open interface | `@Value`와 bean 호출로 계산 가능 | SpEL 때문에 select 최적화 불가 |
| Class 또는 record DTO | 명시적 값 객체, API boundary에 적합 | constructor parameter 계약 필요 |
| Dynamic projection | 호출 시 projection type 선택 | method signature와 `Class<T>` 해석 주의 |

## Interface projection

```java
interface MemberView {
    Long getId();
    String getUsername();
}

List<MemberView> findByTeamId(Long teamId);
```

Closed projection은 accessor가 entity property에 대응할 때 필요한 top-level field만 선택할 수 있다. Nested property를 선택하면 join된 nested property 전체가 materialize될 수 있으므로 projection이라는 이유만으로 join 비용이 사라진다고 생각하면 안 된다.

Open projection은 다음처럼 계산식을 넣지만 target 접근이 필요해 query 최적화를 제한한다.

```java
interface DisplayNameView {
    @Value("#{target.firstName + ' ' + target.lastName}")
    String getDisplayName();
}
```

단순 조합은 Java default method로 표현하면 SpEL 의존성을 줄일 수 있다.

## DTO와 dynamic projection

```java
record MemberSummary(Long id, String username) {
}

List<MemberSummary> findByAgeGreaterThan(int age);

<T> List<T> findByTeamId(Long teamId, Class<T> type);
```

Class projection은 constructor parameter 이름으로 field를 결정한다. Constructor가 여러 개면 projection용 constructor에 `@PersistenceCreator`를 붙인다. JPQL을 직접 쓸 때는 constructor expression에 fully qualified class name을 사용한다.

```java
@Query("select new com.example.MemberSummary(m.id, m.username) from Member m")
List<MemberSummary> findSummaries();
```

Spring Data는 select가 root entity 또는 여러 scalar property인 일부 JPQL query를 DTO constructor expression으로 rewrite할 수 있다. 이미 constructor expression을 쓴 query는 그대로 둔다.

## Native query

Spring Data JPA 4.1에서는 `@Query(nativeQuery = true)`의 구성 annotation인 `@NativeQuery`를 사용할 수 있다.

```java
@NativeQuery(
    value = """
        SELECT m.id, m.username
        FROM member m
        WHERE m.team_id = :teamId
        ORDER BY m.id
        """,
    countQuery = "SELECT count(*) FROM member WHERE team_id = :teamId"
)
Page<MemberView> findViews(@Param("teamId") long teamId, Pageable pageable);
```

Interface projection은 SQL alias를 getter property에 맞춘다. Class 또는 record는 column 순서와 type이 constructor와 정확히 맞으면 직접 mapping할 수 있다. 다르면 JPA `@SqlResultSetMapping`을 정의하고 `@NativeQuery(sqlResultSetMapping = "...")`으로 연결한다.

## Paging과 parser

단순한 native SQL은 Spring Data가 pagination과 count를 보강할 수 있다. 복잡한 SQL은 JSqlParser가 classpath에 있어야 해석되거나 명시적인 `countQuery`가 필요하다. CTE, vendor syntax, window function이 있으면 운영 DB 통합 test에서 content, count와 sort를 모두 검증한다.

## Native query의 비용

- Dialect와 schema 이름에 결합되고 provider의 bootstrap JPQL 검증을 덜 받는다.
- Entity mapping으로 받을 때 빠진 column, alias와 type conversion 문제가 runtime에 드러날 수 있다.
- 동적 sorting이나 scrolling 지원이 query 형태에 따라 제한된다.
- Database별 execution plan이 달라진다.

Native SQL을 숨기기 위해 과도한 abstraction을 더하기보다 query 이름, 반환 DTO, 지원 dialect와 integration test를 함께 둔다. PostgreSQL function이나 recursive CTE처럼 얻는 이점이 명확할 때 사용한다.

## 선택 체크리스트

- API에 entity가 아니라 필요한 field만 노출하는가
- Nested projection이 만든 join과 cardinality를 확인했는가
- DTO constructor와 SQL alias/type을 test했는가
- Native page의 `countQuery`가 content predicate와 일치하는가
- 지원 DB마다 실제 SQL과 plan을 검증했는가

## 출처

- [Spring Data JPA 4.1, Projections](https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html)
- [Spring Data JPA 4.1, Native Query](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html#jpa.query-methods.native-queries)
- [Projections](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28032)
- [Native query](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28033)

## 관련 문서

- [[JPA-API-DTO-Boundary|API DTO boundary]]
- [[JPA-JPQL|JPQL projection]]
- [[Spring-Data-JPA-Paging-and-Web|Paging과 count query]]
- [[Spring-Data-JPA-Custom-Repositories|Custom query fragment]]
- [[Querydsl-Projections|Querydsl projection과 DTO]]
