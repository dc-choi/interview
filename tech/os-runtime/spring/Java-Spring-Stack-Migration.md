---
tags: [java, spring-boot, migration, modernization, compatibility, graalvm, spring-ai]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["Java Spring Stack Migration", "Java Spring 현대화", "Spring Boot 4 마이그레이션", "모던 백엔드 전환"]
---

# Java와 Spring 스택 마이그레이션

Java와 Spring의 major upgrade는 JDK 하나를 바꾸는 작업이 아니다. build tool, Spring Boot와 Framework, Jakarta API, Servlet container, 직렬화, null-safety와 선택적 native 또는 AI 모듈이 **호환 집합**으로 움직인다. 컴파일 성공은 출발점이며 외부 계약, runtime 동작과 운영 rollback까지 검증해야 전환이 끝난다.

## 버전 목록보다 호환 그래프

```text
JDK <-> build tool과 plugin <-> third-party library
       <-> Spring Boot <-> Spring Framework
                       <-> Jakarta와 Servlet container
                       <-> Jackson과 null-safety
                       <-> Native Image, Spring AI 같은 선택 기능
```

한 node만 올리면 classpath와 plugin은 맞아도 runtime behavior가 달라질 수 있다. 반대로 모든 node를 한 번에 올리면 원인 격리가 어려워진다. 현재 조합, 목표 조합과 중간 조합을 versioned matrix로 관리한다.

| 축 | 먼저 확인할 계약 |
|---|---|
| JDK | 최소와 최대 지원, 제거 API, JVM option, locale와 charset |
| Build | Maven 또는 Gradle, compiler target, test와 packaging plugin |
| Framework | Boot BOM, Framework, Spring portfolio와 third-party starter |
| Web | Jakarta namespace, Servlet baseline, container와 WAR 배포 |
| Data와 JSON | driver, ORM, schema, Jackson module과 wire format |
| Type contract | JSpecify, Kotlin nullability와 annotation processor |
| Optional | Native Image metadata, Spring AI와 model provider |

## 전환 전에 기준선을 고정한다

1. 현재 production artifact와 설정으로 test, latency, error, startup와 memory 기준선을 남긴다.
2. 목표 major의 직전 maintenance release로 먼저 올리고 deprecation을 제거한다.
3. BOM 밖에서 직접 pin한 dependency와 사내 starter의 호환 버전을 조사한다.
4. API, JSON, message, DB와 security 동작을 characterization 또는 contract test로 고정한다.
5. rollback 가능한 이전 image, schema와 설정 조합을 보존한다.

오래된 버전에서 여러 major를 건너뛸수록 먼저 직전 안정선으로 이동해야 변경 원인을 한 세대씩 분리할 수 있다.

## Null 계약과 런타임 검증을 구분한다

Spring Framework 7은 null 계약에 JSpecify를 사용하며, `org.springframework.lang`의 JSR-305 기반 `@NonNull`, `@Nullable`, `@NonNullApi`, `@NonNullFields`는 deprecated 상태다. 새 코드에서는 보통 package에 `@NullMarked`를 선언하고 예외 지점에 JSpecify `@Nullable`을 붙인다.

JSpecify null 애노테이션은 IDE/정적 분석기가 읽는 **타입 계약**이다. Jakarta Validation의 `@NotNull`은 Validator가 실행될 때 검사하는 **런타임 제약**이다. 서비스 메서드 검증은 Spring의 `@Validated`와 method validation이 실제로 활성화되어야 하며, 어느 쪽도 생성자와 도메인 메서드의 불변식 검사를 자동으로 대신하지 않는다.

### null 계약을 build 실패와 즉시 실패로 강제한다

Java는 Kotlin처럼 parameter 선언만으로 null 전달을 compile 단계에서 막지 못하므로 두 겹으로 막는다.

- 런타임 fail-fast: 버그를 만들지 않는 것 다음으로 중요한 것은 버그를 만나면 즉시 실패하는 것이다. 예외 없이 지나간 null은 필수 정보가 빠진 채 저장되는 논리 버그가 되어 늦게 발견된다. 생성자와 정적 factory뿐 아니라 `changeNickname` 같은 변경 method에서도 `Objects.requireNonNull(value, message)`로 검사한다. 상태 전제 조건 위반(PENDING일 때만 `activate`)은 `IllegalStateException`, 잘못된 인자 값은 `IllegalArgumentException`으로 구분한다. JDK `Objects`에는 상태 검사 method가 없으므로 Spring `Assert.state`나 명시적 조건 검사를 쓴다.
- Build 게이트: IDE는 null 계약 위반을 경고만 하므로 그대로 build되고 배포된다. 운영에서 그 코드가 실행되어 `NullPointerException`이 나야 드러나는 버그를 앞당기려면 정적 분석을 build에 넣어 위반을 build 실패로 만든다. Package에 `@NullMarked`를 두어 기본값을 non-null로 하고, 저장 전 null인 `getId()` 같은 예외 지점에만 `@Nullable`을 붙인다. 주요 domain과 application package부터 적용한다.
- 도구 선택: Spring Framework 7 문서는 NullAway 같은 build plugin으로 application의 null 안전성을 build 시점에 강제하는 방법을 안내하고, `@NullMarked` package만 검사하는 `NullAway:OnlyNullMarked=true` 설정을 권한다. Spring 6 시절 자료는 JSR-305 기반 `@NonNullApi`와 Gradle SpotBugs plugin(`spotbugsMain`, `spotbugsTest` task)을 쓴다. SpotBugs 4.10.0의 JSpecify 지원은 부분적이라 `@NullMarked`의 scope 기본값을 아직 해석하지 않으므로, JSpecify로 옮긴 뒤 package 기본값을 build 게이트로 쓰려면 분석기의 지원 범위부터 확인한다.
- 오탐 관리: 분석기 기본 규칙이 모든 project에 맞지는 않는다. Hibernate proxy를 고려한 entity `equals`처럼 알려진 오탐은 exclude filter나 이유를 적은 suppression으로 좁게 제외하고, 남은 경고는 정리 단계에서 주기적으로 없앤다.

## 단계별 마이그레이션

### 1. JDK와 build chain

새 JDK에서 기존 binary를 먼저 실행해 runtime warning과 behavior 차이를 찾고, third-party library와 build tool을 갱신한 뒤 재컴파일한다. `jdeps`, compiler warning과 removed API 목록을 함께 본다. 새 language feature 채택은 runtime 전환과 분리한다. 특히 preview feature는 build와 runtime flag, 향후 source 변경 비용까지 승인해야 한다.

### 2. Spring 호환 집합

Spring Boot major upgrade guide를 기준으로 다음 순서를 따른다.

- 목표 major 직전 line의 최신 maintenance release로 이동한다.
- 제거된 deprecation과 unmanaged dependency를 먼저 정리한다.
- Boot BOM, Framework와 Spring portfolio의 지원 matrix를 맞춘다.
- property migrator 같은 임시 도구는 진단에만 쓰고 전환 후 제거한다.
- modularization이나 starter 변경은 중간 호환 구성을 이용해 import와 dependency를 단계적으로 고친다.

2026-08-04 기준 Spring Boot 4는 Java 17 이상과 Spring Framework 7을 요구하며 Jakarta EE 11과 Servlet 6.1 기준선으로 이동했다. Java 25는 중요한 목표 runtime이지만 Boot 4의 최소 요구사항은 아니다. Jackson 3가 기본 방향이고 Jackson 2 호환 module은 이행용 stopgap으로 다룬다.

### 3. 외부 동작 계약

컴파일과 context startup만으로는 다음 회귀를 잡지 못한다.

- JSON field, 날짜와 숫자 format, unknown property와 null 처리
- HTTP status, header, content negotiation과 exception mapping
- validation, transaction 경계와 ORM query
- security filter chain, session과 token 검증
- logging charset, metric 이름, health와 readiness

Golden response와 consumer contract, 실제 DB를 쓰는 integration test로 이전 artifact와 새 artifact를 비교한다. 차이가 의도된 경우 contract version과 migration note를 남긴다.

### 4. Native Image는 별도 배포 트랙

GraalVM Native Image는 startup과 memory 특성을 바꿀 수 있지만 closed-world analysis 때문에 reflection, proxy, resource와 serialization metadata가 필요하다. JVM 배포가 성공했다고 native 전환까지 자동 승인하지 않는다.

- tracing agent 결과를 검토 가능한 reachability metadata로 고정한다.
- build time, image size, startup, steady-state throughput와 memory를 함께 측정한다.
- observability agent, TLS와 동적 plugin의 native 호환성을 확인한다.
- 같은 기능의 JVM artifact를 rollback 경로로 유지한다.

### 5. AI 통합은 core upgrade와 분리한다

Spring AI 2 계열은 Spring Boot 4 line과 맞물리지만, model provider, vector store와 MCP를 붙이는 것은 플랫폼 upgrade와 다른 제품 변경이다. core migration을 안정화한 뒤 별도 module이나 service 경계에서 도입하면 장애 원인과 rollback을 분리하기 쉽다.

## 레거시 Spring MVC XML 설정 해석

`web.xml`과 Spring XML로 구성한 레거시 MVC 애플리케이션은 각 설정 요소가 Java config와 Spring Boot의 어디에 대응하는지 알아야 옮길 수 있다. 한 번에 Java config로 바꾸지 말고 위의 외부 동작 계약 test를 먼저 고정한다.

| 레거시 설정 | 역할 | Java config | Spring Boot 4.1 |
|---|---|---|---|
| `web.xml`의 `DispatcherServlet`과 init-param `contextConfigLocation`(예: `servlet-context.xml`) | Servlet `WebApplicationContext` | `AbstractAnnotationConfigDispatcherServletInitializer`의 `getServletConfigClasses()` | `DispatcherServlet` 자동 등록, 기본 mapping `/` |
| `web.xml`의 `ContextLoaderListener`와 context-param(예: `root-context.xml`) | Root `WebApplicationContext` | `getRootConfigClasses()` | 보통 단일 context |
| `web.xml`의 `CharacterEncodingFilter` | 요청과 응답 charset | `getServletFilters()` | 자동 등록, `spring.servlet.encoding.*`(Boot 3.x까지 `server.servlet.encoding.*`) |
| `<context:annotation-config/>` | `@Autowired`, `@PostConstruct` 등을 처리하는 post-processor 등록 | `AnnotationConfigApplicationContext`가 자동 등록 | 자동 |
| `<context:component-scan>` | stereotype bean 자동 등록 | `@ComponentScan` | `@SpringBootApplication` |
| `<mvc:annotation-driven/>` | annotation 기반 MVC의 infrastructure bean 등록 | `@EnableWebMvc`와 `WebMvcConfigurer` | MVC 자동 구성. `@EnableWebMvc`를 붙이면 자동 구성이 물러나므로 `WebMvcConfigurer`만 둔다 |
| `<mvc:resources>` | 정적 resource handler | `addResourceHandlers` | classpath `/static`, `/public`, `/resources`, `/META-INF/resources` |
| `InternalResourceViewResolver`(prefix `/WEB-INF/views/`, suffix `.jsp`) | view 이름을 JSP 경로로 변환 | `configureViewResolvers`의 `registry.jsp(prefix, suffix)` | `spring.mvc.view.prefix`, `spring.mvc.view.suffix`. 실행 JAR는 JSP를 지원하지 않아 WAR packaging 필요 |
| `<mvc:interceptors>`의 `<mvc:mapping>`, `<mvc:exclude-mapping>` | interceptor 적용 범위 | `addInterceptors()`의 `addPathPatterns()`, `excludePathPatterns()` | 같음 |
| `HandlerInterceptorAdapter` 상속 | interceptor 구현 | `HandlerInterceptor`의 default method 직접 구현 | 같음 |
| `<import resource>`, `GenericXmlApplicationContext` | 설정 조합 | `@Import`, `AnnotationConfigApplicationContext` | component scan과 자동 구성 |

- `HandlerInterceptorAdapter`는 Spring Framework 5.3에서 deprecated됐고 6.0부터 source에서 빠졌다. 이 class를 상속한 코드는 Spring 6 이상에서 compile되지 않으므로 `HandlerInterceptor`를 직접 구현한다.
- Spring Framework 7.0부터 Spring MVC XML namespace 지원은 deprecated다. 제거 계획은 아직 없지만 Java config model에 맞춰 갱신되지 않는다.
- `<context:annotation-config/>`는 선언한 context의 bean만 처리한다. Servlet context XML에만 두면 controller만 처리되고 root context의 service는 빠진다. Root와 Servlet context의 역할은 [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]의 4절에 있다.
- XML로 선언한 interceptor는 `MappedInterceptor` bean이라 모든 `HandlerMapping`이 감지하지만, Java config는 자신이 관리하는 `HandlerMapping`에만 넘긴다. 다른 framework의 `HandlerMapping`에도 걸리던 interceptor는 옮긴 뒤 적용 범위를 test한다.
- 레거시 자료에 `DispatcherServlet` mapping이 `/*`로 적혀 있어도 그대로 옮기지 않는다. `/*`는 JSP forward까지 가로챌 수 있어 보통 `/`를 쓴다.
- Session을 검사해 redirect하던 login interceptor는 새 endpoint와 error dispatch 누락에 취약하므로 옮길 때 Spring Security로 대체할지 검토한다([[Spring-MVC-Filters-and-Interceptors|Spring MVC Filter와 Interceptor]]).
- IDE template이 이 파일들을 자동 생성해도 한 번 직접 구성해 보면 container, context와 MVC 기반 bean이 어디서 생기는지 이해하기 쉽다.

## 검증 게이트

| Gate | 통과 근거 | 실패 시 |
|---|---|---|
| Build | dependency lock, compile, static analysis | 호환 matrix와 plugin을 수정 |
| Behavior | unit, integration, contract와 golden test | 변경 계약을 분리하거나 adapter 추가 |
| Runtime | startup, warning, error, latency와 resource | JVM option과 dependency 조사 |
| Staging | production-like traffic와 data | canary 전환 중지 |
| Rollout | canary guardrail과 rollback rehearsal | 이전 artifact와 설정으로 복귀 |

DB migration은 application rollback과 독립적으로 되돌릴 수 없을 수 있다. schema는 expand-contract로 먼저 호환 범위를 넓히고, 새 코드가 안정된 뒤 오래된 field와 index를 제거한다.

## 실패 패턴

- 목표 버전의 신기능을 한꺼번에 채택해 platform 전환과 feature 변경을 섞는다.
- managed dependency와 사내 starter만 보고 실제 transitive graph를 확인하지 않는다.
- compile success를 runtime과 wire compatibility의 증거로 사용한다.
- native build 성공을 production 성능과 기능 호환의 증거로 사용한다.
- AI starter의 버전 요구 때문에 core service 전체를 성급히 끌어올린다.
- rollback image는 있지만 이전 schema와 설정이 새 코드 변경을 견디지 못한다.

## 출처

- [모던 백엔드 강좌 소개 — Nextree](https://www.nextree.io/modeon-baegendeu-gangjwa-sogae/)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Framework 7 General Availability](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability/)
- [Spring Framework 공식 문서 — Null-safety와 JSpecify](https://docs.spring.io/spring-framework/reference/core/null-safety.html)
- [Spring Framework 공식 문서 — Bean Validation](https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html)
- [Oracle JDK 25 Migration Guide](https://docs.oracle.com/en/java/javase/25/migrate/)
- [GraalVM Reachability Metadata](https://www.graalvm.org/latest/reference-manual/native-image/metadata/)
- [Spring AI Getting Started](https://docs.spring.io/spring-ai/reference/getting-started.html)
- [Spring Framework 공식 문서 — Annotation-based Container Configuration](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config.html)
- [Spring Framework 공식 문서 — Context Hierarchy](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/context-hierarchy.html)
- [Spring Framework 공식 문서 — Servlet Config](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/container-config.html)
- [Spring Framework 공식 문서 — Enable MVC Configuration](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/enable.html)
- [Spring Framework 공식 문서 — MVC Interceptors](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html)
- [Spring Framework 공식 문서 — MVC View Resolvers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/view-resolvers.html)
- [Spring Framework 5.3.39 — `HandlerInterceptorAdapter` source](https://github.com/spring-projects/spring-framework/blob/v5.3.39/spring-webmvc/src/main/java/org/springframework/web/servlet/handler/HandlerInterceptorAdapter.java)
- [Spring Framework 7.0.9 — `Assert` source](https://github.com/spring-projects/spring-framework/blob/v7.0.9/spring-core/src/main/java/org/springframework/util/Assert.java)
- [Spring Boot 공식 문서 — Servlet Web Applications](https://docs.spring.io/spring-boot/reference/web/servlet.html)
- [Spring Boot 공식 문서 — Common Application Properties](https://docs.spring.io/spring-boot/appendix/application-properties/index.html)
- [Spring Boot 4.1.1 — `ServletEncodingProperties` source](https://github.com/spring-projects/spring-boot/blob/v4.1.1/module/spring-boot-servlet/src/main/java/org/springframework/boot/servlet/autoconfigure/ServletEncodingProperties.java)
- [SpotBugs CHANGELOG — 4.10.0](https://github.com/spotbugs/spotbugs/blob/master/CHANGELOG.md)
- [토비 강사 — Spring Null Safety](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291135)
- [토비 강사 — @NonNull과 @NotNull](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=468588)
- [토비 강사 — Member 도메인 로직 개발](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291132)
- [토비 강사 — Member 도메인 코드 개선](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291177)
- [토비 강사 — 코드 다듬기](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306805)
- [토비 강사 — 엔티티의 equals()와 hashCode() 구현](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312377)
- [인프런 — 스프링 설정 파일 분리](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13719)
- [인프런 — 의존객체 자동 주입](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13720)
- [인프런 — 웹 프로그래밍 설계 모델](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13726)
- [인프런 — 스프링 MVC 웹서비스 2](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13728)
- [인프런 — STS를 이용하지 않은 웹 프로젝트](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13729)
- [인프런 — Service & Dao 객체 구현](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13730)
- [인프런 — 리다이렉트, 인터셉트](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13735)

## 관련 문서

- [[Spring-Boot-Essentials|Spring Boot 핵심 구조]]
- [[Runtime-Stack-Evolution|런타임 스택 진화]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Async-vs-Threads|비동기와 가상 스레드]]
- [[JVM-Architecture|JVM 아키텍처]]
