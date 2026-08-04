---
tags: [jpa, jpql, hql, fetch-join, bulk-dml]
status: done
verified_at: 2026-08-04
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
| 여러 to-many 병렬 fetch | 명시적 금지 규칙은 아님 | 허용하지만 DB Cartesian product와 큰 row set 위험 |
| Root 중복 | SQL row에는 반복 가능 | Hibernate 6부터 materialization 뒤 duplicate root를 자동 제거, 이 목적의 `distinct` 불필요 |

Collection fetch와 pagination은 특히 version-sensitive하다. Hibernate 7.4는 limit/offset subquery를 지원하는 DB에서 collection fetch query의 limit을 SQL에서 처리하고, `org.hibernate.limitInMemory` hint로 이전 동작을 복원할 수 있다. 이를 지원하지 않는 DB에서는 여전히 memory에서 제한한다. 과거 버전의 in-memory pagination 경고도 새 버전의 SQL limit도 모든 query에서 원하는 parent page를 자동 보장한다는 뜻은 아니다. 생성 SQL, root 수와 collection 완전성을 통합 test하고, portable한 기본안으로 ID page 후 association 조회 또는 batch fetch를 고려한다.

## named query와 bulk DML

Named query는 이름으로 재사용하고 provider가 startup 단계에서 parse/validation할 기회를 준다. 동적 조건이 많으면 억지로 하나의 named string에 넣기보다 Criteria, query builder 또는 명시적 query repository를 쓴다.

Bulk `UPDATE`/`DELETE`는 row 집합에 직접 적용되어 다음 차이가 있다.

- active persistence context의 managed instance와 자동 동기화되지 않는다.
- optimistic version check를 우회하며 version 증가가 필요하면 명시해야 한다.
- Bulk delete는 relationship으로 cascade되지 않는다.
- 영향받을 entity를 읽기 전 별도 context에서 실행하거나, 실행 뒤 `clear()`하고 다시 읽는다.

Transaction 안에서 bulk DML 직전 flush가 필요한지와 실행 뒤 stale state 제거 순서를 명시한다. Spring Data JPA의 `@Modifying(clearAutomatically = true, flushAutomatically = true)`도 의도를 대신 판단하지 않으므로 data loss 가능성을 검토한다.

## 출처

- [Jakarta Persistence 3.2, Query Language](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#query-language)
- [Jakarta Persistence 3.2, Fetch Joins](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#fetch-joins)
- [Jakarta Persistence 3.2, Bulk Update and Delete](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#bulk-update-and-delete-operations)
- [Hibernate ORM current User Guide, HQL](https://docs.hibernate.org/stable/orm/userguide/html_single/#query-language)
- [Hibernate ORM 7.4 Migration Guide, Limits and fetch joins](https://docs.hibernate.org/orm/current/migration-guide/#limits-and-fetch-joins)
- 강의: [소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21718), [기본 문법과 query API](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21719), [Projection](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21720), [Pagination](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21721)
- 강의: [Join](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21722), [Subquery](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21723), [Type 표현](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21724), [CASE](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21725), [Function](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21726)
- 강의: [Path expression](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21727), [Fetch join 1](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21742), [Fetch join 2](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21743)
- 강의: [Polymorphic query](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21729), [Entity 직접 사용](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21730), [Named query](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21731), [Bulk operation](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21732)

## 관련 문서

- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
- [[Querydsl|Querydsl JPA]]
- [[SQL-Joins|SQL Join]]
- [[Pagination-Optimization|Pagination 최적화]]
