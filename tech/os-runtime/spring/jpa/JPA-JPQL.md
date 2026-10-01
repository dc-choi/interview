---
tags: [jpa, jpql, hql, fetch-join, bulk-dml]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPQL", "HQL", "JPA Query Language", "JPA 페치 조인"]
---

# JPQL과 HQL

JPQL은 table/column이 아니라 persistence unit의 entity name, mapped attribute와 relationship을 대상으로 하는 표준 query language다. Provider가 SQL로 번역하지만 index 선택, row 증폭과 lock 비용까지 추상화해 주지는 않는다. HQL은 JPQL의 superset인 Hibernate 전용 언어이므로 확장 문법을 표준 JPQL로 부르지 않는다.

## query API와 parameter

```java
TypedQuery<Member> query = em.createQuery(
    "select m from Member m where m.status = :status order by m.id",
    Member.class
);
query.setParameter("status", MemberStatus.ACTIVE);
List<Member> result = query.setFirstResult(0).setMaxResults(20).getResultList();
```

- 결과 type을 알면 `TypedQuery<T>`를 사용한다.
- Named parameter와 positional parameter를 한 query에서 섞지 않는다.
- 값은 string concatenation이 아니라 parameter binding으로 전달한다.
- `getSingleResult()`는 0건과 2건 이상에 예외를 낸다. Jakarta Persistence 3.2에는 `getSingleResultOrNull()`도 있다.
- Pagination은 stable하고 unique한 `ORDER BY` 없이는 page 경계가 재현되지 않는다.

## projection

| SELECT | 결과 | 주의 |
|---|---|---|
| `select m` | entity | 현재 context에서 managed가 될 수 있음 |
| `select m.address` | embeddable | entity identity와 변경 추적 대상으로 취급하지 않음 |
| `select m.name` | scalar | 필요한 column만 읽는 read model에 적합 |
| `select new pkg.MemberView(m.id, m.name)` | DTO constructor | fully qualified class와 맞는 constructor 필요 |
| 여러 식 | `Object[]` 또는 `Tuple` | 공개 API로 흘리기보다 명시적 DTO 선호 |

목록 화면에서 entity graph 전체를 읽은 뒤 mapper로 버리는 것보다 필요한 projection을 선택할 수 있다. 다만 projection도 join과 predicate에 맞는 index가 필요하다.

## join과 path expression

- `join m.team t`는 mapped association을 explicit join한다.
- `left join ... on ...`의 조건을 `WHERE`로 옮기면 unmatched left row가 사라져 semantics가 달라질 수 있다.
- 연관 없는 entity type에 대한 range join도 현재 JPQL 표준에 포함되지만 target provider 지원 버전을 확인한다.
- `m.team.name` 같은 implicit association navigation은 inner join을 만든다. SQL 위치가 숨으므로 복잡한 query에서는 explicit join을 선호한다.
- Collection-valued path는 그대로 더 탐색하지 말고 element alias를 join한다.

### 일반 join은 연관을 채우지 않는다

일반 join은 SQL에서 join만 하고 SELECT 절에 적은 entity만 결과로 만든다. `select m from Member m join m.team t`는 회원만 영속화하고 team은 초기화하지 않으므로, loop에서 `m.getTeam().getName()`을 부르면 team마다 SELECT가 나가 N+1이 남는다. inner join이라 team 없는 회원을 거르는 조건 역할만 한다. `join fetch`는 SELECT 절에 `m`만 적어도 team column까지 같은 SQL로 읽어 연관을 초기화하며, mapping의 `LAZY`보다 query의 fetch plan이 우선한다. Hibernate 7.4.11 실측에서 회원 2명의 team 이름을 읽을 때 일반 join은 SQL 3개(회원 1, team 2), fetch join은 1개였고, fetch join으로 채운 team은 초기화된 실제 entity였다. 단 context에 그 team의 proxy가 이미 있으면 동일성을 위해 그 proxy를 초기화해 넣는다([[JPA-Loading-and-Cascade]]).

선택 기준은 결과 모양이다. entity 객체 graph를 그대로 쓰면 fetch join, 여러 table을 조합해 entity와 다른 모양이 필요하면 일반 join으로 필요한 값만 골라 `new` DTO projection으로 반환한다. mapping은 모두 `LAZY`로 두고 한 번에 필요한 곳만 fetch join하면 query마다 조회 graph를 고를 수 있다.

### 쓰지 않는 to-one left join은 SQL에서 빠진다

Hibernate 6부터 to-one 연관의 join은 실제로 필요할 때만 SQL에 렌더링하는 lazy table group으로 처리된다. Hibernate 7.4.11에서 `select m from Member m left join m.team t`처럼 alias를 SELECT와 WHERE 어디에도 쓰지 않으면 생성 SQL에 join이 없었다. to-one left join은 root row 수와 내용을 바꾸지 않기 때문이다. 같은 조건의 inner join은 row를 거르므로 유지됐고, `where t.name = ...`처럼 alias를 쓰면 left join이 렌더링됐다. to-many left join은 row 수를 바꿀 수 있어 남았고, `m.team.id` 같은 FK 경로는 join 없이 FK column을 썼다. 연관 entity를 같은 SQL로 채우려면 `left join fetch`가 필요하다. COUNT에서 LEFT JOIN을 지워도 되는 조건(오른쪽 매칭이 최대 한 행)과 같은 논리다([[Query-Antipatterns]]).

## subquery와 provider 확장

Jakarta Persistence 3.2 JPQL의 subquery는 `WHERE` 또는 `HAVING`에서 사용한다. 표준 JPQL은 `FROM` subquery와 fetch join 안의 subquery를 허용하지 않는다.

Hibernate HQL은 6.1부터 derived root 형태의 `FROM` subquery를 지원하고, 현재 HQL은 CTE와 lateral join 같은 확장도 제공한다. 이 문법을 사용하면 Hibernate와 target DB/version에 종속된다는 사실을 query module과 test에 드러낸다. Portable하게 유지해야 하면 join 재구성, two-step query, native SQL 또는 database view를 비교한다.

## expression, function과 다형성

JPQL은 `CASE`, `COALESCE`, `NULLIF`, string/numeric/date 함수, aggregate와 `FUNCTION()`을 제공한다. Jakarta Persistence 3.2는 set operator와 여러 함수를 추가했다. Database function은 dialect별 결과 type과 index 사용 여부를 확인한다.

- `TYPE(entity)`로 polymorphic type을 검사한다.
- `TREAT(path AS Subtype)`로 subtype attribute에 접근한다.
- Entity parameter와 entity-valued expression은 보통 그 identity를 기준으로 비교된다.
- Enum literal은 표준 이식성을 위해 fully qualified enum class name을 사용하거나 parameter로 바인딩한다.

## fetch join의 표준과 Hibernate 동작

Fetch join은 query 결과의 root/owner를 반환하면서 association 또는 element collection을 같은 query에서 초기화한다. Mapping의 fetch setting을 해당 query에서 override하는 fetch plan이다.

| 항목 | 표준 JPQL | Hibernate HQL 현재 동작 |
|---|---|---|
| Fetch 대상 alias | 허용하지 않음 | nested fetch 목적 alias를 허용하지만 filtering은 불완전 collection 위험 |
| Fetch join condition | 허용하지 않음 | fetched collection 제한을 피하는 것이 안전 |
| Subquery 안 fetch | 허용하지 않음 | 허용하지 않음 |
| 여러 to-one fetch | 가능 | 일반적으로 안전 |
| 여러 to-many fetch | 명시적 금지 규칙은 아님 | bag(index 없는 `List`, `Collection`)을 한 query에서 둘 이상 fetch하면 중첩 경로여도 `MultipleBagFetchException`으로 거부. 그 밖의 조합은 허용하지만 Cartesian product와 큰 row set 위험 |
| Root 중복 | SQL row에는 반복 가능 | Hibernate 6부터 materialization 뒤 duplicate root를 자동 제거, 이 목적의 `distinct` 불필요 |

`@OrderColumn`이 없는 `List`는 기본으로 bag이다. Hibernate 6.0부터 `hibernate.mapping.default_list_semantics`(기본 `BAG`)로 이 분류를 바꿀 수 있지만 owning collection에만 적용되고, `mappedBy` collection의 순서를 유지하려면 `@OrderColumn`을 명시해야 한다. Hibernate 7.4.11에서 `sections`와 `sections.lessons` 두 bag을 fetch하면 예외가 났고, 둘 다 `@OrderColumn` List면 한 SQL로 읽혔다. 여러 collection이 필요하면 fetch join은 collection 하나에만 쓰고 나머지는 `hibernate.default_batch_fetch_size`나 `@BatchSize`로 묶어 읽는다([[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]).

Collection fetch와 pagination은 특히 version-sensitive하다. Hibernate 7.4는 limit/offset subquery를 지원하는 DB에서 collection fetch query의 limit을 SQL에서 처리하고, `org.hibernate.limitInMemory` hint로 이전 동작을 복원할 수 있다. 이를 지원하지 않는 DB에서는 여전히 memory에서 제한하며, 이때 WARN `HHH90003004`가 남고 `hibernate.query.fail_on_pagination_over_collection_fetch=true`로 예외로 바꿀 수 있다([[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]). 과거 버전의 in-memory pagination 경고도 새 버전의 SQL limit도 모든 query에서 원하는 parent page를 자동 보장한다는 뜻은 아니다. 생성 SQL, root 수와 collection 완전성을 통합 test하고, portable한 기본안으로 ID page 후 association 조회 또는 batch fetch를 고려한다.

## named query와 bulk DML

Named query는 이름으로 재사용하고 provider가 startup 단계에서 parse/validation할 기회를 준다. 동적 조건이 많으면 억지로 하나의 named string에 넣기보다 Criteria, query builder 또는 명시적 query repository를 쓴다. 도구별 오류 발견 시점과 가독성 비용은 [[Querydsl-Dynamic-Queries-and-Bulk-DML|동적 query 구현 방식 비교]]에 있다.

Bulk `UPDATE`/`DELETE`는 row 집합에 직접 적용되어 다음 차이가 있다.

- active persistence context의 managed instance와 자동 동기화되지 않는다.
- optimistic version check를 우회하며 version 증가가 필요하면 명시해야 한다.
- Bulk delete는 relationship으로 cascade되지 않는다.
- 영향받을 entity를 읽기 전 별도 context에서 실행하거나, 실행 뒤 `clear()`하고 다시 읽는다.

Transaction 안에서 bulk DML 직전 flush가 필요한지와 실행 뒤 stale state 제거 순서를 명시한다. Spring Data JPA의 `@Modifying(clearAutomatically = true, flushAutomatically = true)`도 의도를 대신 판단하지 않으므로 data loss 가능성을 검토한다.

## 출처

- [Jakarta Persistence 3.2, Query Language](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a4665)
- [Jakarta Persistence 3.2, Fetch Joins](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#fetch-joins)
- [Jakarta Persistence 3.2, Bulk Update and Delete](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a5636)
- [Hibernate ORM current User Guide, HQL](https://docs.hibernate.org/stable/orm/userguide/html_single/#query-language)
- [Hibernate ORM 7.4 Migration Guide, Limits and fetch joins](https://docs.hibernate.org/orm/current/migration-guide/#_limits_and_fetch_joins)
- [Hibernate ORM 7.4.11, `BaseSqmToSqlAstConverter` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/query/sqm/sql/BaseSqmToSqlAstConverter.java)
- [Hibernate ORM 7.4.11, `QuerySettings` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/cfg/QuerySettings.java)
- [Hibernate ORM 7.4.11, `LazyTableGroup` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/sql/ast/tree/from/LazyTableGroup.java)
- [Hibernate ORM 7.4 User Guide, Mapping Lists](https://docs.hibernate.org/orm/7.4/userguide/html_single/#collection-list)
- [Hibernate ORM 7.4 API, `MultipleBagFetchException`](https://docs.hibernate.org/orm/7.4/javadocs/org/hibernate/loader/MultipleBagFetchException.html)
- 강의: [소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21718), [기본 문법과 query API](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21719), [Projection](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21720), [Pagination](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21721)
- 강의: [Join](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21722), [Subquery](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21723), [Type 표현](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21724), [CASE](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21725), [Function](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21726)
- 강의: [Path expression](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21727), [Fetch join 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21742), [Fetch join 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21743)
- 강의: [즉시 로딩과 지연 로딩](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21709), [실전 Spring Data JPA 강의 자료](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=27995)
- 강의: [Polymorphic query](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21729), [Entity 직접 사용](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21730), [Named query](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21731), [Bulk operation](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21732)

## 관련 문서

- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
- [[Querydsl|Querydsl JPA]]
- [[SQL-Joins|SQL Join]]
- [[Pagination-Optimization|Pagination 최적화]]
