---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop object 표시, selection과 ordering"]
---

# Workshop object 표시, selection과 ordering

Object Table/List는 object set을 표시하지만 Active object(singleton/highlight)와 Selected objects(multiselect)는 다른 output이다. 첫 row auto-selection이 기본일 수 있고 hidden widget도 eager/never-unmount에서 선택을 바꿀 수 있다. Multi-object input을 single-object view/property list에 주면 first object만 쓰는 계약인지 확인한다.

## Table과 linked value

Column display name은 추가 시 property name을 복사한 text여서 Ontology rename에 자동 동기화되지 않는다. Multiple type combine은 display name과 ID가 모두 같을 때 column을 합치며 inline edit와 동시 사용은 제한된다. Visibility/order array가 empty이면 configured column 전체를 보여 주므로 empty를 hide-all로 쓰지 않는다.

Function-backed column input은 ObjectSet을 권하고 object array는 덜 효율적이다. Output은 TSv1 FunctionsMap<object,value>, TSv2 Record<ObjectSpecifier,value>, Python dict[object,value]다. Runtime input은 현재 displayed object만, variable input은 전체 set일 수 있다. 여러 값은 custom type 하나로 묶어 function 반복 비용을 줄인다.

Function sort는 모든 대상 계산을 기다리고 base-property sort와 결합할 수 없다.10,000초과이면 end-user sort 미지원, default sort는 loaded page별로만 적용한다. 전체 ranking이라고 표시하지 않는다. Module-defined derived property sort는200row 한도이며 linked aggregation은 native property만, column math는 다른 column-math를 참조할 수 없다. Workshop traversal은1hop이다.

## 큰 property와 view

Geoshape/vector는 generally non-performant로 기본 unload지만 Table/List/Property List에서 user demand로 load할 수 있고 Map geoshape는 자동 load한다. Derived property는 native large type과 다른 query-time 계산이다. Runtime-derived는 module 내부 정의여서 Ontology에 저장되지 않으며 saved state object set에서 미지원이다.

Full Object View는 first object, panel은 instance/adaptive/object-set mode를 구분한다. Adaptive의0개와복수는 set view다. Standard/configured/legacy view 및 interface mapping의 지원 범위도 다르다. Links traversal/hover와 Linked Compass Resource link/upload는 서로 다른 관계다.

## List reorder와 resource list

Object List reorder는 single widget/list layout에서만 지원하고500objects까지만 보여 준다. PK array가 정렬 순서를 나타내며 filtered-out key도 유지한다. Array update는 session 값이므로 persistence가 필요하면 Action을 구성한다. Reorder마다 Action 실행과 나중에 저장하기는 별개 선택이다.

Resource List는 user permissions에 맞춘 resource/type/object-set navigation이다. Static display metadata override나 item visibility는 access grant가 아니다. Marketplace dependency 자동탐지가 Compass resource references에 안 되므로 manual dependency 확인이 필요하다. 실제 table/order/export는 실행하지 않았다.

## 출처

- [Palantir Workshop, derived-properties](https://www.palantir.com/docs/foundry/workshop/derived-properties)
- [Palantir Workshop, unsupported-object-properties](https://www.palantir.com/docs/foundry/workshop/unsupported-object-properties)
- [Palantir Workshop, widgets-core-display](https://www.palantir.com/docs/foundry/workshop/widgets-core-display)
- [Palantir Workshop, widgets-linked-compass-resources](https://www.palantir.com/docs/foundry/workshop/widgets-linked-compass-resources)
- [Palantir Workshop, widgets-links](https://www.palantir.com/docs/foundry/workshop/widgets-links)
- [Palantir Workshop, widgets-object-dropdown](https://www.palantir.com/docs/foundry/workshop/widgets-object-dropdown)
- [Palantir Workshop, widgets-object-list](https://www.palantir.com/docs/foundry/workshop/widgets-object-list)
- [Palantir Workshop, widgets-object-set-title](https://www.palantir.com/docs/foundry/workshop/widgets-object-set-title)
- [Palantir Workshop, widgets-object-table](https://www.palantir.com/docs/foundry/workshop/widgets-object-table)
- [Palantir Workshop, widgets-object-view](https://www.palantir.com/docs/foundry/workshop/widgets-object-view)
- [Palantir Workshop, widgets-property-list](https://www.palantir.com/docs/foundry/workshop/widgets-property-list)
- [Palantir Workshop, widgets-resource-list](https://www.palantir.com/docs/foundry/workshop/widgets-resource-list)

## 관련 문서

- [[Palantir-Workshop]]
