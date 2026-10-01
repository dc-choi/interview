---
tags: [java, web, servlet, jsp, ssr]
status: index
category: "OS & Runtime"
aliases: ["Java Web", "Java 웹"]
---

# Java Web

Java 웹 애플리케이션의 HTTP 진입점부터 서버 사이드 렌더링, 상태와 데이터베이스 경계까지 연결한다. Servlet/JSP의 원리를 현재 Jakarta 명세와 Spring MVC, NestJS의 대응 개념으로 확장해 이해하는 것이 목표다.

## 학습 지도

- [x] [[Java-Web-Servlet-Runtime|Servlet 런타임과 요청 처리]]
  - [x] [[Java-Web-Servlet-Runtime-Deployment|Servlet 배포 설정, 매핑과 생명주기]] — context path, web.xml, 선언 병합, callback 순서, Spring Boot 등록
- [x] [[Java-Web-JSP-and-SSR|JSP와 서버 사이드 렌더링]]
- [x] [[Java-Web-State-and-Persistence|웹 상태와 JDBC 영속성]]
  - [x] [[Java-Web-State-and-Persistence-DataSource|Servlet Container의 JDBC driver와 DataSource]] — driver 배치, JNDI DataSource, Tomcat 기본 pool 값

## 함께 볼 문서

- [[Spring-Request-Lifecycle|Spring 요청 생명주기]]
- [[Servlet-vs-Spring-Container|Servlet Container와 Spring Container]]
- [[Cookie|HTTP Cookie]]
- [[Session|Stateless HTTP 위의 세션]]
- [[Spring-JDBC-Essentials|Spring JDBC Essentials]]
- [[Connection-Pool|DB 커넥션 풀]]

## 출처

[실전 JSP 강의자료](https://www.inflearn.com/courses/lecture?courseId=182737&unitId=13653)는 본문을 확인하지 못해 내용에 반영하지 않았다.
