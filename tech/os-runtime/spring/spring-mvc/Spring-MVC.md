---
tags: [spring, mvc, servlet, dispatcher-servlet, request-lifecycle, exception-handling, multipart]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC", "Spring Web MVC", "스프링 웹 계층"]
---

# Spring MVC — 웹 요청 처리 계층

Spring MVC는 서블릿 컨테이너 위에 `DispatcherServlet` 하나를 올려 **Front Controller 패턴**으로 HTTP 요청을 처리한다. Tomcat이 소켓과 스레드를 관리하고, Spring 컨테이너가 핸들러 Bean과 전략 객체를 제공하는 **두 컨테이너의 핸드오프**가 이 계층의 뼈대다. 요청 진입, 바인딩, 서버 렌더링, 예외 처리까지 웹 계층에서 반복되는 주제를 모았다.

- [[Spring-MVC-Dispatch-and-Lifecycle|디스패치 구조와 요청 생명주기]]: Front Controller로의 진화, DispatcherServlet과 전략 객체, Tomcat부터 Controller까지의 흐름, Servlet/Spring 컨테이너 레이어
- [[Spring-MVC-Binding-and-Validation|요청 바인딩과 검증]]: mapping 조건, parameter와 body binding, 타입 변환과 formatting, multipart, 수동 검증과 Jakarta Validation
- [[Spring-MVC-Server-Rendering|서버 렌더링과 화면 문구]]: Thymeleaf SSR CRUD와 PRG, template 표현식과 escaping, form binding, MessageSource와 국제화
- [[Spring-MVC-Cross-Cutting-and-Errors|횡단 관심사와 오류 처리]]: Filter와 Interceptor 경계, Cookie/Session 인증, 예외 처리 전략, error dispatch와 API 오류 응답
- [[Spring-MVC-Essentials|빈출 애노테이션과 주변 개념]]: 네 폴더를 가로지르는 한 장 요약 (@Component 계열, @RequestBody vs @ModelAttribute, Redirect와 forward, Filter vs Interceptor, WAS vs Web Server와 Tomcat 기초)

## 출처

- 인프런 Spring MVC 1: [강의 범위](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71157), [수업 자료와 버전 안내](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71804), [소스 사용 안내](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71807), [전체 정리와 다음 주제](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71242)
- 인프런 Spring MVC 2: [강의 범위](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83203), [수업 자료와 버전 안내](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83249), [전체 정리와 다음 주제](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83388)

## 관련 문서
- [[Spring|Spring 개요 (IoC, DI, AOP)]]
- [[Spring-Boot-Essentials|Spring Boot Essentials (AutoConfiguration, Embedded Server)]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[HTTP-Status-Code|HTTP Status Code, Header]]
