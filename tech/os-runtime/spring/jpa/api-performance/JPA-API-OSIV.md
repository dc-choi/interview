---
tags: [jpa, spring-boot, osiv, transaction, connection-pool]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA OSIV", "Open EntityManager in View"]
---

# JPA OSIV와 transaction 경계

OSIV(Open EntityManager in View)는 web request 동안 `EntityManager`와 persistence context를 열어 transaction 밖의 controller/view에서도 lazy loading이 가능하게 하는 패턴이다. 편의 기능이지 transaction을 request 전체로 자동 확장하는 기능은 아니다.

## Persistence context와 connection을 구분한다

OSIV가 유지하는 것은 `EntityManager`이고, 물리 connection을 얼마나 오래 보유하는지는 Hibernate connection handling mode가 정한다. Hibernate 단독의 resource-local 기본값은 필요할 때 얻고 transaction 뒤 반환하는 `DELAYED_ACQUISITION_AND_RELEASE_AFTER_TRANSACTION`이다. 그러나 Spring의 `HibernateJpaVendorAdapter`는 JTA가 아닌 persistence unit에 `hibernate.connection.handling_mode=DELAYED_ACQUISITION_AND_HOLD`를 넣고, Spring Boot는 이 adapter를 그대로 쓴다(Spring Framework 7.0.9, Spring Boot 4.1.1, Hibernate ORM 7.4.11 source). 이 mode는 connection을 처음 필요할 때 얻어 session(`EntityManager`)이 닫힐 때까지 보유한다.

| 구성 | connection 획득 | 반환 |
|---|---|---|
| OSIV ON, Spring 기본 | 첫 DB 접근(보통 첫 `@Transactional` 진입이나 첫 query) | OSIV interceptor가 `EntityManager`를 닫는 request 완료 시점 |
| OSIV OFF, Spring 기본 | transaction 시작 | transaction 종료와 함께 `EntityManager`가 닫힐 때 |
| JTA(Hibernate 기본 `DELAYED_ACQUISITION_AND_RELEASE_AFTER_STATEMENT`)나 release 계열 mode로 override | 필요할 때 | statement나 transaction 뒤. 이후 lazy load는 새 checkout |

따라서 OSIV ON이면 transaction이 끝난 뒤 controller에서 느린 외부 API를 호출하거나 view를 rendering하는 동안에도 connection이 pool로 돌아가지 않아, 실시간 traffic에서 pool이 고갈될 수 있다. Request 시작부터 고정되는 것이 아니라 첫 DB 접근부터 request 끝까지 보유하는 것이다.

Spring이 HOLD를 기본으로 두는 이유는 `HibernateJpaDialect`가 release mode가 `ON_CLOSE`일 때만 connection에 isolation과 read-only를 준비하기 때문이다. 그렇지 않으면 custom isolation을 요청한 transaction은 `InvalidIsolationLevelException`으로 실패한다. OSIV를 켠 채 handling mode만 release 계열로 바꾸는 우회는 custom isolation을 깨뜨리고 read-only connection 준비도 빠뜨리므로 권하지 않는다. `spring.jpa.properties.hibernate.connection.handling_mode`를 직접 지정하면 adapter 기본값보다 우선한다(`AbstractEntityManagerFactoryBean`은 사용자 속성에 없는 key만 vendor 속성으로 채운다). 실제 적용 값은 기동 설정에서 확인하고, 점유를 줄이는 정석은 OSIV OFF와 transaction 안 DTO 조립으로 둔다.

Transaction이 끝난 뒤 OSIV persistence context에서 lazy load를 실행하는 것은 새 SQL을 허용하지만 이미 끝난 business transaction과 같은 atomic 작업은 아니다. Serializer가 어느 query를 실행할지 암묵적으로 결정하게 두면 성능과 일관성 경계가 흐려진다.

## ON과 OFF 비교

| 선택 | 이점 | 비용 | 맞는 조건 |
|---|---|---|---|
| OSIV ON | Controller/view에서 lazy load 가능 | 암묵 query, transaction 뒤 외부 호출과 rendering까지 connection 보유, transaction 밖 읽기 | 낮은 traffic의 내부 UI 등에서 위험을 수용할 때 |
| OSIV OFF | Transaction과 SQL 경계가 선명, 빠른 connection 반환 | 필요한 graph와 DTO를 미리 조립 | API 서버의 안전한 기본값 |

Spring Boot 4.1 web application은 기본적으로 `OpenEntityManagerInViewInterceptor`를 등록한다. 값을 명시하지 않으면 기동 때 `spring.jpa.open-in-view is enabled by default. Therefore, database queries may be performed during view rendering. Explicitly configure spring.jpa.open-in-view to disable this warning` 경고가 남는다(Spring Boot 4.1.1 source). 이 경고를 보면 ON과 OFF 중 하나를 골라 설정에 명시한다.

```properties
spring.jpa.open-in-view=false
```

## OFF에서의 조회 구조

1. Application/query service의 read-only transaction을 연다.
2. Fetch join, entity graph, batch fetch 또는 DTO projection으로 필요한 graph를 읽는다.
3. Transaction 안에서 response DTO를 완성한다.
4. Controller는 완성된 DTO만 직렬화한다.

```java
@Transactional(readOnly = true)
public OrderDetail getOrder(long id) {
    Order order = orderRepository.findDetail(id).orElseThrow();
    return OrderDetail.from(order);
}
```

Transaction 밖에서 초기화되지 않은 proxy/collection에 접근하면 `LazyInitializationException`이 발생할 수 있다. 예외를 피하려고 모든 관계를 EAGER로 바꾸거나 write transaction을 HTTP 응답 끝까지 늘리지 않는다. 필요한 조회를 use case별로 명시한다.

## Command와 query를 분리한다

복잡한 화면 조회는 핵심 write service와 별도 query service/repository로 둘 수 있다. 이는 읽기와 쓰기의 모델, 저장소까지 완전히 분리하는 CQRS를 반드시 뜻하지 않는다. 우선 목적은 transaction과 fetch plan의 책임을 분명히 하는 것이다.

- Command service는 불변조건, 변경과 write transaction에 집중한다.
- Query service는 endpoint별 DTO와 조회 최적화에 집중한다.
- Query별 SQL과 integration test를 가까이 둔다.
- 공통 entity repository에 모든 화면 조합을 누적하지 않는다.

## 운영 판단

OSIV 선택은 traffic 규모만으로 끝나지 않는다. Request duration, transaction duration, connection checkout 시간과 pool 대기를 함께 관측한다. HikariCP Micrometer 지표로는 connection 보유 시간 `hikaricp.connections.usage`, 획득 대기 시간 `hikaricp.connections.acquire`, `hikaricp.connections.active`와 `hikaricp.connections.pending`을 본다. 보유 시간이 transaction 시간보다 request 시간에 가깝다면 OSIV로 connection을 붙잡고 있는 것이다. OSIV를 켠 내부 도구도 느린 외부 호출과 lazy serialization이 있으면 pool을 고갈시킬 수 있다. 설정값, 기대 query 경계와 회귀 test를 architecture decision에 남긴다.

## 출처

- [Spring Boot 4.1, Open EntityManager in View](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.jpa-and-spring-data.open-entity-manager-in-view)
- [Hibernate ORM current User Guide, Connection handling](https://docs.hibernate.org/stable/orm/userguide/html_single/#database-connection-handling)
- [Spring Framework 7.0.9, `HibernateJpaVendorAdapter` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/vendor/HibernateJpaVendorAdapter.java)
- [Spring Framework 7.0.9, `HibernateJpaDialect` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/vendor/HibernateJpaDialect.java)
- [Spring Framework 7.0.9, `AbstractEntityManagerFactoryBean` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/AbstractEntityManagerFactoryBean.java)
- [Spring Framework 7.0.9, `JpaTransactionManager` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-orm/src/main/java/org/springframework/orm/jpa/JpaTransactionManager.java)
- [Spring Boot 4.1.1, `HibernateJpaConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-hibernate/src/main/java/org/springframework/boot/hibernate/autoconfigure/HibernateJpaConfiguration.java)
- [Spring Boot 4.1.1, `JpaBaseConfiguration` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-jpa/src/main/java/org/springframework/boot/jpa/autoconfigure/JpaBaseConfiguration.java)
- [Hibernate ORM 7.4.11, `PhysicalConnectionHandlingMode` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/resource/jdbc/spi/PhysicalConnectionHandlingMode.java)
- [Hibernate ORM 7.4.11, `JdbcResourceLocalTransactionCoordinatorBuilderImpl` source](https://github.com/hibernate/hibernate-orm/blob/7.4.11/hibernate-core/src/main/java/org/hibernate/resource/transaction/backend/jdbc/internal/JdbcResourceLocalTransactionCoordinatorBuilderImpl.java)
- [HikariCP 7.0.2, `MicrometerMetricsTracker` source](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-7.0.2/src/main/java/com/zaxxer/hikari/metrics/micrometer/MicrometerMetricsTracker.java)
- 강의: [OSIV와 성능 최적화](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24339)

## 관련 문서

- [[JPA-API-Performance|JPA API 조회 성능]]
- [[JPA-API-DTO-Boundary|JPA DTO와 API 경계]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Spring-Transactional|Spring @Transactional]]
