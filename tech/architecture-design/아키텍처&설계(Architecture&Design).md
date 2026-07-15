---
tags: [architecture, design]
status: index
category: "아키텍처&설계(Architecture&Design)"
aliases: ["아키텍처&설계(Architecture&Design)", "Architecture & Design"]
---

# 아키텍처&설계(Architecture&Design)

## 큰 그림 (먼저 보기)

- [[Event-Driven-Architecture|Event-Driven Architecture (EDA) — 결정 프레임워크]] — 신뢰성, 결합도, 일관성 3축 트레이드오프 + 8개 결정 층 + 패턴 매핑 그림
- [[Monorepo-Architecture|모노레포 아키텍처]] — 모노레포 vs 모놀리스(직교), 공통 패키지 함정, 변화율 계층(SDP), Public API, Conway's Law
- [[Module-Federation|Module Federation]] — Build/Run-time 통합, 마이크로 프론트엔드, 공유 스코프, manifest 독립 배포

## 목차

- [[tech/architecture-design/oop/객체지향(OOP)|객체지향 (OOP)]] — OOP, SOLID, 우아한 객체지향, 아키텍처 적용
- [[tech/architecture-design/design-pattern/디자인패턴이란|디자인 패턴 (Design Patterns)]]
- [[tech/architecture-design/ddd-hexagonal/DDD&Hexagonal|DDD, Hexagonal]] — Layered/Clean/Hexagonal, 실무 적용, Saga, Event Sourcing
- [[tech/architecture-design/principles/원칙(Principles)|원칙, 철학 (Principles)]] — 아키텍처 중요성, IoC, Tidy First
- [[tech/architecture-design/evolution/진화(Evolution)|진화, 전환 (Evolution)]] — 모놀리스 vs MSA, 레거시 현대화, 런타임 스택
- [[tech/architecture-design/data-model/데이터모델(DataModel)|데이터 모델 (Data Model)]] — DTO, VO 레이어링

## 관련 (다른 카테고리)

> EDA를 실현하는 메시징 인프라 패턴은 [[tech/messaging-data-pipeline/메시징&파이프라인(Messaging&Pipeline)|메시징&파이프라인]] 카테고리. 카테고리 분류 룰: 아키텍처 = "**어떻게 설계**" / 메시징 = "**어떻게 안전하게 전송**".

- [[Transactional-Outbox|Outbox 패턴]], [[CDC&Outbox|CDC vs Outbox]], [[Idempotency-Key|멱등성 키]], [[브로커(Brokers)|메시지 브로커]]

## 미작성
- [ ] API versioning (작성 예정: `API-Versioning-Design`)
- [ ] Backward compatibility (작성 예정: `Backward-Compatibility-Design`)
- [ ] Schema evolution (작성 예정: `Schema-Evolution`)
- [ ] Tech debt management (작성 예정: `Tech-Debt-Management`)
- [ ] ADR (Architecture Decision Record) (작성 예정: `ADR`)
- [ ] `CQRS` (작성 예정)

## 관련 문서
- [[ORM]]
