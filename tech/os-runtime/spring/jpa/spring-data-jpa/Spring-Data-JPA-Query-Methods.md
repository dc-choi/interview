---
tags: [jpa, spring-data-jpa, query-method, entity-graph, lock]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Data Query Method", "Derived Query", "Modifying Query"]
---

# Spring Data JPA 쿼리 메서드

쿼리 방식을 고르는 기준은 문법 취향이 아니라 변경 빈도, type safety, fetch plan, SQL 가시성이다. 짧은 조건은 derived query, 고정된 복잡 조회는 `@Query`, 동적 조합은 Specification이나 custom query로 분리한다.

## Query lookup 전략

| 전략 | 동작 |
|---|---|
| `CREATE` | method name에서 query 생성 |
| `USE_DECLARED_QUERY` | 선언된 query를 찾고 없으면 시작 실패 |
| `CREATE_IF_NOT_FOUND` | 선언 query를 먼저 찾고 없으면 생성, 기본값 |

## Method name으로 생성

```java
List<Member> findTop10ByAgeGreaterThanAndNameContainingOrderByIdDesc(
        int age, String name);
```

짧은 equality, range, null, string 조건에는 읽기 쉽다. 이름이 길어지거나 join 조건과 fetch plan이 섞이면 의도를 잃으므로 다른 방식으로 전환한다.

Repository 기반 class의 ID property 이름이 `pk`여도 `findById`는 예약 CRUD signature로서 `@Id`를 대상으로 한다. 일반 property를 찾으려면 `findUserById`처럼 설명 token을 넣거나 실제 property 이름을 쓴다. method name은 application 시작 때 property 경로를 검증하지만 Java compiler가 query 의미까지 검증해 주는 것은 아니다.

## Named query와 `@Query`

JPA named query는 기본적으로 `DomainType.methodName` 규칙으로 찾는다.

```java
@NamedQuery(
    name = "Member.findByUsername",
    query = "select m from Member m where m.username = :username"
)
```

Repository method의 `@Query`가 named query보다 우선한다. query가 한 repository에만 쓰이면 method 옆에 두고, 여러 경로에서 재사용하거나 provider metadata로 관리할 이유가 있으면 named query를 검토한다.

```java
@Query("select m from Member m where m.age >= :age")
List<Member> findAdults(@Param("age") int age);
```

Spring Data 4는 compiler의 `-parameters` flag로 parameter 이름이 보존되면 `@Param`을 생략할 수 있다. refactoring 안정성과 팀 명시성을 위해 named binding을 일관되게 쓰는 것도 유효하다. collection은 `in :ids`로 binding하고 빈 collection이 만드는 SQL은 provider와 dialect에서 test한다.

Named query와 JPQL `@Query`는 보통 application bootstrap에서 문법 검증을 받는다. Database function, dialect 차이와 실제 plan까지 검증되는 것은 아니며 native SQL 오류는 실행 시점에 드러날 수 있다.

DTO를 JPQL에서 직접 만들 때는 fully qualified constructor expression을 쓴다.

```java
@Query("select new com.example.MemberSummary(m.id, m.username) from Member m")
List<MemberSummary> findSummaries();
```

## 반환 계약

| 반환형 | 의미와 주의점 |
|---|---|
| `T` | 단건, 기본 부재 값은 null. Non-null 계약이면 예외, 여러 row면 incorrect result size 예외 |
| `Optional<T>` | 0 또는 1건을 명시 |
| `List<T>` 등 collection | 결과 없음은 빈 collection |
| `Stream<T>` | cursor와 resource를 닫고 transaction 범위를 관리 |
| `Future<T>` | `@Async` 기반 비동기 실행, reactive JPA가 아님 |

Spring Data 4와 Spring Framework 7에서는 JSpecify로 nullability를 선언할 수 있다. `@NullMarked` 범위의 non-null 반환이 비어 있으면 runtime validation이 예외를 낼 수 있고, `@Nullable`은 null을 허용한다. 과거 Spring `@NonNullApi` annotation은 Spring Framework 7에서 JSpecify 사용을 위해 deprecated됐다.

## Bulk DML

```java
@Modifying(flushAutomatically = true, clearAutomatically = true)
@Query("update Member m set m.age = m.age + 1 where m.id in :ids")
int increaseAge(@Param("ids") Collection<Long> ids);
```

`@Modifying`은 `@Query`로 선언한 INSERT, UPDATE, DELETE, DDL에 적용한다. bulk DML은 persistence context를 우회하므로 이미 managed인 entity가 stale해지고 lifecycle callback도 실행되지 않는다.

순수 JPA에서는 JPQL bulk query를 `EntityManager.createQuery(...).executeUpdate()`로 실행한다. `createNativeQuery()`는 SQL을 직접 쓸 때만 선택한다.

기본 `clearAutomatically`가 `false`인 이유는 아직 flush하지 않은 변경을 잃을 수 있기 때문이다. 자동 clear를 켤 때는 먼저 flush할지 결정하고, 이후 entity를 다시 조회한다. derived delete는 대상을 읽어 개별 `delete()`하므로 callback이 실행되지만 많은 row를 메모리에 올릴 수 있다.

## Fetch plan: `@EntityGraph`

JPA 2.1에서 도입된 entity graph를 named 또는 ad hoc 방식으로 붙일 수 있다.

```java
@EntityGraph(attributePaths = "team", type = EntityGraph.EntityGraphType.FETCH)
List<Member> findByAgeGreaterThan(int age);
```

`FETCH` graph에서 지정하지 않은 attribute는 lazy로 취급하고, `LOAD` graph는 mapping의 fetch 설정을 유지하며 지정 attribute를 추가한다. N+1을 줄여도 to-many join은 row 수와 pagination을 바꾸므로 실제 SQL과 cardinality를 확인한다.

## Query hint와 lock

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@QueryHints(value = @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            forCounting = false)
Optional<Member> findLockedById(Long id);
```

Hint는 provider별 의미가 다르다. Hibernate read-only hint는 snapshot 비용을 줄일 수 있지만 객체의 의미적 불변성을 보장하지 않는다. pessimistic lock은 DB lock과 timeout을 유발하고 optimistic lock은 충돌 재시도가 필요하므로, 격리 수준과 동시성 test를 함께 설계한다.

## 선택 체크리스트

- query가 짧고 property 중심이면 derived method부터 검토한다.
- fetch join, DTO, 복잡 predicate가 고정이면 `@Query`로 SQL 형태를 드러낸다.
- bulk 뒤 context를 어떻게 동기화할지 명시한다.
- hint와 lock은 provider 및 DB 통합 test로 확인한다.
- 모든 방식에서 index, 실행 계획, 반환 row 수를 측정한다.

## 출처

- [Spring Data JPA 4.1, JPA Query Methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html)
- [Spring Data JPA 4.1, Query Methods Details](https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html)
- [Spring Data JPA 4.1, Null Handling](https://docs.spring.io/spring-data/jpa/reference/repositories/null-handling.html)
- [Method name query](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28009)
- [JPA NamedQuery](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28010)
- [Repository method의 @Query](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28012)
- [값과 DTO 조회](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28013)
- [Parameter binding](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28014)
- [반환 type](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28015)
- [Bulk 수정 query](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28018)
- [EntityGraph](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28019)
- [JPA hint와 lock](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28020)

## 관련 문서

- [[JPA-JPQL|JPQL과 bulk DML]]
- [[JPA-Loading-and-Cascade|Fetch plan과 N+1]]
- [[Spring-Data-JPA-Projections-and-Native-Queries|Projection과 native query]]
- [[Spring-Data-JPA-Specification-and-QBE|동적 query]]
