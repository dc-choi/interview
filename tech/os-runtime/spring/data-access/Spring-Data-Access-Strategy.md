---
tags: [spring, data-access, repository, jdbc, mybatis, jpa]
status: done
verified_at: 2026-08-04
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

## Repository와 use case 경계

Repository interface는 교체 가능성 자체보다 application이 필요한 persistence contract를 표현한다. 구현마다 pagination, locking, null 처리와 update semantics가 다른데 모든 차이를 한 interface 뒤에 숨기면 추상화가 오히려 불명확해진다.

- Service use case가 transaction boundary를 소유한다.
- Repository는 SQL, mapping과 persistence exception을 캡슐화한다.
- Command repository와 복잡한 query repository를 분리할 수 있다.
- DTO는 controller, application, persistence 각 경계의 목적에 맞게 분리한다.
- Test double로 interface contract를 확인하고 실제 DB integration test로 구현 semantics를 확인한다.

## 실용적인 조합

일반적인 JPA 조합에서는 Spring Data JPA가 공통 CRUD를 맡고 Querydsl 또는 별도 query repository가 복잡한 조회를 맡는다. 특정 bulk operation이나 vendor SQL이 더 명확하면 같은 use case 안에서 `JdbcTemplate`이나 MyBatis를 사용할 수 있다.

JPA와 직접 SQL을 같은 transaction에서 조합할 때는 persistence context의 pending change가 아직 DB에 flush되지 않았을 수 있다. 뒤따르는 JDBC query가 그 변경을 읽어야 한다면 명시적 `flush()`가 필요한지 검토한다. 반대로 직접 SQL이 JPA가 관리 중인 row를 바꾸면 persistence context가 stale 상태가 될 수 있으므로 clear, refresh 또는 경계 분리를 검토한다.

`JpaTransactionManager`는 같은 `DataSource`를 인식하는 JDBC access가 JPA transaction에 참여하도록 지원할 수 있지만, 여러 datasource, routing proxy와 custom configuration에서는 실제 resource binding을 통합 test로 확인한다.

## 설정과 profile

개발, test와 production 설정을 profile로 분리하더라도 bean graph가 같은 contract를 제공해야 한다. Memory repository는 빠른 domain test에 유용하지만 SQL constraint, transaction, mapping을 검증하지 않는다.

Spring Boot 4.1은 classpath와 bean 조건에 따라 `DataSource`, `JdbcTemplate`, JPA repository 등을 자동 구성한다. Custom bean을 제공하면 관련 자동 구성이 물러날 수 있으므로 startup condition report와 context test로 실제 구성을 확인한다. 운영 schema는 ORM 자동 update가 아니라 versioned migration으로 관리한다.

## 선택 절차

1. Use case별 command와 query shape, transaction 경계를 적는다.
2. FK, unique, check와 index 같은 DB contract를 먼저 정한다.
3. 가장 단순하게 contract를 표현하는 접근 기술을 고른다.
4. 생성 SQL, bind, row 수와 실행 계획을 관찰한다.
5. 다른 기술을 추가할 때 transaction 참여와 exception contract를 검증한다.
6. 실제 DB integration test와 migration test를 CI에 둔다.

## 강의 접근 기록

Curriculum의 lecture type 88개를 조회했고 86개 본문을 확인했다. 다음 resource unit 두 개는 재시도에서도 본문을 반환하지 않았다.

- 김영한 강사, [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114613): `No content found for courseId=328990, unitId=114613`
- 김영한 강사, [PPT 자료](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114721): `No content found for courseId=328990, unitId=114721`

구체적인 dependency와 설정은 추정하지 않고 현재 공식 문서로 보강했다. Quiz 11개는 lecture 본문 수집 대상이 아니다.

## 출처

- [Spring Framework, Data Access with JDBC](https://docs.spring.io/spring-framework/reference/data-access/jdbc.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [MyBatis Spring Boot Starter 4.0](https://mybatis.org/spring-boot-starter/mybatis-spring-boot-autoconfigure/)
- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/)
- [Spring Data JPA 4.1](https://docs.spring.io/spring-data/jpa/reference/)
- [Spring Data JPA 4.1, Querydsl extension](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114612)
- 김영한 강사, [수업 자료](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114599)
- 김영한 강사, [데이터 접근 기술 진행 방식 소개](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114615)
- 김영한 강사, [프로젝트 설정과 메모리 저장소](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114616)
- 김영한 강사, [프로젝트 구조 설명 1, 기본](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114617)
- 김영한 강사, [프로젝트 구조 설명 2, 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114618)
- 김영한 강사, [프로젝트 구조 설명 3, 테스트](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114619)
- 김영한 강사, [데이터베이스 테이블 생성](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114620)
- 김영한 강사, [데이터 접근 기술 시작 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114621)
- 김영한 강사, [스프링 데이터 JPA 예제와 트레이드오프](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114673)
- 김영한 강사, [실용적인 구조](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114674)
- 김영한 강사, [다양한 데이터 접근 기술 조합](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114675)
- 김영한 강사, [활용 방안 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114676)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114709)
- 김영한 강사, 활용 1 repository와 service: [회원 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24289), [회원 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24290), [상품 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24294), [상품 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24295), [주문 리포지토리 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24298)

## 관련 문서

- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[MyBatis-Spring-Essentials|MyBatis와 Spring]]
- [[JPA|JPA와 Jakarta Persistence]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA]]
- [[Querydsl|Querydsl JPA]]
- [[Spring-Transactional|Spring transaction]]
- [[Transactional-Test-Antipattern|Spring database integration test]]
