---
tags: [spring, mvc, servlet, dispatcher-servlet, request-lifecycle, exception-handling, multipart]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC", "Spring Web MVC", "스프링 웹 계층"]
---

# Spring MVC — 웹 요청 처리 계층

Spring MVC는 서블릿 컨테이너 위에 `DispatcherServlet` 하나를 올려 **Front Controller 패턴**으로 HTTP 요청을 처리한다. Tomcat이 소켓과 스레드를 관리하고, Spring 컨테이너가 핸들러 Bean과 전략 객체를 제공하는 **두 컨테이너의 핸드오프**가 이 계층의 뼈대다. 요청 진입, 바인딩, 예외 처리까지 웹 계층에서 반복되는 주제를 모았다.

- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container — 레이어 구분, DispatcherServlet의 이중 정체성, Thread-per-Request, 싱글톤 Bean, WebFlux 대안]]
- [[Spring-Request-Lifecycle|요청 처리 흐름 — Tomcat부터 Controller까지 전 구간, Root vs Servlet ApplicationContext, 부팅 순서, Request-per-Thread]]
- [[Spring-MVC-Essentials|빈출 애노테이션과 주변 개념 — @Component 계열, @RequestBody vs @ModelAttribute, Filter vs Interceptor, WAS vs Web Server]]
- [[Spring-Exception-Handling|예외 처리 전략 — 발생 지점별 처리 경로, @ExceptionHandler와 @ControllerAdvice, Filter 예외, 에러 응답 포맷]]
- [[Spring-Multipart-JSON|Multipart + JSON REST — @RequestPart 패턴, 혼용 금지 원칙, MockMvc 테스트, 크기 제한, 대용량 업로드 대안]]

## 관련 문서
- [[Spring|Spring 개요 (IoC, DI, AOP)]]
- [[Spring-Boot-Essentials|Spring Boot Essentials (AutoConfiguration, Embedded Server)]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[HTTP-Status-Code|HTTP Status Code, Header]]
