---
tags: [spring, mvc, servlet-filter, interceptor, authentication, exception-handling, error-dispatch]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC Cross Cutting and Errors", "Spring MVC 횡단 관심사와 오류 처리"]
---

# Spring MVC 횡단 관심사와 오류 처리

Controller 바깥에서 요청을 가로채거나 실패를 수습하는 계층이다. Servlet Filter와 HandlerInterceptor의 호출 경계, 그 경계 위에 얹히는 Cookie/Session 인증과 접근 제어, 예외가 터진 위치에 따라 갈리는 처리 경로, 그리고 Servlet error dispatch와 API 오류 응답 contract를 함께 묶었다.

- [[Spring-MVC-Filters-and-Interceptors|Spring MVC Filter, Interceptor와 ArgumentResolver]]: Filter와 Interceptor의 호출 경계와 오류 경로 차이, login redirect 주의, ArgumentResolver 확장, 선택 기준
- [[Spring-MVC-Session-Authentication|Spring MVC Cookie와 Session 로그인]]: login 계층과 흐름, Cookie에 identity를 직접 넣지 않는 이유, HttpSession 핵심, Cookie/session 보안, Custom SessionManager의 한계, redirect와 접근 제어
- [[Spring-Exception-Handling|Spring 예외 처리 전략]]: 발생 지점별 처리 경로, @ExceptionHandler와 @ControllerAdvice, Filter 예외가 새는 이유, 일관된 에러 응답 포맷과 예외 분류 전략
- [[Spring-MVC-Error-Dispatch-and-API-Responses|Spring MVC 오류 dispatch와 API 예외 응답]]: Servlet 오류 경로와 ERROR dispatch, Spring Boot /error, HandlerExceptionResolver, Advice와 ProblemDetail 기반 API error contract, test와 관찰

## 함께 볼 문서

- [[Spring-MVC|Spring MVC — 웹 요청 처리 계층]]
