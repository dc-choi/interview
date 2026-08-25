---
tags: [spring-boot, auto-configuration, starter, externalized-configuration, embedded-server, actuator, micrometer]
status: index
category: "OS & Runtime"
aliases: ["Spring Boot", "Spring Boot 구성과 운영"]
---

# Spring Boot 구성과 운영

Spring Boot는 Spring Framework를 대체하지 않고, 반복되는 구성과 배포, 운영 준비 작업을 표준화한다. starter와 auto-configuration이 기본 Bean을 정하고, 외부 설정과 profile이 환경별 동작을 바꾸며, 내장 server와 executable JAR이 배포 단위를 만들고, Actuator와 Micrometer가 운영 중인 application의 상태와 metric을 드러낸다. 자동화된 기본값을 그대로 쓰기보다 조건, 우선순위, 노출 경계를 확인하는 것이 핵심이다.

- [[Spring-Boot-Essentials|Spring Boot Essentials]]: Spring Framework와의 차이, AutoConfiguration 원리, Starter 의존성, Embedded Server와 Actuator 개요
- [[Spring-Boot-Auto-Configuration-and-Starters|Spring Boot 자동 구성과 스타터]]: BOM과 dependency management, starter, auto-configuration 세 층 구분과 조건 기반 back-off, 진단법
- [[Spring-Boot-Externalized-Configuration-and-Profiles|Spring Boot 외부 설정과 profile]]: PropertySource 우선순위, 값을 읽는 세 방법, config data, secret 취급과 진단 순서
- [[Spring-Boot-Embedded-Server-and-Executable-Jar|Spring Boot 내장 서버와 실행 가능 JAR]]: 외부 servlet container 방식과의 비교, executable JAR 구조, JAR과 WAR 선택 기준
- [[Spring-Boot-Actuator-Operations|Spring Boot Actuator 운영]]: access와 exposure 분리, health 구성, build/logger/HTTP 진단 endpoint, 보안 경계와 장애 대응 순서
- [[Spring-Boot-Micrometer-Prometheus-Grafana|Spring 모니터링 파이프라인]]: Micrometer, Actuator, Prometheus, Grafana의 책임 분리와 metric으로 문제를 좁히는 절차
- [[Spring-Boot-Custom-Metrics-and-Monitoring|Spring Boot custom metric]]: Counter, Timer, Gauge, DistributionSummary 선택, tag cardinality, business metric 설계와 검증 체크리스트

## 함께 볼 문서

- [[Spring|Spring]]
