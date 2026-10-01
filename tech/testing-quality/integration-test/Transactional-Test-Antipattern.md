---
tags: [testing, transactional, spring, jpa, jdbc, integration-test]
status: done
verified_at: 2026-09-30
category: "테스트&품질(Testing&Quality)"
aliases: ["Transactional Test Antipattern", "테스트 @Transactional 안티패턴", "테스트 데이터 롤백"]
---

# Spring database 통합 테스트와 transaction 격리

Spring TestContext의 test-managed transaction은 각 test 뒤에 data를 rollback해 빠른 격리를 제공한다. 이것은 유용한 도구지만 production transaction 경계, commit 시점과 thread가 달라지는 시나리오까지 검증하지는 않는다. Test 목적에 따라 rollback 격리와 실제 commit 검증을 나눈다.

## Test-managed transaction

Test class 또는 method에 Spring `@Transactional`을 붙이면 `TransactionalTestExecutionListener`가 test 실행 전 transaction을 시작하고 기본적으로 test 완료 뒤 rollback한다. Application의 `REQUIRED`와 `SUPPORTS` transaction은 대개 이 transaction에 참여한다.

```java
@SpringBootTest
@Transactional
class ItemRepositoryTest {
    @Test
    void savesItem() {
        repository.save(new Item("book"));
        assertThat(repository.count()).isEqualTo(1);
    }
}
```

같은 transaction-bound `DataSource`를 쓰는 `JdbcTemplate`과 MyBatis 호출도 rollback 대상에 참여할 수 있다. ORM이 아니라서 rollback되지 않는다는 설명은 정확하지 않다. 다른 `DataSource`, 새 thread, independent transaction을 쓰면 경계가 달라진다.

Test의 `@Transactional`은 아래 수동 구현을 자동화한 것이다. Transaction manager가 시작한 connection을 `TransactionSynchronizationManager`가 현재 thread에 묶고, `JdbcTemplate`과 `SimpleJdbcInsert`가 그 connection을 꺼내 쓰므로 repository의 쓰기가 test transaction에 들어간다. 같은 transaction 안에서는 commit 전 데이터도 조회되므로 저장 후 검증에는 문제가 없다.

```java
@Autowired PlatformTransactionManager transactionManager;
TransactionStatus status;

@BeforeEach
void beginTransaction() {
    status = transactionManager.getTransaction(new DefaultTransactionDefinition());
}

@AfterEach
void rollbackTransaction() {
    transactionManager.rollback(status);
}
```

## 지원 범위

TestContext의 `@Transactional` attribute는 production interceptor와 완전히 같지 않다.

- `value`와 `transactionManager`는 manager 선택에 사용할 수 있다.
- `propagation`은 test 실행 여부를 위한 `NOT_SUPPORTED`, `NEVER`만 특별히 지원한다.
- `isolation`, `timeout`, `readOnly`, exception rollback rule은 test-managed transaction 설정으로 지원되지 않는다.
- Commit 또는 rollback을 programmatic하게 바꾸려면 `TestTransaction`을 사용한다.
- `@Commit`과 `@Rollback(false)`는 test transaction을 commit하게 한다.

Method-level `@BeforeEach`와 `@AfterEach` code는 test-managed transaction 안에서 실행되지만 lifecycle method 자체에 `@Transactional`을 붙이는 방식은 지원되지 않는다. `@BeforeAll`과 `@AfterAll`은 그 transaction 밖이다.

## 잘 맞는 test

- Repository mapping, query와 constraint를 빠르게 반복 검증한다.
- Test가 같은 thread와 같은 transaction manager에서 실행된다.
- Commit callback, propagation과 external resource가 검증 대상이 아니다.
- Rollback 뒤 sequence 값까지 원상 복구될 필요가 없다.

JPA test는 `persist`나 dirty checking만 확인하고 끝내면 SQL이 flush되지 않아 constraint 오류를 놓칠 수 있다. `EntityManager.flush()` 후 필요하면 `clear()`하고 다시 조회해 DB round trip과 mapping을 검증한다.

## 다른 전략이 필요한 test

| 검증 대상 | 권장 격리 방식 |
|---|---|
| Commit-time constraint와 transaction callback | 실제 commit 후 cleanup |
| `REQUIRES_NEW`, rollback-only, outbox | Production과 같은 service transaction, schema reset |
| Async, scheduler, 다른 thread | 명시적 cleanup 또는 격리 DB |
| 여러 datasource와 broker | Resource별 reset, Testcontainers |
| Migration과 운영 DB dialect | 운영과 같은 engine에 migration 적용 |

`REQUIRES_NEW`는 test-managed transaction과 독립적으로 commit할 수 있다. Preemptive timeout이 test body를 다른 thread에서 실행하면 thread-bound transaction 밖의 변경이 commit될 수 있다. JUnit Jupiter의 `assertTimeoutPreemptively` 같은 API와 rollback test를 함께 쓸 때 특히 주의한다.

## Test database 선택

### 별도 shared database

Local 개발 DB와 test DB의 URL, credential과 schema를 분리한다. Test가 운영이나 개발 data를 지우지 않도록 least privilege와 profile guard를 둔다. Parallel test에서는 schema 또는 database namespace까지 격리한다.

### Embedded database

Spring Boot는 compatible embedded DB가 classpath에 있고 별도 URL이 없으면 test용 `DataSource`를 자동 구성할 수 있다. H2 memory mode는 빠르지만 production DB의 SQL, isolation, lock, collation과 constraint timing이 다를 수 있다. Repository contract의 일부는 실제 engine test로 보완한다.

- **Context별 DB 이름**: Spring Boot 2.3부터 자동 구성 embedded `DataSource`는 기동 때 UUID 이름을 만들어 ApplicationContext마다 별도 in-memory DB를 쓴다. `spring.datasource.generate-unique-name`의 기본값이 이미 `true`다(Boot 4.1.1 `DataSourceProperties` 소스 기준). Boot reference의 SQL Databases 절에는 이 값을 `true`로 설정하라는 NOTE가 남아 있지만 켤 필요가 없다.
- **여러 test class가 같은 DB를 보는 경우**: TestContext cache가 같은 context를 재사용할 때가 하나다. 그래서 rollback이나 cleanup은 여전히 필요하다. `spring.datasource.url=jdbc:h2:mem:testdb`처럼 URL을 고정했거나 `generate-unique-name=false`로 껐을 때가 다른 하나다(이름을 주지 않으면 `testdb`). 공유가 필요하면 후자를 의도적으로 고른다. 이 기본값 때문에 H2 console 접속 URL도 더 이상 `jdbc:h2:mem:testdb`가 아니다.
- **In-memory DB 수명**: H2 in-memory DB는 기본적으로 마지막 connection이 닫히면 내용과 함께 사라진다. Pooling 없는 `DriverManagerDataSource`처럼 작업마다 connection을 열고 닫으면 statement 사이에 table과 data가 사라진다. URL에 `DB_CLOSE_DELAY=-1`을 붙이면 JVM이 살아 있는 동안 유지된다. Boot가 자동 구성하는 H2 URL은 이미 `jdbc:h2:mem:<이름>;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`이고, embedded URL을 직접 설정하면 Boot 문서대로 자동 종료를 끈다(H2는 `DB_CLOSE_ON_EXIT=FALSE`).
- **빈 DB와 schema script**: 새 in-memory DB에는 table이 없다. Boot는 기동 때 classpath의 `schema.sql`, `data.sql`을 실행하는데, `spring.sql.init.mode` 기본값이 `embedded`라 embedded DB에서만 자동 실행되고 외부 DB에는 `always`가 필요하다. Flyway나 Liquibase와 이 script를 함께 쓰는 방식은 권장되지 않고 지원 제거가 예고됐다.
- **수동 DataSource 없이 전환**: Test 쪽 `application.properties`에서 `spring.datasource.url`, username, password를 지우면 Boot가 embedded `DataSource`를 만든다. Test classpath에서 `src/test/resources`의 같은 이름 파일이 main 파일을 가리므로 test에서만 바뀐다. H2가 test classpath에 있어야 한다.

Schema는 `schema.sql` 편의 기능보다 production migration을 같은 순서로 적용하는 방식이 drift를 줄인다.

### Ephemeral production-like database

Testcontainers 등으로 실제 engine version을 띄우고 migration을 적용한다. Startup 비용은 container reuse, image cache와 test suite 단위 lifecycle로 줄일 수 있지만 test 간 data reset은 별도로 필요하다.

## Cleanup 전략

| 방식 | 장점 | 주의점 |
|---|---|---|
| Transaction rollback | 빠르고 단순 | Commit과 독립 transaction을 가릴 수 있음 |
| `deleteAll` | API만으로 명시적 | FK 순서, 누락, callback 비용 |
| `TRUNCATE` 또는 schema reset | ORM 밖 변경도 정리 | DB별 syntax, privilege, sequence와 parallelism |
| Database 또는 schema 재생성 | 가장 강한 격리 | Startup과 migration 비용 |

`TRUNCATE` target을 metadata에서 만들 때도 identifier를 사용자 입력과 섞지 않고 test 전용 schema allowlist를 둔다. Cleanup 실패를 삼키지 말고 다음 test를 중단해 오염을 드러낸다.

- **삭제 cleanup이 남기는 찌꺼기**: `@AfterEach`의 `DELETE`는 cleanup 지점에 도달해야 실행된다. 디버깅 중 강제 종료, CI timeout, JVM crash처럼 process가 먼저 끝나면 이미 commit된 row가 남아 다음 실행과 다른 test를 오염시킨다. Rollback 방식은 test의 쓰기를 끝까지 commit하지 않으므로 중간에 process가 죽어도 DB에 반영되지 않는다. 대신 위 표의 한계(commit 시점 제약, `REQUIRES_NEW`, 다른 thread의 쓰기를 가림)는 그대로다.
- **파괴적 cleanup을 운영 계약에 올리지 않는다**: 저장소 전체를 비우는 `clearStore()` 같은 method는 repository interface에 두지 않는다. Memory 구현을 쓰는 test에서만 구현 타입으로 호출하고, 실제 DB 구현은 rollback이나 test 전용 cleanup으로 정리한다.

## 설계 원칙

- Rollback test와 production transaction behavior test를 별도 suite로 둔다.
- Repository test에서는 flush, clear와 직접 DB assertion으로 persistence context 착시를 줄인다.
- Service test에서는 실제 public use-case entry point를 호출한다.
- Test 전용 profile이 production credential을 참조하지 않는지 startup에서 검증한다.
- Migration, seed와 cleanup은 반복 실행 가능하게 만든다.
- DB engine 차이를 의도적으로 허용한 범위와 실제 engine 검증 범위를 문서화한다.

## 출처

- [Spring Framework 7.0, TestContext Transaction Management](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html)
- [Spring Framework 7.0, `@Rollback`](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-rollback.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Spring Boot 4.1, Database Initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Boot 4.1, Testing](https://docs.spring.io/spring-boot/reference/testing/index.html)
- [Spring Boot 2.3 Release Notes — Spring Boot GitHub Wiki](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.3-Release-Notes)
- [DataSourceProperties.java v4.1.1 — Spring Boot GitHub](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-jdbc/src/main/java/org/springframework/boot/jdbc/autoconfigure/DataSourceProperties.java)
- [EmbeddedDatabaseConnection.java v4.1.1 — Spring Boot GitHub](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-jdbc/src/main/java/org/springframework/boot/jdbc/EmbeddedDatabaseConnection.java)
- [H2 Database, Features (In-Memory Databases)](https://h2database.com/html/features.html#in_memory_databases)
- 김영한 강사, [프로젝트 구조 설명3, 테스트](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114619)
- 김영한 강사, [테스트, 데이터베이스 연동](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114634)
- 김영한 강사, [테스트, 데이터베이스 분리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114635)
- 김영한 강사, [테스트, 데이터 롤백](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114636)
- 김영한 강사, [테스트, `@Transactional`](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114637)
- 김영한 강사, [테스트, 임베디드 모드 DB](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114638)
- 김영한 강사, [테스트, 스프링 부트와 임베디드 모드](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114639)
- 김영한 강사, [테스트 정리](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114640)
- 김영한 강사, 활용 1: [회원 기능 테스트](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24291), [주문 기능 테스트](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24300)

## 관련 문서

- [[Integration-Test-Environment|통합 테스트 환경]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Spring-Transactional|Spring transaction]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Test-Isolation|Test isolation]]
