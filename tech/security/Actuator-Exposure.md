---
tags: [security, spring, misconfiguration, owasp]
status: done
category: "보안(Security)"
aliases: ["Actuator Exposure", "Spring Actuator 보안", "Security Misconfiguration", "민감정보 노출"]
---

# Actuator 노출 (Security Misconfiguration)

운영, 모니터링용 관리 엔드포인트가 인증 없이 외부에 노출되어 민감 정보가 새는 문제. Spring Boot Actuator가 대표 사례지만, 원리는 모든 운영 엔드포인트(헬스체크, 메트릭, 디버그)에 공통이다. OWASP Top 10의 Security Misconfiguration(보안 설정 오류)에 해당한다.

## 왜 위험한가

Spring Boot Actuator는 상태 확인, 메트릭, 환경 정보 조회 등 운영에 유용한 기능을 제공한다. 편리한 만큼 설정을 잘못하면 환경 변수, 메모리 정보, 내부 설정, 서비스 상태 같은 민감 정보가 그대로 노출된다.

- `/actuator/env` — 환경 변수 전체. API 키, DB 비밀번호가 환경 변수에 있으면 그대로 유출.
- `/actuator/heapdump` — 힙 덤프 파일. 메모리에 떠 있던 토큰, 자격증명, 평문 데이터가 통째로 빠져나갈 수 있다.
- 그 밖에 `/actuator/configprops`, `/actuator/beans`, `/actuator/mappings`도 내부 구조를 드러낸다.

이렇게 노출된 정보는 그 자체가 피해이자, 다음 공격(자격증명 도용, [[SSRF]]로 내부망 정찰)의 발판이 된다.

## 핵심 원칙: 필요한 것만 열기

기본값을 그대로 믿지 말고 **모두 비활성화한 뒤 필요한 것만 켜는** 화이트리스트 방식이 안전하다.

```properties
# 기본은 전부 끈다
management.endpoints.enabled-by-default=false

# 필요한 엔드포인트만 켠다
management.endpoint.info.enabled=true
management.endpoint.health.enabled=true

# 노출 채널 제한: JMX는 전부 막고, 웹은 화이트리스트만
management.endpoints.jmx.exposure.exclude=*
management.endpoints.web.exposure.include=info,health

# 운영 포트와 분리 + 외부에서 접근 못 하게 바인딩
management.server.port=9000
management.server.address=127.0.0.1

# 기본 경로 변경(추측, 자동 스캔 회피)
management.endpoints.web.base-path=/internal-monitoring
```

설정의 의도:

| 설정 | 막는 것 |
|---|---|
| `enabled-by-default=false` | 기본 활성 엔드포인트의 무심코 노출 |
| `web.exposure.include` 화이트리스트 | 불필요한 엔드포인트의 웹 노출 |
| `jmx.exposure.exclude=*` | JMX 경로 노출 |
| `management.server.port` 분리 | 운영 서비스 포트와 관리 포트 동시 노출 |
| `server.address=127.0.0.1` | 외부에서의 직접 접근 |
| `base-path` 변경 | 기본 경로(`/actuator`) 자동 스캔 |

여기에 방화벽/접근 가능 IP 제한, 인증(Spring Security 연동)을 더하면 다층 방어가 된다. 활성화는 최소화, 외부 노출은 최소화가 두 축이다.

## 일반화

Spring 밖에서도 동일하다. 모니터링/디버그/관리 엔드포인트는 (1) 기본 차단 후 필요한 것만, (2) 운영 트래픽과 포트/네트워크 분리, (3) 인증과 IP 제한, (4) 민감값을 환경 변수 평문 대신 시크릿 매니저로 → [[Secret-Management]].

## 면접 포인트

Q. Actuator를 왜 조심해야 하나?
- `/actuator/env`, `/actuator/heapdump` 등으로 환경 변수, 힙 덤프 속 자격증명이 노출될 수 있다. 운영 정보 노출이자 다음 공격의 발판이 된다.

Q. 어떻게 안전하게 설정하나?
- 기본 전체 비활성화 후 필요한 것만 화이트리스트. 관리 포트 분리, 127.0.0.1 바인딩, 기본 경로 변경, IP 제한, 인증을 더한다. 핵심은 "필요한 것만 열기".

## 출처

- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)

## 관련 문서

- [[Application-Security|애플리케이션 보안 (필요한 것만 노출 원칙)]]
- [[SSRF|SSRF (노출된 내부 정보가 발판)]]
- [[Secret-Management|시크릿 관리 (환경 변수 평문 대신)]]
- [[Spring-Boot-Essentials|Spring Boot 기초]]
