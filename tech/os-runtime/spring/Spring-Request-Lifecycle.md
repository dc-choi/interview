---
tags: [spring, tomcat, servlet, dispatcher-servlet, request-lifecycle, spring-boot]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Request Lifecycle", "Spring 요청 처리 흐름", "DispatcherServlet 내부"]
---

# Spring 요청 처리 흐름

클라이언트 TCP 접속부터 Controller 메서드 반환까지, Spring MVC 애플리케이션이 한 요청을 처리하는 **전 구간**을 정리. Tomcat → Servlet → `DispatcherServlet` → Spring Container → Controller로 이어지는 핸드오프 지점마다 **누가 무엇을 소유하는가**가 핵심이다.

## 1. Tomcat: Web Server + Servlet Container

Tomcat은 두 개 역할을 겸한다.

- **Web Server 역할**: 정적 파일 제공, httpd 호환 native 모듈 지원. 하지만 주 역할이 아님
- **Servlet Container 역할**(메인): Servlet·Filter·Listener 수명주기 관리, HTTP connector(socket), 요청 스레드 풀 관리

Tomcat 자체가 **자바 프로그램**이므로 JVM 위에서 구동된다. 애플리케이션 클래스와 동일 JVM을 공유한다.

## 2. Servlet · 생명주기

Servlet은 "요청을 받아 동적 응답을 생성하는 자바 프로그램"이며 Container가 수명을 통제한다.

- `init()` — Servlet 최초 로드 시 한 번. 초기화 리소스 할당
- `service()` — 요청마다 호출. `doGet`/`doPost`로 분기
- `destroy()` — Container 종료 또는 Servlet 언로드 시

Spring MVC 앱에서는 요청이 전부 **`DispatcherServlet` 하나**(또는 극소수)를 거친다(Front Controller 패턴). URL 패턴은 보통 `/*`.

## 3. DispatcherServlet 내부

`DispatcherServlet`은 Servlet 인터페이스 구현체지만, 내부에는 Spring Container에서 주입받은 전략 객체(인터페이스)들을 들고 있다.

| 전략 | 역할 |
|---|---|
| **HandlerMapping** | URL·HTTP Method로 대상 핸들러(Controller 메서드) 결정 |
| **HandlerAdapter** | 핸들러 타입에 맞게 실제 호출을 어댑팅(`@RequestMapping`·HttpRequestHandler 등) |
| **HandlerInterceptor** | 핸들러 전후 훅(인증·로깅) |
| **ViewResolver** | Controller가 뷰 이름을 반환하면 실제 View로 해석 |
| **HandlerExceptionResolver** | 핸들러 실행 중 예외 가로채기 |
| **MultipartResolver** | 파일 업로드(`multipart/form-data`) 처리 |
| **LocaleResolver** | i18n 로케일 결정 |

실행 메서드 체인: `service()` → `doService()` → `doDispatch()` — `doDispatch()`가 **HandlerMapping 조회 → HandlerAdapter 호출 → ViewResolver 선택**의 오케스트레이션을 담당한다.

## 4. Root ApplicationContext vs Servlet ApplicationContext

전통 Spring MVC는 **두 개의 Context**를 상속 관계로 둔다.

- **Root WebApplicationContext**
  - `ContextLoaderListener`가 서블릿 컨테이너 시작 시 생성
  - **Service·Repository·DataSource** 등 웹에 독립적인 공용 Bean
  - 여러 Servlet이 공유 가능

- **Servlet WebApplicationContext**
  - `DispatcherServlet` 초기화 시 생성
  - Root를 **부모**로 둠(자식은 부모 Bean을 볼 수 있으나 반대는 불가)
  - **Controller·Interceptor·ViewResolver·HandlerMapping** 등 웹 전용 Bean

### 왜 두 층으로 나누었나

- 서블릿 컨테이너 안에 **여러 Servlet**(예: `/api/*`·`/admin/*`)이 있을 때 Service·DataSource는 공통이므로 한 번만 등록
- Bean 조회 순서: **Servlet Context → Root Context**. 같은 ID면 자식(Servlet)이 우선

Spring Boot에서는 대부분 단일 컨텍스트로 통합되어 이 구분이 덜 드러나지만, 멀티 모듈·멀티 DispatcherServlet 구성에서 다시 등장한다.

## 5. 서버 시작 → 첫 요청까지 단계

1. **Web server init** — Tomcat JVM 기동, connector 바인딩
2. **Root WebApplicationContext 로딩** — `ContextLoaderListener`가 Service/Repository Bean 등록
3. **Web server start** — connector 리스닝 시작
4. **Client Request** → Tomcat connector가 TCP accept
5. **Servlet Container 전달** — URL 매핑에 맞는 Servlet 선택
6. **스레드 할당** — 스레드 풀에서 워커 하나를 꺼내 요청 전담
7. **DispatcherServlet init (lazy)** — 아직 초기화 전이면 `init()` 호출, Servlet WebApplicationContext 생성
8. **`service()` 호출** → `doDispatch()`
9. **HandlerMapping**으로 Controller 조회
10. **HandlerAdapter**가 Controller 메서드 호출
11. Controller → Service → Repository → 응답
12. ViewResolver·MessageConverter로 응답 포맷 → 스레드 반납

## 6. Spring MVC vs Spring Boot 부팅 순서

| 축 | Spring MVC (전통) | Spring Boot |
|---|---|---|
| 기동 주체 | **Tomcat이 먼저** 실행 → `ContextLoaderListener`가 ApplicationContext 생성 → `DispatcherServlet` 생성 | **애플리케이션이 먼저** 실행 → `TomcatStarter.onStartup()`으로 내장 Tomcat 기동 → `DispatcherServlet` 등록 |
| 배포 단위 | WAR를 외부 Tomcat에 배포 | 실행 가능 JAR가 내장 Tomcat 포함 |
| 진입점 | Tomcat의 `web.xml`/`ServletContainerInitializer` | `public static void main()` + `SpringApplication.run()` |

Spring Boot는 이 순서 역전 덕분에 단일 JAR로 배포되며, 개발 환경과 운영 환경의 차이가 거의 없어진다.

## 7. Controller 싱글톤이 수많은 요청을 처리하는 이유

Spring Bean은 기본 싱글톤 → Controller 인스턴스는 **앱당 1개**. 그런데 스레드 풀의 수백 워커가 동시에 이 한 객체의 메서드를 호출한다.

### JVM 메모리 관점

- **Heap**: 객체 인스턴스가 저장되는 공간 → Controller 인스턴스 1개 위치
- **Method Area(Metaspace)**: 클래스 정보·메서드 바이트코드 → 여러 스레드가 공유해도 안전
- **Stack (스레드별)**: 메서드 호출 프레임·지역 변수 → 스레드마다 독립

### 안전한 이유

Controller가 **무상태(stateless)** 이면 인스턴스 변수에 쓰는 일이 없다. 각 요청의 파라미터·로컬 변수는 **스레드 고유 스택**에 올라가므로 충돌이 없다. 공유되는 건 "처리 로직(메서드 바이트코드)"뿐이라 동기화가 필요 없다.

### 상태가 필요한 경우

- 요청 범위 데이터 → 메서드 파라미터 또는 `@RequestScope` Bean
- 스레드 로컬(`ThreadLocal`) — 스레드 풀 재사용 때문에 **반드시 요청 종료 시 `remove()`**
- 테넌트·사용자 컨텍스트 → `HttpServletRequest` attribute 또는 WebFilter에서 주입

## 8. Request-per-Thread(요청당 스레드) vs Connection-per-Thread

| 모델 | 설명 | 비용 |
|---|---|---|
| **Connection-per-Thread** | 한 TCP 커넥션당 스레드 전담 | 유휴 커넥션에도 스레드 점유 → 확장성 악화 |
| **Request-per-Thread** (Tomcat 기본) | 요청 처리 시에만 스레드 할당, 끝나면 반납 | 스레드 풀 재사용으로 비용 저렴 |

자바 OS 스레드는 **스택 1MB+·커널 자원**을 소비하므로 비싸다. HTTP `keep-alive`로 커넥션은 유지하되, **스레드는 요청 동안만** 쥐는 게 기본. 커넥션 유휴 중에는 NIO selector가 대기.

Loom(가상 스레드)·WebFlux는 이 한계를 다른 방식으로 넘는다. 자세한 비교는 [[Async-vs-Threads|async/await vs 스레드]].

## 9. JVM 관점: Servlet vs 일반 자바 클래스

- **호출 방식은 동일** — 둘 다 JVM 위의 Java 클래스
- **진입점이 다름**
  - 일반 클래스: `public static void main(String[] args)`
  - Servlet: `main`이 없고 **Container**가 라이프사이클 메서드(`init`·`service`·`destroy`)를 호출
- 즉 Servlet은 "**Container에 의해 실행되는**" 클래스. 개발자가 직접 `new`하지도, `main`을 쓰지도 않는다

## 면접 체크포인트

- Tomcat의 두 역할(Web Server + Servlet Container)
- `DispatcherServlet`의 Front Controller 패턴과 내부 전략 객체들
- Root vs Servlet ApplicationContext의 상속 관계와 조회 순서
- Spring MVC와 Spring Boot의 **기동 순서 역전**
- Controller 싱글톤이 동기화 없이 다중 스레드 처리 가능한 이유(Heap/Method Area/Stack 구분)
- Request-per-Thread가 Connection-per-Thread보다 유리한 이유
- Servlet과 일반 자바 클래스의 실행 진입점 차이

## 관련 문서
- [[Spring|Spring 개요 (IoC·DI·AOP)]]
- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]
- [[Spring-Exception-Handling|Spring 예외 처리 전략]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Async-vs-Threads|async/await vs 스레드]]
- [[HTTP-Status-Code|HTTP Status Code · Header]]
