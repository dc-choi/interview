---
tags: [palantir, carbon, navigation, workshop, slate]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Carbon module navigation과 parameter"]
---

# Carbon module 발견과 parameter 전달

Module은 parameter를 받는 application의 Carbon tab이다. Object/View/Explorer, Workshop, Quiver dashboard, Slate, Vertex와 read-only Notepad 등을 workflow로 연결한다. 새 tab으로 이동해 출발 module 상태를 보존하며 같은 module을 다른 input으로 여러 번 열 수 있다. Carbon 밖에서는 대응 application을 새 browser tab으로 연다.

## Discoverable은 타입 계약을 만족하는 후보 집합이다

Carbon 안의 Open in은 현재 workspace의 discoverable module만 제시한다. 밖에서는 primary/guest organization의 접근 가능한 promoted workspace들에서 모듈을 union하고 현재 object/set output에 적용 가능한 후보로 좁힌다. Carbon을 직접 사용하지 않아도 promoted workspace로 standalone app 간 Open in을 구성할 수 있다.

Built-in Object View는 단일 object, Object Explorer는 object set을 받으며 기본 navigation을 임의 discoverable 목록으로 제거하지 못한다. Object View의 output은 표시 중 object, Explorer는 현재 결과 object set이다. Search는 query를 받아 type/list/exploration/comparison에 맞는 Explorer 또는 module을 연다.

Workshop은 object-set module interface의 external ID와 constraint를 설정하고 discoverable에 추가한다. Type constraint를 생략하면 모든 object type의 후보가 될 수 있다. Quiver는 analysis가 아닌 dashboard를 사용하며 기반 object type을 input constraint로 삼는다. Vertex는 모든 type의 exploration에서 열 후보가 될 수 있다.

후보가 보이는지와 target resource 권한은 별도다. Workspace와 module을 같은 Project에 두는 것은 관리 편의이며 security 의존성을 자동 충족하지 않는다.

## Workshop의 parameter 이름은 전달 경로에 따라 다르다

YAML `parameterValues`의 key는 `variable.<externalId>`, Carbon URL의 query는 `param.variable.<externalId>`를 사용한다. String/object/object-set 값의 type 구조를 유지한다. Metadata title/description, discoverableModules, primary anchored/secondary new-tab shortcut과 home section은 YAML/GUI 양쪽에서 구성할 수 있다.

Carbon navigation은 empty object set, NaN number, time-series set, geoshape/geopoint, struct와 scenario variable을 지원하지 않는 범위다. 일반 Workshop 변수 지원을 Carbon 전달 지원으로 확대하지 않는다. Event 실행 시 선택한 변수의 현재값으로 새 tab을 연다. Notepad는 read-only 경로다.

## Slate는 state 저장과 link interception을 연결한다

Slate iframe이 이탈할 때 Carbon의 `carbon-save-view-request`를 받아 `slate.saveView`를 실행하고, `slate.viewSaved`에서 `viewSaved` message로 ID를 parent에 돌려줘야 widget state를 Carbon parameter로 보존한다. 두 event가 없으면 navigation 뒤 같은 UI 상태 복원을 기대하지 않는다.

Slate variable은 untyped라 default value로 Carbon type을 추론한다. Default가 불필요하면 `v_objectSetPassedFromCarbon`/`v_objectPassedFromCarbon` 이름이 해당 type을 지정한다. Discovery에는 단일 object/set 입력이 명확히 하나로 해석되어야 한다.

Slate link가 알려진 Object View/Explorer/Workshop/Quiver/Slate URL이면 Carbon이 대응 module tab으로 변환한다. Widget state 전체를 자동 output으로 보내는 것이 아니라 사용자가 실행한 link와 parameter가 output을 정한다. Nested iframe의 link는 `target="carbon-navigation-target"`으로 최상위 Slate iframe을 지정해야 같은 interception이 적용된다. 문서 URL 예제에는 서로 다른 module RID가 섞인 예가 있으므로 실제 target RID와 변수를 직접 대조한다.

## 출처

- [Palantir, Modules](https://www.palantir.com/docs/foundry/carbon/modules-overview)
- [Palantir, Configure module discovery](https://www.palantir.com/docs/foundry/carbon/modules-discovery)
- [Palantir, Configure navigation between modules](https://www.palantir.com/docs/foundry/carbon/modules-navigation)
- [Palantir, YAML configuration reference](https://www.palantir.com/docs/foundry/carbon/code-reference)
- [Palantir, YAML configuration example](https://www.palantir.com/docs/foundry/carbon/code-example)

## 관련 문서

- [[Palantir-Carbon-Workspace-and-Access|Workspace와 권한]]
- [[Palantir-Workshop-Applications|Workshop state와 event]]
