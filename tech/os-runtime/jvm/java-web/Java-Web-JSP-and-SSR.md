---
tags: [java, jsp, jakarta-pages, ssr, template]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["JSP와 SSR", "Jakarta Pages"]
---

# JSP와 서버 사이드 렌더링

서버 사이드 렌더링(SSR)은 서버가 데이터와 template을 결합해 완성된 HTML을 응답하는 방식이다. JSP는 이 역할을 위한 Java template 기술이며, 현재 표준 명칭은 Jakarta Pages다.

## 정적 문서, SSR과 JSON API

| 응답 방식 | 서버가 만드는 것 | 적합한 경우 |
|---|---|---|
| 정적 파일 | 미리 준비된 HTML, CSS, image | 내용 변화가 적고 별도 server logic이 없는 자원 |
| SSR | 요청 시 model을 반영한 HTML | 초기 화면, server 중심 form과 SEO가 중요한 page |
| JSON API | 구조화된 data | SPA, mobile client와 service 간 통신 |

방식은 배타적이지 않다. 한 서비스도 SSR page, JSON endpoint와 정적 asset을 함께 제공할 수 있다.

## JSP가 실행되는 방식

Jakarta Pages 4.0 Container는 JSP template을 Jakarta Servlet으로 번역하고 compile해 실행한다.

```text
request -> JSP resource
        -> generated Servlet
        -> Java execution and template output
        -> HTML response
```

따라서 JSP의 request, response와 session은 Servlet runtime의 같은 객체와 scope다. 첫 요청이나 변경 뒤 translation과 compilation 비용이 보일 수 있고, 실행 중 예외의 stack trace에는 generated Servlet 정보가 나타날 수 있다.

과거 예제의 `javax.servlet.jsp.*`와 Eclipse `WebContent` layout은 현재 표준의 기준이 아니다. Jakarta EE 9 이후 namespace는 `jakarta.*`이며 Jakarta Pages 4.0은 Java SE 17 이상을 요구한다.

## JSP syntax와 사용 원칙

| 형태 | 예 | 현재 사용 원칙 |
|---|---|---|
| directive | `<%@ page ... %>` | encoding, content type, tag library 같은 page 설정에 사용한다. |
| declaration | `<%! int count; %>` | generated Servlet field가 될 수 있어 공유 상태와 동시성 위험이 있다. 피한다. |
| scriptlet | `<% ... %>` | Java logic이 view에 섞인다. 새 코드에서는 사용하지 않는다. |
| expression | `<%= value %>` | escaping이 자동 보장되지 않는다. EL과 안전한 출력 도구를 사용한다. |
| JSP comment | `<%-- ... --%>` | 응답 HTML에 포함되지 않는 template 주석이다. |

Controller는 입력 검증, use case 호출과 model 조립을 맡고 JSP는 표시를 맡는다. 조건과 반복은 EL, JSTL이나 custom tag로 표현하고 database 접근, transaction과 업무 규칙은 view 밖에 둔다.

사용자 입력을 HTML에 출력할 때 단순 문자열 결합이나 raw expression을 사용하지 않는다. HTML body, attribute, URL, JavaScript 등 출력 context에 맞는 encoding을 적용하고, 필요하면 검증된 sanitizer를 별도로 사용한다.

## implicit object와 scope

| implicit object | 역할 |
|---|---|
| `request`, `response` | 현재 HTTP 요청과 응답 |
| `session` | 현재 사용자 session, page 설정에 따라 사용 여부 결정 |
| `application` | 현재 `ServletContext`, 모든 요청이 공유 |
| `config` | generated Servlet의 `ServletConfig` |
| `out` | buffered response output |
| `pageContext` | page와 네 scope 접근을 묶는 context |
| `exception` | error page로 지정된 JSP에서만 제공 |

JSP scope는 좁은 순서로 page, request, session, application이다. `getAttribute` 결과는 `Object`이므로 실제 type을 확인해야 한다. application scope의 가변 값은 여러 요청과 thread가 공유하므로 요청별 model 저장소로 쓰지 않는다.

## forward와 redirect

| 방식 | 동작 | request와 URL |
|---|---|---|
| `RequestDispatcher.forward` | server 내부에서 다른 resource로 제어 전달 | 같은 request attribute 사용, browser URL 유지 |
| `sendRedirect` | 3xx response로 client에 새 요청 지시 | 새 request, browser URL 변경 |

조회 결과를 JSP에 보여 주는 전통적인 MVC 흐름은 Controller가 request attribute에 model을 넣고 forward한다. form 처리 후 새로고침 중복 제출을 피하려면 POST 처리 뒤 redirect하는 PRG(Post/Redirect/Get)를 고려한다.

## UTF-8은 경계마다 명시한다

- request body encoding은 parameter나 reader를 처음 읽기 전에 설정한다.
- query string decoding은 Container와 connector 설정의 영향을 받으므로 현재 runtime 문서를 확인한다.
- JSP source에는 `pageEncoding="UTF-8"`, response에는 적절한 `Content-Type`과 charset을 지정한다.
- 반복 설정은 현재 namespace의 `jakarta.servlet.Filter`나 framework 설정으로 중앙화한다.
- database, message와 external API까지 입출력 경계의 encoding을 일관되게 확인한다.

한글만 별도 변환하는 임시 처리는 이미 잘못 decoding된 문자열을 다시 추측하게 만든다. byte를 character로 바꾸는 최초 경계에서 charset을 맞춘다.

## 현재 framework에서의 SSR

### Spring MVC

Controller가 logical view name과 model을 반환하면 `ViewResolver`가 실제 view를 찾고 render한다. JSP/JSTL도 지원하지만 Spring Boot executable JAR에서는 JSP가 지원되지 않으며, 일반적인 Tomcat/Jetty WAR 배포 등 packaging 조건을 확인해야 한다. JSP file은 직접 접근을 막기 위해 보통 `WEB-INF` 아래 둔다.

Thymeleaf와 FreeMarker 같은 template engine도 같은 MVC의 model-to-view 역할을 수행한다. engine을 바꿔도 escaping, view와 business logic 분리, redirect 의미는 그대로 남는다.

### NestJS

NestJS는 Express 또는 Fastify adapter와 template engine을 연결하고 Controller의 `@Render()`로 model을 view에 전달할 수 있다. engine 설정과 adapter 지원 범위는 다르므로 선택한 platform 문서를 기준으로 구성한다.

```ts
@Get()
@Render('index')
home() {
  return { title: 'Home' };
}
```

## 면접 체크포인트

- JSP가 Servlet으로 translation, compilation되어 실행된다는 점을 설명한다.
- page, request, session, application scope의 수명과 공유 범위를 비교한다.
- scriptlet을 피하고 Controller와 view를 분리하는 이유를 말한다.
- forward와 redirect가 request, round trip과 URL에 미치는 차이를 설명한다.
- request decoding과 response encoding의 설정 시점을 설명한다.

## 출처

- [Jakarta Pages 4.0](https://jakarta.ee/specifications/pages/4.0/)
- [Jakarta Pages 4.0 Specification](https://jakarta.ee/specifications/pages/4.0/jakarta-server-pages-spec-4.0.pdf)
- [Jakarta ServletRequest API, character encoding](https://jakarta.ee/specifications/platform/11/apidocs/jakarta/servlet/servletrequest)
- [Jakarta Servlet RequestDispatcher API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/requestdispatcher)
- [Spring Framework, View Technologies](https://docs.spring.io/spring-framework/reference/web/webmvc-view.html)
- [Spring Framework, JSP and JSTL](https://docs.spring.io/spring-framework/reference/web/webmvc-view/mvc-jsp.html)
- [Spring Boot, Servlet Web Applications](https://docs.spring.io/spring-boot/reference/web/servlet.html)
- [NestJS, MVC](https://docs.nestjs.com/techniques/mvc)
- [OWASP, Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- 인프런, [웹 프로그램 개요](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13652)
- 인프런, [JSP 맛보기](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13655)
- 인프런, [JSP 스크립트](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13662)
- 인프런, [JSP request, response](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13663)
- 인프런, [JSP 내장객체](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13664)
- 인프런, [한글처리](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13668)

## 관련 문서

- [[Java-Web-Servlet-Runtime|Servlet 런타임과 요청 처리]]
- [[HTTP-Content-Type|HTTP Content-Type]]
- [[Browser-URL-Flow|브라우저 URL 입력부터 화면 렌더링까지]]
- [[Spring-Request-Lifecycle|Spring 요청 생명주기]]
