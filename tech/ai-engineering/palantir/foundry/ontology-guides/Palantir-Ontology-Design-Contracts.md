---
tags: [palantir, ontology, domain-modeling, architecture]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 업무 의미를 보존하는 Ontology 설계

Foundry Ontology는 dataset, virtual table과 모델 위에 실제 업무의 객체, 관계, 행동과 보안 계약을 올리는 운영 계층이다. Object type은 schema, object는 개별 실체, object set은 실체들의 집합이다. Dataset/row/column 비유는 이해를 돕지만 원천 table을 그대로 객체로 옮기라는 설계 지침이 아니다.

## 동일성, 관측과 이력

Object type은 도메인 전문가가 구분하는 실체나 사건을 표현한다. 하나의 원천 row에 주문, 고객과 제품이 섞여 있으면 각 실체와 관계를 분리한다. 장비 자체와 장비 측정도 다른 개념이다. 업무 식별자를 정하고 원천 간 충돌의 우선순위를 pipeline에 명시한다.

시스템별 고객이나 부서별 고객을 같은 실체의 복사본으로 두면 정본이 모호해진다. 통합 type에 업무 속성과 관계를 두되, 실제로 의미와 형태가 다른 개념까지 한 type으로 강제하지 않는다. 겉모양이 비슷하다는 이유로 모든 것을 Asset에 넣으면 sparse property, 조건부 의미와 복잡한 검증이 생긴다.

현재 실체 하나와 변경 이력을 구분한다. Contract의 매년 복사본을 모두 동등한 현재 객체로 두는 대신 현재 Contract와 Amendment/History를 연결한다. 자주 변하는 값은 time series를 검토한다. 이력 자체가 독립적인 업무 실체일 때까지 없애라는 규칙은 아니다.

## 속성과 관계의 의미

모든 property는 업무나 기술상 명확한 사용 이유를 가져야 한다. ETL 디버깅 metadata는 backing dataset에 남기고 기본 업무 모델에 무조건 노출하지 않는다. 필요한 기술 type은 hidden으로 두되 hidden을 접근 통제로 취급하지 않는다.

Link는 foreign key가 있다는 이유가 아니라 실제 관계를 표현해야 한다. 양 방향 이름을 자연스럽게 읽을 수 있게 정한다. 관계 자체에 기간, 역할, 배분량과 상태가 있으면 연결 객체를 사용한다. 예를 들어 사람과 프로젝트 사이의 배정 역할은 사람의 단일 property에 두면 여러 프로젝트에서 의미가 모호해진다.

Object type은 구체적인 단수 명사, property는 의미가 드러나는 이름을 사용한다. `value`, `date`, `relatedItems` 같은 이름은 금액, 유효일, 상위 관계처럼 구체화한다. 이름과 alias는 사람과 에이전트가 출발점을 발견하는 계약이다.

## 실행 계층을 선택한다

| 필요한 작업 | 적합한 경로 |
| --- | --- |
| 사용자/에이전트의 업무 판단과 즉시 변경 | Action |
| 정제, 대량 집계와 안정된 파생값 | Batch pipeline |
| 원천 이벤트의 지속적인 저지연 처리 | Streaming pipeline |
| Ontology 사건에 따른 배정/알림 | Automation |
| 현재 객체 상태를 따라가는 복잡한 실시간 로직 | Function |
| 반복적인 데이터 갱신 orchestration | Schedule |

Action을 property별 setter로 늘리지 않고 부서 이동, 주문 승인처럼 관련 변경을 묶는 업무 단위로 설계한다. 반대로 정기 집계를 사용자가 Action으로 매번 실행하게 하지 않는다. Automation이 Action을 호출할 수 있으므로 사람만 Action을 쓸 수 있다는 제한으로 해석하지 않는다.

## 모델도 업무 계약으로 연결한다

Live inference는 모델 생성, direct deployment, wrapper function 게시, 애플리케이션 호출로 이어진다. Batch inference는 dataset을 통해 object property를 뒷받침할 수 있다. 예측이나 분류를 업무 용어로 표현하면 여러 앱이 재사용할 수 있지만, 이 연결 자체가 모델의 정확성이나 설명 가능성을 입증하지 않는다. 평가와 운영 결과 확인이 필요하다.

## 안정성과 점진적 개선

공식 설계 원칙의 우선순위는 도메인 의미, 중복 제거, core의 안정적 확장, interface 조합이다. 반복된 형태가 세 번 보이면 통합을 검토하되 숫자만으로 억지 추상화를 만들지 않는다. 안정된 core에 모든 팀의 새 속성을 추가하기보다 연결된 확장 type과 interface를 검토한다.

기한과 도구 지원 때문에 타협할 수 있지만 의미, 이름과 보안 경계는 뒤늦게 고치기 어렵다. 타협의 이유와 재검토 조건을 남기고 실제 사용을 개선한다. 이 Vault에 적용할 때도 문서 파일/원천과 지식 개념을 동일시하지 않고, 개념의 정본과 근거를 연결한다. 이는 설계 지침에서 도출한 적용 방향이며 Vault 구현을 바꾼 기록은 아니다.

## 출처

- [Palantir, Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts)
- [Palantir, Models in the Ontology](https://www.palantir.com/docs/foundry/ontology/models)
- [Palantir, Ontology design best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)
- [Palantir, Ontology design anti-patterns](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns)

## 관련 문서

- [[Palantir-Ontology-Structure-and-Extension|파생값, struct와 확장]]
- [[Palantir-Ontology-Task-Validation|실제 질문으로 검증하기]]
- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 설계 지침과 계약을 학습했다. 실제 Ontology를 생성하거나 배포하지 않았다.
