---
tags: [java, web, servlet, jakarta, http]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Servlet 런타임", "Java 웹 요청 처리"]
---

# Servlet 런타임과 요청 처리

Servlet은 Java 서버에서 HTTP 요청과 응답을 다루는 표준 컴포넌트 모델이다. Servlet Container는 URL을 Servlet에 연결하고 생명주기, 동시 요청, 요청과 응답 객체를 관리한다. Spring MVC도 이 기반 위에서 더 높은 수준의 Controller 모델을 제공한다.

## 표준이 해결한 문제

WAS는 network 연결, multithread와 HTTP message parsing을 처리하고 그 위에서 application 코드를 실행하는 server다. Servlet 표준 이전에는 HTTP server 제품마다 application이 구현할 interface가 달라 server를 바꾸려면 application 코드를 고쳐야 했다. Java 진영은 `Servlet`, `ServletRequest`, `ServletResponse` 같은 계약을 표준 package(초기 `javax.servlet`, 현재 `jakarta.servlet`)로 정하고 Tomcat, Jetty, GlassFish, Undertow, WebSphere, WebLogic 같은 제품이 이를 구현하게 했다. 개발자는 표준 interface만 구현하고 제품은 성능과 부가 기능으로 경쟁한다. JDBC가 API와 driver 구현을 나눈 것과 같은 구조다.

표준을 지켜도 container별 설정, 확장 기능과 기본값 차이는 남으므로 교체 비용이 0은 아니다. 아래의 `javax`에서 `jakarta`로의 이동처럼 표준 자체가 호환되지 않게 바뀌기도 한다.

## 요청 처리의 큰 흐름

```text
Client
  -> HTTP Server와 Servlet Container
  -> URL mapping
  -> Filter chain
  -> Servlet.service(request, response)
  -> 상태 조회와 업무 처리
  -> status, header, body 응답
```

정적 파일은 웹 서버나 Container가 직접 제공할 수 있다. 동적 요청은 Servlet이 계산한 결과를 HTML, JSON 또는 다른 표현으로 응답한다. HTTP가 stateless라는 말은 요청 간 애플리케이션 상태를 프로토콜이 자동 보존하지 않는다는 뜻이며, TCP 연결을 매 요청마다 닫는다는 뜻은 아니다.

Reverse proxy/web server와 WAS를 분리하면 TLS, cache, static asset, load balancing과 application 실행 책임을 독립적으로 운영할 수 있다. 그러나 Tomcat도 정적 파일과 HTTP를 처리할 수 있고 Nginx도 module에 따라 동적 기능을 제공하므로 제품을 “정적 전용”과 “동적 전용”으로 절대 분류하지 않는다. 병목, 장애 격리와 운영 요구로 배치를 결정한다.

## 역사적 환경과 현재 기준

| 구분 | 역사적 실습에서 자주 보이는 형태 | 현재 이해할 기준 |
|---|---|---|
| API namespace | `javax.servlet.*` | Jakarta Servlet 6.1의 `jakarta.servlet.*` |
| 배포 | Eclipse Dynamic Web Project, 외부 Tomcat, 수동 WAR | Jakarta 호환 Container 또는 Spring Boot embedded Container |
| 설정 | `web.xml` 중심 | annotation과 programmatic 설정, 필요할 때 deployment descriptor |
| Java 기준 | 강의와 서버 버전에 따라 다름 | Servlet 6.1은 Java SE 17 이상 |

Jakarta EE 9의 `javax.*`에서 `jakarta.*`로의 namespace 이동은 이전 릴리스와 source, binary 양쪽 모두 호환되지 않는다. 다만 대응하는 API의 method signature와 동작은 유지된다. 오래된 예제를 현재 프로젝트에 옮길 때 import만이 아니라 Container, dependency와 descriptor 버전을 함께 맞춘다.

개발 환경의 본질은 JDK, build, runtime과 배포 artifact의 버전 정합성이다. 특정 IDE의 project layout이나 운영체제의 수동 `PATH` 설정은 한 가지 도구 사용법이지 Servlet 명세의 요구사항이 아니다.

## URL mapping은 보안 경계가 아니다

Servlet은 `@WebServlet` 또는 `web.xml`의 mapping으로 요청 경로와 연결할 수 있다. Jakarta Servlet 명세는 exact path, 최장 path prefix, extension, default servlet 순으로 매핑을 검사하고 첫 일치에서 탐색을 멈추도록 규정한다. Container가 이 우선순위를 임의로 바꾸지는 않는다.

package와 class 이름을 URL에서 숨기는 것은 내부 구조를 캡슐화하지만 인증과 인가를 제공하지 않는다. 보호가 필요한 경로는 Filter, Spring Security 같은 보안 계층에서 사용자 신원과 권한을 검증해야 한다.

매핑은 context path를 뺀 나머지 경로에 적용된다. context path와 요청 경로 분해, `web.xml` 선언과 annotation 병합 규칙, Spring Boot 내장 Container에서 `@WebServlet`이 등록되는 조건은 [[Java-Web-Servlet-Runtime-Deployment|Servlet 배포 설정, 매핑과 생명주기]]에서 다룬다.

## Request와 Response

`HttpServletRequest`는 method, URI, header, cookie, parameter, body와 request attribute를 제공한다. `HttpServletResponse`는 status, header, cookie와 body 출력을 구성한다.

```java
@WebServlet("/members")
public class MemberServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        request.setCharacterEncoding("UTF-8");
        String name = request.getParameter("name");

        response.setStatus(HttpServletResponse.SC_CREATED);
        response.setContentType("text/plain");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(name);
    }
}
```

예제는 API 위치를 보여 주기 위한 최소 형태다. JSON 응답은 serializer를 사용해 escaping과 type 처리를 맡긴다. 응답의 content type과 encoding은 writer를 얻거나 response가 commit되기 전에 정한다.

### HttpServlet을 상속하는 이유

`HttpServlet`은 protocol과 무관한 추상 class `GenericServlet`을 상속하고, `GenericServlet`은 `Servlet`, `ServletConfig`와 `Serializable`을 구현한다. `@WebServlet`을 붙인 class는 `HttpServlet`을 상속해야 한다.

- `GenericServlet`은 `init`, `destroy`의 단순 구현과 `ServletConfig` method, `log`를 제공한다. 그래서 하위 class는 `getServletConfig().getInitParameter(...)` 대신 `getInitParameter(...)`, `getServletContext()`를 바로 호출할 수 있다. `init(ServletConfig)`를 override하면 `super.init(config)`를 호출해야 config가 보존된다.
- `HttpServlet.service`는 HTTP method에 맞는 `doGet`, `doPost` 같은 method로 분기한다. 하위 class는 필요한 `doXxx`만 override하고 `service`를 override할 이유는 거의 없다. 공통 흐름은 부모가 정하고 단계만 하위 class가 채우는 [[TemplateMethod패턴이란|Template Method 패턴]]의 예다.
- override하지 않은 method로 요청이 오면 기본 `doXxx`가 오류로 응답한다. Tomcat 구현은 HTTP/1.1 이상이면 405 Method Not Allowed, HTTP/1.0 이하면 400을 보낸다. `method="post"` form을 `doGet`만 구현한 Servlet으로 보내면 405가 나는 이유다.

### parameter와 body는 다른 입력 경로다

- Query string과 `application/x-www-form-urlencoded` form field는 Servlet parameter API로 통합 조회할 수 있다. 같은 key가 여러 번 오면 `getParameterValues`처럼 복수 값을 보존한다. 단 명세가 form field를 parameter로 채우도록 요구하는 것은 POST이고 content type이 `application/x-www-form-urlencoded`일 때다. PUT, PATCH, DELETE의 form body는 Spring `FormContentFilter` 같은 별도 처리가 있어야 parameter로 읽힌다.
- JSON이나 text body는 `getInputStream`/`getReader`로 읽고 media type, charset, size limit을 확인한 뒤 parser에 넘긴다. body stream을 여러 계층에서 중복 소비하지 않는다.
- Form은 GET과 POST를 지원한다. `POST`만 form data를 보낼 수 있다는 규칙은 없으며 method와 encoding 지원은 HTML/HTTP 계약을 함께 본다.
- `HttpServletRequest`의 attribute는 같은 request 내부 전달용이고 client parameter가 아니다.
- `HttpServletResponse`는 status, header와 body를 commit하기 전에 구성한다. 수동 JSON 문자열 결합 대신 Jackson 같은 serializer를 사용한다.

### parameter API의 반환값

| API | 값이 없을 때 | 주의점 |
|---|---|---|
| `getParameter(name)` | `null` | 값이 여러 개면 `getParameterValues`의 첫 값만 돌려준다. checkbox나 반복 key의 나머지 값이 오류 없이 사라진다. |
| `getParameterValues(name)` | `null` | 선택하지 않은 checkbox는 name과 value를 아예 보내지 않는다. 아무것도 고르지 않은 제출에서 결과를 바로 순회하면 `NullPointerException`이 난다. |
| `getParameterNames()` | 빈 `Enumeration` | 받은 name을 확인하는 디버깅에 쓸 수 있지만 password 같은 민감 값은 log에 남기지 않는다. |

query string과 POST body에 같은 name이 있으면 query string 값이 먼저 온다. `?a=hello`와 body `a=goodbye&a=world`를 함께 받으면 `getParameter("a")`는 `hello`다. POST form data를 parameter API로 읽기 전에 `getInputStream`이나 `getReader`로 body를 먼저 읽으면 parameter 조회를 방해할 수 있다.

### GET과 POST를 구분하는 기준

- GET은 조회처럼 safe하고 idempotent한 의미에 사용한다. parameter가 query string에 있으면 주소, browser history, proxy와 access log에 노출될 수 있다.
- HTML form의 `method`는 `get`(기본), `post`, `dialog`만 받는다. 로그인 form에서 `method="post"`를 빠뜨리면 id와 password가 query string에 실려 위의 경로로 노출된다.
- browser form으로는 PUT, PATCH, DELETE를 보낼 수 없다. HTTP가 아니라 HTML의 제약이다. JavaScript `fetch`로 실제 method를 보내거나, POST에 hidden field로 실제 method를 담고 Spring `HiddenHttpMethodFilter`(기본 parameter 이름 `_method`, PUT, DELETE, PATCH만 변환)가 바꾸게 한다. Spring Boot 4.1 문서 기준 `spring.mvc.hiddenmethod.filter.enabled`의 기본값은 false이고 `FormContentFilter`는 기본으로 켜져 있다.
- POST body는 HTTP header가 아니며 기본적으로 암호화되지 않는다. 전송 기밀성은 HTTPS로 확보한다.
- POST가 크기 제한을 없애 주는 것은 아니다. Client, proxy, Container와 애플리케이션 각각의 제한이 있다.
- method 선택은 보안 우회 수단이 아니라 HTTP 의미, cache, 재시도와 API 계약을 결정한다.

## 생명주기와 동시성

`Servlet` interface가 정의하는 생명주기는 `init`, 요청마다 실행되는 `service`, 종료 시의 `destroy`다. 여기에 더해 Servlet 명세는 Container가 Servlet, Filter, Listener 같은 container-managed class에서 Jakarta Annotations의 `@PostConstruct`, `@PreDestroy`도 호출하도록 요구한다. Spring 전용 callback이 아니다. 호출 순서와 초기화 실패 조건은 [[Java-Web-Servlet-Runtime-Deployment#생명주기 callback 순서|생명주기 callback 순서]]에서 다룬다.

Container는 같은 Servlet instance의 `service`를 여러 thread에서 동시에 호출할 수 있다. 요청별 가변 상태는 local variable이나 request scope에 두고 Servlet instance field에 저장하지 않는다. 공유 자원이 필요하면 thread-safe 설계와 명확한 소유권이 필요하다.

## 설정과 데이터 scope

| 경계 | 용도 | 주의점 |
|---|---|---|
| `ServletConfig` init parameter | 특정 Servlet의 초기 설정 | runtime 사용자 상태로 쓰지 않는다. |
| `ServletContext` init parameter | 애플리케이션 공통 초기 설정 | 배포 설정과 secret 주입 방식을 분리한다. |
| request attribute | 한 요청의 Controller와 View 간 model | forward에서는 유지되며 redirect에서는 새 요청이 된다. |
| session attribute | 여러 요청에 걸친 사용자별 흐름 | 만료, 동시 접근과 분산 저장을 설계한다. |
| context attribute | 애플리케이션 instance 전체 공유 | concurrent access와 multi-instance 불일치를 고려한다. |

설정 parameter와 runtime attribute는 목적이 다르다. process를 여러 개 띄우는 운영 환경에서 instance 간 공유가 필요하면 database, cache 또는 message system 같은 외부 저장소를 사용한다. Servlet init parameter는 `web.xml`의 `<init-param>`이나 `@WebInitParam`으로, 애플리케이션 공통 값은 `<context-param>`으로 선언한다([[Java-Web-Servlet-Runtime-Deployment#web.xml로 선언하고 매핑하기|web.xml로 선언하고 매핑하기]]).

## Spring MVC와 NestJS로 옮겨 보기

| Servlet 개념 | Spring MVC | NestJS |
|---|---|---|
| URL mapping | `@RequestMapping`, `@GetMapping` | Controller와 `@Get`, `@Post` |
| Filter | Servlet Filter, Spring Security chain | middleware, guard, interceptor |
| request attribute/model | `Model`, request attribute | handler argument와 template model |
| 직접 response 작성 | `HttpServletResponse`, `@ResponseBody` | library-specific response 또는 반환값 |
| Container lifecycle | embedded Servlet Container와 Spring bean lifecycle | Nest application과 provider lifecycle |

추상화가 높아져도 HTTP method, header commit, body parsing, 인증 경계와 동시성 책임은 사라지지 않는다. 문제가 생기면 framework annotation에서 멈추지 않고 underlying runtime 흐름까지 내려가 확인한다.

## 면접 체크포인트

- Servlet 표준이 container 교체 문제를 어떻게 풀었는지 설명한다.
- Servlet Container가 mapping, lifecycle, request/response를 어떻게 관리하는지 설명한다.
- `init`, `service`, `destroy`와 동시 요청의 관계를 말한다.
- `HttpServlet.service`의 method 분기와 override하지 않은 method의 405를 설명한다.
- GET과 POST를 보안 수준이 아니라 HTTP 의미와 데이터 위치로 구분한다.
- `getParameter`가 null과 첫 값을 돌려주는 조건을 말한다.
- request, session, application scope의 수명과 공유 범위를 비교한다.
- URL mapping과 접근 제어가 왜 별개인지 설명한다.

## 출처

- [Jakarta Servlet 6.1](https://jakarta.ee/specifications/servlet/6.1/)
- [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.html)
- [Jakarta Servlet ServletRequest API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/servletrequest)
- [Jakarta Servlet HttpServlet API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservlet)
- [Jakarta Servlet GenericServlet API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/genericservlet)
- [Jakarta EE 9 Platform Specification, namespace change](https://jakarta.ee/specifications/platform/9/jakarta-platform-spec-9.html)
- [Apache Tomcat, HttpServlet.java — GitHub](https://github.com/apache/tomcat/blob/main/java/jakarta/servlet/http/HttpServlet.java)
- [MDN, form element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form)
- [MDN, input type checkbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox)
- [Spring Framework, Spring Web MVC](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
- [Spring Framework, Filters](https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html)
- [Spring Framework, HTTP Method Conversion](https://docs.spring.io/spring-framework/reference/web/webmvc-view/mvc-jsp.html)
- [Spring Boot, Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)
- [Spring Boot, Servlet Web Applications](https://docs.spring.io/spring-boot/reference/web/servlet.html)
- [NestJS, Controllers](https://docs.nestjs.com/controllers)
- [NestJS, Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- 인프런, [개발 환경 설정](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13654)
- 인프런, [Servlet 맛보기](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13656)
- 인프런, [Servlet 매핑](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13658)
- 인프런, [Servlet request, response](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13659)
- 인프런, [Servlet Life-Cycle](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13660)
- 인프런, [form 데이터 처리](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13661)
- 인프런, [JSP request, response](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13663)
- 인프런, [Servlet 데이터 공유](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13665)
- 인프런 Spring MVC 1, 웹 기반: [웹 서버/WAS](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71160), [Servlet](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71161), [동시 요청/thread pool](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71162), [HTML/API/CSR/SSR](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71163), [Java 웹 기술 흐름](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71164)
- 인프런 Spring MVC 1, Servlet: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71166), [Hello Servlet](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71167), [request 개요](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71168), [request 기본](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71169), [입력 경로](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71170), [query parameter](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71171), [HTML form](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71172), [text body](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71173), [JSON body](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71174), [response 기본](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71175), [text/HTML 응답](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71176), [JSON 응답](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71177), [Servlet 정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71178)
- 인프런 김영한의 실전 자바 고급 2편, HTTP 서버: [웹 애플리케이션 서버의 역사](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244492), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244493)

## 관련 문서

- [[Java-Web-Servlet-Runtime-Deployment|Servlet 배포 설정, 매핑과 생명주기]]
- [[Java-Web-JSP-and-SSR|JSP와 서버 사이드 렌더링]]
- [[Spring-Request-Lifecycle|Spring 요청 생명주기]]
- [[Servlet-vs-Spring-Container|Servlet Container와 Spring Container]]
- [[HTTP|HTTP]]
- [[Session|Stateless HTTP 위의 세션]]
