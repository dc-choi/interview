---
tags: [spring-boot, embedded-server, servlet-container, executable-jar, deployment]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Embedded Server", "Spring Boot Executable Jar", "내장 톰캣과 실행 가능 JAR"]
---

# Spring Boot 내장 서버와 실행 가능 JAR

Spring Boot는 Spring Framework를 대체하지 않는다. Spring 애플리케이션을 실행하고 배포하는 반복 설정을 내장 서버, 자동 구성과 build plugin으로 표준화한다. 편리함을 제대로 진단하려면 외부 servlet container 방식과 내장 방식의 경계를 함께 이해해야 한다.

## 외부 container 방식

전통적인 servlet 애플리케이션은 다음 순서로 배포된다.

```text
application classes + WEB-INF + dependencies
  -> WAR build
  -> 별도 Tomcat 설치
  -> webapps에 배포
  -> container가 application 초기화
```

Servlet 표준의 `ServletContainerInitializer`는 container 시작 시 호출될 초기화 지점을 제공한다. Spring MVC는 `SpringServletContainerInitializer`와 `WebApplicationInitializer`로 이 과정을 연결해 `ApplicationContext`와 `DispatcherServlet`을 등록할 수 있게 한다.

이 방식은 여러 애플리케이션을 한 container에서 운영하거나 조직이 WAS lifecycle을 중앙 통제할 때 여전히 유효하다. 다만 개발 환경과 운영 환경의 container 설정이 갈라지고, WAR 복사와 재기동 절차가 별도 배포 단위가 되는 비용이 있다.

## 내장 서버 방식

내장 방식은 애플리케이션이 서버를 소유한다.

```text
main()
  -> SpringApplication.run(...)
  -> ApplicationContext 생성
  -> WebServer factory 자동 구성
  -> embedded Tomcat 또는 Jetty 시작
  -> DispatcherServlet 등록
```

- 실행 단위가 애플리케이션 process 하나로 정리된다.
- 서버 version과 설정을 dependency/configuration으로 함께 배포한다.
- local, CI와 production이 같은 artifact를 실행하기 쉬워진다.
- server를 포함했다는 사실이 무중단 배포, 보안 patch와 용량 계획까지 자동 해결하지는 않는다.

Servlet stack의 기본 선택은 Tomcat이며 Jetty 등으로 바꿀 수 있다. Netty는 같은 servlet container의 대체물이 아니라 주로 reactive WebFlux stack의 runtime 선택이다.

## 왜 일반 JAR만으로 충분하지 않았나

일반 JAR manifest는 main class를 지정할 수 있지만 Java 표준 class loader는 JAR 안에 든 dependency JAR을 자동으로 classpath에 올리지 않는다.

초기의 해결책인 shaded/uber JAR은 dependency class를 한 archive에 풀어 합친다. 배포는 단순해지지만 같은 경로의 resource가 충돌할 수 있고 어떤 dependency가 포함됐는지 경계가 흐려진다.

Spring Boot executable JAR은 dependency를 그대로 중첩한다.

```text
app.jar
├── META-INF/MANIFEST.MF
├── BOOT-INF/classes/      application classes
├── BOOT-INF/lib/          dependency JARs
└── Spring Boot loader
```

manifest의 실제 `Main-Class`는 `JarLauncher`이고 application main class는 `Start-Class`에 기록된다. launcher가 중첩 JAR을 읽을 class loader를 준비한 뒤 application main을 호출한다. Maven/Gradle plugin이 이 구조를 만들기 때문에 보통 loader를 직접 구현하지 않는다.

## JAR과 WAR 선택

| 선택 | 적합한 상황 | 운영상 주의점 |
|---|---|---|
| executable JAR | 독립 process, container image, service별 배포 | JVM/server 설정과 종료 신호를 application 배포 계약에 포함 |
| executable WAR | `java -jar`와 외부 container 배포를 함께 지원해야 함 | provided dependency와 두 실행 경로를 모두 테스트 |
| 일반 WAR | 조직 표준 WAS에 위임해야 함 | container version, shared library와 배포 설정 drift 관리 |

기본 선택은 executable JAR이지만 기존 WAS 요구나 platform 제약이 있으면 WAR도 합리적이다. 배포 형식은 아키텍처 원칙이 아니라 운영 환경과 책임 경계의 결과다.

## 장애를 볼 때의 순서

1. `java -jar`로 실제 artifact가 독립 실행되는지 확인한다.
2. manifest의 `Main-Class`/`Start-Class`, `BOOT-INF/classes`, `BOOT-INF/lib`를 확인한다.
3. port 충돌, server binding과 application log를 확인한다.
4. embedded server dependency가 제외되거나 다른 web stack이 선택되지 않았는지 dependency tree를 본다.
5. IDE 실행 성공과 packaged artifact 성공을 별도 검증한다.

## 핵심 판단

- 내장 서버의 본질은 서버가 사라진 것이 아니라 server lifecycle이 application process 안으로 이동한 것이다.
- executable JAR은 모든 class를 한 덩어리로 합치는 방식이 아니라 nested JAR과 launcher로 dependency 경계를 보존한다.
- WAR와 JAR의 선택보다 동일 artifact 재현, 종료/health 계약과 rollback 가능성이 더 중요하다.

## 출처

- [Spring Boot 4.1, Running Your Application](https://docs.spring.io/spring-boot/reference/using/running-your-application.html)
- [Spring Boot 4.1, Nested JARs](https://docs.spring.io/spring-boot/specification/executable-jar/nested-jars.html)
- [Spring Boot 4.1, Launching Executable Jars](https://docs.spring.io/spring-boot/specification/executable-jar/launching.html)
- [Jakarta Servlet, ServletContainerInitializer](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/servletcontainerinitializer)
- 과정 안내: [강의 소개](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148056), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148059), [Spring Framework의 등장](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148062), [Spring Boot의 등장](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148063)
- 외부 container: [소개](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148065), [Tomcat 설치](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148066), [project 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148067), [WAR build/deploy](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148068), [IDE 유료판 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148069), [IDE 무료판 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148070)
- container 초기화: [초기화 1](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148071), [초기화 2](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148072), [Spring container 등록](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148073), [Spring MVC 초기화 지원](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148074), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148075)
- embedded server: [WAR의 단점](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148077), [설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148078), [Servlet](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148079), [Spring](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148080), [build 1](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148081), [build 2](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148082), [boot class](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148601)
- Boot 실행: [project 생성](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148083), [실행 과정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148084), [build/deploy](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148085), [executable JAR](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148086), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148087), [다음 단계](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148172)

## 관련 문서

- [[Spring-Boot-Essentials|Spring Boot Essentials]]
- [[Spring-MVC-Dispatch-Architecture|Spring MVC dispatch 구조]]
- [[Docker-Image-Pipeline|Docker image pipeline]]
