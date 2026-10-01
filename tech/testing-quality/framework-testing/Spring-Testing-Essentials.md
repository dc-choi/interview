---
tags: [spring, testing, junit, integration-test, transactional-test]
status: done
verified_at: 2026-09-30
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
- SUT가 의존성을 내부에서 `new`하거나 공유 상태로 얻으면 test가 준비, 정리, 검증에 쓰는 fake와 SUT가 실제로 쓰는 객체가 달라질 수 있다. 그때 통과는 SUT 동작을 증명하지 못한다. Test마다 fake를 만들어 constructor로 넘기고 같은 reference로 준비와 검증을 한다.
- 결과가 있다는 사실만 보지 않는다. 로그인 결과가 로그인에 쓴 회원과 같은지, 저장 결과가 repository에서 다시 조회되는지처럼 입력과 결과의 대응까지 확인한다.
- Given-When-Then은 준비, 실행, 검증을 읽기 쉽게 나누는 표기법이다. 이 주석만 썼다고 BDD가 되는 것은 아니다.

repository를 memory, JDBC, JPA 구현으로 교체할 수 있다고 주장하려면 `save`, `findById`, `findByName`, `findAll`의 공통 행동 계약을 같은 test suite로 검증한다. DB 구현에는 unique constraint, transaction과 실제 mapping에 관한 구현별 test를 추가한다.

## 포트를 대상으로 한 애플리케이션 서비스 테스트

헥사고날 구조에서는 test도 구현 class가 아니라 제공 포트(interface)를 주입받아 호출한다. 구현을 조회용과 변경용으로 나누거나 이름을 바꿔도 test를 고칠 필요가 없다.

| 단계 | 대역 | 확인하는 것 | 한계 |
|---|---|---|---|
| 순수 Java | 요구 포트를 직접 구현한 stub, 호출을 기록하는 mock. 메서드가 적은 포트는 람다나 익명 class | 업무 흐름, 메일 발송 같은 협력 호출 | 저장 뒤 id가 필요하면 `ReflectionTestUtils`로 채우는 등 준비 비용이 든다 |
| Mockito | `mock()`, `verify()` | 같은 상호작용을 간결하게 | JPA mapping 결함은 못 잡는다 |
| Spring Boot test | Spring Data JPA가 만든 repository adapter와 embedded DB | wiring, JPA mapping, 제약 조건 | SQL을 이해하는 DB여야 mapping 결함이 드러나고, 운영 engine과의 차이는 남는다 |

- 아직 구현이 없는 요구 포트(메일 발송 등)가 있으면 context 기동이 실패한다. `@TestConfiguration`의 `@Bean` 메서드로 테스트용 bean을 등록하고, 여러 test가 쓰면 top-level class로 옮겨 `@Import`로 가져온다. Top-level `@TestConfiguration`은 scan 대상이 아니라서 명시적으로 import해야 한다. 정식 adapter가 생기면 지운다. 대역 배치의 진화 경로는 [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]에 있다.
- `@SpringBootTest`, `@Transactional`, 공통 테스트 설정의 `@Import`를 합성 annotation(예: `@ApplicationServiceTest`)으로 묶으면 test class들이 같은 구성을 쓰므로 TestContext cache가 context를 재사용한다. Cache key는 설정 class, active profile, property source, `@MockitoBean` 같은 context customizer로 정해지므로 하나라도 다르면 새 context가 뜬다([[Spring-Batch-Essentials-Operations|배치 테스트의 context cache]]). Repository slice처럼 범위가 다른 test는 `@DataJpaTest` 같은 전용 annotation을 유지한다.

## test class가 Bean을 받는 방식

Test class는 다른 코드가 생성하거나 주입받는 component가 아니다. 그래서 production code가 constructor 주입을 고집하는 이유(불변 graph, container 없는 생성, 누락의 조기 발견)가 test class 자체에는 덜 중요하다. Production code는 계속 constructor 주입을 쓴다([[Spring-Core-Registration-and-Autowiring|Bean 등록과 autowiring]]).

| 방식 | 전제 | 장단점 |
|---|---|---|
| field `@Autowired` | 없음 | 가장 단순하지만 주입받을 bean이 늘면 줄 수가 크게 는다 |
| constructor 주입(final field, Lombok `@RequiredArgsConstructor`) | test constructor autowire mode `all` | 간결하다. 전역 설정을 모르면 동작 이유가 숨는다 |
| record test class | 같은 autowire 설정. JUnit 6.1 문서는 record를 test class로 지원한다고 밝힌다 | 가장 간결하지만 추가 instance field를 선언할 수 없어 짧은 test에만 맞다 |

- 매 class에 `@TestConstructor(autowireMode = ALL)`를 붙이는 대신 `src/test/resources/junit-platform.properties`에 `spring.test.constructor.autowire.mode=all`을 둘 수 있다(JUnit Platform configuration parameter). 이 설정이 없으면 test constructor는 자동으로 autowire되지 않고, constructor에 직접 붙인 `@Autowired`가 가장 우선한다.
- Record는 final이라 `@Transactional`을 붙이면 IDE가 proxy를 만들 수 없다고 경고할 수 있다. Test-managed transaction은 test class proxy가 아니라 `TransactionalTestExecutionListener`가 관리하므로 무시해도 된다.

## API 테스트

Controller method를 직접 호출하면 `@PostMapping` 같은 MVC mapping, 변환과 검증을 확인하지 못한다. Tomcat 없이 Spring container 안에서 실제 호출과 같은 경로를 태우는 MockMvc를 쓴다.

- Spring Framework 6.2부터 있는 `MockMvcTester`는 AssertJ와 통합돼 상태와 JSON path(`bodyJson().extractingPath(...)`, `hasPathSatisfying(...)`)를 fluent API로 검증한다. Spring Boot는 `@AutoConfigureMockMvc`를 붙이면 AssertJ가 있을 때 `MockMvcTester`도 자동 구성한다.
- Web slice에서 제공 포트 mock을 준비하는 부담이 크면 `@SpringBootTest`, `@AutoConfigureMockMvc`, `@Transactional`로 controller부터 DB까지 통과시키고 응답 뒤 저장 상태까지 조회한다. 기본 MOCK 환경은 embedded server를 띄우지 않아, 아래 test-managed transaction 절에서 다루는 별도 server thread 문제가 없다.
- 기본은 domain test다. API test는 요청이 들어와 모든 작업을 수행하고 바르게 응답하는지에 초점을 두고, 중복 이메일의 `ProblemDetail` 응답이나 `@Valid` 실패의 400 같은 핵심 실패 경로와 예외 mapping마다 web test를 둔다([[Spring-Exception-Handling|Spring 예외 처리]]).

## 동시성 재현 테스트

재고 100개에서 1개를 줄이는 단건 test는 통과해도 100건을 동시에 보내면 최종 재고가 0이 되지 않을 수 있다. 두 thread가 같은 값을 읽고 각자 갱신하면 한쪽 갱신이 사라진다(race condition). 이런 결함은 부하 순간을 재현하고 최종 상태를 단언해야 드러난다.

- 작업 N개를 동시에 실행하고 모두 끝난 뒤 repository에서 최종 상태를 다시 조회해 단언한다. 완료를 기다리지 않고 단언하면 작업이 끝나기 전에 조회할 수 있다. `ExecutorService`와 `CountDownLatch`로 기다리는 방법과 timeout 처리는 [[First-Come-Coupon-Patterns-Failure-and-Verification|선착순 이벤트 검증]]을 따른다.
- 제출한 작업의 예외는 `Future`에 담길 뿐 test thread로 전파되지 않으므로 성공과 실패 건수를 세거나 `Future.get()`으로 확인한다.
- 작업 thread는 test-managed transaction에 참여하지 않는다. Test class에 `@Transactional`을 붙이면 `@BeforeEach`에서 넣은 준비 data가 commit되지 않아 격리 수준에 따라 작업 thread에서 보이지 않고, 작업 thread가 commit한 결과는 rollback되지 않는다. `@BeforeEach`로 준비하고 `@AfterEach`로 명시적으로 지운다.
- 같은 test 하나로 `synchronized`, DB lock, Redis 분산 lock 같은 해결책을 비교 검증한다([[Lock|Lock]], [[Redis-Atomic-Operations|Redis 원자 연산]]). 한 번 통과했다고 race가 없다는 증명은 아니다([[Deterministic-Test|결정적 테스트]]). 총량과 1인 1회처럼 불변식을 나눠 증명하는 방법은 [[First-Come-Coupon-Patterns-Failure-and-Verification|선착순 이벤트 검증]]에 있다.

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
| test가 만든 fake를 constructor로 주입 | `{ provide: MEMBER_REPOSITORY, useValue: fakeRepository }`로 넘긴 같은 reference로 준비와 검증 | fixture와 SUT가 같은 객체를 쓰는지 |
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
- test가 조작하는 fake와 SUT가 쓰는 의존성이 같은 객체인가?
- 동시성 test가 작업 완료를 기다리고 작업의 예외까지 확인하는가?
- NestJS test가 provider wiring과 실제 HTTP pipeline을 구분하는가?

## 출처

- [Spring Framework 7.0, Testing](https://docs.spring.io/spring-framework/reference/testing.html)
- [Spring Framework, Test-managed Transactions](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html)
- [Spring Framework, `@Rollback`](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-rollback.html)
- [Spring Framework 7.0, `@TestConstructor`](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-junit-jupiter.html)
- [Spring Framework 7.0, Context Caching](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html)
- [Spring Framework 7.0, Meta-Annotation Support for Testing](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-meta.html)
- [Spring Framework 7.0, MockMvc AssertJ Integration](https://docs.spring.io/spring-framework/reference/testing/mockmvc/assertj.html)
- [Spring Boot 4.1, Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- [JUnit 6.1, Definitions](https://docs.junit.org/current/writing-tests/definitions.html)
- [JUnit 6.1, Configuration Parameters](https://docs.junit.org/current/running-tests/configuration-parameters.html)
- [Java SE 26, CountDownLatch](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/CountDownLatch.html)
- [Java SE 26, Future](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/Future.html)
- [NestJS, Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM, Transactions](https://typeorm.io/docs/advanced-topics/transactions/)
- 김영한 강사, [회원 repository test case 작성](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49582)
- 김영한 강사, [회원 service test](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49584)
- 김영한 강사, [Spring integration test](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49595)
- 토비 강사, [회원 애플리케이션 서비스 테스트 (1)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306030)
- 토비 강사, [회원 애플리케이션 서비스 테스트 (2)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306260)
- 토비 강사, [엔티티의 equals()와 hashCode() 구현](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312377)
- 토비 강사, [MemberApi와 웹 단위 테스트](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=314630)
- 토비 강사, [API 테스트와 ProblemDetail 예외 핸들러 개발](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=314631)
- 토비 강사, [포트의 설계](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453033)
- 토비 강사, [회원 인증 포트 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=453034)
- 토비 강사, [강사 애플리케이션 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457085)
- 토비 강사, [코드 리뷰와 수정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=457195)
- 토비 강사, [스테레오타입 애노테이션 적용](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=458883)
- 최상용 강사, [재고감소 로직작성](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174912)
- 최상용 강사, [문제점](https://www.inflearn.com/courses/lecture?courseId=328995&unitId=174913)

## 관련 문서

- [[TDD-BDD|TDD와 BDD]]
- [[Test-Isolation|Test isolation]]
- [[Integration-Test-Environment|통합 테스트 환경]]
- [[Transactional-Test-Antipattern|Spring database 통합 테스트]]
- [[Mock-Testing-Strategy|Mock 테스트 설계 전략]]
- [[Hexagonal-In-Practice|Hexagonal Architecture 실전 적용]]
- [[NestJS-Testing|NestJS Testing]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
