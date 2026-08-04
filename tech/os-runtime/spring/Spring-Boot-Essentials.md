---
tags: [spring-boot, auto-configuration, starter, embedded-server]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Essentials", "AutoConfiguration", "Spring vs Spring Boot"]
---

# Spring Boot Essentials — AutoConfiguration, Starter, Embedded Server

Spring Framework만 쓰던 시절에는 XML, Java Config로 DataSource, DispatcherServlet, Jackson 같은 보일러플레이트를 직접 등록해야 했다. Spring Boot는 **"관례 > 설정"** 원칙으로 이 반복 작업을 자동화한다.

## Spring vs Spring Boot

| 축 | Spring Framework | Spring Boot |
|---|---|---|
| 설정 | 수동 (XML, Java Config) | **AutoConfiguration**으로 기본 구성 |
| 의존성 | 라이브러리 개별 명시 | **Starter**로 묶음 제공 |
| 서버 | 별도 WAS 설치, WAR 배포 | **Embedded Tomcat/Jetty**와 실행 가능한 JAR |
| 프로덕션 지원 | 수동 구성 | 선택한 **Actuator starter**로 health, metrics 등 제공 |
| 프로퍼티 | `PropertyPlaceholderConfigurer` | `application.yml`, `@ConfigurationProperties` |

Spring Boot는 Spring을 대체하지 않는다. **Spring 위에 자동화 레이어**를 얹은 것.

## 강의 실습과 현재 version을 구분한다

과거 실습의 Java 11, Gradle과 dependency 조합은 해당 시점의 재현 환경이다. 2026-08-04 기준 Spring Boot 4.1.0은 최소 Java 17, Spring Framework 7.0.8 이상과 Gradle 8.14+ 또는 9.x를 요구한다. 새 project는 현재 `start.spring.io`와 system requirements에서 호환 graph를 다시 생성하고, 오래된 실습을 재현할 때만 당시 version을 함께 고정한다.

## AutoConfiguration 원리

`@SpringBootApplication` 안에 숨어 있는 3단 구조.

```
@SpringBootApplication
  = @SpringBootConfiguration  (= @Configuration)
  + @ComponentScan
  + @EnableAutoConfiguration
```

### 동작 흐름

1. `@EnableAutoConfiguration`이 `@Import(AutoConfigurationImportSelector.class)`를 통해 **자동 설정 후보**를 가져옴
2. Spring Boot 2.7+ 는 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`에서 FQN 목록을 로드 (이전 버전은 `spring.factories`)
3. 각 후보 클래스는 `@Conditional*` 로 **조건부 활성화**
4. 중복 제거 + 제외 필터 + 정렬 후 Bean 등록

### `@Conditional*` 애노테이션이 핵심

```java
@Configuration
@ConditionalOnClass(DataSource.class)          // classpath에 JDBC가 있을 때만
@ConditionalOnMissingBean(DataSource.class)    // 사용자가 정의 안 했을 때만
@ConditionalOnProperty(prefix = "spring.datasource", name = "url")
public class DataSourceAutoConfiguration { ... }
```

- **`@ConditionalOnClass`**: 특정 클래스가 classpath에 있을 때만
- **`@ConditionalOnMissingBean`**: 사용자가 직접 Bean을 정의하지 않았을 때만
- **`@ConditionalOnProperty`**: 설정값이 있을 때만
- **`@ConditionalOnWebApplication`**: 웹 환경일 때만

이 조건들 덕분에 **라이브러리만 추가하면** 필요한 Bean이 자동 등록되고, 사용자가 직접 정의하면 자동 설정이 물러난다.

## Starter 의존성

`spring-boot-starter-*` 모듈은 **관련 라이브러리 세트**를 한 번에 가져온다.

| Starter | 포함 |
|---|---|
| `spring-boot-starter-webmvc` | Spring MVC + JSON 변환 + Tomcat |
| `spring-boot-starter-data-jpa` | Spring Data JPA + Hibernate + HikariCP |
| `spring-boot-starter-security` | Spring Security + 필수 의존성 |
| `spring-boot-starter-test` | JUnit + AssertJ + Mockito + Spring Test |
| `spring-boot-starter-actuator` | Micrometer + Health Endpoint |

버전 충돌, 호환성 고민이 제거됨. `spring-boot-dependencies` BOM이 검증된 라이브러리 세트 버전을 고정.

Spring Boot 4.1에서는 오래 사용된 `spring-boot-starter-web`이 deprecated이고 `spring-boot-starter-webmvc`가 대체 starter다. 과거 강의의 dependency 이름을 현재 프로젝트에 그대로 고정하지 말고, 사용하는 Boot 버전의 starter 표를 확인한다.

dependency tree는 Gradle이나 Maven으로 실제 transitives를 확인한다. application log는 `System.out` 대신 facade와 구현체의 현재 조합을 확인하고, level, output과 보관 정책을 환경별로 설정한다.

## 테스트 설정과 Bean 선택

`@Configuration`이나 `@TestConfiguration`으로 같은 타입의 Bean을 하나 더 등록했다고 해서 그 Bean이 자동으로 우선되지 않는다. `@TestConfiguration`은 테스트 전용 설정을 기본 component scan에서 제외하고 필요한 테스트에서 명시적으로 추가하기 위한 애노테이션이다.

- 후보를 좁힐 때는 `@Qualifier`, 기본 후보를 정할 때는 `@Primary`를 사용한다.
- `@Fallback`은 일반 후보가 없을 때 선택될 후순위 후보를 표시한다.
- 실제 Bean을 교체하는 테스트라면 Spring Framework의 `@TestBean`이나 `@MockitoBean`처럼 override 의미가 분명한 기능을 사용한다.

## Embedded Server

Spring Boot의 servlet stack은 JAR 안에 **Tomcat 또는 Jetty를 포함**해 외부 WAS 없이 단독 실행할 수 있다.

- **장점**: 12-Factor 친화적, Docker 이미지 단순, CI/CD 단순
- **기본**: Tomcat. servlet stack에서는 Jetty로 교체할 수 있고, Netty는 reactive WebFlux stack의 별도 선택이다.
- **설정**: `server.port`, `server.tomcat.threads.max`, `server.compression.enabled` 등 속성으로 튜닝

### JAR vs WAR
- **Executable JAR** (기본): `java -jar app.jar`로 실행
- **WAR**: 외부 WAS에 배포해야 할 때. `SpringBootServletInitializer` 상속 + `spring-boot-starter-tomcat`을 `provided`로

## Actuator — 프로덕션 준비

`/actuator/*` 엔드포인트로 운영 가시성 제공.

| 엔드포인트 | 내용 |
|---|---|
| `/actuator/health` | 애플리케이션, DB, 디스크, 외부 의존성 헬스 |
| `/actuator/metrics` | JVM, HTTP, DB, 비즈니스 지표 (Micrometer) |
| `/actuator/env` | 환경 변수, 프로퍼티 |
| `/actuator/info` | 빌드 정보, Git 커밋 |
| `/actuator/loggers` | 런타임 로그 레벨 변경 |
| `/actuator/heapdump` | 힙 덤프 다운로드 |

Spring Boot 4.1에서 HTTP/JMX 기본 노출은 `health` 하나다. 추가 endpoint는 access/exposure를 명시하고 **인증, authorization과 내부 네트워크 제한**을 함께 적용한다.

## 흔한 실수

- **`@ComponentScan` 범위 밖에 Bean 두기** — `@SpringBootApplication`이 있는 패키지 아래만 스캔
- **사용자 Bean 정의가 AutoConfiguration을 덮어쓴다는 사실 모름** — `@ConditionalOnMissingBean` 이해 필요
- **`application.yml` 중복 키** — 뒤에 선언된 값이 덮어씀, 잘못된 profile 활성화 시 의도치 않은 설정
- **custom auto-configuration을 `spring.factories`에만 등록** — 현대 Boot용 라이브러리는 `AutoConfiguration.imports` 등록 방식을 확인
- **Actuator 전체 노출** — 민감 정보 유출. `management.endpoints.web.exposure.include` 제한
- **Embedded 서버 튜닝 안 함** — 기본값이 작아 트래픽 폭증 시 스레드 풀 포화

## 면접 체크포인트

- **Spring vs Spring Boot** 차이 3~4가지 (AutoConfig, Starter, Embedded, Actuator)
- **`@SpringBootApplication` 내부 3가지 애노테이션**
- AutoConfiguration의 **`@Conditional*`** 역할
- `@ConditionalOnMissingBean`이 **사용자 커스터마이징을 허용**하는 구조
- Starter가 주는 **버전 호환성, 의존성 관리** 이점
- Executable JAR의 **12-Factor/Docker 이점**
- Actuator의 **보안 주의 사항** (전체 노출 금지)

## 출처
- [Spring Boot 4.1, Build Systems와 Starters](https://docs.spring.io/spring-boot/reference/using/build-systems.html)
- [Spring Boot 4.1, System Requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring Boot 4.1, Servlet Web Applications](https://docs.spring.io/spring-boot/reference/web/servlet.html)
- [Spring Boot, Executable Jar Format](https://docs.spring.io/spring-boot/specification/executable-jar/)
- [매일메일 — AutoConfiguration](https://www.maeil-mail.kr/question/23)
- [매일메일 — Spring Boot vs Spring](https://www.maeil-mail.kr/question/24)
- [Spring Boot 공식 문서 — Testing Spring Boot Applications](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- [Spring Framework 공식 문서 — @Primary와 @Fallback](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-primary.html)
- [Spring Framework 공식 문서 — 테스트 Bean Override](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/bean-overriding.html)
- [토비 강사 — Part 1 피드백, 테스트 Bean 우선순위 정정](https://www.inflearn.com/courses/lecture?courseId=337730&unitId=443352)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49603)
- 김영한 강사, [강의 자료와 버전별 정정](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49605)
- 김영한 강사, [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=48553)
- 김영한 강사, [라이브러리 살펴보기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49571)
- 김영한 강사, [빌드하고 실행하기](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49574)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=325630&unitId=49607)

## 관련 문서
- [[Spring|Spring (인덱스)]]
- [[Spring-Boot-Embedded-Server-and-Executable-Jar|내장 서버와 실행 가능 JAR]]
- [[Spring-Boot-Auto-Configuration-and-Starters|자동 구성과 starter]]
- [[Spring-Boot-Externalized-Configuration-and-Profiles|외부 설정과 profile]]
- [[Spring-Boot-Actuator-Operations|Actuator 운영]]
- [[Spring-Boot-Micrometer-Prometheus-Grafana|Micrometer/Prometheus/Grafana]]
- [[Spring-Boot-Custom-Metrics-and-Monitoring|Custom metric과 monitoring]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Spring-MVC-Essentials|Spring MVC Essentials]]
- [[관측가능성(Observability)|관측가능성 (Actuator + Micrometer)]]
