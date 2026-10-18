---
tags: [palantir, ontology, semantic-search]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology의 의사결정과 애플리케이션 경계

Ontology는 data, logic, action과 security를 업무 객체에 연결하는 계층이다. 공급망 분석 결과를 화면에서 확인하는 일과 실제 배정을 바꾸는 일을 같은 업무 의미로 연결한다. 공식 문서의 Onyx 의료기기 사례는 설명용 시나리오이며 검증된 도입 성과로 읽지 않는다.

## 판단의 이력을 남기는 이유

판단 당시 데이터 버전, 사용한 애플리케이션과 로직, 검토한 대안, 선택 이유와 실제 결과를 연결하면 이후 판단을 평가할 수 있다. 이 자료는 검색 맥락이나 학습 데이터의 후보가 된다. 연결했다는 사실만으로 모델이 자동 재학습되거나 모든 추론 과정이 저장되는 것은 아니다.

시뮬레이션 중 대안을 바꾸는 것과 실제 시스템에 변경을 확정하는 것은 구분한다. ERP API, connector와 비동기 파일을 함께 사용한다는 설명은 외부 시스템 전체의 원자적 트랜잭션을 보장하지 않는다. 실패, 재시도와 부분 성공은 각 실행 경로의 계약을 확인해야 한다.

LLM은 자연어를 업무 객체와 도구로 연결할 수 있다. 계산, 제약 검사와 권한 판정은 검증 가능한 함수와 시스템으로 분리한다. 공식 소개의 보안 통합 주장은 export, webhook, 캐시와 복사본까지 동일한 정책이 자동 전파된다는 뜻이 아니다.

## 목적에 따라 화면을 고른다

| 도구 | 중심 작업 | 설계할 때 확인할 점 |
| --- | --- | --- |
| Object Views | 특정 객체와 연결 관계를 함께 확인 | 객체 중심의 일관된 진입점 |
| Object Explorer | 검색, 필터, search around, object set과 bulk Action | 정해지지 않은 질문의 탐색 |
| Quiver | 분석, 통계와 time series, 읽기 중심 dashboard | 탐색 결과와 변경 업무의 분리 |
| Workshop | 정해진 업무의 상호작용과 writeback | 완료 조건과 Action 연결 |
| Slate | 코드 중심 맞춤 앱, 객체와 dataset 결합 | 높은 유연성과 유지보수 부담 |
| Carbon | 여러 앱을 묶은 업무 공간 | 사용자별 진입점과 탐색 |
| Map | 공간 데이터와 객체 분석 | 위치와 관계가 실제 판단에 필요한지 |

탐색형/정형 업무와 기본 도구/맞춤 개발은 서로 다른 선택 축이다. 모든 문제를 맞춤 dashboard로 시작하면 모델의 발견성과 재사용 가능성이 부족한 상태를 화면으로 가릴 수 있다.

## Vault에 적용할 때

개념을 저장하는 것과 판단에 사용한 근거를 남기는 것을 연결한다. 자료의 주장, AI의 해석과 실제 업무 결과를 구분해야 나중에 무엇을 바꿀지 판단할 수 있다. 이는 설계에서 얻은 적용 방향이며 현재 Vault에 의사결정 실행 엔진이 구현됐다는 뜻은 아니다.

## 출처

- [Palantir, why-ontology](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Palantir, applications](https://www.palantir.com/docs/foundry/ontology/applications)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]
- [[Palantir-Ontology-Task-Validation|업무 질문으로 검증]]

공식 문서를 대조한 지식이며 실제 Foundry 배포나 SDK 실행은 검증하지 않았다.
