---
tags: [jpa, spring-data-jpa, pagination, spring-mvc, keyset]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Data Paging", "Pageable", "DomainClassConverter"]
---

# Spring Data JPA 페이징과 웹 경계

페이징은 반환 type만 바꾸는 기능이 아니다. total count 비용, 정렬 안정성, 큰 offset, 입력 제한과 API 응답 계약을 함께 설계해야 한다.

## 반환 type 선택

| 반환형 | 추가 정보 | 비용과 용도 |
|---|---|---|
| `List<T>` | 없음 | 요청한 범위의 content만 필요할 때 |
| `Slice<T>` | 다음 slice 존재 여부 | total count 없이 더보기 UI |
| `Page<T>` | total elements와 pages | content query와 count query가 필요할 수 있음 |
| `Window<T>` | 다음 scroll position | 큰 dataset을 순차 탐색할 때 |

```java
Page<Member> findByAgeGreaterThan(int age, Pageable pageable);

@Query(
    value = "select m from Member m join fetch m.team where m.age >= :age",
    countQuery = "select count(m) from Member m where m.age >= :age"
)
Page<Member> findPage(@Param("age") int age, Pageable pageable);
```

`Page`는 total이 정말 필요한 화면에만 쓴다. fetch join이나 복잡한 join이 있는 content query에서 count를 단순화할 수 있으면 별도 `countQuery`를 둔다. `Slice`도 다음 page 판단을 위해 제한보다 한 건 더 읽을 수 있으므로 query plan은 확인한다.

순수 JPA에서는 `TypedQuery.setFirstResult(offset)`과 `setMaxResults(limit)`로 content 범위를 자르고 별도 count query를 실행한다. Provider가 dialect에 맞는 SQL을 만들지만 정렬과 index 비용까지 자동 최적화하지는 않는다. `Page.map(MemberDto::from)`으로 metadata를 유지하며 content를 DTO로 변환할 수 있다.

## Offset과 keyset

Offset pagination은 임의 page 이동이 쉽지만 offset이 커질수록 앞 row를 건너뛰는 비용이 커지고, 조회 중 데이터가 바뀌면 중복과 누락이 생길 수 있다. 대량 순차 탐색은 `Window`와 `ScrollPosition`을 사용한 scrolling을 검토한다.

Keyset scrolling은 마지막 sort key 이후 조건을 사용하므로 index를 타기 쉽다. 대신 모든 sort key가 결과에 포함돼야 하고 nullable key는 피하는 것이 좋다. 어떤 방식이든 고유한 tie-breaker를 마지막에 붙인다.

```text
ORDER BY created_at DESC, id DESC
```

String 기반 `@Query` method는 현재 scrolling을 지원하지 않으므로 Query by Example, Querydsl 또는 repository가 지원하는 query 형태를 선택한다.

## Parameter 조합 규칙

- `Pageable`은 자체 sort를 포함하므로 별도 `Sort`와 함께 선언하지 않는다.
- `Pageable`과 `Limit`도 함께 쓰지 않는다.
- `Top` 또는 `First`는 `Pageable`과 조합할 수 있으며 제한 범위 안에서 page 계산이 일어난다.
- 정렬이 없으면 DB 반환 순서는 보장되지 않는다.

## Spring MVC 입력 경계

Spring Data web support는 request의 `page`, `size`, `sort`를 `Pageable`과 `Sort`로 변환한다. Spring Boot 4.1 기본값은 page 0, size 20, 최대 size 2000이며 0-based다. 기본 최대값을 운영 정책으로 그대로 받아들이지 말고 endpoint별 상한을 더 작게 정한다.

```yaml
spring:
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100
        one-indexed-parameters: false
```

Client가 보낸 sort property를 그대로 허용하면 내부 필드 노출과 예상하지 않은 join 또는 느린 정렬이 생긴다. API field를 persistence property로 변환하는 allowlist를 두고, page와 size의 음수 및 상한도 검증한다.

여러 `Pageable`을 받을 때는 `@Qualifier`를 붙이며 request parameter는 qualifier prefix를 사용한다.

## 안정적인 API 응답

`PageImpl`은 domain type이므로 그 Jackson 구조를 public API 계약으로 삼지 않는다. 명시적 response DTO로 변환하거나 Spring Data의 `PagedModel`로 감싼다.

```java
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
class WebConfig {
}
```

이 설정은 `Page`를 안정된 simplified `PagedModel` 구조로 render한다. Hypermedia navigation이 필요하면 Spring HATEOAS의 `PagedModel`과 assembler를 사용한다.

## DomainClassConverter의 경계

Controller argument를 `@PathVariable("id") Member member`처럼 선언하면 converter가 repository로 ID 조회할 수 있다. 편리하지만 조회, not-found, authorization, transaction 시점이 controller signature 뒤에 숨는다.

일반적인 write API에서는 ID를 받고 application service가 entity를 조회해 권한과 business rule을 검증하는 편이 낫다. converter는 단순한 read endpoint에서 lookup 의미가 분명할 때 제한적으로 사용한다. Entity를 그대로 응답하지 않고 DTO 경계를 유지한다.

## 체크리스트

- total이 필요한가, 다음 page 여부만 필요한가
- sort가 deterministic하고 composite index와 맞는가
- client size와 sort field를 제한했는가
- count query를 content query와 분리할 수 있는가
- 큰 offset은 keyset 또는 cursor로 전환해야 하는가
- `PageImpl`을 public JSON으로 직접 노출하지 않았는가

## 출처

- [Spring Data JPA 4.1, Query Methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html)
- [Spring Data Commons 4.1, Web Extensions](https://docs.spring.io/spring-data/commons/reference/repositories/core-extensions.html)
- [Spring Boot 4.1, Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)
- [순수 JPA paging과 sorting](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28016)
- [Spring Data JPA paging과 sorting](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28017)
- [Web 확장, domain class converter](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28024)
- [Web 확장, paging과 sorting](https://www.inflearn.com/courses/lecture?courseId=324474&unitId=28025)

## 관련 문서

- [[JPA-API-DTO-Boundary|API DTO 경계]]
- [[JPA-API-Collection-Query-Optimization|Collection query 최적화]]
- [[Index|Database index]]
- [[Spring-Data-JPA-Projections-and-Native-Queries|조회 결과 shaping]]
- [[Querydsl-Repository-and-Paging|Querydsl paging과 count 최적화]]
