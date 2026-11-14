---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop URL, navigation과 저장 상태"]
---

# Workshop URL, navigation과 저장 상태

Module interface는 embedding/URL initialization에 노출한 variable API이고 Ontology interface와 다르다. External ID를 안정적으로 관리한다. URL 값은 최초 load 때 초기화하며 이후 주소 변경만으로 현재 variable을 갱신하지 않는다.

## Routing과 layout

Routing은 page ID와 variable의 non-default 현재 값을 URL에 반영한다. Visible-only/always/never inclusion은 URL에 쓰는 정책이며 external ID가 맞는 query parameter의 초기화 허용 여부와 다르다. Variable-backed page default가 있으면 URL page보다 우선해 잠깐 원하는 page 뒤 default로 이동할 수 있으므로 default를 비운다.

Object-set filter는 URL 미지원이고 object set은 singleton RID만 지원한다. Primitive로 filter를 간접 구성할 수 있다. Carbon tab navigation은 별도 계약으로 object-set filter를 전달할 수 있고 parameter key에 variable. prefix가 필요하다. latest는 published, dev는 last saved version이라는 테스트 링크 차이를 구분한다.

## Tabs와 Stepper의 선택 표시

Tabs widget은 자체 selected state를 갖지 않고 On click에 둔 Switch to {tab name}, Switch to {page name} event 중 현재 layout을 바꾸지 않는 event, 즉 이미 선택된 tab이나 열린 page를 가리키는 event로 selection을 추론한다. Layout event가 여러 개면 그런 event가 가장 많은 tab, 동수면 앞 tab이 선택된다. Set variable value event는 문서 기준 현재 선택 판정에 쓰지 않는다. Variable-backed tab selection을 쓰면 Switch to tab event가 backing variable도 갱신하지만, variable-backed page selection은 page 전환이 variable을 갱신하지 않으므로 Set variable value를 Switch to page와 함께 둔다. Widget을 추가해도 switch event가 생기지 않아 대상 tabbed section이나 page를 먼저 만든다.

Tab마다 Boolean variable로 조건부 표시를 걸 수 있다. Disabled 방식은 값이 false일 때 비활성, Hidden 방식은 false일 때 숨김이다. Badge는 string 또는 number variable을 표시한다. 이 설정은 widget의 해당 tab 항목만 숨기거나 비활성화할 뿐 같은 tab이나 page로 가는 다른 event와 URL 경로는 막지 않으므로 data 접근 통제로 쓰지 않는다(설계 제안).

Stepper는 같은 event와 규칙으로 active step을 정한다. Step을 눌렀다는 사실만으로 active가 되지 않고, matching switch event가 없으면 Active color를 쓰지 않는다. Active step은 variable로 출력되지 않으므로 현재 단계가 필요하면 variable-backed tab selection의 string variable이나 Set variable value로 동기화한 page variable에서 읽는다(설계 제안). On click event가 있는 step이 하나도 없으면 어떤 step도 선택할 수 없다.

| 유형 | 선택 가능 범위 |
| --- | --- |
| Linear | Is completed Boolean이 있는 step이 없으면 전부. 있으면 가장 뒤에 완료된 step의 다음 step까지이고 variable이 없는 step은 미완료로 본다. 완료 step이 없으면 1단계만 |
| Non-linear | 순서와 관계없이 이동과 완료 |

완료 step은 번호나 icon 대신 check mark와 Completed color를 쓰고, active이면서 완료된 step은 Active color를 쓴다. Tab 기반 마법사는 tabbed section 밖의 다른 section에 Stepper를 두어 tab이 바뀌어도 보이게 하고, step마다 대응 tab의 Switch to event를 연결한다. Linear 제한과 Is completed Boolean은 UI 진행 상태일 뿐 Action 성공이나 data 검증을 대체하지 않으므로, 완료 variable은 실제 검증 결과에서 도출한다(설계 제안).

## Saved state

State saving은 opt-in variable 현재 값과 선택적으로 page를 사용자가 명시 저장하고 다시 여는 기능이다. 자동 per-user preference persistence는 아니다. Default saved state를 지정하면 saved-state URL이 없는 방문에 적용할 수 있지만 다른 사용자의 설정이나 data 권한을 부여하지 않는다.

State는 external ID로 값을 찾으므로 ID 변경은 과거 state를 깨뜨린다. Widget을 교체해도 호환 type과 같은 ID를 유지하는 migration을 검토한다. Supported types는 Boolean/date/numeric/string/timestamp와 그 array, object set/filter다. Derived-property object set, struct와 기타 type은 일반 지원으로 가정하지 않는다.

View mode state menu에는 platform access와 visible module header가 필요하다. Embedded child의 routing/state setting은 상속되지 않아 parent variable을 interface로 map한다. 저장 링크는 현재 data snapshot이나 권한을 고정하지 않는다. 실제 saved state load는 수행하지 않았다.

## 출처

- [Palantir Workshop, module-interface](https://www.palantir.com/docs/foundry/workshop/module-interface)
- [Palantir Workshop, routing](https://www.palantir.com/docs/foundry/workshop/routing)
- [Palantir Workshop, state-saving](https://www.palantir.com/docs/foundry/workshop/state-saving)
- [Palantir Workshop, widgets-stepper](https://www.palantir.com/docs/foundry/workshop/widgets-stepper)
- [Palantir Workshop, widgets-tabs](https://www.palantir.com/docs/foundry/workshop/widgets-tabs)

## 관련 문서

- [[Palantir-Workshop]]
- [[Palantir-Workshop-Variables-and-Event-Ordering]]
- [[Palantir-Workshop-Charts-and-Aggregation-Shapes]]
