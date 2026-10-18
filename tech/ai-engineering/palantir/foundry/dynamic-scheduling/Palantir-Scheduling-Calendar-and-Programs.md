---
tags: [palantir, foundry, dynamic-scheduling]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Calendar와 Program Scheduling의 편집 계약

Calendar는 date/timestamp object를 일/주/월로 표시한다. 기본 read-only이며 dynamic mode는 start/end property에 schedules:schedulable-start-time/end-time type class가 필요하다. Modify save handler의 parameter ID는 property ID와 정확히 같고 동일 type class를 부여하며 optional로 설정한다. 이름만 맞추면 parameter alignment 오류를 해결할 수 없다.

Calendar drag-to-create는 macOS Cmd 또는 Windows key+drag다. Create Action에 start/end 및 추가 입력을 만들고 SELECTED START/END TIMESTAMP 또는 DATE를 대응시킨다. 즉시 제안 object가 보이지만 실제 Ontology 생성은 Save Changes 때다. 기본 form을 표시하고 Hide form and apply immediately if valid를 설정하면 유효할 때 숨긴다. Gantt의 Shift+drag 및 form submission 흐름과 구별한다.

Program Scheduling은 project/task를 계층 grouping으로 표시한다. start/end timeline bounds와 layer object set, puck type, start property가 필요하며 Event는 end가 필요 없다. Standard의 dependency array는 같은 layer 내 다른 object PK를 참조하고 화살표로 표시한다. Background는 읽기 전용이고 Event는 단일 시점이다.

Program의 Standard/Event drag 또는 resize는 schedule object/start/end를 받는 save handler Action으로 연결한다. dependency arrow 편집에는 dependency array parameter를 추가한다. selected object set은 mutable output이며 다른 Workshop widget에 전달할 수 있다. dependency의 시각화가 지연 전파를 자동으로 계산하거나 저장하는 scheduling engine 계약을 뜻하지 않는다.

## 출처

- [Palantir, program-scheduling-configuration](https://www.palantir.com/docs/foundry/dynamic-scheduling/program-scheduling-configuration)
- [Palantir, program-scheduling-overview](https://www.palantir.com/docs/foundry/dynamic-scheduling/program-scheduling-overview)
- [Palantir, scheduling-calendar-overview](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-calendar-overview)
- [Palantir, scheduling-calendar-widget](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-calendar-widget)

## 관련 문서

- [[Palantir-Scheduling-Interaction-and-Display]]
