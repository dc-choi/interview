---
tags: [spring-boot, actuator, health, management-endpoint, operations]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Boot Actuator Operations", "Actuator 운영", "프로덕션 준비 기능"]
---

# Spring Boot Actuator 운영

Actuator는 application의 내부 상태를 운영 도구가 읽거나 제한적으로 제어할 수 있는 management surface다. endpoint를 추가하는 것보다 **availability, exposure, authorization과 정보 민감도**를 함께 설계하는 것이 핵심이다.

## access와 exposure를 분리한다

현재 Spring Boot 4.1에서 endpoint가 원격 호출 가능하려면 두 조건을 모두 만족해야 한다.

1. endpoint access가 허용되어 application context에 존재한다.
2. HTTP 또는 JMX 채널에 expose된다.

```yaml
management:
  endpoints:
    access:
      default: none
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      access: read-only
    info:
      access: read-only
    prometheus:
      access: read-only
```

Boot 4.1의 HTTP/JMX 기본 exposure는 `health` 하나뿐이다. 과거 version의 기본값이나 실습용 `include: "*"`를 production 기본으로 이해하지 않는다.

## 자주 쓰는 endpoint

| endpoint | 운영 질문 | 주의점 |
|---|---|---|
| `health` | process와 dependency가 요청을 받을 수 있는가 | detail 공개 범위와 probe 의미 분리 |
| `info` | 어떤 build/commit이 배포됐는가 | 공개 가능한 metadata만 제공 |
| `conditions` | auto-configuration이 왜 적용/제외됐는가 | 내부 class/config 구조 노출 |
| `metrics` | 어떤 meter가 있고 현재 측정값은 무엇인가 | 진단 API이며 장기 저장소가 아님 |
| `prometheus` | Prometheus가 scrape할 형식은 무엇인가 | 별도 registry dependency와 exposure 필요 |
| `loggers` | runtime log level이 무엇인가 | write 권한은 변경 이력과 복구가 필요 |
| `httpexchanges` | 최근 HTTP 교환은 무엇인가 | repository를 직접 제공해야 하며 민감 header/body 배제 |
| `threaddump`/`heapdump` | runtime 정체나 memory를 분석할 수 있는가 | 매우 민감하고 크기가 크므로 엄격히 제한 |

## health는 단일 Boolean이 아니다

`HealthIndicator`는 DB, disk와 custom dependency 상태를 합성한다. 상세 정보 기본값은 `never`이며 `when-authorized`를 사용하면 지정 role에만 component/detail을 보여줄 수 있다.

- liveness는 process를 재시작하면 회복될 수 있는 내부 교착 여부에 집중한다.
- readiness는 새 traffic을 받아도 되는지 판단한다.
- 모든 외부 dependency 실패를 liveness `DOWN`으로 만들면 재시작 폭주가 생길 수 있다.
- management port를 분리했더라도 main application port가 실제로 응답하는지 probe 경로를 설계한다.

## build, logger와 HTTP 진단

Build/Git metadata는 현재 배포 artifact를 식별하는 데 유용하다. CI가 생성한 metadata와 deployment identifier를 연결하되 repository URL, branch와 commit 정보의 공개 범위를 검토한다.

`loggers`의 runtime level 변경은 재기동 없이 진단할 수 있지만 임시 조치다. 누가 언제 어떤 logger를 바꿨는지 감사하고 자동 만료/원복 경로를 둔다.

`httpexchanges`는 최근 교환을 memory에 무제한 저장하는 production tracing 대체물이 아니다. sample/debug 환경에서 사용하고 장기 요청 추적은 APM/tracing으로 보낸다.

## 보안 경계

- public network에 management port를 직접 노출하지 않는다.
- 필요한 endpoint만 expose하고 read/write access를 구분한다.
- Spring Security가 있으면 `EndpointRequest` 기반 별도 authorization을 둔다.
- custom `SecurityFilterChain`을 정의하면 Boot의 actuator security auto-configuration이 back off함을 기억한다.
- `env`, `configprops`, `quartz` 값은 현재 기본 sanitization을 유지하고 `show-values` 완화를 엄격히 제한한다.
- 경로 이름 변경은 충돌 회피 기능이지 인증/authorization 대체물이 아니다.

## 장애 대응 순서

```text
health/availability
  -> deployment info
  -> metrics trend
  -> conditions/config
  -> logger or thread dump
  -> trace/log correlation
```

endpoint 하나의 순간값으로 원인을 단정하지 않는다. metric은 추세, trace는 요청 경로, log는 상세 사건을 제공하므로 같은 deployment/time window로 연결한다.

## 출처

- [Spring Boot 4.1, Production-ready Features](https://docs.spring.io/spring-boot/reference/actuator/)
- [Spring Boot 4.1, Endpoints](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
- [Spring Boot 4.1, Monitoring over HTTP](https://docs.spring.io/spring-boot/reference/actuator/monitoring.html)
- [Spring Boot, Actuator REST API](https://docs.spring.io/spring-boot/api/rest/actuator/)
- Actuator: [프로덕션 준비](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148136), [project](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148137), [시작](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148138), [endpoint 설정](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148139), [endpoint 종류](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148140)
- 운영 진단: [health](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148141), [application info](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148142), [logger](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148143), [HTTP exchange](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148144), [security](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148145), [정리](https://www.inflearn.com/courses/lecture?courseId=330459&unitId=148146)

## 관련 문서

- [[Actuator-Exposure|Actuator 노출 보안]]
- [[Spring-Boot-Micrometer-Prometheus-Grafana|Spring Boot metric pipeline]]
- [[OpenTelemetry|OpenTelemetry]]
