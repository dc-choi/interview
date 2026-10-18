---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop URL, navigation과 저장 상태"]
---

# Workshop URL, navigation과 저장 상태

Module interface는 embedding/URL initialization에 노출한 variable API이고 Ontology interface와 다르다. External ID를 안정적으로 관리한다. URL 값은 최초 load 때 초기화하며 이후 주소 변경만으로 현재 variable을 갱신하지 않는다.

## Routing과 layout

Routing은 page ID와 variable의 non-default 현재 값을 URL에 반영한다. Visible-only/always/never inclusion은 URL에 쓰는 정책이며 external ID가 맞는 query parameter의 초기화 허용 여부와 다르다. Variable-backed page default가 있으면 URL page보다 우선해 잠깐 원하는 page 뒤 default로 이동할 수 있으므로 default를 비운다.

Object-set filter는 URL 미지원이고 object set은 singleton RID만 지원한다. Primitive로 filter를 간접 구성할 수 있다. Carbon tab navigation은 별도 계약으로 object-set filter를 전달할 수 있고 parameter key에 variable. prefix가 필요하다. latest는 published, dev는 last saved version이라는 테스트 링크 차이를 구분한다.

Tabs widget은 자체 selected state를 갖지 않고 Switch-to-page/tab 중 현재 layout을 바꾸지 않는 event 수로 selection을 추론한다. 복수 event면 해당 수가 가장 많은 tab, tie면 앞 tab이다. Set-variable event만으로는 tab indicator를 정하지 않는다. Page는 Set+Switch 동기화가 필요할 수 있고 tab은 switch가 backing variable도 갱신한다. Stepper의 linear/nonlinear와 completion Boolean은 UI 진행 상태이며 Action 성공 증명을 자동 대체하지 않는다.

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
