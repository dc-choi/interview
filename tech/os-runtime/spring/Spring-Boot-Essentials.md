---
tags: [spring-boot, auto-configuration, starter, embedded-server]
status: done
category: "OS & Runtime"
aliases: ["Spring Boot Essentials", "AutoConfiguration", "Spring vs Spring Boot"]
---

# Spring Boot Essentials — AutoConfiguration·Starter·Embedded Server

Spring Framework만 쓰던 시절에는 XML·Java Config로 DataSource·DispatcherServlet·Jackson 같은 보일러플레이트를 직접 등록해야 했다. Spring Boot는 **"관례 > 설정"** 원칙으로 이 반복 작업을 자동화한다.

## Spring vs Spring Boot

| 축 | Spring Framework | Spring Boot |
|---|---|---|
| 설정 | 수동 (XML·Java Config) | **AutoConfiguration**으로 기본 구성 |
| 의존성 | 라이브러리 개별 명시 | **Starter**로 묶음 제공 |
| 서버 | 별도 WAS 설치·WAR 배포 | **Embedded Tomcat/Jetty/Undertow** 내장, JAR 단독 실행 |
| 프로덕션 지원 | 수동 구현 | **Actuator**(health·metrics·env) 기본 |
| 프로퍼티 | `PropertyPlaceholderConfigurer` | `application.yml`·`@ConfigurationProperties` |

Spring Boot는 Spring을 대체하지 않는다. **Spring 위에 자동화 레이어**를 얹은 것.

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
| `spring-boot-starter-web` | Spring MVC + Jackson + Tomcat |
| `spring-boot-starter-data-jpa` | Spring Data JPA + Hibernate + HikariCP |
| `spring-boot-starter-security` | Spring Security + 필수 의존성 |
| `spring-boot-starter-test` | JUnit 5 + AssertJ + Mockito + MockMvc |
| `spring-boot-starter-actuator` | Micrometer + Health Endpoint |

버전 충돌·호환성 고민이 제거됨. `spring-boot-dependencies` BOM이 검증된 라이브러리 세트 버전을 고정.

## Embedded Server

Spring Boot는 JAR 안에 **Tomcat/Jetty/Undertow를 포함**해 외부 WAS 없이 단독 실행한다.

- **장점**: 12-Factor 친화적, Docker 이미지 단순, CI/CD 단순
- **기본**: Tomcat. Netty(WebFlux용)·Jetty·Undertow로 교체 가능
- **설정**: `server.port`, `server.tomcat.threads.max`, `server.compression.enabled` 등 속성으로 튜닝

### JAR vs WAR
- **Executable JAR** (기본): `java -jar app.jar`로 실행
- **WAR**: 외부 WAS에 배포해야 할 때. `SpringBootServletInitializer` 상속 + `spring-boot-starter-tomcat`을 `provided`로

## Actuator — 프로덕션 준비

`/actuator/*` 엔드포인트로 운영 가시성 제공.

| 엔드포인트 | 내용 |
|---|---|
| `/actuator/health` | 애플리케이션·DB·디스크·외부 의존성 헬스 |
| `/actuator/metrics` | JVM·HTTP·DB·비즈니스 지표 (Micrometer) |
| `/actuator/env` | 환경 변수·프로퍼티 |
| `/actuator/info` | 빌드 정보·Git 커밋 |
| `/actuator/loggers` | 런타임 로그 레벨 변경 |
| `/actuator/heapdump` | 힙 덤프 다운로드 |

보안: 기본은 `/health`·`/info`만 노출. 나머지는 **인증 필수·내부 네트워크 제한** 권장.

## 흔한 실수

- **`@ComponentScan` 범위 밖에 Bean 두기** — `@SpringBootApplication`이 있는 패키지 아래만 스캔
- **사용자 Bean 정의가 AutoConfiguration을 덮어쓴다는 사실 모름** — `@ConditionalOnMissingBean` 이해 필요
- **`application.yml` 중복 키** — 뒤에 선언된 값이 덮어씀, 잘못된 profile 활성화 시 의도치 않은 설정
- **`spring.factories` 기반 라이브러리 사용** — Boot 3.x+에서는 새 위치(`.imports`)로 이전 필요
- **Actuator 전체 노출** — 민감 정보 유출. `management.endpoints.web.exposure.include` 제한
- **Embedded 서버 튜닝 안 함** — 기본값이 작아 트래픽 폭증 시 스레드 풀 포화

## 면접 체크포인트

- **Spring vs Spring Boot** 차이 3~4가지 (AutoConfig·Starter·Embedded·Actuator)
- **`@SpringBootApplication` 내부 3가지 애노테이션**
- AutoConfiguration의 **`@Conditional*`** 역할
- `@ConditionalOnMissingBean`이 **사용자 커스터마이징을 허용**하는 구조
- Starter가 주는 **버전 호환성·의존성 관리** 이점
- Executable JAR의 **12-Factor/Docker 이점**
- Actuator의 **보안 주의 사항** (전체 노출 금지)

## 출처
- [매일메일 — AutoConfiguration](https://www.maeil-mail.kr/question/23)
- [매일메일 — Spring Boot vs Spring](https://www.maeil-mail.kr/question/24)

## 관련 문서
- [[Spring|Spring (인덱스)]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Spring-MVC-Essentials|Spring MVC Essentials]]
- [[Observability|관측가능성 (Actuator + Micrometer)]]
