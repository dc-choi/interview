---
tags: [java, web, servlet, jakarta, deployment-descriptor]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Servlet 배포 설정", "web.xml", "Deployment Descriptor", "context path"]
---

# Servlet 배포 설정, 매핑과 생명주기

Servlet Container는 선언된 Servlet, Filter와 Listener를 web application 단위로 읽어 instance를 만들고, 요청 경로를 선언에 연결하고, 정해진 시점에 생명주기 callback을 호출한다. 요청과 응답 처리는 [[Java-Web-Servlet-Runtime]]에서 다룬다.

## context path와 요청 경로 분해

한 Container에 여러 web application을 context path로 나눠 배포하고, 각 application은 자기 `ServletContext`(application scope)를 가진다. Container는 요청 URL의 앞부분과 가장 길게 일치하는 context path의 application을 고르고, 나머지 경로로 Servlet 매핑을 찾는다.

```text
requestURI = contextPath + servletPath + pathInfo   (URL encoding 차이 제외)
```

| context path `/catalog`의 요청 | 매핑 | servletPath | pathInfo |
|---|---|---|---|
| `/catalog/lawn/index.html` | `/lawn/*` | `/lawn` | `/index.html` |
| `/catalog/help/feedback.jsp` | `*.jsp` | `/help/feedback.jsp` | `null` |

- context path는 server root에 배포한 기본 context면 빈 문자열이고, 아니면 `/`로 시작하고 `/`로 끝나지 않는다.
- Tomcat Host가 자동 배포할 때는 WAR나 디렉터리의 이름에서 context path를 정한다. 이름이 `ROOT`면 빈 context path이고, application 안의 `META-INF/context.xml`로는 context path를 정할 수 없다.
- url-pattern은 context path 뒤의 경로에 매칭된다. 같은 application을 다른 context path로 배포해도 매핑은 바뀌지 않는다.
- 경로를 만드는 API마다 기준이 다르다. `getRequestDispatcher("/x")`는 context root 기준이고 `sendRedirect("/x")`는 container root 기준이라 context path를 직접 붙인다([[Java-Web-JSP-and-SSR#forward와 redirect|forward와 redirect]]).
- Spring Boot 내장 Container에서는 `server.servlet.context-path`로 정하고, Thymeleaf의 `@{...}`가 링크에 context path를 붙인다.

## web.xml로 선언하고 매핑하기

`web.xml`(deployment descriptor)은 선언과 매핑을 이름으로 잇는다. `<servlet>`에 이름과 실제 class를 등록하고 `<servlet-mapping>`에서 같은 `<servlet-name>`을 외부 요청 경로에 연결한다. Filter도 `<filter>`와 `<filter-mapping>` 두 단계로 등록한다.

```xml
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" version="6.1">
  <context-param>
    <param-name>images_directory</param-name>
    <param-value>/images</param-value>
  </context-param>

  <servlet>
    <servlet-name>memberServlet</servlet-name>
    <servlet-class>com.example.MemberServlet</servlet-class>
    <init-param>
      <param-name>page_size</param-name>
      <param-value>20</param-value>
    </init-param>
    <load-on-startup>1</load-on-startup>
  </servlet>
  <servlet-mapping>
    <servlet-name>memberServlet</servlet-name>
    <url-pattern>/members</url-pattern>
  </servlet-mapping>

  <filter>
    <filter-name>encodingFilter</filter-name>
    <filter-class>com.example.EncodingFilter</filter-class>
  </filter>
  <filter-mapping>
    <filter-name>encodingFilter</filter-name>
    <url-pattern>/*</url-pattern>
  </filter-mapping>
</web-app>
```

| 선언 | 읽는 API | 공유 범위 |
|---|---|---|
| `<servlet>` 안의 `<init-param>` | `getServletConfig().getInitParameter(...)`, JSP의 `config` | 그 Servlet 선언 하나 |
| `<web-app>` 바로 아래 `<context-param>` | `getServletContext().getInitParameter(...)`, JSP의 `application` | web application 전체 |

password 같은 secret을 init parameter 평문으로 두지 않는다. 배포 설정과 secret 주입을 분리한다.

## 선언 단위와 병합 규칙

- 분산 배포가 아니면 Container는 Servlet 선언 하나에 instance 하나를 쓰고, Filter도 선언마다 instance 하나를 만든다. 같은 class를 다른 이름과 init-param으로 두 번 선언하면 instance도 둘이므로 init-param은 class가 아니라 선언에 속한다. 한 선언에 url-pattern을 여러 개 붙일 수도 있다.
- 요청에 맞는 Filter는 `<url-pattern>` 매핑을 descriptor에 선언한 순서대로 먼저, `<servlet-name>` 매핑을 그다음 선언 순서대로 이어 chain을 만든다. annotation으로만 정의한 Listener, Servlet, Filter의 호출 순서는 정해져 있지 않다. 인코딩 Filter처럼 다른 코드가 parameter를 읽기 전에 실행돼야 하면 descriptor 순서나 framework의 명시적 order로 고정한다.
- descriptor 설정이 annotation보다 우선한다. `@WebServlet`을 descriptor로 덮으려면 `<servlet-name>`이 annotation의 이름과 같아야 하며, 이름을 생략한 annotation의 기본 이름은 class의 fully qualified name이다. 이름이 같으면 descriptor의 url-pattern이 annotation의 pattern을 대체하고, init-param은 합쳐지되 같은 이름이면 descriptor 값이 이긴다. 한쪽을 주석 처리하지 않고 둘 다 남기면 이 병합 규칙이 결과를 정한다.
- `<web-app metadata-complete="true">`이면 `@WebServlet`, `@WebFilter`, `@WebListener`처럼 배포 정보를 담은 annotation을 무시한다. `@HandlesTypes`와 CDI annotation은 이 값과 관계없이 처리된다.
- `<load-on-startup>`이 0 이상이면 배포 때 instance를 만들고 `init`을 호출하며 낮은 값이 먼저다. 없거나 음수면 Container가 시점을 정하고, 요청 처리 시점까지 미루면 첫 요청이 초기화 비용을 낸다.
- `<servlet>`은 `<servlet-class>` 대신 `<jsp-file>`을 가질 수 있다. JSP에서 `config`로 init-param을 읽으려면 이렇게 선언하고 그 선언의 url-pattern으로 요청한다. Tomcat은 이 선언을 별도의 JSP Servlet으로 바꿔 선언한 pattern에만 매핑하므로, 같은 JSP를 `.jsp` 경로로 직접 요청하면 `*.jsp`에 매핑된 기본 JSP Servlet이 처리해 값이 `null`이다. `<load-on-startup>`을 함께 두면 그 JSP를 precompile해 load해야 한다고 schema가 설명한다.

## 생명주기 callback 순서

`Servlet` interface의 `init`, `service`, `destroy`에 더해 Servlet 명세는 Container가 Servlet, Filter, Listener 같은 container-managed class에서 Jakarta Annotations의 `@PostConstruct`, `@PreDestroy`를 호출하도록 요구한다.

| 단계 | 호출 시점 | 알아 둘 규칙 |
|---|---|---|
| 생성 | 배포 때(`load-on-startup`) 또는 처음 필요할 때 | 무거운 준비는 생성자가 아니라 초기화 callback에 둔다. |
| `@PostConstruct` | resource injection이 끝난 뒤, 다른 생명주기 method보다 먼저 | injection 대상이 없어도 호출된다. unchecked exception을 던지면 그 instance는 서비스에 투입되지 않는다. |
| `init(ServletConfig)` | 요청을 받기 전 한 번 | 설정을 읽고 JDBC 같은 비싼 자원을 준비한다. 여기서 예외가 나면 서비스에 투입되지 않고 `destroy`도 호출되지 않는다. |
| `service` | 요청마다, 여러 thread에서 동시에 | `HttpServlet`은 `doGet`, `doPost` 같은 method로 분기한다. |
| `destroy` | Container에서 제거되기 전 | 준비한 자원을 해제한다. |
| `@PreDestroy` | Container에서 제거되기 전 | 명세는 `destroy`와의 상대 순서를 정하지 않는다. |

Tomcat은 instance를 만들 때 injection과 `@PostConstruct`를 처리한 뒤 `init`을 호출하고, 종료 때 `destroy`를 호출한 다음 `@PreDestroy`를 실행한다. 이 순서는 구현 사항이다.

- 초기화는 `init`이나 `@PostConstruct` 한 곳에 모으고, `destroy`와 `@PreDestroy`의 상대 순서에 기대는 정리 로직을 만들지 않는다.
- `init`에서 일부만 준비하고 실패하면 `destroy`가 불리지 않으므로 `init` 안에서 정리한다.
- 요청별 상태는 instance field에 두지 않는다([[Java-Web-Servlet-Runtime#생명주기와 동시성|생명주기와 동시성]]).

## Spring Boot 내장 Container에서의 등록

외부 Container에 WAR로 배포하면 Container 자체의 annotation 탐색과 `web.xml`이 쓰인다. Spring Boot 내장 Container에서는 등록 방식이 다르다.

- Spring bean인 Servlet, Filter와 Listener는 내장 Container에 자동 등록된다. Servlet bean이 하나면 `/`에, 여럿이면 bean 이름을 path prefix로 매핑하고 Filter는 `/*`에 매핑한다.
- `@WebServlet`, `@WebFilter`, `@WebListener` class는 `@ServletComponentScan`이 있어야 등록된다. 기본 스캔 범위는 이 annotation을 붙인 class의 package이고, 내장 Container를 쓸 때만 스캔하며 standalone Container에서는 효과가 없다.
- `@ServletComponentScan`을 빠뜨리면 mapping이 등록되지 않는다. Spring MVC의 `DispatcherServlet`이 기본값 `/`에 매핑돼 있으면 요청은 그쪽으로 가고, 맞는 handler가 없으면 보통 404가 된다.
- 세밀한 제어는 `ServletRegistrationBean`, `FilterRegistrationBean`, `ServletListenerRegistrationBean`으로 한다. Filter 순서는 class에 `@Order`를 붙이거나 `Ordered`를 구현하거나 `FilterRegistrationBean.setOrder`로 정한다. bean method에 붙인 `@Order`로는 정할 수 없다.

## 면접 체크포인트

- `requestURI`를 context path, servlet path와 path info로 나누고 url-pattern이 어느 부분에 매칭되는지 설명한다.
- init-param과 context-param의 선언 위치와 공유 범위를 비교한다.
- Filter chain 순서를 고정하는 방법과 annotation만 쓸 때의 한계를 말한다.
- `@PostConstruct`, `init`, `destroy`, `@PreDestroy`의 호출 시점과 순서 보장 범위를 설명한다.
- Spring Boot 내장 Container에서 `@WebServlet`이 등록되는 조건을 말한다.

## 출처

- [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.html)
- [Jakarta EE, web-common 6.1 XML Schema](https://jakarta.ee/xml/ns/jakartaee/web-common_6_1.xsd)
- [Jakarta Servlet 6.1, HttpServletRequest API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletrequest)
- [Jakarta Servlet 6.1, HttpServletResponse API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletresponse)
- [Apache Tomcat 11, The Context Container](https://tomcat.apache.org/tomcat-11.0-doc/config/context.html)
- [Apache Tomcat, StandardWrapper.java — GitHub](https://github.com/apache/tomcat/blob/main/java/org/apache/catalina/core/StandardWrapper.java)
- [Apache Tomcat, ContextConfig.java — GitHub](https://github.com/apache/tomcat/blob/main/java/org/apache/catalina/startup/ContextConfig.java)
- [Spring Boot, Servlet Web Applications](https://docs.spring.io/spring-boot/reference/web/servlet.html)
- [Spring Boot, ServletComponentScan API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/web/server/servlet/context/ServletComponentScan.html)
- [Spring Boot, Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)
- [인프런, Servlet 맛보기](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13656)
- [인프런, Servlet 맵핑](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13658)
- [인프런, Servlet Life-Cycle](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13660)
- [인프런, JSP 내장객체](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13664)
- [인프런, Servlet 데이터 공유](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13665)
- [인프런, 한글처리](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13668)
- [인프런, 김영한, 프로젝트 생성 (서블릿)](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71166)
- [인프런, 김영한, Hello 서블릿](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71167)

## 관련 문서

- [[Java-Web-Servlet-Runtime|Servlet 런타임과 요청 처리]]
- [[Java-Web-JSP-and-SSR|JSP와 서버 사이드 렌더링]]
- [[Servlet-vs-Spring-Container|Servlet Container와 Spring Container]]
- [[Spring-MVC-Filters-and-Interceptors|Spring MVC Filter와 Interceptor]]
