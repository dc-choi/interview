---
tags: [palantir, foundry, dynamic-scheduling]
status: done
verified_at: 2026-10-21
category: "AI엔지니어링(AIEngineering)"
---

# Scheduling 데이터 모델과 변경 경계

Schedule은 작업의 시작/종료와 Resource 할당을 나타내고 Resource는 사람, 장비, 장소처럼 배정 대상이다. 최소 두 object type과 link가 필요하다. 기본 Schedule schema는 String resource foreign key와 Timestamp start/end이며 many-to-one와 many-to-many 관계를 지원한다. 여러 Resource type으로 확장할 수 있다. 수정할 object에는 edits를 활성화한다.

Schedule에는 기간을 고정할지 정하는 Boolean property를 선택적으로 둘 수 있다. 첫 구성에서는 Schedule의 시작, 종료와 Resource 관계를 편집할 수 있는지 먼저 확인한 뒤 Workshop에 연결한다.

Gantt는 resource row, schedule puck, 전체 timeline bounds와 하나 이상의 schedule layer를 받는다. 시작/종료 또는 연결 resource가 빠진 puck은 unscheduled drawer에 놓인다. 같은 object type도 여러 layer에서 다른 스타일과 상호작용을 가질 수 있다.

각 layer에는 Schedule Object Set, Linked Resource Property, Start Time Property, End Time Property와 해당 Save Handler Action을 연결한다. Action을 선택하는 것에서 끝내지 않고 widget이 제공하는 변수를 parameter의 기본값으로 지정해야 드래그한 object와 변경 시간이 전달된다.

Scenario를 활성화하면 Action은 격리된 제안 변경으로 들어가고 Review/Submit 후 Ontology에 적용된다. 비활성화하거나 Disable Scenario 변수가 true이면 직접 Ontology를 수정한다. UI에서 제약을 표시하는 것과 서버 Action의 허용 조건은 별도로 설계한다.

## Save handler

표준 modify Action에는 Schedule object와 optional resource ID/start/end를 연결하고 widget의 SCHEDULE OBJECT, RESOURCE ID, SELECTED START/END TIMESTAMP를 기본값으로 준다. 수정할 property ID와 Action parameter ID가 정확히 일치해야 한다. 표시 이름의 일치는 이 계약을 대체하지 않는다.

복합 변경이나 외부 API 호출에는 function-backed Action을 쓸 수 있다. 다만 drag 결과를 화면에서 이동한 것과 Action 성공, scenario 제출 성공을 같은 상태로 취급하지 않는다.

동일 본문 canonical alias: [scheduling-overview](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-overview).

## 출처

- [Palantir, dynamic-scheduling](https://www.palantir.com/docs/foundry/dynamic-scheduling)
- [Palantir, scheduling-concepts](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-concepts)
- [Palantir, scheduling-getting-started](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-getting-started)
- [Palantir, scheduling-ontology-primitives](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-ontology-primitives)
- [Palantir, scheduling-drag-and-drop](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-drag-and-drop)
- [Palantir, scheduling-gantt-chart-widget](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-gantt-chart-widget)

## 관련 문서

- [[Palantir-Scheduling-Interaction-and-Display]]
- [[Palantir-Scheduling-Function-Contracts]]
