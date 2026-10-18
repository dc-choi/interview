---
tags: [palantir, machinery, process]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Machinery 상태와 process log

## 상태 모델과 실행 로직

Machinery는 object가 시간에 따라 상태를 바꾸는 process를 모델링하고 Action/Automate/AI workflow를 연결한다. Process container 하나는 object type의 string 상태 property 하나를 추적한다. 한 시점의 상태는 하나로 두고 독립적인 여러 상태 축은 별도 process와 hierarchy로 표현한다.

State ID는 실제 데이터 값과 일치해야 하고 화면 label은 별도로 바꿀 수 있다. Enum value type을 backing하면 허용 값과 graph 상태를 맞추기 쉽다. Graph에서 상태 값을 바꿔도 Ontology 값, Action submission criteria나 자동화 조건이 함께 바뀌지는 않는다.

Input state는 Action submission criteria로 강제할 수 있지만 graph의 output state 화살표가 결과를 강제하지는 않는다. 실제 Action 로직을 검토한다. 자동화 노드는 상태 진입에 따른 실행과 notification side effect를 표현한다. Graph를 그린 것과 workflow를 구현한 것은 구분한다.

## 최신 상태와 이벤트 이력

Process object는 최신 상태만 보여 주므로 transition, 체류 시간과 경로 분석에는 log object가 필요하다. 필수 log schema는 log ID, process ID, old/new state와 timestamp다. 선택적으로 isLatest, millisecond duration, serialized JSON path, action type RID와 owning app RID를 담는다.

외부 입력의 단순 changelog는 processId, state, timestamp와 선택적 isDeleted로 제공한다. 최신 log의 isDeleted가 true면 Ontology에서 해당 object를 제외한다. Platform edit를 추적하려면 user edit history를 켜고 materialization을 구성한다. 검증일에는 multiple datasource나 row-level permission object type의 platform edit log 추적은 지원하지 않는다.

## 설치와 신선도

Machinery의 표준 설치는 Marketplace product로 Pipeline Builder pipeline, log object type과 process link를 만든다. 초기 build와 indexing이 끝나야 mining/monitoring에 보인다. 자동 log는 원본 process보다 한 build와 indexing job만큼 뒤처지며 문서상 보통 2~5분이다. 실시간 요구에는 최소 schema를 충족하는 custom log가 필요하다.

자동 관리 log object에 임의의 수정 Action을 정의하지 않는다. 외부 변경과 platform 변경을 모두 분석하려면 원천 changelog와 edit history의 coverage/순서를 확인한다.

## 출처

- [Palantir Foundry, machinery](https://www.palantir.com/docs/foundry/machinery/)
- [Palantir Foundry, connect-data](https://www.palantir.com/docs/foundry/machinery/connect-data/)
- [Palantir Foundry, core-concepts](https://www.palantir.com/docs/foundry/machinery/core-concepts/)
- [Palantir Foundry, draw-a-graph](https://www.palantir.com/docs/foundry/machinery/draw-a-graph/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/machinery/overview/)

## 관련 문서

- [[Palantir-Foundry-Machinery]]
