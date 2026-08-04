---
tags: [java, web, cookie, session, jdbc, dao, connection-pool]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Java 웹 상태와 영속성", "Servlet JDBC"]
---

# 웹 상태와 JDBC 영속성

웹 요청의 상태는 Cookie와 Session 경계를 거쳐 server-side use case로 들어오고, JDBC와 connection pool을 통해 database에 반영된다. 각 경계의 수명, 신뢰 수준과 resource 소유권을 구분해야 안전한 시스템이 된다.

## Cookie와 Session은 함께 동작한다

| 구분 | Cookie | Server-side Session |
|---|---|---|
| 주 저장 위치 | client | server memory 또는 외부 store |
| client가 보내는 값 | 실제 설정 값 또는 opaque identifier | 일반적으로 Cookie에 든 session ID |
| 신뢰 수준 | 사용자가 열람하고 수정할 수 있다고 가정 | 식별자가 탈취되면 session 권한을 사용할 수 있음 |
| 수명 | `Max-Age`, `Expires`와 user agent 정책 | idle/absolute timeout, logout과 server invalidation |
| scale | 매 요청에 자동 전송 | 여러 instance가 공유할 store 또는 routing 전략 필요 |

Session이 Cookie보다 자동으로 안전한 것은 아니다. 상태를 server에 두더라도 session ID는 bearer credential처럼 보호한다.

### 안전한 Session 체크리스트

- HTTPS와 `Secure`, `HttpOnly`, 목적에 맞는 `SameSite`를 함께 적용한다.
- Cookie의 Domain과 Path를 필요한 범위로 좁히고 ID를 URL에 넣지 않는다.
- 로그인과 권한 상승 뒤 `changeSessionId()` 등으로 ID를 교체해 fixation을 막는다.
- idle timeout, 필요하면 absolute timeout을 두고 logout 시 `invalidate()`한다.
- 상태 변경 요청은 SameSite만 믿지 않고 CSRF token과 Origin 검증 등 위협 모델에 맞게 방어한다.
- session ID, 인증 Cookie와 민감한 session 값을 log에 남기지 않는다.
- 여러 instance에서는 in-memory 기본 store 대신 수명과 일관성을 관리할 외부 store를 검토한다.

Servlet session attribute의 가변 객체는 같은 사용자의 병렬 요청에서도 동시에 접근할 수 있다. session scope가 thread safety를 보장한다고 가정하지 않는다.

자세한 HTTP 속성과 인증 경계는 [[Cookie|HTTP Cookie]], [[Session|Stateless HTTP 위의 세션]]에서 다룬다.

## Database 제품보다 먼저 볼 SQL 원리

과거 Oracle 설치와 SQL 실습에서 얻어야 할 핵심은 특정 설치 화면이 아니라 관계형 schema와 query의 의미다.

- DDL은 table, column, type와 constraint 같은 구조를 정의한다.
- DML은 row를 조회하고 추가, 변경, 삭제한다.
- primary key와 constraint는 database가 지키는 무결성 경계다.
- transaction의 commit과 rollback은 여러 변경의 원자성을 결정한다.
- `UPDATE`나 `DELETE`에 `WHERE`가 없으면 모든 대상 row에 적용될 수 있다. 의도, transaction과 backup을 확인한다.
- sequence는 Oracle의 key 생성 수단 중 하나다. 다른 DB는 identity, auto-increment 등 다른 기능을 쓸 수 있다.

제품 설치, 계정 권한과 관리 도구는 사용하는 버전의 공식 문서를 따른다. 학습 편의를 위한 광범위한 권한을 운영 계정에 그대로 적용하지 않고 least privilege를 사용한다.

## JDBC 실행 흐름

```text
DataSource.getConnection()
  -> PreparedStatement 생성과 parameter binding
  -> executeQuery 또는 executeUpdate
  -> ResultSet mapping
  -> ResultSet, Statement, Connection close
```

JDBC 4 호환 driver는 일반적으로 service provider로 자동 등록되므로 애플리케이션이 매번 `Class.forName`을 호출하지 않는다. 오래된 driver나 특수한 classloader 환경은 예외다.

```java
String sql = "select id, name from member where id = ?";

try (Connection connection = dataSource.getConnection();
     PreparedStatement statement = connection.prepareStatement(sql)) {
    statement.setLong(1, memberId);
    try (ResultSet rows = statement.executeQuery()) {
        if (rows.next()) {
            return new MemberDto(rows.getLong("id"), rows.getString("name"));
        }
    }
}
```

값은 `PreparedStatement` parameter로 binding해 SQL injection을 예방한다. table, column, sort direction처럼 placeholder가 받을 수 없는 SQL 구조를 동적으로 만들 때는 허용 목록과 query builder를 사용한다. PreparedStatement가 모든 DB와 상황에서 execution plan 재사용까지 보장한다고 단정하지 않는다.

직접 JDBC에서는 try-with-resources로 예외 경로까지 반환을 보장한다. server 애플리케이션은 `DriverManager`보다 구성, pooling과 분산 transaction 확장이 가능한 `DataSource`를 우선한다.

## DAO, DTO와 transaction 경계

| 개념 | 책임 | 피해야 할 혼동 |
|---|---|---|
| DAO/Repository | query, parameter, mapping과 persistence 오류를 캡슐화 | table마다 기계적으로 계층을 복제하지 않는다. |
| DTO | 계층이나 API 사이에 전달할 data shape | DB row나 domain entity와 항상 같지 않다. |
| Entity | 식별성과 lifecycle을 가진 domain 또는 ORM 객체 | 외부 API 응답에 그대로 노출하지 않는다. |
| Value Object | 값의 동등성과 불변 규칙을 표현 | 단순 getter/setter DTO와 같은 말이 아니다. |
| Service | use case와 transaction 경계를 조정 | Controller나 JSP에 transaction을 분산하지 않는다. |

공통 CRUD 코드를 copy/paste하는 것은 재사용 전략이 아니다. use case와 변경 이유를 기준으로 persistence port를 설계하고, framework abstraction을 쓰더라도 query 비용과 transaction 범위를 검토한다.

## DataSource와 connection pool

`DataSource`는 connection을 얻는 표준 계약이며 모든 구현이 pool인 것은 아니다. pooled DataSource에서는 `Connection.close()`가 보통 물리 연결 종료가 아니라 logical connection을 pool로 반환한다. JNDI와 Tomcat `context.xml`은 Container가 DataSource를 관리하는 한 가지 배포 방식이지 유일한 방식은 아니다.

운영 pool은 다음을 함께 조정한다.

- 애플리케이션 instance 수를 포함한 database 전체 connection budget
- acquire timeout, idle timeout과 maximum lifetime
- 느린 query, transaction 시간과 connection 보유 시간
- validation, leak detection과 pool 대기 metrics
- 장애 DB로 무한 대기하지 않는 timeout과 recovery 정책

pool을 크게 만들면 항상 빨라지는 것이 아니다. DB가 동시에 처리할 수 있는 작업량을 넘으면 lock, memory와 context switching 비용이 커질 수 있다.

## Spring과 NestJS에서의 대응

| 책임 | Spring | NestJS와 TypeORM |
|---|---|---|
| connection provider | `DataSource`, Spring Boot의 일반적 HikariCP 구성 | TypeORM `DataSource`와 driver pool |
| SQL 추상화 | `JdbcTemplate`, repository, JPA | repository, query builder, raw query |
| local transaction | transaction manager와 `@Transactional` | transaction callback 또는 `QueryRunner` |
| row/data shape | `RowMapper`, entity, DTO | entity와 DTO, raw result mapping |

현재 TypeORM에서는 여러 query를 한 connection과 transaction에 묶어야 할 때 `QueryRunner`를 명시적으로 사용할 수 있다.

```ts
const runner = dataSource.createQueryRunner();
await runner.connect();
await runner.startTransaction();
try {
  await runner.manager.save(order);
  await runner.commitTransaction();
} catch (error) {
  await runner.rollbackTransaction();
  throw error;
} finally {
  await runner.release();
}
```

transaction 안에서는 해당 runner의 manager만 사용한다. database 밖의 message broker와 외부 API까지 하나의 local transaction으로 원자화할 수는 없으므로 [[Transactional-Outbox|Outbox]]와 보상 전략을 별도로 설계한다.

## 면접 체크포인트

- Cookie와 Session의 저장 위치, 신뢰 경계와 scale 차이를 설명한다.
- Session ID rotation, timeout, invalidation과 CSRF 방어가 각각 필요한 이유를 말한다.
- JDBC의 Connection, PreparedStatement, ResultSet lifecycle을 순서대로 설명한다.
- DAO, DTO, Entity와 Value Object의 책임 차이를 말한다.
- DataSource 계약과 pool 구현, logical close와 physical close를 구분한다.
- framework를 써도 transaction과 connection 예산을 알아야 하는 이유를 설명한다.

## 출처

- [Jakarta Servlet Cookie API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/cookie)
- [Jakarta HttpServletRequest API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletrequest)
- [RFC 6265, HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
- [OWASP, Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP, Cross-Site Request Forgery](https://owasp.org/www-community/attacks/csrf)
- [Java SE, DataSource](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/javax/sql/DataSource.html)
- [Java SE, Connection](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/Connection.html)
- [Java SE, PreparedStatement](https://docs.oracle.com/en/java/javase/26/docs/api/java.sql/java/sql/PreparedStatement.html)
- [OWASP, SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Spring Framework, JDBC Core](https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html)
- [Spring Boot, SQL Databases](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [NestJS, Database](https://docs.nestjs.com/techniques/database)
- [NestJS, Session](https://docs.nestjs.com/techniques/session)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- 인프런, [Cookie](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13666)
- 인프런, [Session](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13667)
- 인프런, [오라클 설치](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13669)
- 인프런, [SQL](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13670)
- 인프런, [JDBC](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13671)
- 인프런, [DAO와 DTO](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13672)
- 인프런, [Connection Pool](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13673)

## 관련 문서

- [[Cookie|HTTP Cookie]]
- [[Session|Stateless HTTP 위의 세션]]
- [[CSRF|CSRF]]
- [[SQL|SQL]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[NestJS-Database|NestJS Database]]
