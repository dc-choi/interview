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

## 출처

- [Palantir use-case-life-cycle, use-case-life-cycle](https://www.palantir.com/docs/foundry/use-case-life-cycle)
- [Palantir use-case-life-cycle, distilling-functional-requirements](https://www.palantir.com/docs/foundry/use-case-life-cycle/distilling-functional-requirements)
- [Palantir use-case-life-cycle, overview](https://www.palantir.com/docs/foundry/use-case-life-cycle/overview)
- [Palantir use-case-life-cycle, sequencing-development](https://www.palantir.com/docs/foundry/use-case-life-cycle/sequencing-development)
- [Palantir use-case-life-cycle, solution-design](https://www.palantir.com/docs/foundry/use-case-life-cycle/solution-design)
- [Palantir use-case-life-cycle, use-case-roles](https://www.palantir.com/docs/foundry/use-case-life-cycle/use-case-roles)

## 관련 문서

- [[Palantir-Use-Case-Design]]
