---
tags: [palantir, ontology, interfaces, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 파생값, 구조체와 확장의 경계

한 사실은 의미상 속한 위치에서 관리한다. 다른 객체의 값을 복사하면 모든 변경 경로에서 사본을 갱신해야 한다. Runtime 파생값과 pipeline 사전 계산은 입력이 언제 변하는지에 따라 선택한다.

## 사전 계산과 동적 파생값

같은 row의 안정된 이름을 합치는 계산은 pipeline에서 처리할 수 있다. Action으로 바뀌는 배정 관계의 인원수는 조회 시 link를 세는 derived property가 적합하다. 저장된 count를 유지하면 모든 Action과 Automation이 count도 갱신해야 하며 하나라도 빠지면 불일치가 남는다.

공식 structural guidance는 query당 대략 1만 객체 아래와 위를 성능 검토의 참고 구간으로 나눈다. 이는 하드 한도나 SLA가 아니다. Aggregation 종류와 query 경로를 측정한 뒤 필요할 때만 비정규화하고, 정본과 갱신 전략을 명시한다.

## Struct는 값과 근거를 묶는다

주소, 좌표와 고도처럼 함께 쓰는 값은 struct로 묶을 수 있다. AI 출력의 결과, 신뢰도, 출처와 시각도 같은 구조에 두면 근거가 결과와 분리되는 것을 줄인다. 다중 값은 reducer로 대표값을 고르고 main field로 간단한 속성처럼 보이게 할 수 있다.

Reducer가 고른 값과 전체 관측을 구분한다. 최신값이나 최대 신뢰도 값을 고르는 정책은 사실의 객관적 정답을 보장하지 않는다. 필드명, 선택 기준과 원천을 함께 남겨야 한다.

## Interface와 관계 확장

Interface는 공유 property, link와 Action의 형태를 정의한다. 검사 가능, 예약 가능 같은 능력별 interface를 조합하면 능력 조합마다 새 상속 type을 만들지 않아도 된다. 분류 목적의 interface도 여러 type을 함께 조사하는 데 쓸 수 있다.

특정 workflow가 interface를 아직 지원하지 않으면 per-type 구현이 임시로 필요할 수 있다. Interface를 정의했다는 사실과 모든 UI/API가 그 추상화를 지원한다는 사실을 구분한다. 실제 지원을 확인하고 중복 구현을 정리할 조건을 둔다.

관계의 기간, 역할이나 배분율은 object-backed link의 연결 객체로 표현한다. 단순 연결만 필요한 소비자와 상세 관계 정보가 필요한 소비자에게 서로 다른 탐색 깊이를 제공한다. 단순 foreign key 존재만으로 의미 없는 link를 추가하지 않는다.

## 보안도 도메인 의미를 따른다

Row-level은 볼 수 있는 객체, column-level은 그 객체의 속성을 제한하며 교집합으로 세부 접근을 만든다. 공개/제한 객체를 복제하기 전에 하나의 의미 모델에 정책을 적용할 수 있는지 검토한다. 애플리케이션의 임시 filter를 강제되는 보안 정책으로 대체하지 않는다.

기본 접근을 제한하고 새 type, link와 property가 기존 경계를 우회하지 않는지 확인한다. 접근할 수 있는 사람을 정하는 것과 왜 그 데이터가 필요한지 판단하는 것은 별개다. 실제 row/column 통제가 export나 다른 실행 경로까지 전파되는지는 해당 제품의 보안 계약을 다시 확인한다.

## 출처

- [Palantir, Ontology structural guidance](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance)
- [Palantir, Ontology best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)

## 관련 문서

- [[Palantir-Ontology-Design-Contracts|업무 의미와 실행 계층]]
- [[Palantir-Ontology-Task-Validation|사용성 검증]]
- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 지침을 비교했다. Query 성능과 실제 접근 제어는 실행 검증하지 않았다.
