---
tags: [jpa, jakarta-persistence, hibernate, spring-data-jpa, migration]
status: done
verified_at: 2026-09-30
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

SQL 중심 개발에서는 CRUD마다 SQL을 직접 쓰고 객체와 SQL을 오가며 변환한다. 연락처 같은 field 하나가 추가되면 관련 INSERT, SELECT, UPDATE를 모두 고쳐야 하고 하나라도 빠뜨리면 조용한 bug가 된다. JdbcTemplate이나 MyBatis는 JDBC 반복 code를 줄이지만 SQL 작성과 이 동기화 책임은 그대로 남긴다. 또 처음 실행한 SQL이 객체 graph의 탐색 범위를 정한다. Member만 조회한 SQL이었다면 `member.getTeam()`은 채워져 있지 않다. 그래서 DAO가 돌려준 entity의 연관 객체가 채워졌는지 믿을 수 없어 매번 그 계층의 SQL을 열어 봐야 하고, 물리적으로 계층을 나눠도 다음 계층을 믿고 쓸 수 없다. 우회책으로 `getMember()`, `getMemberWithTeam()`처럼 탐색 범위별 method가 늘어난다. 같은 row를 두 번 조회하면 서로 다른 instance가 만들어져 `==` 비교도 깨진다. 상속 구조는 저장할 때 table별 INSERT로 나누고 조회할 때 join 결과를 다시 조립해야 하며, 객체 참조도 FK 값으로 바꿔 저장하고 다시 참조로 세팅해야 한다. 객체답게 설계할수록 mapping 작업이 늘어 결국 객체 설계를 포기하게 된다.

JPA는 참조로 연관을 다루게 하고 지연 로딩으로 실제 사용 시점에 조회해 탐색을 신뢰할 수 있게 만든다. 기본은 모든 연관을 지연 로딩으로 두고, 성능이 필요한 use case만 fetch join이나 entity graph로 조회 계획을 바꾼다([[JPA-Loading-and-Cascade|JPA 로딩과 생명주기 전파]]). 같은 persistence context 안에서 같은 entity 조회는 동일성을 보장하고, 변경 감지가 수정용 UPDATE 호출을 없애며, SQL은 commit 시점에 모아 보낸다([[JPA-Persistence-Context|JPA 영속성 컨텍스트]]). 지연 로딩도 persistence context 밖에서는 실패하므로 신뢰할 수 있는 범위는 그 context 안이다.

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

## Dialect와 표준 속성, 구현체 속성

JPA는 특정 DB에 종속되지 않게 설계됐지만 DB마다 SQL 문법과 함수가 다르다. 가변 문자열 type(MySQL과 H2는 `varchar`, Oracle은 `varchar2`), paging(`LIMIT`과 `OFFSET`, Oracle의 `ROWNUM` 계열)과 함수를 DB별 SQL로 번역하는 계층이 dialect다. DDL 자동 생성 결과, `setFirstResult`와 `setMaxResults`의 paging SQL, JPQL 함수 번역이 dialect에 따라 달라진다. JPQL 코드는 DB를 바꿔도 그대로지만 생성 SQL과 실행 계획은 DB별로 검증한다.

- Hibernate 6부터 `hibernate.dialect`를 지정할 필요가 없다. JDBC metadata로 DB와 version을 읽어 dialect를 고른다. Hibernate core의 `org.hibernate.dialect` package에 있는 dialect를 지정하면 WARN `HHH90000025`(`... does not need to be specified explicitly using 'hibernate.dialect'`)가 남는다. 직접 만들거나 third-party인 dialect일 때만 지정한다.
- 기동 때 DB에 접근할 수 없으면 `hibernate.boot.allow_jdbc_metadata_access=false`와 `jakarta.persistence.database-product-name`, `jakarta.persistence.database-major-version`으로 DB를 알려 준다. Hibernate가 직접 지원하지 않는 DB의 dialect는 `hibernate-community-dialects`에 있다.
- DB 고유 함수를 JPQL에서 쓰려면 provider에 함수를 등록한다. Hibernate 5의 `Dialect` 상속과 `registerFunction` 방식은 현재 Hibernate에 없고 `FunctionContributor`로 등록한다([[Querydsl-Joins-Subqueries-and-Functions]]).
- `jakarta.persistence.*`(과거 `javax.persistence.*`)로 시작하는 속성은 표준이라 구현체를 바꿔도 의미가 유지된다. `hibernate.dialect`, `hibernate.show_sql`처럼 `hibernate.*`로 시작하는 속성은 Hibernate 전용이라 다른 구현체에서는 동작하지 않는다.

## 강의 설정을 현재 코드로 읽는 법

강의의 초기 실습은 Maven, H2, `persistence.xml`, `javax.persistence-api`, 구형 `hibernate-entitymanager`를 사용한다. 이는 해당 버전의 재현 자료다. 현재 Hibernate는 `org.hibernate.orm:hibernate-core`, 현재 표준 API는 `jakarta.persistence-api`를 사용한다. Spring Boot 프로젝트라면 dependency version을 개별 고정하기보다 지원되는 Boot dependency set과 starter를 기준으로 맞춘다.

Spring Boot 4.1에서 `spring-boot-starter-data-jpa`는 Hibernate, Spring Data JPA와 Spring ORM을 함께 제공하고 HikariCP를 기본 우선순위의 connection pool로 선택한다. H2 같은 embedded DB는 학습과 빠른 test에 유용하지만 강의의 구버전을 고정하지 말고 Boot가 관리하는 호환 dependency를 사용한다. H2 console과 `ddl-auto=create` 계열은 개발 전용으로 제한하고 운영 schema는 versioned migration으로 관리한다. SQL parameter logging은 개인정보와 credential을 노출할 수 있으므로 환경별 masking과 접근 통제가 필요하다.

강의의 SQL 관찰 설정도 version에 맞춰 읽는다.

- `hibernate.show_sql`(Spring Boot `spring.jpa.show-sql`)은 SQL을 console(`System.out`)에 직접 찍고, `org.hibernate.SQL` logger를 DEBUG로 켜면 logging framework를 거친다. level, appender와 masking 정책을 적용하려면 logger 방식을 쓴다. `hibernate.format_sql`은 두 방식 모두의 줄바꿈 formatting이다.
- bind parameter 값의 logger는 Hibernate 5의 `org.hibernate.type`(TRACE)에서 Hibernate 6부터 `org.hibernate.orm.jdbc.bind`(TRACE)로 바뀌었다. Hibernate 7.4.11에서 `org.hibernate.type=TRACE`만 켜면 값이 나오지 않았고 `org.hibernate.orm.jdbc.bind=TRACE`에서 `binding parameter (1:VARCHAR) <- [...]`가 나왔다. Spring Boot 2 시절 설정을 그대로 옮기면 SQL의 `?` 값이 보이지 않는다.
- 값이 바인딩된 SQL과 실행 시간을 보려면 p6spy나 datasource-proxy 같은 JDBC proxy를 쓴다. `p6spy-spring-boot-starter`는 Spring Boot 3.x에 1.12.1, 4.x에 2.x(현재 2.0.1)를 맞추고 `decorator.datasource.enabled=false`로 환경별로 끌 수 있다. 개발 단계의 관찰 도구이며 운영에 켜려면 overhead를 측정하고 민감 값 노출을 통제한다.

`META-INF/persistence.xml`과 `Persistence.createEntityManagerFactory()`를 쓰는 Java SE bootstrap은 지금도 표준이다. 반면 Spring 애플리케이션은 보통 container가 `EntityManagerFactory`, transaction-bound `EntityManager`와 lifecycle을 관리한다. 둘을 같은 코드 예제로 섞지 않는다.

```java
try (EntityManagerFactory emf = Persistence.createEntityManagerFactory("app")) {
  EntityManager em = emf.createEntityManager();
  EntityTransaction tx = em.getTransaction();
  try {
    tx.begin();
    // unit of work
    tx.commit();
  } catch (RuntimeException e) {
    if (tx.isActive()) {
      tx.rollback();
    }
    throw e;
  } finally {
    em.close();
  }
}
```

Commit 전에 예외가 나면 rollback 경로가 필요하다. 명세상 활성 transaction에 참여한 `EntityManager`를 `close()`해도 persistence context는 transaction이 끝날 때까지 managed로 남으므로 close만으로 transaction이 정리된다고 기대하지 않는다. 예외를 삼키지 말고 rollback 뒤 다시 던진다. Jakarta Persistence 3.2부터는 `emf.runInTransaction(em -> { ... })`과 `callInTransaction`이 정상 반환이면 commit, 예외면 rollback 뒤 다시 던지고, 끝나면 `EntityManager`까지 닫는다. 명세도 직접 `createEntityManager()`로 정리를 책임지는 방식보다 이 method를 더 안전하다고 안내한다.

`EntityManagerFactory`는 애플리케이션 기동 때 persistence unit(보통 DB)마다 하나 만들어 공유하는 factory다. `EntityManager`는 요청이나 transaction 단위로 만들어 쓰고 반드시 닫으며, 그 persistence context는 동시 실행 thread 사이에 공유하면 안 된다. Spring의 일반적인 persistence context 범위는 transaction이지 HTTP request 자체가 아니다. OSIV는 이 범위를 web response까지 늘리는 별도 선택이다.

## Spring repository 경계

Spring이 주입하는 shared `EntityManager` proxy는 현재 transaction에 연결된 실제 context로 작업을 위임한다. 변경을 flush해 DB에 반영하는 작업에는 transaction이 필요하다. Read도 repeatable한 unit of work와 lazy loading 경계를 명확히 하려면 service의 read transaction 안에서 수행한다.

`@Repository`는 component 역할을 표시하고 eligible persistence exception translation의 대상이 된다. 적절한 post-processor가 있을 때 JPA provider exception을 Spring `DataAccessException` 계층으로 변환하며 원래 cause는 보존한다. Annotation만 붙였다고 모든 임의 exception이 자동 변환되는 것은 아니다.

- 변환이 필요한 이유: `EntityManager`는 순수 JPA라 Spring 예외를 모른다. 명세상 provider는 `PersistenceException` 계열뿐 아니라 `IllegalArgumentException`과 `IllegalStateException`도 던지므로, 그대로 service까지 올라오면 service가 JPA 기술에 묶인다.
- 동작 원리: Spring Boot가 `PersistenceExceptionTranslationPostProcessor`를 등록하고(`spring.persistence.exceptiontranslation.enabled`, 기본 `true`, Boot 3.x까지 이름은 `spring.dao.exceptiontranslation.enabled`) `@Repository` bean을 proxy로 감싼다. Proxy는 `EntityManagerFactory` bean에 변환을 맡기고, 그 bean은 JPA dialect의 변환기를 쓴다. `@Repository`를 뗀 JPA repository에서 JPQL 문법 오류를 내면 `IllegalArgumentException`이 그대로 나오고, 붙이면 `InvalidDataAccessApiUsageException`으로 바뀐다. Repository의 `getClass()`를 찍으면 CGLIB 생성 class가 보인다.
- 대표 변환(Spring Framework 7.0.9 `EntityManagerFactoryUtils`): `IllegalStateException`, `IllegalArgumentException`, `TransactionRequiredException`은 `InvalidDataAccessApiUsageException`, `NoResultException`은 `EmptyResultDataAccessException`, `NonUniqueResultException`은 `IncorrectResultSizeDataAccessException`, `EntityNotFoundException`은 `JpaObjectRetrievalFailureException`, `LockTimeoutException`은 `CannotAcquireLockException`, `PessimisticLockException`은 `PessimisticLockingFailureException`, `OptimisticLockException`은 `JpaOptimisticLockingFailureException`, `EntityExistsException`은 `DataIntegrityViolationException`, 나머지 `PersistenceException`은 `JpaSystemException`이 된다. Hibernate를 쓰면 `HibernateException`이나 그것이 원인인 `PersistenceException`은 `HibernateExceptionTranslator`가 먼저 해석한다. 재시도 가능 여부 분류는 [[Spring-JDBC-Essentials|Spring JDBC Essentials]]의 예외 계층을 따른다.
- 기술별 차이: `JdbcTemplate`과 MyBatis-Spring은 자체적으로 변환하지만 `EntityManager`를 직접 쓰는 코드는 이 proxy가 맡는다. Querydsl은 JPQL을 만드는 builder라 변환하지 않으므로 Querydsl repository에도 `@Repository`가 필요하다. Spring Data JPA repository에는 변환이 자동으로 적용된다.
- `@Repository`가 없는 class나 `new`로 만든 repository에서는 변환되지 않는다. Service가 `DataAccessException` 하위 type으로 분기한다면 repository가 proxy를 거치는 bean인지 확인한다.

## 버전 경계 체크리스트

- import가 `javax.persistence`인지 `jakarta.persistence`인지 확인한다.
- 표준 JPQL과 Hibernate HQL 확장을 구분한다.
- Hibernate major upgrade 때 migration guide로 query, fetch, schema generation 동작을 확인한다.
- ORM major upgrade 뒤 SQL과 bind logging category, JDBC proxy starter의 호환 version을 다시 확인한다.
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
- [Jakarta Persistence 3.2 API, EntityManager](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/entitymanager)
- [Jakarta Persistence 3.2 API, EntityManagerFactory](https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/entitymanagerfactory)
- [Hibernate ORM 7.4, Introduction](https://docs.hibernate.org/orm/7.4/introduction/html_single/)
- [Hibernate ORM 7.4, Introduction, Logging the generated SQL](https://docs.hibernate.org/orm/7.4/introduction/html_single/#logging-generated-sql)
- [Hibernate ORM 5.6 User Guide, Logging](https://docs.jboss.org/hibernate/orm/5.6/userguide/html_single/Hibernate_User_Guide.html#best-practices-logging)
- [Spring Boot 4.1, Configure JPA Properties](https://docs.spring.io/spring-boot/how-to/data-access.html)
- [spring-boot-data-source-decorator README](https://github.com/gavlyukovskiy/spring-boot-data-source-decorator)
- [spring-boot-data-source-decorator 2.0.0 release](https://github.com/gavlyukovskiy/spring-boot-data-source-decorator/releases/tag/v2.0.0)
- [Hibernate ORM 7.4.11, `DeprecationLogger` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/internal/log/DeprecationLogger.java)
- [Hibernate ORM 7.4.11, `Dialect` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/dialect/Dialect.java)
- [Spring Framework 7.0.9, `EntityManagerFactoryUtils` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/EntityManagerFactoryUtils.java)
- [Spring Framework 7.0.9, `HibernateExceptionTranslator` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/hibernate/HibernateExceptionTranslator.java)
- [Spring Framework 7.0.9, `AbstractEntityManagerFactoryBean` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/AbstractEntityManagerFactoryBean.java)
- [Spring Boot 4.1.1, `PersistenceExceptionTranslationAutoConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-persistence/src/main/java/org/springframework/boot/persistence/autoconfigure/PersistenceExceptionTranslationAutoConfiguration.java)
- 강의: [강좌 소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21735), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21744)
- 강의: [SQL 중심적인 개발의 문제점](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21670), [JPA 소개](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21683)
- 강의: [Hello JPA, 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21684), [Hello JPA, 애플리케이션 개발](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21685)
- 강의: [데이터베이스 스키마 자동 생성](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21692), [페이징](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21721), [JPQL 함수](https://www.inflearn.com/courses/lecture?courseId=324109&unitId=21726)
- 김영한 강사, [JPA 시작](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114651)
- 김영한 강사, [ORM 개념 1, SQL 중심적인 개발의 문제점](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114652)
- 김영한 강사, [ORM 개념 2, JPA 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114653)
- 김영한 강사, [JPA 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114654)
- 김영한 강사, [JPA 적용 1, 개발](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114655)
- 김영한 강사, [JPA 적용 2, 리포지토리 분석](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114656)
- 김영한 강사, [JPA 적용 3, 예외 변환](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114657)
- 김영한 강사, [JPA 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114658)
- 김영한 강사, [Querydsl 적용](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114670)
- 김영한 강사, 활용 1 준비: [강좌 소개](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24769), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24315), [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=86625), [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=21871), [라이브러리 살펴보기](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24276), [View 환경 설정](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24277), [H2 데이터베이스 설치](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24278), [JPA와 DB 설정, 동작확인](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24279)

## 관련 문서

- [[JPA|JPA와 Jakarta Persistence]]
- [[Java-Spring-Stack-Migration|Java와 Spring 스택 마이그레이션]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA Essentials]]
- [[Querydsl|Querydsl JPA]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
