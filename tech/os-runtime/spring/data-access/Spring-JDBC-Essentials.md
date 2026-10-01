---
tags: [spring, jdbc, jdbc-template, datasource, database]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Spring JDBC Essentials", "JdbcTemplate", "Spring DataSource"]
---

# Spring JDBC Essentials

JDBC는 Java 코드가 관계형 데이터베이스와 통신하는 표준 API다. Spring JDBC는 SQL을 숨기는 ORM이 아니라, JDBC의 반복적인 resource 관리와 예외 변환을 맡고 SQL 실행 지점은 그대로 드러내는 얇은 추상화다.

## JDBC 표준 interface와 driver

JDBC 이전에는 DB마다 연결, SQL 전달과 결과 응답 방법이 달라 DB를 바꾸면 접근 코드도 다시 써야 했다. JDBC는 이 세 기능을 `Connection`, `Statement`와 `PreparedStatement`, `ResultSet` interface로 표준화하고, DB vendor는 이를 구현한 JDBC driver를 제공한다. 애플리케이션은 interface에만 의존하므로 DB를 바꿀 때 driver library를 교체한다. `JdbcTemplate`, MyBatis와 JPA도 내부적으로 JDBC를 쓰므로 connection, statement, result set 동작을 알아야 이 도구들의 문제를 추적할 수 있다.

- 표준화한 것은 접근 방법이지 SQL이 아니다. 페이징처럼 DB마다 크게 다른 SQL과 data type은 DB를 바꾸면 함께 고친다([[SQL-Fundamentals]]). JPA는 dialect로 이 차이를 상당 부분 흡수한다.
- `DriverManager.getConnection(url, ...)`은 등록된 driver에 차례로 연결을 요청한다. driver는 URL이 자기 형식(`jdbc:h2:` 등)이 아니면 `null`을 돌려 다음 driver로 넘긴다. 받아들이는 driver가 없으면 OpenJDK 구현은 SQLState `08001`의 `No suitable driver found for <url>` 예외를 던진다. 반환 타입은 `java.sql.Connection`이지만 실제 객체는 driver 구현체다(H2는 `org.h2.jdbc.JdbcConnection`).

JDBC driver를 명시적으로 `Class.forName`으로 load하던 방식은 JDBC 4의 service provider 자동 등록 이후 일반적인 애플리케이션 코드에서 필요하지 않다. 오래된 driver나 특수 classloader 환경은 예외다. Java SE 26의 `DriverManager` API도 connection 획득에는 `DataSource` 사용을 선호한다고 명시한다.

## 순수 JDBC의 책임

```text
DataSource에서 Connection 획득
  -> PreparedStatement 생성, parameter binding
  -> execute
  -> ResultSet을 domain 값으로 mapping, INSERT라면 필요한 생성 key 회수
  -> ResultSet, Statement, Connection 정리
```

- SQL 값은 문자열 연결 대신 `PreparedStatement` parameter로 전달한다. table과 column 이름처럼 parameter로 binding할 수 없는 identifier는 allowlist로 제한한다.
- `ResultSet` cursor를 읽어 행을 객체로 mapping한다.
- INSERT, UPDATE, DELETE는 `executeUpdate()`로 영향받은 행 수를, SELECT는 `executeQuery()`로 `ResultSet`을 받는다.
- DB가 id를 만드는 table이면 statement를 만들 때 `Statement.RETURN_GENERATED_KEYS`나 key column 이름을 넘기고, 실행 뒤 `getGeneratedKeys()`로 읽어 객체에 채운다. Spring API별 회수 방법은 [[Spring-JDBC-Essentials-JdbcTemplate|JdbcTemplate API 계약]]에 있다.
- 예외 경로에서도 자원을 반환해야 하므로 Spring transaction과 무관한 직접 JDBC라면 try-with-resources를 사용한다. Spring transaction이 묶어 둔 connection은 아래 Transaction 참여 절의 규칙으로 반환한다.
- transaction 안의 여러 statement는 같은 transaction-bound connection을 사용해야 한다.

## DataSource와 pool은 같은 말이 아니다

`DataSource`는 connection을 얻는 표준 계약이다. Java SE 26 API는 basic, connection pooling, distributed transaction 구현 범주를 구분한다. 구현체는 매번 물리 connection을 만들 수도 있고 pool에서 빌릴 수도 있다.

| 구현 성격 | 용도 |
|---|---|
| `DriverManagerDataSource`, `SimpleDriverDataSource` | test와 standalone 예제, pooling 없음 |
| HikariCP 같은 pooled DataSource | 운영 애플리케이션의 connection 재사용 |
| JNDI DataSource | application server가 connection과 설정 소유 |

Spring 공식 문서는 현대적인 JDBC pool로 HikariCP를 예시하고, C3P0도 전통적 선택지로 분류한다. 특정 강의 예제의 C3P0가 Spring 자체의 기본이라는 뜻은 아니다. Spring Boot JDBC/JPA starter의 일반적인 기본 pool은 HikariCP다.

pool의 크기와 timeout은 [[Connection-Pool|DB 커넥션 풀]]에서 다룬다. 애플리케이션 instance 수를 늘리면 각 process의 pool 합계도 함께 늘어난다.

`DataSource`와 `JdbcTemplate`은 애플리케이션에서 한 번 만들어 공유한다. `JdbcTemplate`은 구성 뒤 thread-safe하므로 하나의 instance를 여러 DAO에 주입해도 된다. Spring Boot는 pooled `DataSource`, `JdbcTemplate`, `NamedParameterJdbcTemplate`과 `JdbcClient`를 자동 구성하므로 보통 이를 주입받는다. DAO마다 생성자에서 pool을 직접 만들면 DAO 수만큼 독립 pool과 connection 예산이 생기고 접속 정보가 코드에 흩어진다.

## H2와 현재 Spring Boot 설정

H2는 memory repository 다음 단계에서 SQL, schema와 transaction을 확인하기 좋은 embedded DB다. 다만 특정 강의의 설치 경로, console URL과 version 조합은 영구 규칙이 아니다. 현재 Spring Boot는 classpath에 embedded DB가 있고 별도 URL이 없으면 이를 자동 구성할 수 있으며, 외부 DB는 `spring.datasource.*`로 연결 정보를 명시한다.

embedded DB도 test suite 전체에서 같은 instance가 재사용될 수 있다. context마다 분리해야 한다면 `spring.datasource.generate-unique-name=true` 같은 설정을 검토한다. 운영 DB와 dialect, constraint, lock 동작이 다르므로 H2 test만으로 운영 호환성을 증명하지 말고 실제 DB 기반 integration test와 migration 검증을 별도로 둔다.

## JdbcTemplate이 맡는 것

`JdbcTemplate`은 다음 반복을 담당한다.

- connection 획득과 framework 규칙에 맞는 반환
- statement 실행과 `ResultSet` 반복
- checked `SQLException`을 Spring `DataAccessException` 계층으로 변환
- callback을 통한 row mapping과 parameter binding
- 현재 Spring transaction이 있으면 그 transaction의 connection에 참여

`JdbcTemplate`이 SQL의 정확성, transaction boundary, N+1, index 선택이나 업무 mapping을 대신 판단하지는 않는다. SQL과 row mapper가 code review와 test의 대상이다.

조회 결과 개수(`queryForObject`의 0건 예외와 `Optional` 계약), 변경 행 수 검사, 생성 key 회수, 이름 기반 parameter, row mapping과 dynamic SQL은 [[Spring-JDBC-Essentials-JdbcTemplate|JdbcTemplate API 계약]]에서 다룬다.

## 예외 번역 경계

현재 Spring Framework에서 `JdbcTemplate`의 기본 translator는 JDBC 4 exception subclass를 먼저 해석하는 `SQLExceptionSubclassTranslator`이며 SQLState 기반 translator로 fallback한다. Vendor error code 기반 `SQLErrorCodeSQLExceptionTranslator`가 모든 환경의 기본이라고 가정하면 안 된다. Classpath root에 custom `sql-error-codes.xml`이 있거나 명시적으로 구성한 경우에는 error-code translator를 사용할 수 있다.

`DataAccessException`은 unchecked이고 persistence 기술과 무관한 공통 분류를 제공한다. Duplicate key나 resource failure처럼 caller가 구분할 가치가 있는 유형만 처리하며, 다른 exception으로 바꿀 때 원래 cause를 보존한다. `@Repository` 기반 translation은 eligible bean과 post-processor가 있을 때 적용되고, `JdbcTemplate`은 template 실행 경계에서 이미 translation한다.

`SQLException`을 unchecked 예외 하나로 감싸기만 하면 service는 JDBC에서 벗어나지만 키 중복, SQL 문법 오류와 lock 실패를 구분하지 못해 특정 오류만 복구할 수 없다. repository가 `getErrorCode()`로 vendor error code를 보고 자체 예외로 바꾸면 복구는 가능하지만, code가 DB마다 달라(H2의 키 중복은 23505) DB를 바꿀 때 변환 코드도 바뀌고 오류 유형마다 예외 class가 필요해진다. Spring 예외 계층이 이 변환을 대신한다. `new SQLErrorCodeSQLExceptionTranslator(dataSource).translate("save", sql, e)`처럼 명시적으로 쓰면 spring-jdbc에 포함된 `org/springframework/jdbc/support/sql-error-codes.xml`의 DB별 code 목록으로 `DuplicateKeyException`, `BadSqlGrammarException` 같은 하위 예외를 돌려받는다.

| 분류 (Spring Framework 7.0.9) | 대표 하위 예외 | 재시도 판단 |
|---|---|---|
| `TransientDataAccessException` | `QueryTimeoutException`, `PessimisticLockingFailureException`과 `CannotAcquireLockException`, `OptimisticLockingFailureException`, `TransientDataAccessResourceException` | 원인을 고치지 않아도 다시 시도하면 성공할 수 있다. 횟수 제한과 backoff를 둔 재시도 후보다 |
| `NonTransientDataAccessException` | `DataIntegrityViolationException`과 `DuplicateKeyException`, `BadSqlGrammarException`, `DataAccessResourceFailureException` | 입력이나 SQL을 바꾸지 않으면 같은 실패가 반복된다 |
| `RecoverableDataAccessException` | JDBC `SQLRecoverableException`의 번역 | 새 connection을 얻는 등 복구 뒤 transaction 전체를 다시 실행한다 |

- 재시도는 같은 transaction 안에서 같은 SQL을 반복한다는 뜻이 아니다. `OptimisticLockingFailureException`처럼 읽은 상태가 낡은 경우는 transaction을 새로 시작해 다시 읽는다. PostgreSQL 18은 오류가 난 transaction을 aborted 상태로 두고 `ROLLBACK`이나 `ROLLBACK TO SAVEPOINT` 전에는 다음 문장을 처리하지 않지만, MySQL 8.4 InnoDB는 duplicate-key 오류에서 그 문장만 rollback한다. 같은 transaction 안에서 예외를 잡고 SQL을 이어 가는 복구는 DB마다 결과가 다르다.
- 키 중복 뒤 새 ID로 저장하는 복구는 같은 연산의 재시도가 아니라 다른 입력으로 하는 새 연산이다. service는 `DuplicateKeyException`처럼 복구할 유형만 잡고 나머지는 공통 예외 처리 경계에서 기록한다.
- `DeadlockLoserDataAccessException`과 `CannotSerializeTransactionException`은 Spring 6.0.3부터 deprecated이므로 `PessimisticLockingFailureException`이나 `CannotAcquireLockException`으로 처리한다.
- service가 Spring 예외 계층에 의존하는 대신 DB별 오류 code 변환을 직접 유지하지 않아도 된다. 완전한 기술 독립이 필요하면 repository 경계에서 자체 예외로 다시 바꾼다.

## Transaction 참여

Spring JDBC는 내부적으로 `DataSourceUtils`를 사용해 현재 thread에 transaction-bound connection이 있으면 재사용한다. 그래서 같은 `DataSource`와 Spring transaction manager를 사용하는 `JdbcTemplate` 호출들은 한 local transaction에 참여할 수 있다.

직접 `dataSource.getConnection()`을 호출해 별도 connection을 만들면 이 경계를 벗어날 수 있다. 직접 JDBC가 필요하면 다음 중 하나로 같은 connection에 참여한다.

- `DataSourceUtils.getConnection(dataSource)`로 얻고 `DataSourceUtils.releaseConnection(con, dataSource)`로 반환한다. 현재 thread에 transaction이 묶어 둔 connection이 있으면 그것을 돌려주고, 반환 때는 transaction connection이면 닫지 않고 아니면 닫는다.
- `TransactionAwareDataSourceProxy`로 감싼 `DataSource`를 쓴다.
- `JdbcTemplate.execute(ConnectionCallback)` 안에서 connection을 받는다.

transaction이 묶어 둔 connection에 직접 `close()`를 호출하면 connection이 pool로 반환돼 같은 transaction의 이후 SQL과 commit이 실패하고, HikariCP는 반환 때 미커밋 변경을 rollback한다. 시작부터 정리까지의 순서와 propagation, proxy 함정은 [[Spring-Transactional|Spring @Transactional]]에서 다룬다.

## DAO와 Repository 경계

DAO는 SQL, parameter, row mapping과 persistence 오류를 캡슐화한다. Service는 여러 DAO 호출의 업무 transaction과 정책을 조정한다. `@Repository`는 역할을 드러낼 뿐 아니라 적절한 post-processor와 함께 persistence 예외를 Spring의 일관된 예외 계층으로 변환하는 경계가 된다.

모든 table마다 기계적으로 DAO, Service, Controller를 하나씩 만들 필요는 없다. use case와 transaction boundary를 먼저 정하고 persistence port가 숨겨야 할 변경을 기준으로 나눈다.

## TypeORM과 비교

| Spring JDBC | TypeORM/NestJS | 공통 위험 |
|---|---|---|
| `DataSource` | TypeORM `DataSource` | pool은 process별이며 전체 connection 예산 필요 |
| `JdbcTemplate` | repository, query builder, raw query | resource 관리는 줄지만 query 비용은 남음 |
| `RowMapper` | entity hydration 또는 raw result mapping | column과 domain 경계 누락 |
| Spring transaction-bound connection | transaction callback의 `transactionalEntityManager` | callback 밖 manager 사용 시 다른 connection 가능 |
| `queryForObject`(정확히 1건), `query` 결과의 `Optional` 변환 | `findOneByOrFail`(없으면 reject), `findOneBy`(없으면 `null`, 여러 건이면 첫 행) | 부재와 중복을 정상 흐름, 예외, 데이터 오류 중 무엇으로 볼지 계약 필요 |
| `update`의 영향 행 수 | `UpdateResult.affected`(driver에 따라 미지원) | 0건 변경을 성공으로 오인 |

두 생태계 모두 편의 API가 transaction의 원자성을 자동 확장하지 않는다. 하나의 DB transaction 밖에 있는 broker나 외부 API는 [[Transactional-Outbox|Outbox]]나 별도 복구 전략이 필요하다.

## 흔한 실수

- `DataSource`라면 무조건 pool이라고 생각한다.
- DAO마다 `DataSource`나 pool을 따로 만든다.
- SQL parameter를 문자열로 이어 붙여 injection과 escaping 문제를 만든다.
- pool connection의 `close`를 물리 연결 종료로 오해한다. 보통 pool로 반환하는 동작이다.
- transaction 안에서 다른 DataSource나 직접 만든 connection을 섞는다.
- 모든 `DataAccessException`을 똑같이 재시도하거나 실패한 transaction 안에서 같은 SQL을 반복한다.
- `JdbcTemplate` 사용만으로 query와 mapping test가 불필요하다고 생각한다.
- connection을 오래 잡은 채 외부 API 응답을 기다린다.

## 면접 체크포인트

- JDBC가 표준화한 것(접근 interface)과 표준화하지 않은 것(SQL 방언)을 구분한다.
- JDBC의 connection, statement, result set 책임을 순서대로 설명한다.
- `DataSource` 계약과 pooled implementation을 구분한다.
- `JdbcTemplate`이 제거하는 boilerplate와 제거하지 않는 SQL 책임을 말한다.
- `TransientDataAccessException`과 `NonTransientDataAccessException`으로 재시도 여부를 판단한다.
- transaction-bound connection을 벗어나는 코드가 왜 원자성을 깨는지 설명한다.
- ORM을 사용해도 pool과 transaction 경계 지식이 필요한 이유를 말한다.

## 출처

- [Spring Framework, JDBC Core](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)
- [Spring Framework, Controlling Database Connections](https://docs.spring.io/spring-framework/reference/data-access/jdbc/connections.html)
- [Spring Framework API, DataSourceUtils](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/datasource/DataSourceUtils.html)
- [Spring Framework API, org.springframework.dao](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/package-summary.html)
- [Spring Boot 4.1, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Java SE 26 API, JDBC module](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/module-summary.html)
- [Java SE 26 API, DriverManager](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/DriverManager.html)
- [Java SE 26 API, Driver](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/Driver.html)
- [Java SE 26 API, DataSource](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/javax/sql/DataSource.html)
- [Java SE 26 API, Connection](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/Connection.html)
- [OpenJDK 26, `DriverManager` source](https://github.com/openjdk/jdk/blob/jdk-26-ga/src/java.sql/share/classes/java/sql/DriverManager.java)
- [PostgreSQL 18, Transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html)
- [MySQL 8.4 Reference Manual, InnoDB Error Handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [HikariCP 7.0.2, `ProxyConnection` source](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.0.2/src/main/java/com/zaxxer/hikari/pool/ProxyConnection.java)
- [TypeORM, Repository APIs](https://typeorm.io/docs/working-with-entity-manager/repository-api/)
- [인프런, JDBC](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13737)
- [인프런, JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13738)
- [인프런, 커넥션 풀](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13739)
- 김영한 강사, [H2 database 설치](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49593)
- 김영한 강사, [순수 JDBC](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49594)
- 김영한 강사, [Spring JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49596)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110041)
- 김영한 강사, [수업 자료](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110053)
- 김영한 강사, [강의 소스 코드](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110470)
- 김영한 강사, [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110061)
- 김영한 강사, [H2 데이터베이스 설정](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110062)
- 김영한 강사, [JDBC 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110063)
- 김영한 강사, [JDBC와 최신 데이터 접근 기술](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110064)
- 김영한 강사, [데이터베이스 연결](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110065)
- 김영한 강사, [JDBC 개발, 등록](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110066)
- 김영한 강사, [JDBC 개발, 조회](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110067)
- 김영한 강사, [JDBC 개발, 수정과 삭제](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110068)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110069)
- 김영한 강사, [체크 예외와 인터페이스](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110107)
- 김영한 강사, [런타임 예외 적용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110108)
- 김영한 강사, [데이터 접근 예외 직접 만들기](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110109)
- 김영한 강사, [스프링 예외 추상화 이해](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110110)
- 김영한 강사, [스프링 예외 추상화 적용](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110111)
- 김영한 강사, [JDBC 반복 문제 해결, JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110112)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110113)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=328723&unitId=110114)
- 김영한 강사, [JdbcTemplate 소개와 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114623)
- 김영한 강사, [JdbcTemplate 적용 3, 구성과 실행](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114626)

## 관련 문서

- [[Spring-JDBC-Essentials-JdbcTemplate|JdbcTemplate API 계약]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[SQL|SQL]]
- [[Transactional-Outbox|Transactional Outbox]]
