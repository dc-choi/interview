---
tags: [spring, mvc, annotation, filter, interceptor, tomcat, was]
status: done
category: "OS & Runtime"
aliases: ["Spring MVC Essentials", "Spring 애노테이션", "Filter vs Interceptor", "WAS vs Web Server"]
---

# Spring MVC Essentials — 빈출 애노테이션·서블릿·인터셉터

Spring 면접에서 가장 자주 등장하는 MVC 주변 개념 모음. 개별 주제의 깊이 있는 설명은 각각의 전용 문서(예: [[Spring-Exception-Handling]])로 연결.

## Stereotype 애노테이션 — `@Component` 계열

Spring Bean으로 등록되는 클래스에 붙이는 4종. 기능적으로는 모두 `@Component` 파생이지만 **역할별로 구분해 쓰는 이유**가 있다.

| 애노테이션 | 용도 | 특별 효과 |
|---|---|---|
| **`@Component`** | 일반 Bean | 기본 등록만 |
| **`@Controller`** | 웹 요청 핸들러 | **DispatcherServlet이 핸들러로 등록** (Spring 6+는 Controller만 인정) |
| **`@RestController`** | REST API 핸들러 | `@Controller` + `@ResponseBody` 조합 |
| **`@Service`** | 비즈니스 로직 레이어 | 의미 구분, AOP pointcut 명시 |
| **`@Repository`** | 영속성 레이어 | **DataAccessException 자동 변환** — 구현체별 예외를 Spring 통합 예외로 |

`@Component` 하나로 다 쓰면 되지만, 레이어별 애노테이션을 쓰면:
1. 핸들러·예외 변환 같은 **특별 효과**를 얻음
2. AOP pointcut을 **레이어 단위로** 지정 가능
3. 코드를 읽을 때 **아키텍처 의도**가 드러남

## `@Controller` vs `@RestController`

| 축 | `@Controller` | `@RestController` |
|---|---|---|
| 응답 본문 | View 이름 반환 (Thymeleaf·JSP) | **JSON/XML 직렬화** |
| `@ResponseBody` | 메서드마다 명시 필요 | **전체 메서드에 자동 적용** |
| 주 용도 | MVC + View | REST API |

`@RestController` = `@Controller` + `@ResponseBody`. API 서버 개발의 기본.

## `@ResponseBody`

반환값을 View가 아닌 **HTTP 응답 본문으로 직렬화**. 기본 포맷은 JSON(Jackson 자동 연결).

- 단일 메서드에 붙이면 그 메서드만 JSON 반환
- 클래스에 `@RestController`를 쓰면 모든 메서드에 자동 적용
- 반환 타입이 `String`이면 그대로 body에 씀 (JSON 아님에 주의)

## `@Value`

`application.yml`·`application.properties`·환경 변수의 값을 Bean 필드에 주입.

```java
@Value("${app.api.timeout:5000}")
private int timeout;
```

- `${key:default}` 문법으로 기본값 지정 가능
- SpEL(`#{...}`) 지원: `@Value("#{T(java.time.Duration).ofSeconds(30)}")`
- 그러나 **`@ConfigurationProperties`가 일반적으로 더 나은 선택** — 타입 안전·검증·그룹화

## `@RequestBody` vs `@ModelAttribute`

| 축 | `@RequestBody` | `@ModelAttribute` |
|---|---|---|
| Content-Type | `application/json`·`application/xml` | `multipart/form-data`·`application/x-www-form-urlencoded` |
| 바인딩 | HttpMessageConverter로 Body 역직렬화 | 필드별 Setter/Constructor 바인딩 |
| 유효성 | `@Valid` + `MethodArgumentNotValidException` | `@Valid` + `BindException` |
| 중첩 객체 | 자연스럽게 지원 | 제한적 |

`multipart` + JSON 같이 쓰는 경우는 [[Spring-Multipart-JSON]] 참고.

## Filter vs Interceptor

두 도구 모두 요청 전후 처리를 담당하지만 **실행 계층과 범위**가 다르다.

| 구분 | Filter | Interceptor |
|---|---|---|
| 계층 | **Servlet Container** (Tomcat) | **Spring MVC** (DispatcherServlet 이후) |
| 적용 범위 | 모든 요청 (정적 리소스 포함) | Spring이 처리하는 요청만 |
| 수명주기 | `doFilter` 단일 메서드 | `preHandle` → `postHandle` → `afterCompletion` 3단계 |
| 핸들러 정보 | 없음 (Servlet 레벨) | **핸들러 메서드·애노테이션 접근 가능** |
| Spring Bean 주입 | 가능 (DelegatingFilterProxy) | 자연스러움 |
| 등록 | `@WebFilter`·`FilterRegistrationBean`·`web.xml` | `WebMvcConfigurer.addInterceptors()` |
| 예외 처리 | **`@ExceptionHandler` 도달 안 함** (별도 처리) | `@ControllerAdvice`로 처리 가능 |

### 용도별 선택

- **인코딩·CORS·압축·요청/응답 래핑**: Filter (더 낮은 계층, HTTP 수준 작업)
- **인증·인가 검사·성능 로깅·핸들러 메타 활용**: Interceptor (Spring 컨텍스트 필요)
- 둘 다 할 수 있는 경우가 많지만, **핸들러 정보가 필요하면 Interceptor**

## WAS vs Web Server

| 구분 | Web Server | WAS (Web Application Server) |
|---|---|---|
| 대상 | 정적 콘텐츠 (HTML·CSS·JS·이미지) | 동적 콘텐츠 + Servlet Container |
| 예 | Nginx·Apache HTTPD | Tomcat·Jetty·Undertow·WebLogic |
| 역할 | 파일 서빙·프록시·캐시·압축·TLS 종료 | 애플리케이션 로직 실행 |

### 왜 분리하는가
- **과부하 방지**: WAS가 정적 리소스까지 서빙하면 CPU·메모리 낭비
- **독립 스케일링**: Web Server·WAS를 각자 스케일
- **추가 기능**: LB·캐시·WAF·TLS 종료를 Web Server에서 처리
- **보안**: WAS를 직접 외부 노출하지 않고 역방향 프록시로 격리

현대 백엔드는 **Nginx(Web Server) → Spring Boot 내장 Tomcat(WAS)** 조합이 흔함. Spring Boot가 Tomcat을 내장하므로 WAS 별도 설치는 불필요.

## Tomcat 기초

Tomcat은 **Servlet Container + Web Server** 기능을 겸하지만, 실무에선 Spring MVC의 Servlet Container 역할이 주됨.

- **요청 수명주기**: Connector(HTTP/AJP) → Executor(Thread Pool) → Engine → Host → Context → Servlet
- **기본 스레드 모델**: Thread-per-Request (`server.tomcat.threads.max`·`min-spare`)
- **Connector**: NIO(기본)·NIO2·APR 중 선택. NIO가 Async 지원으로 권장
- **Servlet 등록**: Spring Boot는 DispatcherServlet 하나를 `/`에 등록해 모든 요청을 Spring이 라우팅

자세한 Servlet·DispatcherServlet 구조는 [[Servlet-vs-Spring-Container]]·[[Spring-Request-Lifecycle]].

## 면접 체크포인트

- **`@Component` vs `@Service`/`@Repository`/`@Controller`** — 기능 차이가 없어 보이지만 실제로는 특별 효과(DataAccessException·핸들러 등록)가 있음
- **`@Controller` vs `@RestController`** 차이 한 줄로 설명
- **Filter vs Interceptor** 선택 기준 (Servlet 계층 vs Spring 계층·핸들러 정보)
- Filter의 예외가 `@ControllerAdvice`로 **안 잡히는 이유**
- **WAS와 Web Server 분리**가 주는 스케일·보안 이점
- `@RequestBody` vs `@ModelAttribute` 매핑 동작 차이

## 출처
- [매일메일 — @Value](https://www.maeil-mail.kr/question/7)
- [매일메일 — @ExceptionHandler](https://www.maeil-mail.kr/question/8)
- [매일메일 — @ResponseBody](https://www.maeil-mail.kr/question/9)
- [매일메일 — Filter vs Interceptor](https://www.maeil-mail.kr/question/10)
- [매일메일 — Spring MVC](https://www.maeil-mail.kr/question/11)
- [매일메일 — @Controller와 @RestController](https://www.maeil-mail.kr/question/12)
- [매일메일 — @ControllerAdvice](https://www.maeil-mail.kr/question/13)
- [매일메일 — @RequestBody vs @ModelAttribute](https://www.maeil-mail.kr/question/14)
- [매일메일 — Tomcat](https://www.maeil-mail.kr/question/22)
- [매일메일 — @Component·@Service·@Controller·@Repository](https://www.maeil-mail.kr/question/72)
- [매일메일 — WAS와 Web Server의 차이점](https://www.maeil-mail.kr/question/105)

## 관련 문서
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]
- [[Spring-Exception-Handling|Spring 예외 처리 (@ExceptionHandler·@ControllerAdvice)]]
- [[Spring-Multipart-JSON|Multipart + JSON]]
- [[Reverse-Proxy|Reverse Proxy (Nginx)]]
