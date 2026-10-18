---
tags: [palantir, foundry, ontology, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Foundry 학습", "팔란티어 온톨로지"]
---

# Palantir Foundry와 운영 온톨로지

데이터와 모델을 업무 객체에 연결하고, 권한이 있는 행동으로 결과를 바꾸는 구조를 학습한다. 일반 개념은 [[Ontology-Knowledge-Graph]], 이 Vault의 설계는 [[Development-Ontology]]를 참조한다.

## 의미 모델과 조회

- [[Palantir-Operational-Ontology|운영 온톨로지의 전체 구조]] — 데이터, 로직, 행동과 보안, 의사결정 환류, 개인 지식 온톨로지와의 적용 경계
- [[Palantir-Ontology-Modeling|객체와 관계 모델링]] — 업무 단위, 식별자, 필수 속성과 링크의 보장 범위
- [[Palantir-Ontology-Evolution|인터페이스와 스키마 변경]] — 소비자 계약, 사용자 편집과 마이그레이션
- [[Palantir-Ontology-Retrieval|객체와 문서 검색]] — 청크, 임베딩, 키워드, 관계 탐색과 파생 속성
- [[Palantir-Ontology-Scenarios|대안 비교와 Scenario]] — 자동 rebase, 수명, 검토와 실제 반영

## 데이터와 모델 운영

- [[Palantir-Data-and-Model-Integration|데이터와 모델 통합]] — 원천 연결, 가상화, 멀티모달과 모델 adapter
- [[Palantir-Object-Backend|객체 백엔드]] — 객체 색인, 원천과 편집, 충돌과 direct datasource
- [[Palantir-Data-Pipeline-Operations|파이프라인 운영]] — transaction, incremental, schema, 최신성과 배포 경계
- [[Palantir-Model-Deployment-and-Monitoring|모델 배포와 관측]] — 평가, release, batch/live와 추론 이력

## 행동, 애플리케이션과 보안

- [[Palantir-Actions-and-Functions|Actions와 Functions]] — 업무 변경, 권한, 원자성, 동시성과 외부 효과
- [[Palantir-Security-and-Governance|보안과 거버넌스]] — 스키마와 데이터 권한, 통제 전파와 우회 경로
- [[Palantir-SDK-and-Agent-Tools|SDK와 에이전트 도구]] — OSDK, OAuth, Chatbot Studio와 Ontology MCP
- [[Palantir-AIP-Logic-and-Evaluation|AIP Logic과 평가]] — 실행 주체, 모델 접근, 승인, 평가와 실행 관측
- [[Palantir-Workshop-Applications|Workshop 업무 앱]] — 변수, 이벤트, Action, 모듈 권한과 배포 버전

## 객체 모델, 권한과 업무 변경

- [[Palantir-Ontology-Guides]]
- [[Palantir-Foundry-Ontology]]
- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Object-Workflows]]
- [[Palantir-Object-Experience]]
- [[Palantir-Foundry-Actions]]
- [[Palantir-Functions]]
- [[Palantir-Security-Governance]]
- [[Palantir-Foundry-Security]]
- [[Palantir-Data-Governance]]
- [[Palantir-Foundry-Automation]]
- [[Palantir-Foundry-Rules]]
- [[Palantir-Dynamic-Scheduling]]

## 데이터 적재, 변환과 성능

- [[Palantir-Connectors]]
- [[Palantir-Data-Connectivity]]
- [[Palantir-Foundry-Data-Integration]]
- [[Palantir-Foundry-Pipelines]]
- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Expressions]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Foundry-Data-Health]]
- [[Palantir-Foundry-Data-Lifecycle]]
- [[Palantir-Foundry-Performance]]
- [[Palantir-Foundry-Compute]]
- [[Palantir-SQL-Warehousing]]
- [[Palantir-Iceberg]]
- [[Palantir-SAP-Integration]]
- [[Palantir-Foundry-HyperAuto]]
- [[Palantir-Project-Data-Management]]

## 분석, 지도와 멀티모달

- [[Palantir-Foundry-Analytics]]
- [[Palantir-Quiver]]
- [[Palantir-Contour]]
- [[Palantir-Boardroom]]
- [[Palantir-Insight]]
- [[Palantir-Notepad]]
- [[Palantir-Fusion]]
- [[Palantir-Collaborative-Analysis]]
- [[Palantir-Time-Series]]
- [[Palantir-FoundryTS]]
- [[Palantir-Map]]
- [[Palantir-Geospatial]]
- [[Palantir-Spatial-Models]]
- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
- [[Palantir-Foundry-Machinery]]

## 애플리케이션, SDK와 AI

- [[Palantir-Workshop]]
- [[Palantir-Slate]]
- [[Palantir-OSDK]]
- [[Palantir-Ontology-MCP]]
- [[Palantir-API]]
- [[Palantir-Foundry-Agents]]
- [[Palantir-Foundry-AIP]]
- [[Palantir-Foundry-Logic]]
- [[Palantir-Model-Engineering]]
- [[Palantir-Pilot]]
- [[Palantir-Foundry-Consumer-Applications]]
- [[Palantir-Foundry-Interactivity]]
- [[Palantir-Foundry-Application-Extensions]]
- [[Palantir-Legacy-Forms]]

## 플랫폼 운영과 제품 전달

- [[Palantir-Foundry-Architecture]]
- [[Palantir-Platform-Operations]]
- [[Palantir-Foundry-Administration]]
- [[Palantir-Foundry-Development]]
- [[Palantir-Developer-Tools]]
- [[Palantir-Foundry-Carbon]]
- [[Palantir-Foundry-Operations]]
- [[Palantir-Workflow-Operations]]
- [[Palantir-Product-Delivery]]
- [[Palantir-Foundry-Marketplace]]
- [[Palantir-Program-Adoption]]
- [[Palantir-Solution-Design]]
- [[Palantir-Use-Case-Design]]

## 다른 플랫폼과 변경 이력

- [[Apollo]]
- [[Gotham]]
- [[Palantir-Defense-OSDK]]
- [[Palantir-Platform-Evolution]]

## 공식 진입점

Capabilities는 데이터/모델/온톨로지/분석/앱/보안을 연결하고 Developers는 개발 환경, SDK, Functions, API와 연결 수단으로 안내한다. 공개 튜토리얼과 Learning portal, Developer community는 별도 학습 경로다.

- [Palantir, Documentation](https://www.palantir.com/docs/)
- [Palantir, Foundry capabilities](https://www.palantir.com/docs/foundry/)
- [Palantir, Developers](https://www.palantir.com/docs/foundry/developers/)
