---
tags: [spring, mvc, dispatcher-servlet, front-controller, request-lifecycle, servlet]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC Dispatch and Lifecycle", "Spring MVC 디스패치 구조와 요청 생명주기"]
---

# Spring MVC 디스패치 구조와 요청 생명주기

요청이 어떤 구조를 거쳐 Controller에 도달하는지 다루는 묶음이다. Servlet/JSP에서 Front Controller로 책임이 분리된 배경, DispatcherServlet과 HandlerMapping/Adapter/ViewResolver의 전략 구조, Tomcat 소켓부터 Controller 반환까지의 전 구간 흐름, 그리고 그 흐름이 지나는 Servlet Container와 Spring Container의 레이어 구분까지를 함께 본다.

- [[Web-MVC-and-Front-Controller-Evolution|Web MVC와 Front Controller의 진화]]: Servlet/JSP에서 MVC로의 책임 분리, Front Controller의 단계적 설계, Adapter 확장 지점과 Spring MVC로 이어지는 구조, NestJS 대응
- [[Spring-MVC-Dispatch-Architecture|Spring MVC dispatch 구조]]: DispatcherServlet 핵심 흐름, HandlerMapping과 HandlerAdapter를 나누는 이유, ViewResolver 렌더링 전략, customization 경계와 장애 분석
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]: Tomcat부터 Controller까지 전 구간, Root vs Servlet ApplicationContext, 부팅 순서, Controller 싱글톤과 Request-per-Thread
- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]: 레이어 구분, DispatcherServlet의 이중 정체성, Thread-per-Request와 싱글톤 Bean, 부모-자식 ApplicationContext, WebFlux 대안

## 함께 볼 문서

- [[Spring-MVC|Spring MVC — 웹 요청 처리 계층]]
