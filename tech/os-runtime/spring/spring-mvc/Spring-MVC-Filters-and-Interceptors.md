---
tags: [spring, mvc, servlet-filter, interceptor, argument-resolver, authentication]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Filters Interceptors", "Spring MVC 필터와 인터셉터"]
---

# Spring MVC Filter, Interceptor와 ArgumentResolver

Filter는 Servlet Container chain에서 resource 전후를 감싸고 Interceptor는 Spring MVC가 선택한 handler 전후를 감싼다. 둘 다 logging/auth 같은 공통 처리가 가능하지만 실행 범위, 오류 경로와 사용할 수 있는 metadata가 다르다.

## 호출 경계

```text
Client
  -> Servlet Filter chain
  -> DispatcherServlet
  -> HandlerInterceptor.preHandle
  -> HandlerAdapter / Controller
  -> postHandle
  -> View render
  -> afterCompletion
```

이 그림은 동기 정상 흐름이다. 예외가 나면 `postHandle`은 호출되지 않을 수 있고 `afterCompletion`은 handler chain 진입/완료 조건에 따라 예외 정보와 함께 호출된다. Async request는 별도 callback/dispatch가 있어 단일 thread 전후로 가정하지 않는다.

## Servlet Filter

`Filter#doFilter`는 request/response를 검사/래핑하고 반드시 다음 처리가 필요하면 `chain.doFilter`를 호출한다.

- Character encoding, security filter chain, CORS, request/response wrapping처럼 Servlet 계층 concern에 적합하다.
- URL pattern과 dispatcher type(`REQUEST`, `ERROR`, `ASYNC`, `FORWARD`, `INCLUDE`)을 명시한다.
- Error dispatch에서 다시 호출될 수 있으므로 중복 logging/side effect를 피한다.
- `try/finally`로 MDC, timer와 request-local resource를 정리한다.
- Body logging wrapper는 size, binary, secret과 one-shot stream 문제를 처리한다.

Spring Boot의 `FilterRegistrationBean`, component/Servlet registration과 Spring Security의 `DelegatingFilterProxy`는 registration/order가 다를 수 있다. 정확한 chain order를 integration test와 startup log로 확인한다.

## HandlerInterceptor

Interceptor는 handler object/`HandlerMethod` metadata에 접근할 수 있다.

- `preHandle`: 호출 전 차단/준비, false면 chain 진행 중단
- `postHandle`: handler 성공 뒤, View rendering 전의 model 조정
- `afterCompletion`: request 완료 뒤 cleanup/logging

Handler annotation 기반 audit/locale와 MVC-specific cross-cutting concern에 유용하다. Response가 이미 commit된 뒤 상태를 바꾸려 하지 않는다.

Path include/exclude allowlist를 수동 유지하는 인증은 새 endpoint/static/error dispatch 누락에 취약하다. Production authentication/authorization은 Spring Security filter chain과 method security 같은 중앙 정책을 우선한다. Interceptor는 그 security context를 활용한 부가 처리에 적합하다.

## Login redirect 주의

미인증 request를 login page로 redirect할 때 API client에는 401/403 JSON이 더 적합할 수 있다. HTML/API content type과 endpoint group을 분리한다. 원래 URL return parameter는 same-origin relative path만 허용해 open redirect를 막는다.

## ArgumentResolver

Custom `HandlerMethodArgumentResolver`는 session/security context에서 current user/tenant 같은 Controller argument를 생성할 수 있다.

```java
String home(@CurrentUser AuthenticatedUser user) { ... }
```

- Annotation/type로 지원 범위를 좁힌다.
- Resolver가 반환한 principal은 인증 결과를 편리하게 전달할 뿐 endpoint authorization을 대체하지 않는다.
- Hidden DB query, remote I/O와 transaction을 넣어 handler 비용을 감추지 않는다.
- Anonymous/expired session의 null/error contract를 명시한다.

## 선택 기준

| 요구 | 기본 선택 |
|---|---|
| 모든 Servlet dispatch와 request wrapper | Filter |
| Handler annotation/method metadata | Interceptor |
| Controller parameter materialization | ArgumentResolver |
| Authentication/authorization | Spring Security filter/method policy |
| Controller 예외 response | HandlerExceptionResolver/Advice |

## 출처

- [Jakarta Servlet 6.1, Filter](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/filter), [Spring MVC interceptors](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html), [Spring MVC argument resolvers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/arguments.html)
- Filter/Interceptor: [Filter 개요](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83339), [Filter logging](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83340), [Filter 인증](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83341), [Interceptor 개요](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83342), [Interceptor logging](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83343), [Interceptor 인증](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83344), [ArgumentResolver](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83345), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83346)

## 관련 문서

- [[Spring-MVC-Session-Authentication|Session login]]
- [[Spring-MVC-Dispatch-Architecture|DispatcherServlet 구조]]
- [[Spring-Exception-Handling|예외 처리]]
- [[Spring-Security-Architecture-and-Configuration|Spring Security 구조와 설정]]
