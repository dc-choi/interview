---
tags: [jpa, hibernate, lazy-loading, n-plus-one, cascade, orphan-removal]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA Loading", "JPA Proxy", "JPA Cascade", "JPA N+1"]
---

# JPA 로딩과 생명주기 전파

Association mapping은 구조를 정의하고 fetch plan은 한 use case에서 어느 graph를 언제 읽을지 결정한다. 모든 관계를 EAGER로 바꾸거나 OSIV에 기대면 query 위치와 비용이 숨는다. 기본은 좁은 mapping과 use case별 명시적 조회 계획이다.

## proxy와 reference

`EntityManager.getReference()`는 state를 바로 읽지 않고 identity만 가진 reference를 돌려줄 수 있다. Hibernate는 보통 proxy나 bytecode enhancement를 사용하지만, provider는 이미 context에 있는 instance를 반환하거나 state를 더 일찍 가져올 수도 있다.

```java
Member ref = em.getReference(Member.class, id);
Long sameId = ref.getId();       // 초기화 없이 가능할 수 있음
String name = ref.getName();     // 초기화가 필요할 수 있음
```

- 정확한 concrete class 비교보다 `instanceof`와 proxy-aware equality를 검토한다.
- 초기화되지 않은 lazy state를 closed context 밖에서 읽지 않는다.
- `PersistenceUnitUtil.isLoaded()`로 portable한 loaded 여부를 검사할 수 있지만 business flow를 검사 결과 분기에 의존시키지 않는다.
- Proxy는 transaction을 대신하지 않는다. 초기화 SQL이 실행될 경계를 명확히 한다.

## fetch 기본값과 실무 기준

| 매핑 | 명세 기본값 | 해석 |
|---|---|---|
| `ManyToOne`, `OneToOne` | `EAGER` | 반드시 eager라는 요구, 불필요한 graph 확장 주의 |
| `OneToMany`, `ManyToMany` | `LAZY` | provider에 대한 hint |

실무 model은 to-one도 `LAZY`를 명시하고 Hibernate 동작을 검증하는 경우가 많다. 하지만 annotation 기본값만 보고 실제 SQL을 예측하지 않는다. Query, entity graph, provider fetch profile과 batch 설정이 최종 fetch plan을 바꿀 수 있다.

## N+1을 query shape로 해결한다

Parent N건을 가져온 뒤 각 association 접근마다 SELECT가 나가면 `1 + N` query가 된다. EAGER로 바꿔도 JPQL query 뒤 추가 select가 이어질 수 있으므로 근본 해결이 아니다.

| 방법 | 적합한 경우 | 주의 |
|---|---|---|
| fetch join | 한 transaction에서 필요한 좁은 graph | to-many 병렬 fetch는 row cartesian product |
| `EntityGraph` | query별 attribute graph를 선언 | SQL과 중첩 graph를 검증 |
| batch/subselect fetch | lazy collection 여러 개를 묶어 초기화 | 왕복은 줄지만 필요 없는 data도 읽을 수 있음 |
| DTO projection | 화면/API read model | 변경 추적 대상이 아님 |
| two-step query | parent paging 후 ID로 children 조회 | 순서 보존과 두 query 일관성 고려 |

Collection fetch join과 pagination은 provider, version과 DB별 SQL 및 page semantics를 확인한다. Hibernate 7.4는 limit/offset subquery를 지원하는 DB에서 이전의 in-memory limit 동작을 개선했지만, 지원하지 않는 DB에서는 여전히 memory에서 제한할 수 있다. 현재 migration guide와 생성 SQL을 본다. 자세한 표준/HQL 경계는 [[JPA-JPQL]]에 둔다.

API 응답에서 to-one, to-many와 DTO projection을 단계별로 비교하는 방법은 [[JPA-API-Performance]]에 둔다.

## cascade와 orphanRemoval은 다르다

| 기능 | 의미 |
|---|---|
| `cascade=PERSIST` | source에 대한 persist를 target으로 전파 |
| `cascade=MERGE` | merge state 복사를 target으로 전파 |
| `cascade=REMOVE` | source remove를 target remove로 전파 |
| `orphanRemoval=true` | `OneToOne`/`OneToMany` 관계에서 빠진 privately owned target을 flush 때 remove |

`orphanRemoval`은 단순히 parent 삭제 때 child를 삭제하는 옵션이 아니다. 관계에서 제거된 private child의 생명주기를 끝내는 의미다. Managed parent 자체를 remove하면 orphan-removal 관계의 target에도 remove가 전파되므로 같은 목적의 `cascade=REMOVE`를 중복 설명할 필요가 없다.

공유 child, 다른 parent로 이동할 child, 독립 repository로 관리되는 entity에는 orphan removal이 맞지 않는다. Cascade는 aggregate 경계를 대신 결정하지 않으며 DB `ON DELETE`와도 다른 계층이다.

## OSIV와 직렬화 경계

Spring의 Open EntityManager in View는 web response까지 `EntityManager`를 열어 lazy loading을 가능하게 한다. 이것이 물리 connection을 항상 request 전체에 고정한다는 뜻은 아니지만 controller/serializer에서 예측 못 한 query와 추가 checkout을 허용한다. `spring.jpa.open-in-view=false`를 선택하면 transaction 안에서 필요한 graph를 읽고 DTO로 변환하는 경계를 강제하기 쉽다. Connection handling mode까지 포함한 선택 기준은 [[JPA-API-OSIV]]에 둔다.

Entity를 HTTP response로 직접 직렬화하면 lazy loading, 순환 reference와 field 노출 문제가 겹친다. 외부 contract는 DTO/projection으로 분리한다.

## 출처

- [Jakarta Persistence 3.2, Fetch Strategies](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#fetch-strategies)
- [Jakarta Persistence 3.2, Cascade and orphanRemoval](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#relationship-mapping-defaults)
- [Hibernate ORM current User Guide, Fetching](https://docs.hibernate.org/stable/orm/userguide/html_single/#chapters/fetching/Fetching)
- [Hibernate ORM 7.4 Migration Guide, Limits and fetch joins](https://docs.hibernate.org/orm/current/migration-guide/#limits-and-fetch-joins)
- [Spring Boot, Open EntityManager in View](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.jpa-and-spring-data.open-entity-manager-in-view)
- 강의: [프록시](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21708), [즉시 로딩과 지연 로딩](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21709), [CASCADE와 고아 객체](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21710), [실전 예제 5](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21711)
- 김영한 강사, 활용 1: [엔티티 설계시 주의점](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24284)

## 관련 문서

- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[JPA-Aggregate-Collection-Mapping|JPA 애그리거트 컬렉션 매핑]]
- [[Spring-Transactional|Spring @Transactional]]
