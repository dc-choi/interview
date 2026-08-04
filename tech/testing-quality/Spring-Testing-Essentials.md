---
tags: [spring, testing, junit, integration-test, transactional-test]
status: done
verified_at: 2026-08-04
category: "테스트&품질(Testing&Quality)"
aliases: ["Spring Testing Essentials", "Spring 단위 테스트와 통합 테스트"]
---

# Spring Testing Essentials

Spring test의 첫 선택은 annotation이 아니라 검증할 경계다. 업무 객체의 규칙은 container 없이 빠르게 검증하고, wiring, proxy, persistence처럼 framework가 만드는 동작만 필요한 크기의 Spring context로 확인한다.

## 테스트 경계를 먼저 고른다

| 검증 대상 | 권장 시작점 | 검증하지 않는 것 |
|---|---|---|
| service의 업무 규칙 | 객체 직접 생성 + fake repository | Spring Bean graph, 실제 SQL |
| repository 계약 | 구현체별 contract test | 전체 HTTP pipeline |
| Spring wiring과 DB 연동 | `@SpringBootTest`, `@JdbcTest`, `@DataJpaTest` 중 필요한 범위 | 실제 client와 network, 별도 server thread |
| 실제 HTTP 요청 경로 | server를 띄운 test + HTTP client | 외부 의존성의 운영 상태 |

Spring IoC는 POJO를 직접 생성할 수 있게 설계되어 있다. constructor로 의존성을 드러내면 회원 service test는 Spring 없이 memory fake를 주입해 정상 등록, 중복 거절과 조회 규칙을 확인할 수 있다. 단위 test가 container를 필요로 한다면 업무 코드가 framework lookup이나 static state에 묶였는지 먼저 살핀다.

`@SpringBootTest`는 `SpringApplication`을 통해 application context를 만든다. 기본 `webEnvironment=MOCK`는 실제 server를 열지 않으므로, port를 통한 client/server 경계를 검증하려면 `RANDOM_PORT`나 `DEFINED_PORT`를 의도적으로 선택한다.

## 독립성과 읽기 쉬운 시나리오

- 각 test는 순서와 이전 test의 결과에 의존하지 않는다.
- in-memory repository라면 `@AfterEach` cleanup이나 test마다 새 instance를 사용한다.
- 실제 DB라면 unique fixture, 명시적 cleanup 또는 격리된 DB를 선택한다.
- 성공 경로만 보지 말고 중복 입력 같은 예외와 실패 후 상태도 함께 검증한다.
- Given-When-Then은 준비, 실행, 검증을 읽기 쉽게 나누는 표기법이다. 이 주석만 썼다고 BDD가 되는 것은 아니다.

repository를 memory, JDBC, JPA 구현으로 교체할 수 있다고 주장하려면 `save`, `findById`, `findByName`, `findAll`의 공통 행동 계약을 같은 test suite로 검증한다. DB 구현에는 unique constraint, transaction과 실제 mapping에 관한 구현별 test를 추가한다.

## test-managed transaction의 범위

Spring TestContext의 test-managed transaction은 기본적으로 test 종료 후 rollback할 수 있다. DB cleanup이 쉬워지지만 다음 경계를 감추면 안 된다.

1. JPA test는 assertion 전에 `flush()`가 필요할 수 있다. 쓰기 지연 상태만 보고 끝내면 constraint 위반이나 잘못된 SQL을 놓치는 false positive가 생긴다.
2. `RANDOM_PORT`나 `DEFINED_PORT`의 HTTP server는 client test와 별도 thread, 별도 transaction에서 실행된다. test method의 rollback이 server가 commit한 데이터를 되돌리지 않는다.
3. commit 시점의 constraint, trigger, outbox와 after-commit callback을 검증하려면 실제 commit 경로가 필요하다.
4. rollback test만 통과했다고 migration, isolation level과 운영 DB dialect 호환성이 증명되는 것은 아니다.

따라서 transaction rollback은 cleanup 도구 중 하나다. 검증 목표가 commit 경계라면 명시적 cleanup, disposable database나 Testcontainers 같은 격리를 사용한다.

## NestJS와 TypeORM으로 옮길 때

| Spring | NestJS/TypeORM | 판단 기준 |
|---|---|---|
| 객체 직접 생성 | class 직접 생성 + Jest fake | 순수 업무 규칙 |
| Spring context test | Nest `TestingModule` | provider token과 module wiring |
| 실제 server test | `createNestApplication()` + HTTP client | guard, pipe, interceptor를 포함한 request path |
| test-managed transaction | TypeORM transaction callback 또는 `QueryRunner` harness | 같은 connection과 manager에 참여하는지 확인 |

TypeORM transaction callback 안에서는 전달받은 transactional manager만 사용한다. global repository나 manager를 섞으면 다른 connection으로 빠질 수 있다. `QueryRunner`는 단일 connection의 transaction을 명시적으로 시작, commit, rollback하고 반드시 release해야 한다.

실제 HTTP server가 repository를 자체 pool에서 얻는다면 test process의 transaction rollback으로 server write를 격리할 수 없다. Spring의 별도 server thread와 같은 경계다. 이때는 request별 transaction propagation을 별도로 구현했다고 가정하지 말고, disposable DB나 명시적 cleanup을 기본으로 검토한다.

## 점검 질문

- 이 test가 검증하려는 경계 때문에 정말 container가 필요한가?
- fake와 실제 repository가 같은 행동 계약을 지키는가?
- rollback 때문에 flush, commit 또는 별도 thread의 동작을 놓치지 않는가?
- test data가 실행 순서와 공유 DB 상태에 독립적인가?
- NestJS test가 provider wiring과 실제 HTTP pipeline을 구분하는가?

## 출처

- [Spring Framework 7.0, Testing](https://docs.spring.io/spring-framework/reference/testing.html)
- [Spring Framework, Test-managed Transactions](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html)
- [Spring Framework, `@Rollback`](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-rollback.html)
- [Spring Boot 4.1, Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- [NestJS, Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM, Transactions](https://typeorm.io/docs/advanced-topics/transactions/)
- 김영한 강사, [회원 repository test case 작성](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49582)
- 김영한 강사, [회원 service test](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49584)
- 김영한 강사, [Spring integration test](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49595)

## 관련 문서

- [[TDD-BDD|TDD와 BDD]]
- [[Test-Isolation|Test isolation]]
- [[Integration-Test-Environment|통합 테스트 환경]]
- [[NestJS-Testing|NestJS Testing]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
