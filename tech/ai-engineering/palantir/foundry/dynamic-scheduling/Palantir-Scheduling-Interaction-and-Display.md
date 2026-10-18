---
tags: [palantir, foundry, dynamic-scheduling]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Gantt 상호작용과 표시 계약

Gantt의 Allocate는 같은 resource/time 중복 배치를 허용한다. no overlaps는 같은 object type의 기존 puck과 후속 sequence를 이동한다. resource-only/time-only는 이동 축을 제한한다. Simple swap은 두 puck을, Swap with downstream은 이후 sequence도 함께 교환한다. Snap to previous는 앞 puck 끝으로 붙인다. 이 동작을 일반적인 전역 최적화 알고리즘으로 해석하지 않는다.

Snap interval과 단위는 drag 및 resize의 시간 간격을 정한다. 별도 snap 시작을 지정하지 않으면 chart 시작에 맞춘다. Gantt drag-to-create는 Shift+drag로 Create Action form을 열고 start/end/resource를 채운다. primary key를 포함한 Create Action의 필수값도 준비한다. 다른 widget의 drop은 별도 drop Action 설정이 필요하다.

Standard puck은 크기 조절과 상호작용을 지원한다. Background는 읽기 전용이고 Rules를 지원하지 않는다. Event는 시점 marker이며 Gantt에서는 drag/drop과 Rules를 지원하지 않는다. Program Scheduling의 Event 저장 handler와 혼동하지 않는다. Function 색상은 object→hex string 또는 color/name custom type map이며 name을 제공하면 legend를 만든다.

Row 우클릭은 Resource object와 클릭한 timestamp를 Action 기본값으로 전달한다. row select와 puck select는 Workshop event를 연결할 수 있다. 팝업, tab 변경 같은 event는 Ontology 변경 Action과 구별한다. popover/puck properties는 linked object와 function-backed property도 사용할 수 있다.

## 표시 상태

operating hours의 음영/접기, display range, zoom/scroll 제한, timezone, date formatting, row grouping/sort, layer별 subrow, overlapping puck collapse는 화면 표현이다. bounds와 실제 할당 제약의 강제 여부를 따로 확인한다. User Preferences 입력/출력은 deprecated이며 현재 timezone/layout 설정을 우선한다.

Selected Objects는 선택 object set을, Search Results Output은 마지막 추천 Function이 objects를 반환했을 때 그 결과를 제공한다. 화면 search bar의 Enter는 검색 group을 만든다. 변경 log와 scenario Review는 수정 검토를 돕지만 별도 권한이나 backend validation을 대신하지 않는다.

## 출처

- [Palantir, scheduling-drag-and-drop](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-drag-and-drop)
- [Palantir, scheduling-drag-to-create](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-drag-to-create)
- [Palantir, scheduling-gantt-chart-widget](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-gantt-chart-widget)
- [Palantir, scheduling-row-level-interactions-overview](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-row-level-interactions-overview)
- [Palantir, scheduling-row-level-triggering-actions-and-events](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-row-level-triggering-actions-and-events)
- [Palantir, scheduling-schedule-layer-level-interactions](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-schedule-layer-level-interactions)
- [Palantir, scheduling-schedule-layer-style](https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-schedule-layer-style)

## 관련 문서

- [[Palantir-Scheduling-Data-and-Scenarios]]
- [[Palantir-Scheduling-Calendar-and-Programs]]
