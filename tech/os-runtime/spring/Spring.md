---
tags: [runtime, spring]
status: index
category: "OS & Runtime"
aliases: ["Spring"]
---

# Spring

Spring Framework는 Java 애플리케이션의 객체 graph, 웹 요청, 데이터 접근, 트랜잭션과 횡단 관심사를 일관된 programming model로 다룬다. Spring Boot는 이 framework 위에 자동 설정, starter와 내장 server를 더한다.

- **IoC**: 객체 생성과 조립의 제어를 container에 맡기는 원리
- **DI**: constructor나 factory method를 통해 필요한 의존성을 외부에서 제공하는 방식
- **AOP**: transaction, security, logging 같은 횡단 관심사를 proxy와 advice로 적용하는 방식

container 사용 자체가 좋은 설계를 보장하지는 않는다. dependency direction, Bean scope, transaction boundary와 proxy 적용 조건까지 함께 봐야 한다.

## 상세 주제

- [[Spring-Core|Spring Core (객체 설계, container와 metadata, 등록과 자동 주입, scope와 lifecycle)]]
- [[Spring-Core-AOP|Spring AOP와 proxy (pointcut, advice, self-invocation, NestJS interceptor 비교)]]
- [[Spring-AOP|Spring AOP 상세 (proxy factory, 자동 proxy, advice, pointcut과 실전 한계)]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기 (설정, 후보 선택, scope, lifecycle)]]
- [[Spring-Data-Access|Spring 데이터 접근 (선택 전략, JdbcTemplate, MyBatis, JPA, Querydsl, transaction)]]
- [[Spring-MVC|Spring MVC 웹 계층 (서블릿 컨테이너, 요청 처리 흐름, 빈출 애노테이션, 예외 처리, Multipart + JSON)]]
- [[Spring-Transactional|@Transactional (Propagation, Isolation, readOnly, 자기 호출 함정)]]
- [[Spring-Boot-Essentials|Spring Boot Essentials (AutoConfiguration, Starter, Embedded, Actuator)]]
- [[Spring-Boot-Embedded-Server-and-Executable-Jar|Spring Boot 내장 서버와 실행 가능 JAR]]
- [[Spring-Boot-Auto-Configuration-and-Starters|Spring Boot 자동 구성과 starter]]
- [[Spring-Boot-Externalized-Configuration-and-Profiles|Spring Boot 외부 설정과 profile]]
- [[Spring-Boot-Actuator-Operations|Spring Boot Actuator 운영]]
- [[Spring-Boot-Micrometer-Prometheus-Grafana|Spring Boot metric pipeline]]
- [[Spring-Boot-Custom-Metrics-and-Monitoring|Spring Boot custom metric]]
- [[Java-Spring-Stack-Migration|Java와 Spring 스택 마이그레이션 (JDK, Boot/Framework, Jakarta/Jackson 호환 그래프, 동작 검증, Native Image와 AI 분리)]]
- [[JPA|JPA와 Jakarta Persistence (생태계, 영속성 컨텍스트, 매핑, 로딩, 값 타입, JPQL)]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA (JPA vs Hibernate vs SDJ, ddl-auto, ID 생성, isNew/Persistable)]]
- [[Spring-Authorization-Server|Spring Authorization Server (OAuth2 인가 서버, RegisteredClient, 필터 체인 분리, JWKS, consent)]]
- [[Spring-Security|Spring Security (FilterChain, 인증 Context, Session, CSRF와 인가)]]
- [[Spring-Batch-Essentials|Spring Batch (Job/Step/Chunk, Job Parameter와 멱등성, Reader 성능, JDBC 배치, Jenkins 운영, Scheduler vs Quartz)]]
- [[Spring-Testing-Essentials|Spring test 경계 (단위, context, DB transaction, NestJS와 TypeORM 비교)]]
- [[Java-ThreadLocal-and-Request-Context|Java ThreadLocal과 요청 context]]

## 다른 프레임워크 비교

- [[NestJS-vs-Spring|NestJS vs Spring (DI, 모듈, 데코레이터, AOP vs Guard/Pipe/Interceptor, 트랜잭션, 생태계)]]
