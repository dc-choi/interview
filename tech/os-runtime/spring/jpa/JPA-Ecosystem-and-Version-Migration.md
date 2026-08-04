---
tags: [jpa, jakarta-persistence, hibernate, spring-data-jpa, migration]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JPA Ecosystem", "javax to jakarta persistence", "JPA 버전 전환"]
---

# JPA 생태계와 버전 전환

JPA라는 익숙한 이름은 계속 쓰이지만 현재 표준명과 package는 Jakarta Persistence, `jakarta.persistence.*`다. 강의의 핵심 원리는 여전히 유효하되 오래된 dependency와 `javax.persistence.*` 예제를 새 프로젝트에 그대로 복사하지 않는다.

## ORM이 다루는 경계

객체는 reference, identity, inheritance와 encapsulation으로 model을 만들고 relational DB는 row, primary/foreign key와 join으로 상태를 표현한다. 이 차이는 단순 CRUD SQL 반복뿐 아니라 다음 문제를 만든다.

- 객체 identity와 DB primary key를 언제 같다고 볼 것인가?
- 단방향 reference와 table의 양방향 join 가능성을 어떻게 연결할 것인가?
- inheritance와 object graph를 table, discriminator와 join으로 어떻게 저장할 것인가?
- 어느 association을 한 unit of work에서 읽고 변경할 것인가?

ORM은 이 번역을 metadata와 persistence context로 일관되게 수행한다. Query 비용과 schema 무결성까지 대신 결정하지는 않는다.

## 표준, 구현체, 편의 계층

| 계층 | 역할 | 현재 기준 예시 |
|---|---|---|
| Jakarta Persistence | entity lifecycle, mapping annotation, `EntityManager`, JPQL 명세 | `jakarta.persistence:jakarta.persistence-api:3.2.0` |
| Hibernate ORM | 표준 구현과 HQL, batch fetching 같은 확장 | 7.4 latest stable, Jakarta Persistence 3.2 |
| Spring Data JPA | JPA 위에 repository와 query method 제공 | 4.1 stable |
| Querydsl JPA | Q type과 Java DSL로 JPQL query 조립 | OpenFeign fork 7.5, Spring Data는 best-effort 지원 |
| Spring Boot | provider, `DataSource`, transaction manager 자동 설정 | 4.1 stable 문서 기준 |

상위 추상화를 써도 생성 SQL, DB constraint, transaction과 query cardinality는 사라지지 않는다. JPQL은 표준 범위이고 HQL, Hibernate annotation과 hint는 provider 종속 범위다.

Querydsl 원본 `com.querydsl` 계열과 활성 OpenFeign fork의 `io.github.openfeign.querydsl` 계열은 artifact와 Jakarta classifier 규칙이 다르다. Runtime과 annotation processor를 한 계열로 맞추고 세부 설정은 [[Querydsl-Setup-and-Compatibility]]에서 확인한다.

## 강의 설정을 현재 코드로 읽는 법

강의의 초기 실습은 Maven, H2, `persistence.xml`, `javax.persistence-api`, 구형 `hibernate-entitymanager`를 사용한다. 이는 해당 버전의 재현 자료다. 현재 Hibernate는 `org.hibernate.orm:hibernate-core`, 현재 표준 API는 `jakarta.persistence-api`를 사용한다. Spring Boot 프로젝트라면 dependency version을 개별 고정하기보다 지원되는 Boot dependency set과 starter를 기준으로 맞춘다.

Spring Boot 4.1에서 `spring-boot-starter-data-jpa`는 Hibernate, Spring Data JPA와 Spring ORM을 함께 제공하고 HikariCP를 기본 우선순위의 connection pool로 선택한다. H2 같은 embedded DB는 학습과 빠른 test에 유용하지만 강의의 구버전을 고정하지 말고 Boot가 관리하는 호환 dependency를 사용한다. H2 console과 `ddl-auto=create` 계열은 개발 전용으로 제한하고 운영 schema는 versioned migration으로 관리한다. SQL parameter logging은 개인정보와 credential을 노출할 수 있으므로 환경별 masking과 접근 통제가 필요하다.

`META-INF/persistence.xml`과 `Persistence.createEntityManagerFactory()`를 쓰는 Java SE bootstrap은 지금도 표준이다. 반면 Spring 애플리케이션은 보통 container가 `EntityManagerFactory`, transaction-bound `EntityManager`와 lifecycle을 관리한다. 둘을 같은 코드 예제로 섞지 않는다.

```java
try (EntityManagerFactory emf = Persistence.createEntityManagerFactory("app")) {
  EntityManager em = emf.createEntityManager();
  try {
    em.getTransaction().begin();
    // unit of work
    em.getTransaction().commit();
  } finally {
    em.close();
  }
}
```

`EntityManagerFactory`는 애플리케이션에서 공유하는 factory지만 `EntityManager`와 그 persistence context는 동시 실행 thread 사이에 공유하면 안 된다. Spring의 일반적인 persistence context 범위는 transaction이지 HTTP request 자체가 아니다. OSIV는 이 범위를 web response까지 늘리는 별도 선택이다.

## Spring repository 경계

Spring이 주입하는 shared `EntityManager` proxy는 현재 transaction에 연결된 실제 context로 작업을 위임한다. 변경을 flush해 DB에 반영하는 작업에는 transaction이 필요하다. Read도 repeatable한 unit of work와 lazy loading 경계를 명확히 하려면 service의 read transaction 안에서 수행한다.

`@Repository`는 component 역할을 표시하고 eligible persistence exception translation의 대상이 된다. 적절한 post-processor가 있을 때 JPA provider exception을 Spring `DataAccessException` 계층으로 변환하며 원래 cause는 보존한다. Annotation만 붙였다고 모든 임의 exception이 자동 변환되는 것은 아니다.

## 버전 경계 체크리스트

- import가 `javax.persistence`인지 `jakarta.persistence`인지 확인한다.
- 표준 JPQL과 Hibernate HQL 확장을 구분한다.
- Hibernate major upgrade 때 migration guide로 query, fetch, schema generation 동작을 확인한다.
- 개발용 schema 자동 생성과 운영 migration을 분리한다.
- dialect, driver, DB version 조합은 framework 지원표와 실제 통합 test로 검증한다.

## 강의 접근 기록

MCP에서 56개 lecture 중 54개 내용을 읽었다. 아래 두 resource unit은 목록에는 있으나 본문을 반환하지 않았다.

- [2024 최신 버전으로 프로젝트 설정하기, 문서](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=203903): `No content found for courseId=324109, unitId=203903`
- [2024 최신 버전으로 프로젝트 설정하기, 소스코드](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=203904): `No content found for courseId=324109, unitId=203904`

따라서 두 unit의 구체적인 설정은 추정해 복원하지 않고, 현재 공식 문서로 별도 보강했다. quiz 9개는 lecture 본문 수집 대상이 아니었다.

실전 활용 1 과정 `324119`는 lecture 36개 본문을 모두 확인했고 quiz 7개는 본문 수집 대상에서 제외했다. 최초 조회에서 unit `24300`, `24301`, `24303`, `24304`, `24305`, `24306`, `24308`이 `McpServerError: rate_limit_exceeded`를 반환했지만 소규모 재시도에서 모두 성공했다. 최종 미수집 unit은 없다.

## 출처

- [Jakarta Persistence 3.2 release](https://jakarta.ee/specifications/persistence/3.2/)
- [Jakarta Persistence 3.2 specification](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)
- [Hibernate ORM releases](https://hibernate.org/orm/releases/)
- [Hibernate ORM current getting started](https://docs.hibernate.org/orm/current/quickstart/html_single/)
- [Hibernate ORM 7.4 User Guide](https://docs.hibernate.org/orm/7.4/userguide/html_single/)
- [Spring Data JPA 4.1 reference](https://docs.spring.io/spring-data/jpa/reference/)
- [Spring Data JPA 4.1, Querydsl extension](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- [OpenFeign Querydsl 7.5 release](https://github.com/OpenFeign/querydsl/releases/tag/7.5)
- [Spring Boot 4.1, SQL databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- 강의: [강좌 소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21735), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21744)
- 강의: [SQL 중심적인 개발의 문제점](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21670), [JPA 소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21683)
- 강의: [Hello JPA, 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21684), [Hello JPA, 애플리케이션 개발](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21685)
- 김영한 강사, [JPA 시작](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114651)
- 김영한 강사, [ORM 개념 1, SQL 중심적인 개발의 문제점](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114652)
- 김영한 강사, [ORM 개념 2, JPA 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114653)
- 김영한 강사, [JPA 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114654)
- 김영한 강사, [JPA 적용 1, 개발](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114655)
- 김영한 강사, [JPA 적용 2, 리포지토리 분석](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114656)
- 김영한 강사, [JPA 적용 3, 예외 변환](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114657)
- 김영한 강사, [JPA 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114658)
- 김영한 강사, 활용 1 준비: [강좌 소개](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24769), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24315), [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=86625), [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=21871), [라이브러리 살펴보기](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24276), [View 환경 설정](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24277), [H2 데이터베이스 설치](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24278), [JPA와 DB 설정, 동작확인](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24279)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[Java-Spring-Stack-Migration|Java와 Spring 스택 마이그레이션]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
- [[Querydsl|Querydsl JPA]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
