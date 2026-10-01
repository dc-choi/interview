---
tags: [jpa, hibernate, collection-fetch, pagination, batch-fetch, dto-projection]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA Collection Query Optimization", "JPA 컬렉션 조회 최적화"]
---

# JPA 컬렉션 조회 최적화

To-many association을 join하면 parent 한 건이 child 수만큼 SQL row로 늘어난다. 이 cardinality 증폭은 객체 중복이나 data 불일치가 아니라 관계형 join의 정상 결과다. ORM이 root object를 한 번만 반환해도 DB 전송량과 hydration 비용은 이미 발생했으므로 Java 목록 크기만 보고 성능을 판단하지 않는다.

## 여섯 단계 비교

| 단계 | 방식 | Query shape | 핵심 tradeoff |
|---|---|---|---|
| V1 | Entity 직접 반환 | serializer가 graph 탐색 | 계약 노출, N+1, 순환 |
| V2 | Entity 후 DTO 변환 | root 뒤 lazy SELECT 반복 | 계약은 분리되지만 N+1 |
| V3 | To-one과 collection fetch join | 한 SQL, root row 반복 | row 증폭, paging 주의 |
| V3.1 | Root page와 batch fetch | root query와 batched collection query | 왕복 증가, page 안정성 |
| V4 | Root DTO 뒤 child DTO 개별 조회 | `1 + N`, 단건 상세는 `1 + 1` | 목록에서는 projection이어도 N+1, 단건에는 가장 단순 |
| V5 | Root DTO와 child `IN` query | 보통 두 query | Grouping과 순서 조립 필요 |
| V6 | Flat DTO join 후 regrouping | 한 SQL, flat rows | parent column 반복 전송, root paging 불가 |

## Collection fetch join의 현재 동작

Hibernate 6부터 `join fetch`로 생긴 duplicate root는 entity materialization 뒤 자동 제거된다. Root 중복 제거만을 위해 JPQL/HQL에 `distinct`를 넣을 필요는 없다. SQL row 증폭 자체가 사라지는 것은 아니며 scalar/DTO projection의 중복 semantics는 별도다.

여러 to-one fetch는 row를 늘리지 않아 함께 걸어도 보통 안전하지만, collection fetch는 query당 하나로 제한한다.

- Hibernate는 한 query에서 bag을 둘 이상 fetch하면 SQL로 번역하는 단계에서 `MultipleBagFetchException`(`cannot simultaneously fetch multiple bags`)으로 거부한다. Bag은 `@OrderColumn` 같은 index 정보가 없는 `List`나 `Collection` mapping이다. `hibernate.mapping.default_list_semantics` 기본값이 `BAG`이므로 `List<OrderItem>` 같은 가장 흔한 mapping이 여기에 해당한다(Hibernate 7.4.11 source).
- 한쪽 이상이 `Set`이거나 index가 있는 `List`면 query는 실행되지만 root 하나의 row 수가 fetch한 collection 크기의 곱이 된다. Item 3개와 결제 4건이면 12 row다. Bag 하나를 다른 collection과 함께 fetch하면 bag element가 다른 collection 크기만큼 중복 적재될 수 있으므로 대상 버전의 재현 test로 확인한다.
- 예외를 없애려고 `List`를 `Set`으로 바꾸면 예외만 사라진다. Cartesian product와 전송량은 그대로 남고 순서 의미도 바뀐다. 이 예외는 query를 나누라는 신호로 보고, 나머지 collection은 batch fetch나 root ID `IN` query로 따로 초기화한다.
- 이 검사는 query를 SQL로 번역할 때 일어나므로 application 기동만으로 안심하지 말고 query를 실제로 실행하는 test를 둔다.

## Fetch join과 pagination

과거 Hibernate에서는 collection fetch query에 limit을 적용하면 전체 row를 읽은 뒤 memory에서 root를 제한하는 경우가 일반적이었다. Hibernate ORM 7.4는 limit/offset subquery를 지원하는 DB에서 이 제한을 SQL 안에서 처리하도록 개선했다. 지원하지 않는 DB에서는 여전히 memory 제한을 사용할 수 있다.

따라서 `collection fetch + pagination은 절대 불가능`도, `현재 버전이면 항상 안전`도 정확하지 않다. Provider/version, dialect, 생성 SQL, root page 크기와 collection 완전성을 integration test한다. 이식성과 예측 가능성이 중요하면 다음 two-step 전략을 우선한다.

1. Stable하고 unique한 정렬로 root ID 또는 root entity page를 읽는다.
2. 필요한 to-one은 첫 query에서 fetch한다.
3. 해당 root들의 collection을 batch fetch하거나 ID `IN` query로 읽는다.
4. 첫 page의 ID 순서대로 응답을 조립한다.

두 query 사이 다른 transaction이 commit할 수 있으므로 완전히 동일한 snapshot이 필요한지 isolation 요구도 결정한다.

Memory 제한은 조건에 맞는 row를 모두 읽은 뒤 root를 자르므로 결과가 크면 OutOfMemory 장애로 이어질 수 있다. 그래서 일어났다는 사실을 감지하고 막는 장치를 둔다(Hibernate 7.4.11 source).

- Memory 제한이 적용되면 `org.hibernate.orm.query` logger에 WARN `HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory`가 남는다. 이 식별자를 운영 log alert나 test의 log assertion 대상으로 둔다.
- `hibernate.query.fail_on_pagination_over_collection_fetch=true`(기본 `false`)를 켜면 memory 제한이 필요한 query가 경고 대신 예외로 실패한다. 최소한 test와 CI profile에서 켜 두면 배포 전에 드러난다. Hibernate 7.4 기준으로 이 설정은 DB가 subquery 안 `LIMIT`을 지원하지 않아 memory 제한이 필요한 경우에 적용된다.
- `org.hibernate.limitInMemory` hint는 7.4 이전 동작을 되살리는 호환용이라 새 코드에서 쓰지 않는다.

## Batch fetch

Hibernate의 `hibernate.default_batch_fetch_size`, association의 `@BatchSize` 또는 session별 batch size는 여러 lazy collection/entity를 `IN` query 묶음으로 초기화한다. JDBC statement batch와 다른 읽기 최적화다.

```properties
spring.jpa.properties.hibernate.default_batch_fetch_size=100
```

크기 `100`은 예시일 뿐 정답이 아니다. 흔히 쓰는 범위는 100~1000이고, 1000을 상한으로 두는 이유는 DB마다 `IN` parameter 수 제한이 있어서다. DB parameter 제한, plan 형태, 평균 page와 collection 크기를 측정해 정한다.

- 크게 잡을수록 왕복은 줄지만 한 번에 DB와 application이 받는 순간 부하가 커진다. 작게 잡으면 왕복은 늘고 한 번의 부하는 작다.
- 필요한 data를 결국 모두 읽는다면 총 memory 적재량은 크기와 거의 무관하다. 판단 변수는 heap 총량보다 DB와 application이 견딜 수 있는 순간 부하다.
- 다만 batch 초기화는 persistence context에 있는 같은 종류의 미초기화 proxy와 collection을 크기만큼 함께 읽는다. 크게 잡으면 실제로 접근하지 않을 연관까지 읽혀 row와 bind가 늘 수 있다.
- Hibernate 7.4.11 source는 IN 목록 방식에서 한 SQL의 key 수를 dialect가 선언한 parameter 제한으로 잘라 여러 SQL로 나눈다(Oracle 23 이전 1000, SQL Server 2048). PostgreSQL처럼 표준 array를 쓰는 dialect에서는 key 목록을 array parameter 하나로 bind하므로 IN 상한 논리가 그대로 적용되지 않는다. 대상 DB에서 생성 SQL과 bind 수를 확인한다.

To-one은 fetch join하고 collection은 batch fetch로 읽는 조합(V3.1)이 paging과 collection 조회를 함께 푸는 기본안이다.

## DTO 직접 조회와 regrouping

V4처럼 root DTO마다 child query를 호출하면 entity를 안 썼어도 N+1이다. 다만 주문 한 건의 상세처럼 root가 하나면 root query 1번과 child query 1번으로 끝나므로, 코드가 가장 단순한 V4가 단건 조회에는 적정한 선택이다.

V5는 root DTO 목록과 모든 child DTO를 `where child.parent.id in :ids`로 읽고 `Collectors.groupingBy`로 `Map<ParentId, List<ChildDto>>`를 만들어 root마다 바로 찾는다. To-one join을 포함한 root query와 child query 두 번이며, 중복 column 전송이 작고 root pagination이 쉽지만 query와 조립 코드가 늘어난다. 여러 root를 다루는 목록에 맞는다.

V6는 parent와 child를 flat row 한 번으로 읽고 application에서 계층 DTO로 묶는다. Query 횟수는 최소지만 parent column이 child 수만큼 반복 전송되므로 data가 많으면 V5보다 오히려 느릴 수 있고 재조립 코드도 커진다. DB row limit은 child row에 적용되므로 root 기준 paging은 불가능하고 child 기준 paging만 된다. 작은 bounded result나 export처럼 flat shape가 자연스러운 경우에 비교한다.

Flat row를 root 단위로 묶을 때 grouping key는 root ID 값 자체로 둔다. DTO 객체를 key로 쓰면서 `equals`와 `hashCode`를 ID 기준으로 정의하지 않으면 같은 주문의 row가 하나로 모이지 않는다. Lombok을 쓴다면 `@EqualsAndHashCode(of = "orderId")`처럼 식별자로 한정한다.

## 검증 체크리스트

- 실제 SQL 횟수뿐 아니라 각 SQL의 row와 byte를 기록한다.
- Root 정렬은 unique tie-breaker까지 포함한다.
- Empty collection과 optional relation을 포함해 DTO shape를 검증한다.
- Query plan, index와 `IN` parameter 수를 운영 DB에서 확인한다.
- Connection 점유, heap allocation, GC와 p95/p99 latency를 비교한다.
- Cache를 쓴다면 managed entity 대신 불변 DTO snapshot과 invalidation 정책을 우선 검토한다.

## 출처

- [Hibernate ORM current HQL Guide, Association fetching](https://docs.hibernate.org/stable/orm/querylanguage/html_single/#explicit-fetch-join)
- [Hibernate ORM 7.4 Migration Guide, Limits and fetch joins](https://docs.hibernate.org/orm/current/migration-guide/#_limits_and_fetch_joins)
- [Hibernate ORM current FetchSettings](https://docs.hibernate.org/stable/orm/javadocs/org/hibernate/cfg/FetchSettings.html)
- [Hibernate ORM 7.4.11, `BaseSqmToSqlAstConverter` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/query/sqm/sql/BaseSqmToSqlAstConverter.java)
- [Hibernate ORM 7.4.11, `MappingSettings` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/cfg/MappingSettings.java)
- [Hibernate ORM 7.4.11, `QuerySettings` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/cfg/QuerySettings.java)
- [Hibernate ORM 7.4.11, `QueryLogging` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/query/QueryLogging.java)
- [Hibernate ORM 7.4.11, `HibernateHints` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/jpa/HibernateHints.java)
- [Hibernate ORM 7.4.11, `StandardBatchLoaderFactory` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/loader/ast/internal/StandardBatchLoaderFactory.java)
- [Hibernate ORM 7.4.11, `Dialect` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/dialect/Dialect.java)
- 강의: [주문 조회 V1](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24330), [V2, Entity를 DTO로 변환](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24331), [V3, Fetch join 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24332), [V3.1, Paging과 한계 돌파](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24333)
- 강의: [V4, JPA에서 DTO 직접 조회](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24334), [V5, Collection 조회 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24335), [V6, Flat data 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24336), [API 개발 고급 정리](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24337)

## 관련 문서

- [[JPA-API-ToOne-Query-Optimization|JPA To-one 조회 최적화]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[JPA-JPQL|JPQL과 HQL]]
- [[Pagination-Optimization|Pagination 최적화]]
