---
tags: [spring-boot, externalized-configuration, configuration-properties, profile, property-source]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Externalized Configuration", "Spring Profiles", "외부 설정과 프로필"]
---

# Spring Boot 외부 설정과 profile

같은 artifact를 환경마다 다시 build하지 않고 실행 시점의 configuration으로 동작을 바꾸는 것이 외부 설정의 목적이다. 값의 출처, 우선순위, type/validation과 secret 취급을 하나의 운영 계약으로 관리해야 한다.

## 설정 source를 하나의 Environment로 본다

Spring은 여러 source를 `PropertySource`로 감싸 `Environment`에서 key/value로 조회한다.

```text
default/config data/environment/system property/command line/test override
  -> ordered PropertySources
  -> Environment
  -> binding or lookup
```

현재 Spring Boot 4.1의 전체 우선순위는 단순히 OS 환경 변수, JVM property, command line 세 종류만 외우는 목록보다 길다. 핵심은 **나중 source가 앞 source를 override한다**는 것과 실제 source report를 진단할 수 있어야 한다는 점이다.

- packaged config보다 외부 config가 우선한다.
- profile-specific config가 같은 위치의 일반 config를 override한다.
- 여러 active profile은 뒤 profile이 앞 profile을 override한다.
- command line property는 file 기반 config보다 우선한다.
- `spring.config.location`은 기본 위치를 대체하고 `spring.config.additional-location`은 추가한다.

## 입력 방식의 경계

| 방식 | 범위 | 장점 | 주의점 |
|---|---|---|---|
| OS environment | process/container 배포 환경 | platform 연동이 쉽다 | 문자열/이름 제약, secret 노출 경로 |
| JVM system property | 한 JVM | `-Dkey=value`로 명확 | launcher option과 application argument 순서 |
| command line option | 한 실행 | 일회 override가 쉽다 | process list/history와 운영 drift |
| config file | 구조화된 설정 집합 | review와 재현이 쉽다 | artifact 내 secret 포함 금지 |
| config tree/secret mount | file 단위 key | Kubernetes/Docker secret 연동 | 권한, rotation과 reload 계약 |

`--server.port=9000` 같은 option argument는 Spring Boot가 property로 변환한다. 일반 Java argument와 달리 `ApplicationArguments`에서도 option name/value로 읽을 수 있다.

## 값을 읽는 세 방법

| 방법 | 적합한 범위 | 특징 |
|---|---|---|
| `Environment` | framework/infrastructure, 동적 key | low-level lookup와 type conversion |
| `@Value` | 고립된 값 한두 개 | 간단하지만 key가 code 곳곳에 흩어지기 쉽다 |
| `@ConfigurationProperties` | 의미 있는 설정 묶음 | type-safe binding, metadata, validation |

Application 설정은 보통 `@ConfigurationProperties`를 우선한다.

```java
@Validated
@ConfigurationProperties("client.payment")
public record PaymentClientProperties(
    @NotBlank URI baseUrl,
    @DurationMin(seconds = 1) Duration timeout
) {}
```

Bean 등록은 `@ConfigurationPropertiesScan` 또는 `@EnableConfigurationProperties`로 명시한다. type mismatch와 validation 실패를 startup에서 드러내면 traffic을 받은 뒤 늦게 실패하는 위험이 줄어든다.

## config data와 profile

```yaml
client:
  payment:
    base-url: https://sandbox.example
    timeout: 2s
---
spring:
  config:
    activate:
      on-profile: prod
client:
  payment:
    base-url: https://api.example
```

- YAML은 표준 `---`로 document를 나눈다. 과거 properties 예제의 구분 문법을 YAML과 섞지 않는다.
- `application-{profile}.yaml` 파일 분리와 한 파일의 multi-document 방식 중 팀 운영에 맞는 하나를 선택한다.
- `spring.profiles.active`를 profile-specific document 안에서 다시 설정하지 않는다.
- `@Profile`은 값을 바꾸는 기능이 아니라 특정 Bean/configuration 등록 조건이다.

Profile을 `dev`, `prod`라는 거대한 mode switch로 남용하면 조합 테스트가 어려워진다. DB, messaging, mock 같은 독립 capability는 profile group이나 명시적 property condition을 검토한다.

## secret과 운영 안전성

- password/token을 repository의 `application-prod.yaml`에 넣지 않는다.
- environment variable도 자동으로 안전한 vault가 아니다. process/log/debug endpoint와 배포 spec 노출을 통제한다.
- config tree 또는 secret manager를 쓰더라도 rotation 시 connection/client를 어떻게 갱신할지 정의한다.
- `/actuator/env`와 `/actuator/configprops`의 sanitization/authorization을 유지한다.
- startup log에는 최종 값보다 source와 검증 실패 원인을 secret redaction 상태로 남긴다.

## 진단 순서

1. 기대 key를 canonical kebab case로 확인한다.
2. active/default profile과 profile group을 확인한다.
3. 실제 config location/import 순서를 확인한다.
4. `env`/`configprops` endpoint를 안전한 내부 경로에서 사용해 source/binding을 확인한다.
5. type conversion, constructor binding과 validation error를 확인한다.
6. 긴급 command line override를 영구 운영 설정으로 방치하지 않는다.

## 출처

- [Spring Boot 4.1, Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- [Spring Boot 4.1, Profiles](https://docs.spring.io/spring-boot/reference/features/profiles.html)
- [Spring Boot 4.1 API, ConfigurationProperties](https://docs.spring.io/spring-boot/4.1/api/java/org/springframework/boot/context/properties/ConfigurationProperties.html)
- 설정 source: [project](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148111), [외부 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148112), [OS environment](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148113), [JVM property](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148114), [argument](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148115), [option argument](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148116), [Boot option](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148117), [Spring 통합](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148118)
- config data: [외부 file](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148119), [내부 file 분리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148120), [multi-document](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148121), [config data 우선순위](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148122), [전체 우선순위](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148123), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148124)
- binding/profile: [project](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148126), [`Environment`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148127), [`@Value`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148128), [`@ConfigurationProperties`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148129), [constructor binding](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148130), [validation](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148131), [YAML](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148132), [`@Profile`](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148133), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148134)

## 관련 문서

- [[Spring-Boot-Auto-Configuration-and-Starters|Spring Boot 자동 구성과 starter]]
- [[Secret-Management|Secret 관리]]
- [[Actuator-Exposure|Actuator 노출]]
