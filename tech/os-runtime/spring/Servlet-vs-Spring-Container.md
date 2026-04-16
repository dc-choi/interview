---
tags: [spring, servlet, container, ioc, tomcat, dispatcher-servlet]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Servlet Container vs Spring Container", "서블릿 컨테이너 vs 스프링 컨테이너"]
---

# Servlet Container vs Spring Container

흔히 뭉뚱그려 말하지만 **서로 다른 레이어의 컨테이너**다. 서블릿 컨테이너는 **HTTP·스레드·서블릿 수명주기**를 관리하는 WAS(Tomcat·Jetty·Undertow)의 엔진이고, 스프링 컨테이너는 그 위에서 동작하는 **IoC/DI 컨테이너**다. Spring MVC는 `DispatcherServlet`이라는 단 하나의 서블릿을 서블릿 컨테이너에 등록해 두 세계를 잇는다.

## 두 컨테이너의 역할

| 축 | Servlet Container (Tomcat 등) | Spring Container (ApplicationContext) |
|---|---|---|
| 책임 | HTTP 파싱·커넥터·요청 스레드 할당 | Bean 등록·의존성 주입·AOP |
| 관리 대상 | `Servlet`, `Filter`, `Listener` 수명주기 | `@Component`/`@Service`/`@Repository` 등 POJO Bean |
| 스코프 | 프로세스당 1개 | 웹앱 1개 + 하위 컨텍스트들 |
| 주요 구성 | HTTP connector, 스레드 풀, 세션 관리 | `BeanFactory` → `ApplicationContext` |

## 요청 처리 흐름

1. 클라이언트 → **HTTP connector**가 TCP accept
2. 서블릿 컨테이너가 **스레드 풀에서 워커 스레드 1개를 할당**
3. URL 매핑에 따라 해당 `Servlet.service()` 호출
4. Spring MVC 앱이면 그 대상이 **`DispatcherServlet`**
5. `DispatcherServlet`이 Spring 컨테이너에서 **HandlerMapping → HandlerAdapter → Controller Bean** 조회
6. Controller 메서드 실행 → ViewResolver/Converter로 응답 직렬화
7. 서블릿 컨테이너가 응답을 네트워크로 반환 → 스레드 반납

## DispatcherServlet: 두 세계의 다리

- **서블릿 컨테이너에게는 Servlet 하나** — `web.xml` 또는 Spring Boot의 자동 등록을 통해 `/*`로 매핑
- **Spring 컨테이너에게는 Bean** — 자신이 관리하는 Controller·Resolver·Interceptor Bean을 사용
- 요청이 들어오면 서블릿 컨테이너에서 Spring 컨테이너로 **핸드오프**

## Thread-per-Request와 싱글톤 Bean

### 요청당 스레드 모델

서블릿 컨테이너는 요청마다 스레드를 할당한다. 수천 동시 요청 = 수천 스레드 대기 가능. 스레드 풀 크기(`maxThreads`·`connectionTimeout`)가 병목의 축.

### Bean은 기본 싱글톤

Spring은 Bean을 기본 싱글톤으로 관리하므로 **여러 워커 스레드가 동일 Bean을 공유**한다. 그래서 Bean은 **무상태(stateless)** 여야 안전하다. 인스턴스 변수에 요청별 데이터를 넣으면 동시성 버그가 곧바로 터진다.

**요청별 상태를 다루는 방법**:
- 메서드 파라미터·지역 변수 사용
- `@RequestScope` Bean
- `HttpServletRequest`의 attribute
- `ThreadLocal`(주의: 스레드 풀 재사용으로 누수 발생 가능 → 요청 종료 시 반드시 `remove()`)

## 수명주기 비교

| 단계 | Servlet Container | Spring Container |
|---|---|---|
| 초기화 | `Servlet.init()` 호출 | `@PostConstruct` / `InitializingBean` |
| 요청 처리 | `service()` → `doGet/doPost` | Bean 메서드 호출 |
| 종료 | `Servlet.destroy()` | `@PreDestroy` / `DisposableBean` |
| 컨텍스트 | `ServletContextListener` | `ApplicationListener<ContextRefreshedEvent>` |

Spring Boot에서는 내장 서블릿 컨테이너(기본 Tomcat)를 사용하므로 두 수명주기가 하나의 JVM 안에서 공존한다.

## 부모-자식 ApplicationContext

전통적 Spring MVC 구성에서는 두 개의 ApplicationContext가 존재했다.
- **Root ApplicationContext** — 서비스·리포지토리 등 공유 Bean (`ContextLoaderListener`가 생성)
- **Servlet WebApplicationContext** — Controller 등 웹 전용 Bean (`DispatcherServlet`이 생성)

웹 컨텍스트는 Root를 부모로 가지므로 하위 Bean이 상위 Bean을 참조할 수 있다. Spring Boot에서는 대부분 단일 컨텍스트로 통합되어 이 구분이 덜 드러나지만, 멀티 모듈·멀티 DispatcherServlet을 쓸 때 다시 등장한다.

## Non-Blocking 대안: Spring WebFlux

WebFlux는 서블릿 API를 쓰지 않고 **Netty(기본)·Undertow·Jetty(리액티브 모드)** 위에서 동작한다.
- Thread-per-Request 모델을 버리고 **이벤트 루프 + 워커 풀**
- `DispatcherHandler`가 `DispatcherServlet`을 대체
- 한 스레드가 수만 커넥션을 관리 → WebSocket·SSE·스트리밍 유리

따라서 "Spring Container는 Servlet Container 위에서 동작한다"는 명제는 **Spring MVC에만 해당**하며, WebFlux에서는 맞지 않다.

## 흔한 오해

- "Spring이 HTTP를 처리한다" → HTTP는 서블릿 컨테이너가, Spring은 DI와 라우팅 규약만 관여
- "Bean은 요청마다 생성된다" → 기본은 싱글톤. 요청 스코프는 명시적으로 지정해야 함
- "DispatcherServlet은 여러 개 있어도 된다" → 가능하지만, 보통 하나. 멀티로 나누는 순간 설정 복잡도↑
- "ThreadLocal은 안전하다" → 서블릿 컨테이너가 스레드를 재사용하므로 누수 위험. 인터셉터에서 반드시 `remove()`

## 면접 체크포인트

- Servlet Container와 Spring Container의 **책임 분리** 한 문장
- `DispatcherServlet`이 두 컨테이너를 잇는 방법
- 왜 Bean이 **stateless**여야 하는가(싱글톤 + 스레드 공유)
- Root vs Servlet ApplicationContext 구분과 Boot에서의 단순화
- WebFlux는 왜 이 구조에서 벗어나는가(Thread-per-Request 포기)

## 출처
- [sigridjin — ServletContainer와 SpringContainer는 무엇이 다른가](https://sigridjin.medium.com/servletcontainer%EC%99%80-springcontainer%EB%8A%94-%EB%AC%B4%EC%97%87%EC%9D%B4-%EB%8B%A4%EB%A5%B8%EA%B0%80-626d27a80fe5)

## 관련 문서
- [[Spring|Spring 개요 (IoC·DI·AOP)]]
- [[Spring-Exception-Handling|Spring 예외 처리 전략]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Async-vs-Threads|async/await vs 스레드]]
