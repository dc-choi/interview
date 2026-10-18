---
tags: [palantir, ontology, data-modeling, assessment, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 의사결정 기록과 평가 모델"]
---

# 의사결정 기록과 평가 모델

업무 대상, 특정 시도의 계획, 실행과 결과 평가는 서로 다른 수명과 식별자를 갖는다. 이를 한 객체의 상태값으로만 표현하면 여러 시도와 상충하는 평가를 보존하기 어렵다. Defense OSDK의 Targeting and Fires 스키마에서도 이 역할을 분리한다. 여기서는 공개 모델의 정보 구조와 계약을 다룬다.

## 대상과 시도, 실행과 평가

`Targetable Entity`는 대상 자체이며 `Intelligence Subject`를 확장한다. `Target`은 그 대상에 대한 개별 시도를 표현하고 대상 링크를 필수로 갖는다. 한 대상에 여러 Target이 연결될 수 있다. 따라서 두 타입을 같은 실체의 다른 이름으로 합치면 시도별 이력을 잃는다.

`Engagement`는 `Operation`을 확장하는 실행 기록이고, 여러 평가에 연결될 수 있다. `Target Effect Solution`과 `Effector Employment`는 구성 관계를 별도로 표현한다. 구체적인 하위 타입인 `Aimpoint Weapon Employment`는 위치와 오차 같은 추가 속성을 가진다. 이 스키마가 정의돼 있다는 사실은 실행 승인이나 외부 시스템 호출이 자동으로 강제된다는 근거가 아니다.

## 관계에 속성이 있으면 연결 객체로 만들기

`Target List`와 `Target` 사이에는 `Target List Assignment`가 있고, 특정 목록 안의 우선순위를 그 연결 객체에 저장한다. 대상의 전역 속성에 우선순위 하나를 두는 것과 다르다. 일반 업무에서도 같은 항목의 순위가 목록마다 달라지면 연결 자체를 모델링할 필요가 있다.

`Target Priority`는 특정 타입의 상대 우선순위이며 `High Payoff Target List`에 속한다. `Attack Guidance`와 `Target Selection Standard`도 각각 별도 Matrix에 속한다. 계획을 나타내는 `Targeting Operation`은 이 묶음들을 참조한다. 여러 소비자가 같은 규칙 묶음을 참조하는 구조와 개별 대상의 실행 이력을 구분한다.

## 범위와 권한의 기록

`Targeting Area`는 공간 범위를, `Target Engagement Authority`는 소유 조직과 범위에 연결된 권한의 기록을 표현한다. 데이터에 권한 객체가 존재하는 것과 플랫폼이 요청을 허용하는 것은 별도 문제다. 실제 접근과 행동 검증은 [[Palantir-Security-and-Governance]]와 [[Palantir-Actions-and-Functions]]의 실행 계약으로 확인한다.

`Collateral Concern Candidate`는 점 기반과 영역 기반 하위 타입으로 나뉜다. 각각 위치와 geometry를 필수로 갖는다. 후보와 목록은 다대다이며, Guidance는 여러 목록과 적용 범위를 연결한다. 한 객체에 점이나 영역 중 아무 값이나 넣는 대신 필요한 형태를 인터페이스로 구분한 사례다.

`Fire Support Coordination Measure`는 지도 표시용 anchor points와 거리, 별도의 intersection geometry를 정의한다. 화면에 그린 도형과 계산에 사용하는 geometry가 같은 필드라고 가정하면 안 된다. 유효 기간과 활성 여부도 다른 속성이다.

## 수행 여부와 결과, 결과와 신뢰도

| 평가 종류 | 구분하는 정보 |
| --- | --- |
| Serviced Assessment | 시도가 있었는지 나타내는 필수 boolean |
| Physical Assessment | 물리적 결과, 시각과 신뢰도 |
| Functional Assessment | 기능적 결과, 시각과 신뢰도 |
| Munition Effectiveness Assessment | 평가 범위와 시각, 서로 다른 결과 판단 |
| Collateral Damage Assessment | 부수적 피해 판단, 추정과 시각, 신뢰도 |

시도 여부가 참이라는 사실을 효과가 있었다는 뜻으로 바꾸지 않는다. 또한 일부 결과는 `Yes`, `No`, `Undetermined`를 구분한다. 이를 boolean으로 축약하면 미확정을 부정이나 긍정으로 잘못 바꿀 수 있다.

신뢰도도 `Confirmed`, `Probable`, `Possible`, `Undetermined`의 별도 값이다. 결과의 종류와 평가에 대한 신뢰는 독립된 차원이다. 여러 평가가 한 실행과 연결되므로 최근 값 하나로 덮어쓰기 전에 이력과 근거의 보존 방식을 결정한다.

## 스키마 변경과 문서 불일치

`Change Assessment`와 그 효과 값 타입은 폐기 예정으로 표시되며, 상세 문서는 `Physical Assessment`와 대응 값 타입 사용을 안내한다. 그러나 기존 값 목록에는 물리적 상태와 다른 변화 표현이 함께 있다. 이름만 바꿔 모든 값을 기계적으로 옮기기보다 의미 보존과 실제 허용값을 확인해야 한다.

`Target Selection Standard`의 Mobility 설명은 양쪽에 적용할 때 생략한다고 쓰지만 상세는 `required: true`이고 두 허용값만 정의한다. `Fire Support Coordination Measure`의 일부 소유/조정 링크 설명도 필수를 뜻하는 표현을 쓰지만 상세는 선택 링크다. 이런 차이는 구현 환경의 메타데이터와 실제 검증 규칙으로 해소해야 한다.

## 출처

- [Palantir Documentation, Targetable Entity](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetableEntity/)
- [Palantir Documentation, Target](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-target/)
- [Palantir Documentation, Target Type](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetType/)
- [Palantir Documentation, Engagement](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-engagement/)
- [Palantir Documentation, Target Effect Solution](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetEffectSolution/)
- [Palantir Documentation, Effector Employment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-effectorEmployment/)
- [Palantir Documentation, Aimpoint Weapon Employment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-aimpointWeaponEmployment/)
- [Palantir Documentation, Target List](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetList/)
- [Palantir Documentation, Target List Assignment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetListAssignment/)
- [Palantir Documentation, Target Priority](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetPriority/)
- [Palantir Documentation, High Payoff Target List](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-highPayoffTargetList/)
- [Palantir Documentation, Attack Guidance](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-attackGuidance/)
- [Palantir Documentation, Attack Guidance Matrix](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-attackGuidanceMatrix/)
- [Palantir Documentation, Target Selection Standard](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetSelectionStandard/)
- [Palantir Documentation, Target Selection Standard Matrix](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetSelectionStandardMatrix/)
- [Palantir Documentation, Targeting Operation](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetingOperation/)
- [Palantir Documentation, Targeting Area](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetingArea/)
- [Palantir Documentation, Target Engagement Authority](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetEngagementAuthority/)
- [Palantir Documentation, Collateral Concern Candidate](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralConcernCandidate/)
- [Palantir Documentation, Point-Based Collateral Concern Candidate](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralConcernCandidatePoint/)
- [Palantir Documentation, Geometry-Based Collateral Concern Candidate](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralConcernCandidateWithGeometry/)
- [Palantir Documentation, Collateral Concern List](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralConcernList/)
- [Palantir Documentation, Collateral Concern Guidance](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralConcernGuidance/)
- [Palantir Documentation, Fire Support Coordination Measure](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-fireSupportCoordinationMeasure/)
- [Palantir Documentation, Serviced Assessment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-targetAssessment/)
- [Palantir Documentation, Physical Assessment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-physicalAssessment/)
- [Palantir Documentation, Functional Assessment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-functionalAssessment/)
- [Palantir Documentation, Munition Effectiveness Assessment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-munitionEffectivenessAssessment/)
- [Palantir Documentation, Collateral Damage Assessment](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-collateralDamageAssessment/)
- [Palantir Documentation, Change Assessment (deprecated)](https://www.palantir.com/docs/defense-osdk/api/targetingFires/interfaceTypes/com-palantir-ontology-defense-types-changeAssessment/)

## 관련 문서

- [[Palantir-Defense-Ontology-Contracts]]
- [[Palantir-Observation-and-Evidence-Modeling]]
- [[Palantir-Resource-and-Hierarchy-Modeling]]
- [[Palantir-Actions-and-Functions]]
