---
tags: [architecture, design]
status: index
category: "아키텍처&설계(Architecture&Design)"
aliases: ["아키텍처&설계(Architecture&Design)", "Architecture & Design"]
---

# 아키텍처&설계(Architecture&Design)

## 큰 그림 (먼저 보기)

- [[Event-Driven-Architecture|Event-Driven Architecture (EDA) — 결정 프레임워크]] — 신뢰성, 결합도, 일관성 3축 트레이드오프 + 8개 결정 층 + 패턴 매핑 그림
- [[Reactive-Systems-Principles|리액티브 시스템 원칙]] — 응답성, 회복성, 탄력성과 메시지 구동의 관계, backpressure와 BASE 경계
- [[Monorepo-Architecture|모노레포 아키텍처]] — 모노레포 vs 모놀리스(직교), 공통 패키지 함정, 변화율 계층(SDP), Public API, Conway's Law
- [[Module-Federation|Module Federation]] — Build/Run-time 통합, 마이크로 프론트엔드, 공유 스코프, manifest 독립 배포

## 목차

- [[tech/architecture-design/oop/객체지향(OOP)|객체지향 (OOP)]] — OOP, SOLID, 우아한 객체지향, 아키텍처 적용
- [[tech/architecture-design/design-pattern/디자인패턴이란|디자인 패턴 (Design Patterns)]]
- [[tech/architecture-design/ddd-hexagonal/DDD&Hexagonal|DDD, Hexagonal]] — Layered/Clean/Hexagonal, 실무 적용, Saga, Event Sourcing
- [[tech/architecture-design/principles/원칙(Principles)|원칙, 철학 (Principles)]] — 아키텍처 중요성, IoC, Tidy First
- [[tech/architecture-design/evolution/진화(Evolution)|진화, 전환 (Evolution)]] — 모놀리스 vs MSA, 레거시 현대화, 런타임 스택, 에이전트 기반 레거시 코드 전환
- [[tech/architecture-design/data-model/데이터모델(DataModel)|데이터 모델 (Data Model)]] — DTO, VO 레이어링
- [[Recommendation-System-Architecture|추천 시스템]] — 후보 생성, 랭킹, 데이터 계약, 평가와 OTT 디스커버리

## 관련 (다른 카테고리)

> EDA를 실현하는 메시징 인프라 패턴은 [[tech/messaging-data-pipeline/메시징&파이프라인(Messaging&Pipeline)|메시징&파이프라인]] 카테고리. 카테고리 분류 룰: 아키텍처 = **어떻게 설계** / 메시징 = **어떻게 안전하게 전송**.

- [[Transactional-Outbox|Outbox 패턴]], [[CDC&Outbox|CDC vs Outbox]], [[Idempotency-Key|멱등성 키]], [[브로커(Brokers)|메시지 브로커]]

## 문서화 체크리스트

`[x]`는 재사용 가능한 문서가 있다는 뜻이며 숙련도를 뜻하지 않는다.

- [x] [[Blockchain-Replication-and-Consensus-Cost|블록체인 복제와 합의 비용]] — 이중지불과 거래 순서 합의, 비잔틴 장군 문제의 가정, Sybil 저항과 MEV, 확률적 확정, Ethereum의 실행, 확정성, 저장 유형, 오라클과 가스 한도
- [x] [[Recommendation-System-Architecture|추천 시스템 정본 묶음 (후보, 랭킹, 피드백, 평가와 서빙)]]
- [x] [[Low-Code-Platform-Exit-Boundaries|로우코드 플랫폼 이탈 조건]] — 코드 반출과 독립 운영, 전체 앱 이전 범위
- [x] [[Recommendation-System-Serving-Operations|추천 서빙과 운영]] — 입력과 재학습 경계, 임베딩 버전과 벡터 일괄 조회 검증
- [x] [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 최소 기반 (통계, ML과 implicit feedback)]]
- [x] [[Recommendation-System-OTT-Discovery-Architecture|OTT 통합 디스커버리 (검색, 추천과 browse)]]
- [x] [[Recommendation-System-Taxonomy-Content-Based|추천 시스템 택소노미 (작품 concept, LLM 보조 태깅과 사용자 affinity)]]
- [x] [[Recommendation-System-OTT-Discovery-Scenarios|OTT 추천 구축 시나리오 (taxonomy와 behavior 2x2 분기)]]
- [x] [[Recommendation-System-Page-Level-Optimization|멀티 캐러셀 홈과 페이지 단위 최적화]]
- [x] [[Recommendation-System-Evaluation-Experimentation|추천 평가, OPE와 온라인 실험 통계]]
- [x] [[API-Versioning-Design|API versioning]] — 기존 보강: [[API-Conventions-Operations|API 버저닝 전략]], [[Controller-Routing|NestJS URI 버저닝 구현]]
- [x] [[Backward-Compatibility-Design|Backward compatibility]] — 엄격한 JSON 파싱과 응답 필드 추가, 기존 보강: [[GraphQL-Schema-Design|GraphQL 스키마 진화]], [[Blue-Green#DB 스키마, 공유 상태의 난제|DB Expand-Contract]], [[Schema-Versioning|roll-forward와 전후방 호환]]
- [x] [[Schema-Evolution|Schema evolution]] — 기존 보강: [[Event-Sourcing|이벤트 Upcaster]], [[GraphQL-Schema-Design|GraphQL 추가와 폐기 규칙]]
- [x] [[Tech-Debt-Management|Tech debt management]] — 기존 보강: [[Technical-Debt|기술 부채의 정의, 경제 모델, Fowler 4분면]]
- [x] [[Lehman-Software-Evolution|소프트웨어 진화 법칙]] — E-type 시스템의 변경, 복잡성 관리와 피드백
- [x] [[ADR|ADR (Architecture Decision Record)]] — 기존 보강: [[Tech-Spec-Writing-Review-Process#ADR(Architecture Decision Record)과의 차이|테크스펙과 ADR의 차이]]
- [x] [[Clean-Architecture-NestJS-CQRS|CQRS (Command, Query, Event 분리, Read Model, NestJS 계약, 도입 임계점)]]
- [x] [[Enterprise-Architecture|엔터프라이즈 아키텍처(EA)와 ISP]] — baseline, target과 전환 계획, TOGAF 네 도메인, Clinger-Cohen과 전자정부법의 ITA 근거, 형식화 조건
- [x] [[AI-Ready-ERP-Transformation|AI 활용 기반으로서의 ERP 전환]] — AI 전사 확산의 네 병목, 프로세스 자산화와 프로세스 마이닝, 기준정보와 3층 Data Product, Clean Core와 핵심 업무 시스템 연계, 거버넌스와 전환 범위 점검 질문
- [x] [[Agent-Ready-Core-System|에이전트가 일하기 좋은 코어 시스템 구조]] — 기간계에 에이전트를 붙이기 어려운 세 이유, 업무 단위 서비스와 표준 관문, 서비스별 원장과 모듈러 모놀리스의 선택, 표준 프로세스와 확장점, 운영 거래 재현 회귀, 참조 모델과 패키지 도입
- [x] [[Manufacturing-AI-Data-Architecture|제조 AI의 데이터 아키텍처]] — 확산을 막는 다섯 병목, 엣지 배치와 엣지 플랫폼 요건, 디지털 트윈의 하향식과 상향식 데이터 요건, 데이터 플랫폼 요건과 여섯 맥락, 희귀 결함의 합성 데이터와 모델 붕괴
- [x] [[Commercial-to-Open-Source-Transition|상용 소프트웨어에서 오픈소스 스택으로의 전환 (OX)]] — AI 스택이 늘리는 관리 대상, 가시화, 안전한 토대, 확장, SBOM과 라이선스 거버넌스, 금융사 사례
- [x] [[Digital-Twin|디지털 트윈]] — 성숙도 다섯 단계, 연결 계층(ERP, WMS, WCS, PLC, 센서), 실제 운영 지표와 비교하는 모델 신뢰도, 가상 시운전의 검증 범위, CAD를 실시간 3D로 바꾸는 단계와 테셀레이션 허용치, 코딩 에이전트의 편집기 조작 경로
- [x] [[Warehouse-Operations-Simulation|물류센터 운영 시뮬레이션]] — 네 구성 요소, 레이아웃과 위치 데이터, 출고량, 빈도, 연관도 기반 적치, 주문 단위 피킹과 총량 피킹 비교, 인력 스케줄링, 레이아웃 생성, 재고 조사 자동화, 에이전트 기반 자원 배치와 시작 조건

## 검색과 추천 숙련 게이트

- [ ] [[Search-Recommendation-Discovery-Learning-Path|검색, 추천과 디스커버리 8단계 산출물]]을 같은 ID와 event 계약으로 완성하고 검토받기

## 관련 문서
- [[ORM]]
