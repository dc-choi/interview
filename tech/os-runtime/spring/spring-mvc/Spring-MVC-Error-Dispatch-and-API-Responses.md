---
tags: [spring, mvc, error-dispatch, exception-resolver, problem-detail, api-error]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Error Dispatch", "Spring MVC 오류 dispatch와 API 응답"]
---

# Spring MVC 오류 dispatch와 API 예외 응답

Servlet error page와 Spring MVC exception resolver는 서로 다른 층이다. 예외가 DispatcherServlet 안에서 resolver로 처리되면 Container error dispatch까지 가지 않을 수 있고, Filter/Container에서 실패하면 MVC advice의 범위 밖일 수 있다.

## Servlet 오류 경로

Servlet은 예외를 밖으로 던지거나 `response.sendError(status, message)`로 Container에 오류 처리를 요청할 수 있다. Response가 아직 commit되지 않았다면 Container는 status/exception mapping에 맞는 error page로 `ERROR` dispatch를 수행할 수 있다.

```text
REQUEST dispatch -> Servlet/Controller 실패
  -> Container error mapping
  -> ERROR dispatch -> /error 또는 error resource
```

Error dispatch는 동일한 network request 안의 내부 dispatch지만 Filter/DispatcherServlet/Interceptor 일부가 다시 실행될 수 있다. `DispatcherType.ERROR`, error path exclusion과 idempotent logging을 설계한다. Error request attribute에는 status, exception, request URI 등이 포함될 수 있으나 client response에 그대로 노출하지 않는다.

`sendError`와 body 직접 작성/`setStatus`를 섞거나 response commit 뒤 오류 page로 전환하려 하면 일관된 결과를 보장하기 어렵다.

## Spring Boot `/error`

Spring Boot Servlet application은 일반적으로 Container error page를 `/error`로 연결하고 `BasicErrorController`와 `ErrorAttributes` 기반의 HTML/다른 representation fallback을 제공한다. Template/static error page 우선순위와 노출 property는 사용하는 Boot version의 reference를 확인한다.

- Browser HTML error page와 JSON API error contract를 같은 default Map에 맡기지 않는다.
- Stack trace, exception message, binding error와 path를 외부에 기본 노출하지 않는다.
- 상세 원인은 server log/trace ID로 연결하고 client에는 stable code와 안전한 detail을 준다.
- `/error` fallback은 마지막 안전망이고 domain API 설계의 주 경로가 아니다.

## HandlerExceptionResolver

`DispatcherServlet` 내부에서 발생한 예외는 resolver chain이 예외를 response/`ModelAndView`로 변환할 기회를 가진다. Spring MVC의 주요 resolver는 다음 역할을 맡는다.

- `ExceptionHandlerExceptionResolver`: `@ExceptionHandler`, `@ControllerAdvice`
- `ResponseStatusExceptionResolver`: `@ResponseStatus`, `ResponseStatusException`
- `DefaultHandlerExceptionResolver`: Spring MVC 표준 예외를 4xx/5xx status로 매핑

Resolver가 처리했다고 해서 business operation이 정상 성공한 것은 아니다. HTTP status, body, logging/metric 분류를 오류 의미에 맞게 유지한다.

## `@ExceptionHandler`와 Advice

Controller-local handler는 해당 Controller 범위의 예외를 처리하고 `@ControllerAdvice`/`@RestControllerAdvice`는 선택한 Controller 집합에 교차 적용된다.

- 가장 구체적인 예외와 cause/root matching, 여러 advice의 `@Order`를 test한다.
- 모든 `Exception`을 400으로 바꾸지 않는다. Client 오류, authorization, conflict, dependency와 internal defect를 구분한다.
- Domain exception을 HTTP에 직접 결합할지 adapter에서 mapping할지 architecture boundary를 정한다.
- Filter/security chain 예외는 MVC advice에 자동 도달한다고 가정하지 않는다.

## 현재 API error contract

Spring MVC는 RFC 9457 기반 `ProblemDetail`과 `ErrorResponse`를 지원한다.

```json
{
  "type": "https://example.com/problems/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "Request contains invalid fields",
  "instance": "/orders",
  "code": "ORDER_INPUT_INVALID"
}
```

- `type`, `title`, `status`, `detail`, `instance`의 표준 의미를 보존한다.
- Application code/field errors/trace ID는 extension으로 추가한다.
- Internal exception message, SQL/path/token을 detail에 복사하지 않는다.
- 400 malformed body, 401 unauthenticated, 403 forbidden, 404 absence, 409 state conflict, 422 semantic validation 등은 API 정책과 RFC semantics를 일관되게 적용한다.
- Content negotiation을 하더라도 같은 오류가 Accept header에 따라 의미/status가 바뀌지 않게 한다.

## Test와 관찰

- HTML request와 JSON request의 error rendering을 각각 test한다.
- Controller/binding/Filter/security/async/dependency failure 지점을 분리한다.
- 이미 commit된 streaming response 실패는 일반 JSON error body로 되돌릴 수 없음을 처리한다.
- Error code/status/exception class/trace를 metric과 log에 연결하되 PII cardinality를 제한한다.

## 출처

- [Spring Framework, MVC exceptions](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html), [Spring MVC error responses](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html), [Spring Boot error handling](https://docs.spring.io/spring-boot/reference/web/servlet.html#web.servlet.spring-mvc.error-handling)
- Servlet/HTML error: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83348), [exception/sendError](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83349), [error page 등록](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83350), [ERROR dispatch](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83351), [Filter dispatcher type](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83352), [Interceptor 재호출](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83353), [Boot error page 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83354), [Boot error page 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83355), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83356)
- API error: [시작](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83358), [BasicErrorController](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83359), [Resolver 시작](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83360), [custom resolver](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83361), [Spring resolver 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83362), [Spring resolver 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83363), [ExceptionHandler](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83364), [ControllerAdvice](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83365), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83366)

## 관련 문서

- [[Spring-Exception-Handling|Spring 예외 처리 전략]]
- [[Spring-MVC-Filters-and-Interceptors|Filter와 Interceptor]]
- [[HTTP-Status-Code|HTTP status]]
- [[API-Conventions-Response|API response convention]]
