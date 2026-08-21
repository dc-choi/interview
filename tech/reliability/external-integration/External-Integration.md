---
tags: [reliability, external-api, resilience, integration]
status: index
category: "Reliability"
aliases: ["External Integration", "외부 연동 복원력"]
---

# 외부 연동 복원력

외부 서비스에 의존하는 시스템이 상대의 장애, 지연과 스펙 변경을 자기 장애로 만들지 않게 하는 문서 묶음이다. 공통 방어선에서 도메인별 실전 패턴, 계약 없는 소스의 주기 수집, 가장 엄격한 도메인인 결제까지 이어진다.

## 목차

- [[External-Service-Resilience|외부 서비스 장애 대응]] — Timeout, Bulkhead, Circuit Breaker 계층 방어
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]] — 재시도 규율, jitter 변형 비교, 토큰 버킷 재시도 예산
- [[External-API-Integration-Patterns|외부 API 연동 실전 패턴]] — 조회형과 거래형, 상태 머신, 보상 트랜잭션, 대사
- [[External-Collection-Pipeline-Reliability|외부 수집 파이프라인 신뢰성]] — 조용한 실패 승격, 항목 격리와 실패 분류, 신선도 SLO
- [[Payment-System-Principles|결제 시스템 5원칙]] — PG 스펙, 숙련자, DB 제약, 해킹 대비, 신뢰 보호
- [[Payment-Reconciliation-Worker|결제 대사 worker]] — 안정적인 page 수집, 불일치 재확인, 멱등 보정

## 상위 문서

- [[안정성엔지니어링(Reliability)|안정성엔지니어링]]
