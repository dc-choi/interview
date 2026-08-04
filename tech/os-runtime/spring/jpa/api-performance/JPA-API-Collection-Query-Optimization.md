---
tags: [jpa, hibernate, collection-fetch, pagination, batch-fetch, dto-projection]
status: done
verified_at: 2026-08-04
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
| V4 | Root DTO 뒤 child DTO 개별 조회 | `1 + N` | Projection이어도 N+1 |
| V5 | Root DTO와 child `IN` query | 보통 두 query | Grouping과 순서 조립 필요 |
| V6 | Flat DTO join 후 regrouping | 한 SQL, flat rows | parent column 반복, root paging 어려움 |

## Collection fetch join의 현재 동작

Hibernate 6부터 `join fetch`로 생긴 duplicate root는 entity materialization 뒤 자동 제거된다. Root 중복 제거만을 위해 JPQL/HQL에 `distinct`를 넣을 필요는 없다. SQL row 증폭 자체가 사라지는 것은 아니며 scalar/DTO projection의 중복 semantics는 별도다.

여러 to-one fetch는 보통 안전하지만 서로 평행한 여러 to-many fetch는 DB에서 Cartesian product를 만든다. HQL 문법상 항상 금지된다고 단정할 수는 없어도 결과 집합이 폭발할 수 있으므로 한 query로 합치기 전에 cardinality를 계산한다.

## Fetch join과 pagination

과거 Hibernate에서는 collection fetch query에 limit을 적용하면 전체 row를 읽은 뒤 memory에서 root를 제한하는 경우가 일반적이었다. Hibernate ORM 7.4는 limit/offset subquery를 지원하는 DB에서 이 제한을 SQL 안에서 처리하도록 개선했다. 지원하지 않는 DB에서는 여전히 memory 제한을 사용할 수 있다.

따라서 `collection fetch + pagination은 절대 불가능`도, `현재 버전이면 항상 안전`도 정확하지 않다. Provider/version, dialect, 생성 SQL, root page 크기와 collection 완전성을 integration test한다. 이식성과 예측 가능성이 중요하면 다음 two-step 전략을 우선한다.

1. Stable하고 unique한 정렬로 root ID 또는 root entity page를 읽는다.
2. 필요한 to-one은 첫 query에서 fetch한다.
3. 해당 root들의 collection을 batch fetch하거나 ID `IN` query로 읽는다.
4. 첫 page의 ID 순서대로 응답을 조립한다.

두 query 사이 다른 transaction이 commit할 수 있으므로 완전히 동일한 snapshot이 필요한지 isolation 요구도 결정한다.

## Batch fetch

Hibernate의 `hibernate.default_batch_fetch_size`, association의 `@BatchSize` 또는 session별 batch size는 여러 lazy collection/entity를 `IN` query 묶음으로 초기화한다. JDBC statement batch와 다른 읽기 최적화다.

```properties
spring.jpa.properties.hibernate.default_batch_fetch_size=100
```

크기 `100`은 예시일 뿐 정답이 아니다. DB parameter 제한, plan 형태, 평균 page와 collection 크기, heap 사용량을 측정해 정한다. 너무 작으면 왕복이 늘고 너무 크면 필요 없는 row와 bind가 늘 수 있다.

## DTO 직접 조회와 regrouping

V4처럼 root DTO마다 child query를 호출하면 entity를 안 썼어도 N+1이다. V5는 root DTO 목록과 모든 child DTO를 `where child.parent.id in :ids`로 읽고 `Map<ParentId, List<ChildDto>>`로 묶는다. 중복 column 전송이 작고 root pagination이 쉽지만 query와 조립 코드가 늘어난다.

V6는 parent와 child를 flat row 한 번으로 읽고 application에서 계층 DTO로 묶는다. Query 횟수는 최소지만 parent column이 반복되고 DB row limit은 child row에 적용되므로 root page와 맞지 않는다. 작은 bounded result나 export처럼 flat shape가 자연스러운 경우에 비교한다.

## 검증 체크리스트

- 실제 SQL 횟수뿐 아니라 각 SQL의 row와 byte를 기록한다.
- Root 정렬은 unique tie-breaker까지 포함한다.
- Empty collection과 optional relation을 포함해 DTO shape를 검증한다.
- Query plan, index와 `IN` parameter 수를 운영 DB에서 확인한다.
- Connection 점유, heap allocation, GC와 p95/p99 latency를 비교한다.
- Cache를 쓴다면 managed entity 대신 불변 DTO snapshot과 invalidation 정책을 우선 검토한다.

## 출처

- [Hibernate ORM current HQL Guide, Association fetching](https://docs.hibernate.org/stable/orm/querylanguage/html_single/#explicit-association-joins-fetch)
- [Hibernate ORM 7.4 Migration Guide, Limits and fetch joins](https://docs.hibernate.org/orm/current/migration-guide/#limits-and-fetch-joins)
- [Hibernate ORM current FetchSettings](https://docs.hibernate.org/stable/orm/javadocs/org/hibernate/cfg/FetchSettings.html)
- 강의: [주문 조회 V1](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24330), [V2, Entity를 DTO로 변환](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24331), [V3, Fetch join 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24332), [V3.1, Paging과 한계 돌파](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24333)
- 강의: [V4, JPA에서 DTO 직접 조회](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24334), [V5, Collection 조회 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24335), [V6, Flat data 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24336), [API 개발 고급 정리](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24337)

## 관련 문서

- [[JPA-API-ToOne-Query-Optimization|JPA To-one 조회 최적화]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[JPA-JPQL|JPQL과 HQL]]
- [[Pagination-Optimization|Pagination 최적화]]
