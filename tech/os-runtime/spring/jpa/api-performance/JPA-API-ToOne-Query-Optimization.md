---
tags: [jpa, hibernate, n-plus-one, fetch-join, dto-projection]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA To-One Query Optimization", "JPA 단건 연관 조회 최적화"]
---

# JPA To-one 조회 최적화

주문처럼 root가 여러 `ManyToOne` 또는 `OneToOne`을 참조하는 API는 응답이 요구하는 graph를 먼저 고정한다. Entity 목록만 가져온 뒤 DTO mapper가 lazy association을 순회하면 N+1이 생긴다. 해결 목표는 무조건 한 query가 아니라 필요한 graph를 예측 가능한 비용으로 읽는 것이다.

## 네 단계 비교

| 단계 | 조회 방식 | 장점 | 비용과 위험 |
|---|---|---|---|
| V1 | Entity 직접 반환 | 구현이 짧아 보임 | API 결합, lazy query, 순환과 field 노출 |
| V2 | Entity 조회 후 DTO 변환 | 계약 분리, domain 로직 재사용 | Mapper의 association 접근이 N+1 가능 |
| V3 | Entity와 필요한 to-one fetch join 후 DTO 변환 | 좁은 graph를 한 SQL로 초기화 | Column 과다 조회, query별 fetch plan 필요 |
| V4 | Query에서 DTO 직접 projection | 필요한 column만 조회 | Constructor/query 결합, 재사용성과 변경 추적 없음 |

V1은 운영 API 선택지가 아니다. V2를 기준으로 SQL을 관찰하고 문제가 확인되면 V3 또는 V4로 이동한다.

## N+1을 정확히 센다

Root query 1회 후 각 row의 association마다 추가 SELECT가 실행되는 형태를 N+1이라 부른다. 하지만 실제 횟수는 연관 target ID의 중복, 1차 cache와 이미 초기화된 상태에 따라 달라진다. `1 + N + N` 같은 숫자를 공식처럼 외우지 말고 request 단위 SQL과 row를 측정한다.

Mapping을 EAGER로 바꾸는 것은 query별 요구를 표현하지 못한다. JPQL root query 뒤 별도 SELECT가 이어질 수 있고 다른 use case에서 과조회가 된다. To-one mapping은 보통 lazy로 두고 fetch join, entity graph 또는 projection으로 use case별 계획을 만든다.

## Fetch join으로 entity graph를 읽는다

```java
select o
from Order o
join fetch o.member
join fetch o.delivery
where o.status = :status
```

여러 to-one fetch는 row cardinality를 곱하지 않으므로 한 query에서 처리하기 비교적 안전하다. Optional relation을 inner join하면 root가 사라질 수 있으므로 `left join fetch` 필요 여부를 결정한다. Entity가 managed 상태로 반환되므로 같은 transaction에서 domain behavior가 필요할 때도 맞는다.

Fetch join은 필요한 column만 고르는 기능이 아니다. Entity와 association의 mapped state를 hydration하므로 넓은 entity라면 전송량을 확인한다. Association에 조건을 걸어 불완전한 collection을 managed graph로 만드는 방식도 피한다.

## DTO projection으로 read model을 읽는다

```java
select new app.api.OrderSummary(
    o.id, m.name, d.address, o.status, o.orderDate
)
from Order o
join o.member m
join o.delivery d
```

DTO projection은 반환 field가 작고 변경 추적이 필요 없는 목록에 적합하다. Query와 DTO constructor가 결합되므로 화면별 query repository에 격리하고 compile/test로 signature를 보호한다. QueryDSL projection도 같은 tradeoff를 가지며 SQL 최적화를 자동 보장하지 않는다.

## 선택 기준

- Entity graph가 작고 domain behavior도 사용하면 fetch join 후 DTO 변환을 우선한다.
- 읽기 전용 목록이 크고 응답 field가 작으면 DTO projection을 비교한다.
- 공통 repository를 모든 화면에 재사용하려고 거대한 fetch join을 만들지 않는다.
- 쿼리 수, row/byte, DB 실행 계획, mapping CPU를 같은 조건에서 측정한다.
- Stable `ORDER BY`와 page semantics는 별도로 검증한다.

## 출처

- [Hibernate ORM current User Guide, Fetching](https://docs.hibernate.org/stable/orm/userguide/html_single/#chapters/fetching/Fetching)
- [Jakarta Persistence 3.2, Fetch Joins](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#fetch-joins)
- 강의: [간단한 주문 조회 V1](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24325), [V2, Entity를 DTO로 변환](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24326), [V3, Fetch join 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24327), [V4, JPA에서 DTO 직접 조회](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24328)

## 관련 문서

- [[JPA-API-DTO-Boundary|JPA DTO와 API 경계]]
- [[JPA-API-Collection-Query-Optimization|JPA 컬렉션 조회 최적화]]
- [[JPA-JPQL|JPQL과 HQL]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
