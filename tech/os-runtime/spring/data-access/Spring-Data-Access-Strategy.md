---
tags: [spring, data-access, repository, jdbc, mybatis, jpa]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Spring Data Access Strategy", "Spring 데이터 접근 기술 선택"]
---

# Spring 데이터 접근 기술 선택과 조합

Spring 애플리케이션의 데이터 접근 계층은 하나의 도구로 통일하는 것보다 query 성격, domain model, 팀의 SQL 통제 능력과 운영 요구에 맞춰 선택한다. 도구가 바뀌어도 use case transaction, schema constraint와 관측 가능한 SQL이라는 공통 경계는 유지한다.

## 선택 지도

| 기술 | 강점 | 비용 | 잘 맞는 문제 |
|---|---|---|---|
| `JdbcTemplate` | SQL과 실행 흐름이 직접 보이고 dependency가 작다 | 동적 SQL과 mapping code가 늘 수 있다 | 단순 CRUD, 정해진 SQL, 작은 adapter |
| MyBatis | XML dynamic SQL과 명시적 result mapping | Mapper XML과 Java contract를 함께 관리한다 | SQL 중심 시스템, 복잡한 조건 query |
| Jakarta Persistence | object graph, identity와 unit of work | fetch plan, lifecycle, generated SQL 학습이 필요하다 | aggregate 변경과 관계 중심 domain |
| Spring Data JPA | repository 반복 구현을 줄인다 | JPA 의미와 query 비용은 그대로 남는다 | 공통 CRUD와 단순 derived query |
| Querydsl JPA | generated type으로 동적 JPQL을 조립한다 | annotation processing과 generated source 관리가 필요하다 | 복잡한 동적 predicate와 projection |

SQL mapper와 ORM은 상호 배타적이지 않다. ORM으로 command model을 관리하면서 report query는 JDBC나 MyBatis로 읽을 수 있다. 다만 기술별로 다른 transaction manager나 `DataSource`를 섞으면 하나의 local transaction에 자동 참여하지 않을 수 있다.

선택에는 query 성격과 팀 역량을 함께 넣는다. `JdbcTemplate`과 MyBatis는 SQL을 직접 써야 하지만 동작이 단순해 SQL에 익숙한 팀이 빨리 적응한다. JPA와 Spring Data JPA는 반복 CRUD SQL을 없애고 Querydsl은 동적 query를 compile 시점에 검사하지만, persistence context와 생성 SQL을 익히는 학습 비용이 크다. 복잡한 통계 query 작성이 업무의 대부분(강의 예시는 70~80%)이면 MyBatis 중심 구성이 더 단순할 수 있다.

## Repository와 use case 경계

Repository interface는 교체 가능성 자체보다 application이 필요한 persistence contract를 표현한다. 구현마다 pagination, locking, null 처리와 update semantics가 다른데 모든 차이를 한 interface 뒤에 숨기면 추상화가 오히려 불명확해진다.

- Service use case가 transaction boundary를 소유한다.
- Repository는 SQL, mapping과 persistence exception을 캡슐화한다.
- Command repository와 복잡한 query repository를 분리할 수 있다.
- DTO는 controller, application, persistence 각 경계의 목적에 맞게 분리한다.
- Test double로 interface contract를 확인하고 실제 DB integration test로 구현 semantics를 확인한다.

### Spring Data JPA를 application 계약에 잇는 구성

Service가 repository interface에만 의존하면 구성 설정의 `@Bean` 하나만 바꿔 memory, JDBC, JPA 구현을 교체할 수 있다. 다형성과 DI로 얻는 OCP다. Spring Data JPA를 이 계약에 잇는 방법은 세 가지다.

| 구성 | 형태 | 장점 | 비용 |
|---|---|---|---|
| 계약 동시 상속 | `interface SpringDataJpaMemberRepository extends JpaRepository<Member, Long>, MemberRepository` | 구현 class 없이 Spring Data proxy가 application 계약을 구현한다 | 계약의 method 이름과 signature가 Spring Data 규칙에 묶인다 |
| Adapter | service -> application interface <- adapter class -> Spring Data repository | service 변경 없이 구현을 바꾸고 계약 언어를 기술과 분리한다 | 단순 위임 class와 추적 경로가 늘어난다 |
| 직접 사용 | service가 Spring Data repository와 Querydsl query repository를 직접 주입 | 구조가 단순하고 Spring Data 기능을 그대로 쓴다 | 접근 기술을 바꾸면 service 코드를 많이 고친다 |

계약 동시 상속은 계약의 `save`, `findById`, `findAll`이 `CrudRepository` signature와 맞아 `SimpleJpaRepository`로 전달되고, `findByName`은 method 이름 규칙으로 query가 만들어져서 성립한다. 규칙으로 표현할 수 없는 method가 계약에 들어오면 repository 생성이 실패하므로(기본 bootstrap mode는 기동 시점, `LAZY`는 첫 사용 시점) fragment([[Spring-Data-JPA-Custom-Repositories]])나 adapter가 필요하다. 주입 지점은 계약 타입으로 둔다. Spring Data repository 타입을 그대로 주입받으면 `deleteAll`, `flush` 같은 `JpaRepository` 전체 API가 use case에 노출되고, 기존 구현을 고르던 `@Bean`을 남겨 두면 같은 타입 후보가 둘이 된다. 상속한 CRUD method와 직접 선언한 query method의 transaction 차이는 [[Spring-Data-JPA-Repository-Abstraction]]에 있으며 use case 경계는 service가 소유한다.

추상화에는 비용이 든다. interface 자체가 유지보수 대상이고 구현을 찾아가는 시간이 들며, 어설픈 추상화는 오히려 탐색만 어렵게 만든다([[Spring-Core-Object-Design-and-Composition]]). 작은 프로젝트, prototype과 속도가 중요한 단계는 직접 사용으로 시작하고, 구현 교체나 persistence 격리 요구가 실제로 생길 때 adapter로 refactoring한다. 복잡한 조회는 별도 query repository 대신 fragment로 붙일 수도 있다. MyBatis mapper 앞의 위임 repository도 같은 기준으로 판단한다([[MyBatis-Spring-Essentials]]).

## 실용적인 조합

일반적인 JPA 조합에서는 Spring Data JPA가 공통 CRUD를 맡고 Querydsl 또는 별도 query repository가 복잡한 조회를 맡는다. 특정 bulk operation이나 vendor SQL이 더 명확하면 같은 use case 안에서 `JdbcTemplate`이나 MyBatis를 사용할 수 있다. 강의 사례의 실무 비중은 JPA 계열 대략 95%, SQL mapper 5%이며 통계 query가 많을수록 SQL mapper 비중이 올라간다.

JPA와 직접 SQL을 같은 transaction에서 조합할 때는 persistence context의 pending change가 아직 DB에 flush되지 않았을 수 있다. 뒤따르는 JDBC query가 그 변경을 읽어야 한다면 명시적 `flush()`가 필요한지 검토한다. 반대로 직접 SQL이 JPA가 관리 중인 row를 바꾸면 persistence context가 stale 상태가 될 수 있으므로 clear, refresh 또는 경계 분리를 검토한다.

`JpaTransactionManager`는 같은 `DataSource`를 인식하는 JDBC access가 JPA transaction에 참여하도록 지원할 수 있지만, 여러 datasource, routing proxy와 custom configuration에서는 실제 resource binding을 통합 test로 확인한다. Spring Boot는 JPA(Hibernate)가 classpath에 있으면 `JpaTransactionManager`를 등록하고 JDBC 전용 manager 자동 구성은 물러난다. 선택 조건은 [[Spring-Transactional]]의 자동 구성 절에 있다.

## 설정과 profile

개발, test와 production 설정을 profile로 분리하더라도 bean graph가 같은 contract를 제공해야 한다. Memory repository는 빠른 domain test에 유용하지만 SQL constraint, transaction, mapping을 검증하지 않는다.

Spring Boot 4.1은 classpath와 bean 조건에 따라 `DataSource`, `JdbcTemplate`, JPA repository 등을 자동 구성한다. Custom bean을 제공하면 관련 자동 구성이 물러날 수 있으므로 startup condition report와 context test로 실제 구성을 확인한다. 운영 schema는 ORM 자동 update가 아니라 versioned migration으로 관리한다.

## 선택 절차

1. Use case별 command와 query shape, transaction 경계를 적는다.
2. FK, unique, check와 index 같은 DB contract를 먼저 정한다.
3. 가장 단순하게 contract를 표현하는 접근 기술을 고른다.
4. 생성 SQL, bind, row 수와 실행 계획을 관찰한다(아래 SQL 관찰 설정).
5. 다른 기술을 추가할 때 transaction 참여와 exception contract를 검증한다.
6. 실제 DB integration test와 migration test를 CI에 둔다.

## SQL과 bind 값 관찰

선택 절차 4를 실행하는 logging 설정이다. Category 이름과 level은 Spring Framework 7.0.9, MyBatis 3.5와 Spring Boot 4.1.1이 관리하는 Hibernate 7.4 기준이다.

| 기술 | SQL | Bind 값과 결과 |
|---|---|---|
| `JdbcTemplate` | `logging.level.org.springframework.jdbc=debug` | `org.springframework.jdbc.core.StatementCreatorUtils`를 TRACE |
| MyBatis | mapper package나 namespace logger를 DEBUG | parameter도 DEBUG, 결과 row는 TRACE |
| Hibernate | `logging.level.org.hibernate.SQL=debug` | `org.hibernate.orm.jdbc.bind`를 TRACE |

- `org.hibernate.SQL`은 DEBUG일 때만 SQL을 남긴다. Hibernate 7.4의 bind 값은 `org.hibernate.orm.jdbc.bind` category로 나오므로 Hibernate 5 시절의 `org.hibernate.type.descriptor.sql.BasicBinder` 설정으로는 보이지 않는다.
- `spring.jpa.show-sql=true`는 `hibernate.show_sql`로 전달돼 logger가 아니라 console에 직접 쓴다. logging level, 형식과 수집 정책을 따르지 않으므로 logger 설정을 쓴다. 둘을 함께 켜면 같은 SQL이 두 번 보이지만 query가 두 번 실행된 것은 아니다.
- 결과가 큰 MyBatis query는 row까지 찍히지 않도록 TRACE 대신 DEBUG로 둔다.
- Test는 `src/test/resources`의 설정을 읽으므로 같은 logging level을 test 쪽에도 둔다.
- JPA 변경은 flush 때 SQL이 된다. test가 rollback으로 끝나면 UPDATE가 log에 나오지 않을 수 있으므로 `flush()`를 호출하거나 commit하는 test로 확인한다([[Transactional-Test-Antipattern]]).
- Bind 값과 결과 row log는 개인정보와 credential을 노출하므로 운영에서는 끄거나 대상을 제한한다. SQL 관찰 도구의 노출 주의는 [[Querydsl-Setup-and-Compatibility]]에도 있다.

## 출처

[강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114613)와 [PPT 자료](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114721)는 본문을 확인하지 못했다. 구체적인 dependency와 설정은 현재 공식 문서를 기준으로 보강했다.

- [Spring Framework, Data Access with JDBC](https://docs.spring.io/spring-framework/reference/data-access/jdbc.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [MyBatis Spring Boot Starter 4.0](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/)
- [Spring Data JPA 4.1](https://docs.spring.io/spring-data/jpa/reference/)
- [Spring Data JPA 4.1, Querydsl extension](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- [Spring Data JPA 4.1, Defining Repository Interfaces](https://docs.spring.io/spring-data/jpa/reference/repositories/definition.html)
- [Spring Data JPA 4.1, Creating Repository Instances](https://docs.spring.io/spring-data/jpa/reference/repositories/create-instances.html)
- [Spring Boot 4.1, Managed Dependency Coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html)
- [Spring Framework 7.0.9, `JdbcTemplate` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/core/JdbcTemplate.java)
- [Spring Framework 7.0.9, `StatementCreatorUtils` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-jdbc/src/main/java/org/springframework/jdbc/core/StatementCreatorUtils.java)
- [MyBatis 3, Logging](https://mybatis.org/mybatis-3/logging.html)
- [Hibernate ORM 7.4, Logging the generated SQL](https://docs.hibernate.org/orm/7.4/introduction/html_single/#logging-generated-sql)
- [Hibernate ORM 7.4.5, `SqlStatementLogger` source](https://github.com/hibernate/hibernate-orm/blob/7.4.5/hibernate-core/src/main/java/org/hibernate/engine/jdbc/spi/SqlStatementLogger.java)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114612)
- 김영한 강사, [수업 자료](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114599)
- 김영한 강사, [데이터 접근 기술 진행 방식 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114615)
- 김영한 강사, [프로젝트 설정과 메모리 저장소](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114616)
- 김영한 강사, [프로젝트 구조 설명 1, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114617)
- 김영한 강사, [프로젝트 구조 설명 2, 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114618)
- 김영한 강사, [프로젝트 구조 설명 3, 테스트](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114619)
- 김영한 강사, [데이터베이스 테이블 생성](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114620)
- 김영한 강사, [데이터 접근 기술 시작 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114621)
- 김영한 강사, [JdbcTemplate 적용 3, 구성과 실행](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114626)
- 김영한 강사, [MyBatis 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114643)
- 김영한 강사, [MyBatis 적용 2, 설정과 실행](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114645)
- 김영한 강사, [JPA 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114654)
- 김영한 강사, [JPA 적용 1, 개발](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114655)
- 김영한 강사, [스프링 데이터 JPA 적용 2](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114664)
- 김영한 강사, [스프링 데이터 JPA 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114665)
- 김영한 강사, [스프링 데이터 JPA 예제와 트레이드오프](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114673)
- 김영한 강사, [실용적인 구조](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114674)
- 김영한 강사, [다양한 데이터 접근 기술 조합](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114675)
- 김영한 강사, [활용 방안 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114676)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114709)
- 김영한 강사, [자바 코드로 직접 스프링 빈 등록하기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49587)
- 김영한 강사, [순수 JDBC](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49594)
- 김영한 강사, [JPA](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49597)
- 김영한 강사, [스프링 데이터 JPA](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49598)
- 김영한 강사, 활용 1 repository와 service: [회원 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24289), [회원 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24290), [상품 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24294), [상품 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24295), [주문 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24298)

## 관련 문서

- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[MyBatis-Spring-Essentials|MyBatis와 Spring]]
- [[JPA|JPA와 Jakarta Persistence]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA]]
- [[Querydsl|Querydsl JPA]]
- [[Spring-Transactional|Spring transaction]]
- [[Transactional-Test-Antipattern|Spring database integration test]]
