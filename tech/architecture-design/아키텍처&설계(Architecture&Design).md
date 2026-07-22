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
- [[Recommendation-System-Architecture|추천 시스템]] — 후보 생성, 랭킹, 데이터 계약, 평가와 OTT 디스커버리

## 관련 (다른 카테고리)

> EDA를 실현하는 메시징 인프라 패턴은 [[tech/messaging-data-pipeline/메시징&파이프라인(Messaging&Pipeline)|메시징&파이프라인]] 카테고리. 카테고리 분류 룰: 아키텍처 = "**어떻게 설계**" / 메시징 = "**어떻게 안전하게 전송**".

- [[Transactional-Outbox|Outbox 패턴]], [[CDC&Outbox|CDC vs Outbox]], [[Idempotency-Key|멱등성 키]], [[브로커(Brokers)|메시지 브로커]]

## 문서화 체크리스트

`[x]`는 재사용 가능한 문서가 있다는 뜻이며 숙련도를 뜻하지 않는다.

- [x] [[Recommendation-System-Architecture|추천 시스템 정본 묶음 (후보, 랭킹, 피드백, 평가와 서빙)]]
- [x] [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 최소 기반 (통계, ML과 implicit feedback)]]
- [x] [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 디스커버리 (검색, 추천과 browse)]]
- [x] [[Recommendation-System-Taxonomy-Content-Based|추천 시스템 택소노미 (작품 concept, LLM 보조 태깅과 사용자 affinity)]]
- [x] [[Recommendation-System-OTT-Discovery-Scenarios|OTT 추천 구축 시나리오 (taxonomy와 behavior 2x2 분기)]]
- [x] [[Recommendation-System-Page-Level-Optimization|멀티 캐러셀 홈과 페이지 단위 최적화]]
- [x] [[Recommendation-System-Evaluation-Experimentation|추천 평가, OPE와 온라인 실험 통계]]
- [ ] API versioning (작성 예정: `API-Versioning-Design`) — 기존 보강: [[API-Conventions-Operations|API 버저닝 전략]], [[Controller-Routing|NestJS URI 버저닝 구현]]
- [ ] Backward compatibility (작성 예정: `Backward-Compatibility-Design`) — 기존 보강: [[GraphQL-Schema-Design|GraphQL 스키마 진화]], [[Blue-Green#DB 스키마, 공유 상태의 난제|DB Expand-Contract]]
- [ ] Schema evolution (작성 예정: `Schema-Evolution`) — 기존 보강: [[Event-Sourcing|이벤트 Upcaster]], [[GraphQL-Schema-Design|GraphQL 추가와 폐기 규칙]]
- [ ] Tech debt management (작성 예정: `Tech-Debt-Management`) — 기존 보강: [[Technical-Debt|기술 부채의 정의, 경제 모델, Fowler 4분면]]
- [ ] ADR (Architecture Decision Record) (작성 예정: `ADR`) — 기존 보강: [[Tech-Spec-Writing-Review-Process#ADR(Architecture Decision Record)과의 차이|테크스펙과 ADR의 차이]]
- [x] [[Clean-Architecture-NestJS-CQRS|CQRS (Command, Query, Event 분리, Read Model, NestJS 계약, 도입 임계점)]]

## 검색과 추천 숙련 게이트

- [ ] [[Search-Recommendation-Discovery-Learning-Path|검색, 추천과 디스커버리 8단계 산출물]]을 같은 ID와 event 계약으로 완성하고 검토받기

## 관련 문서
- [[ORM]]
