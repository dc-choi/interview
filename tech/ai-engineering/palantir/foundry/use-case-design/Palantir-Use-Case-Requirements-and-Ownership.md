---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Use case 요구사항과 책임의 연결"]
---

# Use case 요구사항과 책임의 연결

## 기능을 먼저 정의하기

공식 framework의 use case는 특정 사용자에게 새 capability를 제공하는 time-bound 팀 활동이다. Source X 연결 또는 ML Y 적용만으로 가치를 정의하지 않고 어떤 결정/행동이 달라지는지와 측정 가능한 결과를 적는다.

요구사항은 User type, Interface, Decision, Decision inputs, Action으로 쓴다. 현행 pain point, 이해관계자, KPI와 배경을 함께 기록한다. 특정 chart/button에 너무 일찍 고정하거나 사용자/결정 범위를 좁게 조사하면 기능적으로 같은 더 단순한 구현을 놓칠 수 있다.

요구사항에서 core/derived/use-case object와 key/cardinality, 상태 전이/validation/누가 실행할지, 필요한 enrichment와 인터페이스 목적을 도출한다. Core는 원천 truth의 granularity, derived는 파생 개념, use-case object는 업무에서 편집하는 상태다. 색이나 diagram상의 분류가 실제 permission을 만들지 않는다.

## Enrichment 위치와 실행 순서

UI 내부 계산은 Action 변경을 바로 반영하기 쉽지만 매번 실행 비용과 재사용/후속 filter 한계가 있다. Data layer 계산은 재사용하기 쉽지만 갱신 지연이 있다. Action으로 바뀌지 않는 enrichment라면 data layer부터 검토한다는 원문 heuristic은 절대 규칙이 아니다. 실제 freshness/scale/identity/permission을 비교한다.

권장 순서는 robust pipeline, practical object model, label/metric enrichment와 decision-capture interface 기반을 만든 후 model/scenario로 확장하는 것이다. 모든 ML 탐색을 나중으로 금지하는 규칙이 아니라 multiplier에 필요한 기반을 먼저 증명하는 접근이다. 원문의 Workshop 개발비1/10 예시는 설명용 주장이지 프로젝트별 비용 추정치가 아니다.

Domain lead는 domain ROI/우선순위, workstream lead는 여러 use case의 공유/역량 배치, use case lead는 ROI/adoption/권한/운영 조정, product owner는 roadmap/기능 책임을 맡는다. SME는 현행업무와 제약을 검증하고 developer는 전문분야별 구현을 한다. 역할표를 실제 인력 배치나 접근권한으로 자동 적용하지 않는다.

## 화면에서 실행 조직까지 연결한다

공유 상황판이 있어도 사용자가 정보를 찾고 위험을 판단하는 훈련, 결정 권한과 책임, 데이터 제공 조직의 접근 합의가 필요하다. 이는 2023년 S4G 발표에서 설명한 데이터 접근 조율과 실무자 훈련/결정 위임을 요구사항 설계에 적용한 해석이다. 발표자의 성과 주장을 독립 검증한 결과나 제품의 자동 보장으로 취급하지 않는다. (2026-10-18 [공식 발표 영상](https://www.youtube.com/watch?v=1F7apO2hFXk&t=952s) 15:52–16:54, 28:13–29:14 전사와 화면 표본 대조)

재고 재배치 시뮬레이션에서 Allocation Request를 제출하는 단계도 승인, 출하와 실제 재고 이동의 완료와 구분한다. 2024년 6월 AIPCon의 Fujitsu 시연은 Send Allocation Request 버튼에 대기 중이거나 처리 중인 action item이 있어 새 요청을 만들 수 없다는 툴팁을 띄우지만, 버튼을 누르자 요청 상태가 들어간 생성 폼이 열리고 제출 뒤 Successfully Submitted 알림이 나온다. 이 툴팁 문구만으로 중복 요청 차단이 동작한다고 보지 않는다. 이 화면에서 도출할 설계 원칙은 단계별 상태, 책임자와 완료 근거를 따로 정의하는 것이다. (2026-10-18 [공식 발표 영상](https://www.youtube.com/watch?v=CmpQTrnL3ko&t=5742s) 1:35:42–1:35:51 화면 확인, 실제 업무 실행 없음)

## 출처

- [Palantir use-case-life-cycle, use-case-life-cycle](https://www.palantir.com/docs/foundry/use-case-life-cycle)
- [Palantir use-case-life-cycle, distilling-functional-requirements](https://www.palantir.com/docs/foundry/use-case-life-cycle/distilling-functional-requirements)
- [Palantir use-case-life-cycle, overview](https://www.palantir.com/docs/foundry/use-case-life-cycle/overview)
- [Palantir use-case-life-cycle, sequencing-development](https://www.palantir.com/docs/foundry/use-case-life-cycle/sequencing-development)
- [Palantir use-case-life-cycle, solution-design](https://www.palantir.com/docs/foundry/use-case-life-cycle/solution-design)
- [Palantir use-case-life-cycle, use-case-roles](https://www.palantir.com/docs/foundry/use-case-life-cycle/use-case-roles)

## 관련 문서

- [[Palantir-Use-Case-Design]]
