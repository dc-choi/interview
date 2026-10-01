---
tags: [java, jsp, jakarta-pages, ssr, template]
status: done
verified_at: 2026-09-30
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

### 수정이 바로 보이는 이유와 운영 설정

Tomcat 11의 JSP engine Jasper는 기본값 `development=true`에서 JSP에 접근할 때 JSP와 의존 파일의 변경을 검사해 다시 compile한다. 검사 간격 `modificationTestInterval`의 기본값은 4초이고, 0이면 매 접근마다 검사한다. 재시작 없이 수정이 보이는 개발 편의 기능이지만 요청 경로에 검사 비용을 더한다.

- 운영의 주된 최적화는 JSP precompile이다. 배포 전에 translation과 compile을 끝내면 첫 요청의 비용도 사라진다.
- precompile이 어렵다면 `development=false`로 접근 시 검사를 끄고, 필요하면 `checkInterval`(기본값 0)을 0보다 크게 두어 background recompile을 쓴다. 두 값은 `$CATALINA_BASE/conf/web.xml`의 JspServlet init parameter다.
- generated `.java`와 `.class`는 기본적으로 그 web application의 work directory(`$CATALINA_BASE/work` 아래)에 생긴다. 예외의 line 번호가 generated Servlet 기준이면 이 파일에서 원래 JSP 위치를 찾는다.

Servlet class 변경의 자동 반영은 JSP와 다른 기능이다. Tomcat Context의 `reloadable="true"`는 `WEB-INF/classes`와 `WEB-INF/lib`를 감시하다 web application 전체를 reload한다. runtime 부담이 커서 기본값은 false이고 운영에는 권장되지 않으며, 필요하면 Manager application으로 필요할 때만 reload한다. reload는 web application classloader를 새로 만들므로 static 상태와 application cache가 초기화되고, 이전 classloader를 참조가 붙잡으면 누수가 생긴다([[JVM-Architecture]]의 ClassLoader 누수).

## JSP syntax와 사용 원칙

| 형태 | 예 | 현재 사용 원칙 |
|---|---|---|
| page directive | `<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>` | encoding, content type, import, session, buffer, errorPage 같은 page 설정에 사용한다. |
| include directive | `<%@ include file="header.jsp" %>` | translation 시점에 파일 내용을 합친다. 고정된 공통 조각에 쓴다. |
| taglib directive | `<%@ taglib uri="..." prefix="c" %>` | JSTL 같은 tag library의 식별 URI와 호출 접두사를 정한다. |
| declaration | `<%! int count; %>` | generated Servlet field가 될 수 있어 공유 상태와 동시성 위험이 있다. 피한다. |
| scriptlet | `<% ... %>` | Java logic이 view에 섞인다. 새 코드에서는 사용하지 않는다. |
| expression | `<%= value %>` | escaping이 자동 보장되지 않는다. EL과 안전한 출력 도구를 사용한다. |
| JSP comment | `<%-- ... --%>` | 응답 HTML에 포함되지 않는 template 주석이다. |
| HTML comment | `<!-- ... -->` | 해석하지 않는 template text로 응답에 그대로 나간다. 안의 scriptlet과 expression은 실행된다. |

Controller는 입력 검증, use case 호출과 model 조립을 맡고 JSP는 표시를 맡는다. 조건과 반복은 EL, JSTL이나 custom tag로 표현하고 database 접근, transaction과 업무 규칙은 view 밖에 둔다.

사용자 입력을 HTML에 출력할 때 단순 문자열 결합이나 raw expression을 사용하지 않는다. HTML body, attribute, URL, JavaScript 등 출력 context에 맞는 encoding을 적용하고, 필요하면 검증된 sanitizer를 별도로 사용한다.

`<!-- <%= value %> -->`처럼 HTML 주석 안에 둔 expression도 실행되어 값이 page source에 노출된다. 내부 메모와 비활성 코드는 JSP 주석으로 처리한다.

### include 지시어와 `<jsp:include>`

| 구분 | `<%@ include file="..." %>` | `<jsp:include page="..."/>` |
|---|---|---|
| 시점 | translation time | request time |
| 포함하는 것 | 파일 텍스트. 포함한 page와 한 translation unit으로 compile된다 | 대상 resource를 실행한 출력 |
| 상대 경로 기준 | 현재 JSP 파일 | 현재 JSP page |
| 맞는 조각 | layout처럼 고정된 조각 | 요청마다 달라지는 조각, 동적 resource |

- include 지시어로 합친 파일은 page 지시어와 선언을 공유한다. 같은 page 속성에 다른 값을 주면 translation 오류이고, 같은 이름의 선언은 한 generated Servlet 안에서 충돌한다.
- 포함된 파일의 변경을 container에 알리는 방법은 명세에 없다. Tomcat의 Jasper는 이를 감지해 부모 JSP를 다시 compile하지만 container 기능이다.
- `<jsp:include>`로 포함한 page는 status code를 바꾸거나 header를 설정할 수 없다. cookie 추가 같은 호출은 무시된다.
- taglib 지시어는 그 prefix를 쓰는 action보다 앞에 둔다. 뒤에 오거나 tag library descriptor를 찾지 못하면 translation 오류다.

## implicit object와 scope

| implicit object | 역할 |
|---|---|
| `request`, `response` | 현재 HTTP 요청과 응답 |
| `session` | 현재 사용자 session. page 지시어 `session`의 기본값이 true라 session이 없으면 새로 만든다. session이 필요 없는 page는 `session="false"`로 둔다. |
| `application` | 현재 `ServletContext`, 모든 요청이 공유 |
| `config` | generated Servlet의 `ServletConfig` |
| `out` | buffered response output. 기본 buffer는 구현 크기 8kb 이상이고 `autoFlush` 기본값은 true다. |
| `pageContext` | page와 네 scope 접근을 묶는 context |
| `exception` | `isErrorPage="true"`인 error page에서만 제공 |

JSP scope는 좁은 순서로 page, request, session, application이다. `getAttribute` 결과는 `Object`이므로 실제 type을 확인해야 한다. application scope의 가변 값은 여러 요청과 thread가 공유하므로 요청별 model 저장소로 쓰지 않는다.

익명 요청마다 session이 생기면 memory와 session store 부담이 커진다. session을 쓰지 않는 page에서 `session="false"`를 두는 이유는 [[Spring-MVC-Session-Authentication]]의 `getSession(false)` 원칙과 같다.

## errorPage와 isErrorPage

오류가 날 수 있는 page에 `<%@ page errorPage="/WEB-INF/views/error.jsp" %>`를, 오류 page에 `<%@ page isErrorPage="true" %>`를 둔다.

- page가 잡지 못한 Throwable은 errorPage로 forward된다. 예외 객체는 request attribute `jakarta.servlet.error.exception`과 하위 호환용 `jakarta.servlet.jsp.jspException`에 담긴다.
- `isErrorPage="true"`인 page에서만 `exception` 암시 변수가 초기화되고 `${pageContext.errorData.statusCode}` 같은 `ErrorData`를 쓸 수 있다. false인 page에서 `exception`을 참조하면 translation 오류다.
- 오류 page의 응답 status 기본값은 `errorData.statusCode`(기본 500)지만 page가 200을 포함한 다른 값으로 바꿀 수 있다. 오류 page가 200을 내면 monitoring, cache와 client가 성공으로 오인한다.
- page 지시어로 errorPage를 지정한 page에는 `web.xml`의 error page가 쓰이지 않는다. page별 지정과 애플리케이션 전체 `<error-page>`가 섞이면 오류 응답이 page마다 달라진다.
- `autoFlush=true`에서 buffer 내용이 이미 response로 flush됐다면 errorPage로의 dispatch가 실패할 수 있다. 큰 page 뒤쪽에서 난 예외는 반쯤 그린 화면으로 끝날 수 있다. commit 뒤 전환이 실패하는 원리는 [[Spring-MVC-Error-Dispatch-and-API-Responses]]와 같다.

`exception.getMessage()`를 사용자 화면에 그대로 내보내면 내부 구조와 값이 드러난다. 사용자에게는 일반 메시지와 추적 ID를 주고 예외와 맥락은 server log에 남긴다. 새 코드는 page별 errorPage보다 `web.xml`의 `<error-page>`(exception-type, error-code)나 framework 예외 처리로 중앙화한다.

## forward와 redirect

| 방식 | 동작 | request와 URL | `/`로 시작하는 경로의 기준 |
|---|---|---|---|
| `RequestDispatcher.forward` | server 내부에서 다른 resource로 제어 전달 | 같은 request attribute 사용, browser URL 유지 | 현재 web application의 context root |
| `sendRedirect` | 3xx response로 client에 새 요청 지시 | 새 request, browser URL 변경 | servlet container root. context path를 직접 붙여야 한다. |

조회 결과를 JSP에 보여 주는 전통적인 MVC 흐름은 Controller가 request attribute에 model을 넣고 forward한다. form 처리 후 새로고침 중복 제출을 피하려면 POST 처리 뒤 redirect하는 PRG(Post/Redirect/Get)를 고려한다.

`sendRedirect("secondPage.jsp")`처럼 `/` 없는 상대 경로는 현재 request URI 기준이라 page를 다른 폴더로 옮기면 깨진다. `response.sendRedirect(request.getContextPath() + "/login")`처럼 context path를 명시하고, context path 개념은 [[Java-Web-Servlet-Runtime-Deployment]]에서 확인한다. response가 이미 commit된 뒤 `sendRedirect`를 호출하면 `IllegalStateException`이 난다.

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
- include 지시어와 `<jsp:include>`의 시점과 포함 대상 차이를 말한다.
- page, request, session, application scope의 수명과 공유 범위를 비교한다.
- scriptlet을 피하고 Controller와 view를 분리하는 이유를 말한다.
- errorPage가 200 응답이나 flush 뒤 dispatch 실패로 이어지는 조건을 설명한다.
- forward와 redirect가 request, round trip, URL과 경로 기준에 미치는 차이를 설명한다.
- request decoding과 response encoding의 설정 시점을 설명한다.

## 출처

- [Jakarta Pages 4.0](https://jakarta.ee/specifications/pages/4.0/)
- [Jakarta Pages 4.0 Specification](https://jakarta.ee/specifications/pages/4.0/jakarta-server-pages-spec-4.0.pdf)
- [Jakarta ServletRequest API, character encoding](https://jakarta.ee/specifications/platform/11/apidocs/jakarta/servlet/servletrequest)
- [Jakarta Servlet RequestDispatcher API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/requestdispatcher)
- [Jakarta Servlet HttpServletResponse API](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletresponse)
- [Apache Tomcat 11, Jasper 2 JSP Engine How To](https://tomcat.apache.org/tomcat-11.0-doc/jasper-howto.html)
- [Apache Tomcat 11, The Context Container](https://tomcat.apache.org/tomcat-11.0-doc/config/context.html)
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
- [[Java-Web-Servlet-Runtime-Deployment|Servlet 배포 설정, 매핑과 생명주기]]
- [[HTTP-Content-Type|HTTP Content-Type]]
- [[Browser-URL-Flow|브라우저 URL 입력부터 화면 렌더링까지]]
- [[Spring-Request-Lifecycle|Spring 요청 생명주기]]
- [[Spring-MVC-Error-Dispatch-and-API-Responses|Spring MVC 오류 dispatch와 API 예외 응답]]
