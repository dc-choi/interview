---
tags: [spring, mvc, dispatcher-servlet, handler-mapping, handler-adapter, view-resolver]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Dispatch Architecture", "Spring MVC 디스패치 구조"]
---

# Spring MVC dispatch 구조

`DispatcherServlet`은 Servlet Container의 request를 받아 Spring이 관리하는 handler와 전략 객체로 연결하는 Front Controller다. URL을 Controller method에 바로 호출하는 단일 table이 아니라 handler 탐색, 호출 adapter, 반환 처리, 예외와 View rendering이 협력하는 pipeline이다.

## 핵심 흐름

```text
Filter chain
  -> DispatcherServlet
  -> HandlerMapping -> HandlerExecutionChain
  -> HandlerAdapter
  -> argument resolvers -> handler
  -> return value handlers -> ModelAndView 또는 response body
  -> ViewResolver -> View.render
  -> HandlerExceptionResolver (예외 경로)
```

1. `HandlerMapping`이 request path, method와 mapping condition에 맞는 handler와 interceptor chain을 찾는다.
2. `DispatcherServlet`이 handler type을 지원하는 `HandlerAdapter`를 선택한다.
3. Adapter가 argument resolution, data binding/validation을 거쳐 handler를 호출한다.
4. 반환값은 return value handler, message converter 또는 `ModelAndView`로 처리된다.
5. 아직 response가 직접 작성되지 않았고 View가 필요하면 `ViewResolver`가 logical name을 실제 `View`로 바꾸고 render한다.
6. 예외는 발생 위치와 등록된 resolver에 따라 `HandlerExceptionResolver` chain으로 간다.

실제 세부 단계는 async request, multipart, locale, interceptor와 handler return type에 따라 달라진다. “항상 Controller 뒤에 ViewResolver가 실행된다”라고 외우지 않는다. `@ResponseBody`/`ResponseEntity` 응답은 View rendering 경로를 쓰지 않는다.

## Mapping과 Adapter를 나누는 이유

Mapping은 누가 처리할지를 찾고 Adapter는 그 handler를 어떻게 호출할지를 안다. 이 분리 덕분에 annotation method, `HttpRequestHandler`, 과거 Controller contract와 custom handler가 같은 Front Controller 아래 공존할 수 있다.

현재 annotation 기반 MVC의 중심은 다음 두 component다.

- `RequestMappingHandlerMapping`: `@RequestMapping` 계열 metadata로 handler method를 등록하고 찾는다.
- `RequestMappingHandlerAdapter`: argument resolver, return value handler, data binder와 message converter를 조합해 method를 호출한다.

`@Controller`는 component scanning 대상과 웹 handler 역할을 함께 나타내고 `@RestController`는 `@Controller`와 `@ResponseBody` 의미를 결합한다. Class와 method level mapping은 조건을 조합한다. Annotation 생략에 의존하기보다 public endpoint contract가 드러나게 작성한다.

## ViewResolver는 rendering 전략이다

Controller가 logical view name을 반환하면 resolver chain이 prefix/suffix, template engine과 locale 같은 조건으로 `View`를 찾는다. JSP의 `InternalResourceView`는 forward를 사용하며 Thymeleaf는 자체 template engine으로 render한다.

- logical name을 filesystem path와 동일시하지 않는다.
- user input을 view name에 직접 합쳐 임의 resource forward를 만들지 않는다.
- template escaping과 URL/JavaScript context의 안전성은 별도로 검증한다.
- Spring Boot auto-configuration은 dependency와 설정에 따라 전략을 등록한다. 현재 등록 목록은 startup report와 application context에서 확인한다.

## Customization 경계

Custom `HandlerMethodArgumentResolver`, `HttpMessageConverter`, interceptor와 ViewResolver를 추가할 수 있지만 framework default를 통째로 교체하지 않도록 extension hook을 선택한다.

- Argument resolver는 인증 principal이나 강한 domain identifier처럼 반복되는 입력 변환에 적합하다.
- Converter는 media type과 Java type contract를 정확히 선언해야 한다.
- Interceptor는 handler metadata가 필요한 공통 처리에 적합하지만 보안 filter chain/transaction의 책임을 무조건 대신하지 않는다.
- 예외 response는 [[Spring-Exception-Handling|예외 처리 전략]]에서 통일한다.

## 관찰과 장애 분석

- Mapping 충돌/404는 registered mappings와 path/method/consumes/produces 조건부터 본다.
- 415는 request `Content-Type`과 readable converter, 406은 `Accept`와 writable representation을 확인한다.
- Binding 실패와 handler 내부 domain 실패를 같은 500으로 합치지 않는다.
- request thread를 오래 막는 DB/I/O는 DispatcherServlet 구조가 해결하지 않는다. timeout와 pool saturation을 함께 관찰한다.

## 출처

- [Spring Framework, DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html), [Handler mappings](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping.html), [View resolution](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/viewresolver.html)
- Spring MVC 구조: [전체 구조](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71202), [mapping/adapter](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71203), [ViewResolver](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71204), [annotation Controller](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71205), [mapping 통합](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71206), [실용적인 handler](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71207), [구조 정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71208)

## 관련 문서

- [[Web-MVC-and-Front-Controller-Evolution|MVC와 Front Controller 진화]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Spring-MVC-Request-Mapping-and-Binding|요청 mapping과 binding]]
- [[Spring-Exception-Handling|Spring 예외 처리]]
