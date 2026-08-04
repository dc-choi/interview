---
tags: [security, spring, misconfiguration, owasp]
status: done
verified_at: 2026-08-04
category: "보안(Security)"
aliases: ["Actuator Exposure", "Spring Actuator 보안", "Security Misconfiguration", "민감정보 노출"]
---

# Actuator 노출 (Security Misconfiguration)

운영, 모니터링용 관리 엔드포인트가 인증 없이 외부에 노출되어 민감 정보가 새는 문제. Spring Boot Actuator가 대표 사례지만, 원리는 모든 운영 엔드포인트(헬스체크, 메트릭, 디버그)에 공통이다. OWASP Top 10의 Security Misconfiguration(보안 설정 오류)에 해당한다.

## 왜 위험한가

Spring Boot Actuator는 상태 확인, 메트릭, 환경 정보 조회 등 운영에 유용한 기능을 제공한다. 편리한 만큼 access/exposure/authorization을 잘못 구성하면 내부 설정, topology, memory와 서비스 상태 같은 민감 정보가 노출된다.

- `/actuator/env`, `/actuator/configprops` — 현재 Boot는 값이 기본 sanitization되지만 key/source와 구조도 공격 단서가 된다. `show-values`를 완화하면 원본 값이 노출될 수 있다.
- `/actuator/heapdump` — 힙 덤프 파일. 메모리에 떠 있던 토큰, 자격증명, 평문 데이터가 통째로 빠져나갈 수 있다.
- 그 밖에 `/actuator/configprops`, `/actuator/beans`, `/actuator/mappings`도 내부 구조를 드러낸다.

이렇게 노출된 정보는 그 자체가 피해이자, 다음 공격(자격증명 도용, [[SSRF]]로 내부망 정찰)의 발판이 된다.

## 핵심 원칙: 필요한 것만 열기

현재 Boot 4.1은 HTTP/JMX에 `health`만 기본 노출한다. 운영에서는 기본값에 기대기보다 **access와 exposure를 모두 allowlist로 선언**한다.

```properties
# 기본 endpoint access를 끈다
management.endpoints.access.default=none

# 필요한 endpoint에 read access를 부여한다
management.endpoint.info.access=read-only
management.endpoint.health.access=read-only

# 노출 채널 제한: JMX는 전부 막고, 웹은 화이트리스트만
management.endpoints.jmx.exposure.exclude=*
management.endpoints.web.exposure.include=info,health

# 운영 포트와 분리 + 외부에서 접근 못 하게 바인딩
management.server.port=9000
management.server.address=127.0.0.1
```

설정의 의도:

| 설정 | 막는 것 |
|---|---|
| `access.default=none` | endpoint를 기본적으로 application context에서 제거 |
| 개별 `access=read-only` | 필요한 읽기 operation만 허용 |
| `web.exposure.include` 화이트리스트 | 불필요한 엔드포인트의 웹 노출 |
| `jmx.exposure.exclude=*` | JMX 경로 노출 |
| `management.server.port` 분리 | 운영 서비스 포트와 관리 포트 동시 노출 |
| `management.server.address=127.0.0.1` | 외부에서의 직접 접근 |

여기에 방화벽/접근 가능 IP 제한, Spring Security authorization을 더하면 다층 방어가 된다. 경로를 `/actuator`에서 바꾸는 것은 충돌 회피나 routing 편의일 뿐 보안 경계가 아니다.

## 일반화

Spring 밖에서도 동일하다. 모니터링/디버그/관리 엔드포인트는 (1) 기본 차단 후 필요한 것만, (2) 운영 트래픽과 포트/네트워크 분리, (3) 인증과 IP 제한, (4) 민감값을 환경 변수 평문 대신 시크릿 매니저로 → [[Secret-Management]].

## 면접 포인트

Q. Actuator를 왜 조심해야 하나?
- `/actuator/env`, `/actuator/heapdump` 등으로 configuration 구조나 메모리 속 자격증명이 노출될 수 있다. 기본 sanitization이 있어도 endpoint 자체의 access를 최소화해야 한다.

Q. 어떻게 안전하게 설정하나?
- 기본 access 차단 후 필요한 읽기 endpoint만 화이트리스트한다. 관리 포트/망 분리, IP 제한과 endpoint별 authorization을 더한다. 핵심은 "필요한 것만 열기"다.

## 출처

- [Spring Boot 4.1, Actuator Endpoints](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
- [Spring Boot 4.1, Monitoring over HTTP](https://docs.spring.io/spring-boot/reference/actuator/monitoring.html)
- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)

## 관련 문서

- [[Application-Security|애플리케이션 보안 (필요한 것만 노출 원칙)]]
- [[SSRF|SSRF (노출된 내부 정보가 발판)]]
- [[Secret-Management|시크릿 관리 (환경 변수 평문 대신)]]
- [[Spring-Boot-Essentials|Spring Boot 기초]]
- [[Spring-Boot-Actuator-Operations|Spring Boot Actuator 운영]]
