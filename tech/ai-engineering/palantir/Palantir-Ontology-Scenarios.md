---
tags: [palantir, ontology, scenario, simulation, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 시나리오", "Ontology Scenarios"]
---

# Ontology Scenario: 대안 편집과 실제 반영을 분리한다

Scenario는 기준 Ontology 데이터 위에 Action으로 만든 편집을 얹어 대안을 비교하는 공간이다. 예를 들어 배정이나 재고 이동안을 적용한 결과를 보고, 실제 운영 데이터에 반영할지 별도로 결정한다. 2026-10-16 기준 beta 기능이며 enrollment별 가용성을 확인해야 한다. [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

공개 문서 대조만 수행했으며 실제 Scenario의 격리, 권한, 합병과 외부 호출을 시험하지 않았다.

## 과거 데이터 스냅샷과 구분한다

Scenario는 과거 시점 조회를 위한 버전 저장소가 아니다. 기준이 되는 main 또는 global branch에 **10분마다 자동 rebase**되며, 임의 시점에 rebase하거나 주기를 설정할 수 없다. 같은 Scenario를 나중에 조회했을 때 원천 변화가 반영될 수 있다. [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

따라서 재현 가능한 평가를 설계할 때는 Scenario 식별자만 남겨 충분하다고 판단하지 않는다. 입력 데이터의 기준, 모델과 함수 버전, 평가 시점과 기대 결과를 함께 정해야 한다. 이는 자동 rebase 조건에서 도출한 설계상 주의점이다.

Global branching은 개발자가 워크플로를 개발하고 시험하는 경계다. Scenario는 만들어진 업무 흐름의 사용자가 데이터 변경안을 비교하는 경계다. 둘을 같은 종류의 소스 코드 branch로 해석하지 않는다.

## 임시 상태와 공유할 메타데이터를 나눈다

| 형태 | 저장과 사용 범위 |
|---|---|
| Temporary scenario | 현재 세션의 임시 분석. 세션이 끝나면 임시 메타데이터가 사라지므로 공유나 보존 수단으로 삼지 않음 |
| Persisted scenario | Ontology 객체에 Scenario 메타데이터를 저장해 공유, 분류와 검토 흐름에 사용 |

Workshop에서 Scenario를 만들었다고 모든 위젯이 자동으로 같은 상태를 보는 것은 아니다. 객체 표는 Scenario 데이터 사용을 켜고 해당 변수를 연결하며, Action도 `Apply to Scenario` 대상을 설정한다. 집계 변수와 객체 속성 변수 역시 어떤 Scenario를 읽는지 확인한다. [Temporary scenarios](https://www.palantir.com/docs/foundry/ontology/temporary-scenario)

Persisted scenario의 객체 타입은 `Ontology Scenario` interface를 구현하고 primary key를 Scenario Reference에 연결한다. 기본 수명은 31일이며, 만료되면 편집과 backing Scenario 객체가 삭제된다. 만료 속성을 바꿀 수 있지만 새 만료 시점은 설정 시점에서 31일을 넘길 수 없다. 저장했다는 이유로 무기한 보존된다고 해석하지 않는다. [Store scenario metadata as objects](https://www.palantir.com/docs/foundry/ontology/persisted-scenario)

## 검토 상태와 실행 인가를 연결한다

다음은 공식 문서의 검토 흐름을 일반화한 구성이다. 상태값만 추가하면 자동으로 강제되는 규칙은 아니다.

1. Scenario 객체에 작성자, 상태와 검토 정보를 둔다.
2. 객체 보안 정책으로 작성자와 검토 그룹의 조회 범위를 정한다.
3. 객체를 Action으로만 편집하도록 설정한다. 제출 Action은 작성자 일치와 초안 상태를, 승인/반려 Action은 검토 그룹 소속과 검토 중 상태를 함께 검사한다.
4. 실제 합병은 merge Action의 제출 조건으로 별도로 통제한다.

그룹은 이름 대신 안정적인 그룹 ID로 참조하고, 객체 타입 정의의 조회 권한도 확인한다. 승인 Action에 `Apply Scenario` rule을 추가해 승인과 합병을 같은 Action으로 묶는 구성도 가능하다. [Persisted scenario governance](https://www.palantir.com/docs/foundry/ontology/persisted-scenario)

Scenario 안에서는 실험을 허용하되 실제 데이터에는 적용하지 못하게 하려면 실행 문맥을 제출 조건에 반영한다. 사용자에게 Scenario 편집을 허용한 사실이 main 반영 권한을 뜻하지는 않는다.

## Merge는 실제 데이터 변경이다

Scenario에서 생성, 수정, 삭제한 객체와 링크의 편집은 그 안에 머문다. Merge Action은 이 편집을 하나의 Ontology 트랜잭션으로 반영한다. 합병할 object/link type 범위와 실행할 사용자를 정의하고 Action 제한도 확인한다. [Merge scenarios](https://www.palantir.com/docs/foundry/ontology/merge-scenario)

이 계약을 외부 시스템 전체의 원자성으로 확대하지 않는다. Action의 webhook, 알림과 함수 외부 호출은 별도 실패 경계를 가지며 [[Palantir-Actions-and-Functions]]에서 다룬다. Scenario의 객체 격리만으로 외부 호출까지 무해한 시험 환경이 되었다고 판단하지 않는다.

## SDK와 함수도 실행 문맥을 확인한다

OSDK의 Scenario 지원은 experimental이다. TypeScript는 `@osdk/client` 2.27.0 이상과 맞는 생성 SDK를 요구하며, `createScenario` 또는 `withScenario`로 얻은 client의 조회와 Action은 Scenario 문맥에서 실행된다. 확인한 TypeScript 절에서는 batch Action, 중첩 Scenario와 transaction 결합을 지원하지 않는다. [Use scenarios with OSDK](https://www.palantir.com/docs/foundry/ontology/osdk-scenario)

편집된 객체 목록은 식별자만 있는 결과이므로 속성이 필요하면 Scenario client로 다시 조회한다. 편집 링크 조회는 many-to-many를 반환하며 one-to-many는 외래 키 소유 객체의 편집으로 나타난다. 이를 편집 누락으로 오해하지 않는다.

AIP Logic 함수를 Scenario에서 사용하려면 해당 함수와 호출하는 중첩 Logic 함수에 staged writes를 켜야 한다. 다른 함수와 같은 기본 동작으로 가정하지 않는다. [Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)

## 출처

- [Palantir, Scenarios overview](https://www.palantir.com/docs/foundry/ontology/overview-ontology-scenario)
- [Palantir, Temporary scenarios](https://www.palantir.com/docs/foundry/ontology/temporary-scenario)
- [Palantir, Store scenario metadata as objects](https://www.palantir.com/docs/foundry/ontology/persisted-scenario)
- [Palantir, Merge scenarios](https://www.palantir.com/docs/foundry/ontology/merge-scenario)
- [Palantir, Use scenarios with OSDK](https://www.palantir.com/docs/foundry/ontology/osdk-scenario) — TypeScript의 생성, 조회, 편집, 합병과 편집 목록 절을 대조했다. Python 예제 전체와 실행 결과는 확인하지 않았다.

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Actions-and-Functions]]
- [[Palantir-Security-and-Governance]]
- [[Palantir-SDK-and-Agent-Tools]]
