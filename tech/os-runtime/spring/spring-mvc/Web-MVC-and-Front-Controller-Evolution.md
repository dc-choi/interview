---
tags: [spring, servlet, jsp, mvc, front-controller, adapter]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Web MVC Front Controller", "MVC와 프론트 컨트롤러 진화"]
---

# Web MVC와 Front Controller의 진화

Servlet이 HTTP를 처리하고 JSP가 HTML을 만들 수 있어도 한 파일이나 Controller가 입력, 업무 규칙, 화면 생성까지 모두 맡으면 변경 이유가 뒤엉킨다. MVC는 Controller, Model, View의 책임을 분리하고 Front Controller는 공통 진입과 확장 전략을 중앙화한다.

## Servlet/JSP에서 MVC로

| 역할 | 책임 | 경계 |
|---|---|---|
| Controller | request 해석, use case 호출, 결과/화면 선택 | HTML 문자열과 persistence logic을 직접 만들지 않는다. |
| Model | View가 render할 presentation data | domain entity 전체나 request mutable state와 동일하지 않다. |
| View | model을 HTML 같은 representation으로 render | transaction과 business decision을 수행하지 않는다. |

Servlet에서 HTML을 직접 이어 붙이면 escaping, layout과 test가 어려워진다. JSP scriptlet에서 조회/저장 logic까지 실행하면 Java code와 markup이 다시 결합된다. Controller가 request attribute에 model을 넣고 `RequestDispatcher.forward`로 `WEB-INF` 아래 View에 전달하는 방식은 역사적인 MVC 출발점이다.

`WEB-INF`는 browser의 직접 resource 요청을 막아 Controller 경유를 유도하지만 authorization을 자동 제공하지 않는다. 입력 검증과 권한 검사는 Controller/security 계층에서 수행한다.

## MVC만으로 남는 반복

Controller마다 다음 작업을 반복하면 URL/view 경로, forward와 parameter 처리 방식이 흩어진다.

- 공통 encoding, logging, 인증과 오류 처리
- URL에서 대상 Controller 선택
- parameter를 Controller 입력으로 변환
- 논리 view name을 실제 View로 변환
- model 전달과 render

Filter도 공통 HTTP 처리를 할 수 있지만 어떤 Controller 형태를 호출하고 반환값을 어떻게 해석할지는 application framework의 책임이다. 이 지점에 Front Controller를 둔다.

## Front Controller의 단계적 설계

```text
Request
  -> Front Controller
  -> Handler lookup
  -> Handler Adapter
  -> Controller
  -> ModelAndView
  -> View Resolver
  -> View render
```

1. URL과 Controller map을 한 Servlet에 모아 진입점을 통일한다.
2. `View` 객체가 forward/render를 맡아 Controller의 중복을 없앤다.
3. Controller에서 Servlet API를 떼고 parameter map, model과 logical view name을 사용한다.
4. 자주 쓰는 형태에는 model을 인자로 주고 view name만 반환하는 간단한 contract를 제공한다.
5. 서로 다른 Controller contract는 Handler Adapter가 공통 `ModelAndView` 결과로 맞춘다.

각 단계는 이전 version을 무조건 폐기하는 정답 순서가 아니라 책임을 어디로 이동시키는지 보여 주는 설계 실험이다. 편의 contract가 단순할수록 세밀한 HTTP 제어가 필요한 handler에는 부족할 수 있으므로 하나의 Controller interface로 모든 use case를 강제하지 않는다.

## Adapter가 확장 지점을 만든다

Front Controller가 모든 handler type을 `instanceof` 분기로 직접 알면 새 Controller 종류마다 중앙 code를 고쳐야 한다. `supports(handler)`와 `handle(...)` contract를 가진 adapter 목록을 두면 lookup과 invocation이 분리된다.

- Handler Mapping은 요청 조건으로 handler를 찾는다.
- Handler Adapter는 해당 handler를 호출할 수 있는지와 입력/반환 변환을 안다.
- `ModelAndView`는 model과 view 선택을 transport하는 한 형태다.
- View Resolver는 logical name을 실제 View로 바꾼다.

Adapter를 추가하면 중앙 분기를 줄일 수 있지만 OCP가 자동 보장되는 것은 아니다. adapter 선택 순서, 중복 지원, 오류 계약과 configuration 변경은 여전히 설계해야 한다.

## Spring MVC로 이어지는 구조

Spring MVC의 `DispatcherServlet`은 이 Front Controller 역할을 하며 `HandlerMapping`, `HandlerAdapter`, `ViewResolver`, `HandlerExceptionResolver` 같은 전략을 조합한다. Annotation Controller가 기본이어도 과거 Controller/HttpRequestHandler나 custom handler를 지원할 수 있는 이유가 이 분리다.

Application code는 framework를 다시 만들기보다 이 경계를 이용한다.

- HTTP binding과 response 선택은 Controller에 둔다.
- business transaction은 service/use case에 둔다.
- View model과 API DTO를 persistence entity에서 분리한다.
- cross-cutting concern은 Filter/Interceptor/Advice 중 실제 실행 범위에 맞춰 둔다.

## NestJS에 대응시키기

NestJS도 platform adapter 위에서 route metadata로 handler를 찾고 pipe/guard/interceptor/filter를 거쳐 Controller method를 호출한다. DispatcherServlet component와 일대일 대응하지는 않지만 중앙 dispatch, handler metadata, argument 변환과 cross-cutting pipeline이라는 설계 원리는 같다.

## 출처

- [Spring Framework, DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html), [View technologies](https://docs.spring.io/spring-framework/reference/web/webmvc-view.html)
- Servlet/JSP/MVC: [요구사항](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71180), [Servlet 화면](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71181), [JSP 화면](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71182), [MVC 개요](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71183), [MVC 적용](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71184), [MVC 한계](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71185), [정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71186)
- Front Controller: [패턴](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71188), [진입점 v1](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71189), [View v2](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71190), [ModelAndView v3](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71191), [편의 contract v4](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71192), [Adapter v5-1](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71194), [Adapter v5-2](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71195), [설계 정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71196)

## 관련 문서

- [[Java-Web-JSP-and-SSR|JSP와 SSR]]
- [[Java-Web-Servlet-Runtime|Servlet 런타임]]
- [[Spring-MVC-Dispatch-Architecture|Spring MVC dispatch 구조]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
