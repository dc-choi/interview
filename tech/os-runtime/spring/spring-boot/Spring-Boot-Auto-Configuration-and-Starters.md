---
tags: [spring-boot, auto-configuration, conditional, starter, dependency-management]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Auto Configuration", "Spring Boot Starters", "자동 구성과 스타터"]
---

# Spring Boot 자동 구성과 스타터

Spring Boot의 생산성은 compatible dependency set을 선택하는 일과 반복적인 Bean 등록을 분리해 자동화하는 데서 나온다. Starter는 dependency 선택의 단위를 제공하고, auto-configuration은 classpath/Bean/property/runtime 조건을 보고 기본 Bean을 등록한다.

## 세 층을 구분한다

| 층 | 책임 | 사용자 제어 지점 |
|---|---|---|
| BOM/dependency management | 함께 검증된 library version 집합 | Boot version, 명시적 override |
| starter | 용도별 dependency 묶음 | 필요한 starter 선택, 불필요한 transitive 제외 |
| auto-configuration | runtime 조건에 따른 기본 Bean | property, 사용자 Bean, exclude |

Starter를 추가했다고 모든 기능이 무조건 활성화되는 것은 아니다. 필요한 class가 classpath에 있고 application type/property/Bean 조건이 맞아야 자동 구성이 적용된다.

## dependency 관리

Spring Boot plugin과 BOM은 관리 대상 dependency의 version을 제공한다. 이 목록에 없는 library는 version을 직접 관리해야 한다.

- Boot BOM을 사용해도 dependency tree에서 실제 선택 version과 충돌을 확인한다.
- 관리 version을 override하면 그 조합의 compatibility 검증 책임이 application 팀으로 이동한다.
- starter는 API가 아니라 편의 dependency descriptor이므로 사용하지 않는 구현체는 제외할 수 있다.
- 강의 당시의 `spring-boot-starter-web` 같은 이름과 현재 Boot 4.1의 starter 구성을 구분한다.

## 자동 구성 흐름

```text
@SpringBootApplication
  -> @EnableAutoConfiguration
  -> auto-configuration candidates import
  -> @Conditional 평가
  -> match한 configuration의 Bean 등록
```

현대 Spring Boot library는 후보 class를 다음 파일에 등록한다.

```text
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

오래된 강의에서 보이는 `spring.factories` 기반 `EnableAutoConfiguration` 등록을 새 library의 기본 방식으로 복사하지 않는다. `@AutoConfiguration`과 imports file이 현재 extension point다.

## 조건이 만드는 back-off

```java
@AutoConfiguration
@ConditionalOnClass(Client.class)
@ConditionalOnProperty(prefix = "acme.client", name = "enabled", matchIfMissing = true)
public class ClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    Client client(ClientProperties properties) {
        return new Client(properties.endpoint());
    }
}
```

- `@ConditionalOnClass`: 필요한 library가 있을 때만 후보가 된다.
- `@ConditionalOnMissingBean`: 사용자가 같은 역할의 Bean을 제공하면 기본값이 물러난다.
- `@ConditionalOnProperty`: feature flag/configuration으로 활성 조건을 제어한다.
- `@ConditionalOnWebApplication`: servlet/reactive/non-web application을 구분한다.

`@ConditionalOnMissingBean`은 평가 시점까지 처리된 Bean definition만 볼 수 있다. 그래서 일반 business configuration보다 auto-configuration에 사용하고, 필요한 경우 `before`/`after` ordering을 명시한다.

## library를 만들 때

1. core 기능을 Spring Boot와 독립적인 library로 설계한다.
2. properties contract와 default를 정의한다.
3. 별도 auto-configure module에서 조건부 Bean을 제공한다.
4. `AutoConfiguration.imports`에 후보를 등록한다.
5. 사용자 Bean 제공, dependency 부재, property on/off와 context startup을 테스트한다.
6. starter module은 필요한 dependency를 모으되 application code를 넣지 않는다.

자동 구성은 component scan에 우연히 걸리게 만드는 기능이 아니다. application의 scan 범위 밖에서도 명시적 imports metadata로 발견되어야 한다.

## 진단법

- Actuator `conditions` 또는 debug condition report로 어떤 조건이 match하지 않았는지 본다.
- dependency tree로 필요한 class가 실제 runtime classpath에 있는지 확인한다.
- 같은 type의 사용자 Bean과 auto-configured Bean이 충돌하는지 본다.
- property prefix/name과 relaxed binding 결과를 확인한다.
- application code에서 auto-configuration을 무작정 exclude하기 전에 back-off 지점을 찾는다.

## 핵심 판단

- 자동 구성은 숨겨진 마법이 아니라 후보 import와 조건 평가다.
- 사용자 정의가 항상 자동 구성을 덮는다는 표현은 과하다. 각 auto-configuration의 실제 조건을 봐야 한다.
- starter 편의성과 version 안정성은 Boot BOM 범위 안에서만 성립한다.

## 출처

- [Spring Boot 4.1, Build Systems and Starters](https://docs.spring.io/spring-boot/reference/using/build-systems.html)
- [Spring Boot, Creating Your Own Auto-configuration](https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html)
- [Spring Boot 4.1 API, ConditionalOnMissingBean](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/condition/ConditionalOnMissingBean.html)
- dependency 관리: [직접 관리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148089), [Boot version 관리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148090), [starter](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148091), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148092)
- 자동 구성 시작: [project](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148094), [JDBC 예제](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148095), [자동 구성 확인](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148096), [개념](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148097), [기반 예제](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148098)
- 조건: [`@Conditional`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148099), [조건 종류](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148100)
- library: [순수 library 생성](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148101), [사용 1](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148102), [사용 2](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148103), [auto-configure library](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148104), [적용 1](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148105), [적용 2](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148106)
- 내부 원리: [Boot 동작](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148107), [`ImportSelector`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148108), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148109)

## 관련 문서

- [[Spring-Boot-Essentials|Spring Boot Essentials]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC/DI와 Bean lifecycle]]
- [[Spring-Boot-Externalized-Configuration-and-Profiles|Spring Boot 외부 설정과 profile]]
