---
tags: [jpa, hibernate, api, query-optimization, spring-data-jpa, querydsl]
status: index
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA API Performance", "JPA API 성능 최적화"]
---

# JPA API 조회 성능

JPA API의 성능 문제는 annotation 하나보다 조회 결과의 모양에서 시작한다. 필요한 root 수, to-one과 to-many cardinality, page 경계, 응답 DTO를 먼저 정하고 그 모양을 가장 적은 비용으로 만드는 query plan을 선택한다. SQL 횟수만 줄이는 것이 아니라 row 수, 전송 byte, DB 실행 시간, heap 사용량과 코드 복잡도를 함께 본다.

## 최적화 순서

1. Entity를 HTTP 계약에서 분리하고 request/response DTO를 정의한다.
2. 실제 SQL과 query 횟수를 관찰해 N+1을 확인한다.
3. 필요한 to-one은 fetch join이나 entity graph로 한 번에 읽는다.
4. To-many가 있으면 row 증폭과 root pagination을 별도 문제로 다룬다.
5. Entity 조회 후 DTO 변환과 DTO projection을 비교한다.
6. OSIV를 선택하고 lazy loading이 허용되는 경계를 고정한다.
7. 운영 부하에서 latency 분포, connection pool과 DB 부하를 다시 측정한다.

## 단계별 선택 지도

| 문제 | 우선 선택 | 다음 선택 | 경계 |
|---|---|---|---|
| API 계약과 entity 결합 | 전용 DTO | application command/query | 직렬화 설정으로 숨기지 않음 |
| To-one N+1 | fetch join | DTO projection | 실제 접근 graph만 읽음 |
| To-many N+1 | root page 후 batch fetch | child `IN` query | row 증폭과 page semantics 검증 |
| 목록 전용 읽기 | DTO projection | flat result regrouping | query repository로 격리 |
| Transaction 밖 lazy load | transaction 안 DTO 조립 | OSIV를 명시적으로 선택 | serializer의 암묵 query 금지 |

## Query 횟수만으로 판단하지 않는다

한 query로 합쳐도 parent column이 child 수만큼 반복되면 전송량과 hydration 비용이 커진다. 반대로 두 query 전략은 왕복이 하나 늘지만 root page를 안정적으로 유지하고 중복 row를 줄일 수 있다. 다음 값을 같은 요청에서 비교한다.

- 생성 SQL, bind 값, 반환 row 수와 실행 계획
- DB 시간과 application mapping 시간
- 요청당 connection 점유 시간과 pool 대기
- 응답 payload, heap allocation과 GC
- Query 전용 코드의 복잡도와 변경 비용

## 재현 가능한 조회 fixture

최적화 전후 비교에는 고정된 graph가 필요하다. Root 여러 건, 각기 다른 collection 크기, 공유되는 to-one target, optional relation과 빈 collection을 포함하면 N+1, row 증폭과 mapping 누락을 함께 확인할 수 있다. Demo의 `@PostConstruct` seed와 `ddl-auto=create`는 local 실습 편의일 뿐 운영 초기화 방식이 아니다. Test fixture, migration 또는 별도 seed profile로 격리하고 생성된 관계와 row 수를 먼저 검증한다.

## Repository 도구의 위치

Spring Data JPA는 repository interface의 반복 CRUD와 query method 구현을 줄인다. 그러나 fetch plan, index, cardinality와 transaction 경계는 대신 결정하지 않는다. 복잡한 동적 조건에는 Criteria, QueryDSL, 명시적 JPQL/HQL 또는 native SQL 중 팀이 검증 가능한 도구를 선택한다.

Querydsl은 generated Q type과 Java 표현식으로 동적 predicate를 조립하고 compile 단계에서 property 이름 오류를 찾게 돕는다. 이것도 SQL 비용을 자동 최적화하지 않으므로 최종 SQL과 실행 계획을 확인한다. 설정, projection과 repository 구성은 [[Querydsl]]에서, Spring Data repository 규칙은 [[Spring-Data-JPA-Essentials]]에서 이어서 본다.

## 버전이 바꾸는 결론

오래된 예제의 package, build 설정과 provider workaround는 원리와 분리한다. 이 문서는 Jakarta Persistence 3.2, Hibernate ORM 7.4, Spring Boot 4.1을 검증 기준으로 삼는다.

- `javax.persistence` 예제는 현재 `jakarta.persistence` namespace로 옮긴다.
- Hibernate 5 전용 JSON module은 entity 직접 직렬화의 해법으로 채택하지 않는다.
- Hibernate 6부터 fetch join의 duplicate root 처리 방식이 달라졌다.
- Hibernate 7.4부터 일부 DB에서 collection fetch와 limit 처리 방식이 달라졌다.
- Spring Boot web application은 여전히 OSIV를 기본 등록하므로 설정을 명시한다.

## 학습 순서

- [[JPA-API-DTO-Boundary|DTO와 API 경계]]
- [[JPA-API-ToOne-Query-Optimization|To-one 조회 최적화]]
- [[JPA-API-Collection-Query-Optimization|컬렉션 조회 최적화]]
- [[JPA-API-OSIV|OSIV와 transaction 경계]]

## 출처

- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)
- [Hibernate ORM 7.4 Migration Guide](https://docs.hibernate.org/orm/current/migration-guide/)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- 강의: [강좌 소개](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24316), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24108), [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=87103), [2편 추가 자료](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=28786)
- 강의: [API 개발 고급 소개](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24322), [조회용 샘플 데이터 입력](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24323)
- 강의: [스프링 데이터 JPA 소개](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24341), [QueryDSL 소개](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24342)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]
- [[JPA-JPQL|JPQL과 HQL]]
- [[Querydsl|Querydsl JPA]]
- [[Pagination-Optimization|Pagination 최적화]]
