---
tags: [palantir, ontology, decision, architecture]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["운영 온톨로지", "Operational Ontology"]
---

# 운영 온톨로지: 의미에서 의사결정과 행동까지

운영 온톨로지는 업무 객체의 의미와 관계를 정의하고, 그 객체에 적용할 계산, 행동과 권한을 연결하는 계층이다. Foundry는 데이터셋, 가상 테이블과 모델 위에 이 계층을 두며, 의미 요소와 실행 요소를 함께 다룬다. 개념과 관계를 정의하는 일반 온톨로지는 [[Ontology-Knowledge-Graph]]에서 먼저 구분한다. [Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview)

2026-10-16 공개 문서 대조 기준이다. 제품 기능 설명과 아래 설계 해석을 구분하며 실제 Foundry 환경을 구축하거나 성능, 보안과 장애를 시험한 기록은 아니다.

## 전체 구조를 먼저 본다

| 계층 | 맡는 책임 | 다음 확인 문서 |
|---|---|---|
| 원천과 데이터 통합 | 시스템, 테이블, 문서와 미디어를 연결하고 변환 | [[Palantir-Data-and-Model-Integration]] |
| 의미 모델 | Object type, property, link와 interface로 업무 대상을 표현 | [[Palantir-Ontology-Modeling]], [[Palantir-Ontology-Evolution]] |
| 객체 백엔드 | 원천과 편집을 조회 가능한 객체로 제공 | [[Palantir-Object-Backend]] |
| 로직과 행동 | 계산, 모델 호출, 변경 조건과 실행을 연결 | [[Palantir-Actions-and-Functions]] |
| 접근과 통제 | 스키마, 데이터, 실행과 후속 이용의 경계를 설정 | [[Palantir-Security-and-Governance]] |
| 애플리케이션과 에이전트 | 업무 자원을 UI, SDK와 도구로 소비 | [[Palantir-SDK-and-Agent-Tools]] |

조회 근거를 구성하는 방법은 [[Palantir-Ontology-Retrieval]], 대안 변경과 실제 반영의 분리는 [[Palantir-Ontology-Scenarios]]에서 다룬다. 업무 화면은 [[Palantir-Workshop-Applications]], 모델을 포함한 실행과 평가는 [[Palantir-AIP-Logic-and-Evaluation]]로 연결한다.

표는 공식 구조를 읽기 위한 학습 지도다. 모든 계층이 별도 제품이거나 한 번의 요청에서 순서대로 실행된다는 뜻은 아니다. Architecture Center는 Ontology의 언어, 엔진과 도구를 데이터, 로직과 워크플로 서비스 위의 구조로 설명한다. Foundry는 데이터 운영, AIP는 생성형 AI, Apollo는 소프트웨어 배포 영역을 담당한다. [Architecture overview](https://www.palantir.com/docs/foundry/architecture-center/overview)

공식 Ontology 소개 페이지는 같은 구조를 Language, Engine, Toolchain으로 나눈다. Language는 데이터, 로직, 행동과 보안을 표현하고, Engine은 이질적인 시스템의 조회와 변경을 조정하며, Toolchain은 SDK, MCP와 재사용 도구로 이를 소비하게 한다. 이는 제품의 설계 설명이다. 소개 페이지의 대규모 읽기/쓰기와 낮은 지연 표현을 특정 환경의 처리량이나 외부 시스템까지의 원자성 보장으로 인용하지 않는다. [Ontology 소개](https://www.palantir.com/platforms/ontology)

## 의사결정을 하나의 업무 흐름으로 본다

Palantir의 설계 설명은 의사결정을 데이터, 로직, 행동과 보안의 결합으로 다룬다. 필요한 정보를 조회하는 것에서 끝나지 않고, 선택 가능한 행동을 계산하고 실행 결과를 다음 판단에 연결한다. [Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology)

다음 주문 배정 예시는 이 구조를 이해하기 위한 설계 예시다. 특정 고객 사례나 검증된 구현은 아니다.

1. **상태:** 주문, 라이더, 허브와 수용량을 안정적인 식별자와 관계로 연결한다.
2. **판단:** 배송 시간, 수용량과 운영 조건으로 후보 배정을 계산한다. 모델 점수는 선택 근거의 일부다.
3. **대안:** 변경안을 실제 반영 전에 비교한다. Scenario의 격리된 편집과 실제 반영 계약을 구별한다.
4. **행동:** 허용된 사용자가 배정 Action을 제출하고 서버가 조건을 평가한다.
5. **결과:** 객체 변경과 외부 배차 시스템 반영을 각각 확인한다.
6. **환류:** 사용한 정보, 선택과 결과를 남겨 다음 배정 규칙을 평가한다.

공식 문서의 가상 공급망 사례도 정보 조회, 대안 계산, 사람의 검토와 원천 시스템 연결을 한 흐름으로 설명한다. 이를 실제 고객의 효과 측정 결과로 인용하지 않는다. 의사결정 계보를 남길 수 있다는 기능 설명 역시 기록할 맥락과 평가 기준이 자동으로 정해진다는 뜻은 아니다.

## 객체 그래프만 만들어서는 완성되지 않는다

Operational app은 사용자가 내릴 결정, 필요한 현재 정보, scenario의 대안 비교와 Action의 반영, 실제 결과의 환류를 하나의 흐름으로 구성한다. Agent는 그중 정형 작업을 수행하고 사람은 검토/steering/escalation을 맡도록 정할 수 있다. App-building 안내의 즉시 반영/모든 submission 기록이라는 포괄적 설명은 Action Log의 성공-only 기록과 외부 효과/색인 지연의 전용 계약을 대체하지 않는다. Model의 예측과 실제 outcome을 비교할 기준도 따로 정한다.

의미 모델은 대상과 관계를 일관되게 표현한다. 실행 모델은 어떤 조건에서 상태를 바꿀 수 있는지 정한다. 모델이 적절한 Action을 골랐더라도 데이터 접근, 제출 조건, 동시성과 외부 효과가 충족됐는지는 별개의 문제다.

- 함수나 모델의 결과는 계산 결과다. 업무상 승인과 같은 것으로 취급하지 않는다.
- 도구 설명은 에이전트의 선택을 돕는다. 서버의 무결성 조건을 대신하지 않는다.
- 객체 편집의 트랜잭션과 외부 시스템 변경의 성공은 별도로 확인한다.
- 읽기 필터와 읽은 정보의 후속 전파 통제를 구분한다.

이 구분의 제품별 계약과 예외는 [[Palantir-Actions-and-Functions]], [[Palantir-Security-and-Governance]]에 둔다. 같은 내용을 모든 문서에 복제해 갱신 시점이 갈라지게 하지 않는다.

## 개인 지식 온톨로지에 적용할 범위를 고른다

[[Development-Ontology]]는 지식 원문과 현재 판단의 근거를 연결하는 프로젝트다. Palantir의 운영 온톨로지는 참고할 설계지만, 제품 기능 전체를 이 Vault의 구현 사실로 옮길 수는 없다.

| 배울 관점 | 개인 지식 작업에 적용할 해석 | 별도 검증이 필요한 확장 |
|---|---|---|
| 업무 의미 | 자료의 역할, 개념과 적용 조건을 명시 | 모든 문서를 자동으로 정확히 분류할 수 있는가 |
| 출처와 버전 | 판단 근거가 어느 원문과 시점에서 왔는지 추적 | 갱신된 원문과 기존 결론의 충돌을 감지하는가 |
| 실행 계약 | 조회, 제안, 승인과 실제 변경을 구분 | 업무 시스템에 쓰는 Action의 인가와 복구 |
| 판단 환류 | 채택 이유와 결과를 다음 검토의 근거로 사용 | 자동 결과 수집과 인과 효과 평가 |
| 보호 경계 | 공개 지식과 보호된 원본을 분리 | 여러 사용자의 권한 전파와 외부 반출 통제 |

표의 적용은 설계 해석과 확장 검토 항목이며 구현 완료 목록이 아니다. 현재 구현 계약은 [[Ontology-Context-Platform-Implementation]]과 코드, 운영 근거를 함께 확인한다. 새 그래프 DB나 Foundry 도입을 이 학습의 전제 또는 확정 결정으로 두지 않는다.

## 이해를 확인할 질문

- 같은 주문 배정에서 객체 조회, 모델 점수, Action 제출과 외부 반영의 성공을 각각 어떻게 확인할 것인가?
- 현재 지식 조회에 필요한 출처 추적과, 실제 업무를 바꾸는 실행 권한 중 어느 쪽을 먼저 해결해야 하는가?
- 문서를 읽어 얻은 제품 지식과 직접 시험해서 확인한 동작을 어떻게 구별해 남길 것인가?

## 출처

- [Palantir, Ontology](https://www.palantir.com/platforms/ontology)
- [Palantir, Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview)
- [Palantir, Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Palantir, Architecture Center overview](https://www.palantir.com/docs/foundry/architecture-center/overview)
- [Palantir, Foundry documentation](https://www.palantir.com/docs/foundry)
- [Palantir, Use case development](https://www.palantir.com/docs/foundry/app-building/overview)
- [Palantir, What is an operational application?](https://www.palantir.com/docs/foundry/app-building/operational-apps)
- [Palantir, Connecting analytics to operations](https://www.palantir.com/docs/foundry/app-building/analytics-operations)

## 관련 문서

- [[Palantir-Foundry|Palantir 학습 지도]]
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Development-Ontology|개발 판단 온톨로지]]
- [[AI-Workflow-Knowledge-Loop|업무와 지식의 환류]]
