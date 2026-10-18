---
tags: [palantir, custom-widgets, workshop, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Custom Widget 상태와 보안"]
---

# Custom Widget 상태와 보안

Custom widget은 Workshop에 custom frontend를 추가하는 iframe component다. 현재 host 지원은 Workshop이며 일반 독립 OSDK app과 runtime 제약이 다르다. Widget set은 code/assets와 version을 묶는 Compass resource이고 widget은 그 안의 개별 entry point/configuration이다. 개별 widget은 set의 권한을 상속한다.

## Parameter와 event가 host 상태 계약이다

Configuration은 최대 parameter 50개/event 50개이며 ID는 camelCase다. Primitive Boolean/date/number/string/timestamp와 primitive array, objectSet, Ontology scenario RID를 전달한다. Date는 YYYY-MM-DD, timestamp는 timezone 포함 ISO8601이다. Struct와 object-set filter는 first-class parameter type이 아니지만 objectSet parameter가 filter를 포함한 set definition을 가리킬 수는 있다.

Workshop variable을 parameter에 bind하고 event의 parameterUpdateIds로 수정 가능한 parameter를 정한다. emitEvent의 update와 host event side effect를 연결한다. Scenario parameter는 Ontology Scenario의 isolated sandbox에서 object read/action apply에 사용할 RID이며 다른 scenario 기능 전체와 같은 계약으로 보지 않는다.

ObjectSet parameter는 RID와 instantiated OSDK ObjectSet을 함께 제공하며 host definition 변경/data invalidation 시 둘 다 바뀐다. FoundryWidget에 client를 주고 experimental useObjectSet hook을 쓰려면 OsdkProvider2도 감싼다. Null set일 때 hook을 조건부 호출하는 대신 set이 있을 때 별도 view component를 render한다.

Widget이 ObjectSet으로 event를 내보내면 SDK가 temporary set을 만들고 RID를 보낸다. 짧은 시간의 연속 event는 마지막 호출만 전달하고 이전 호출은 버린다. Temporary set 생성 중 network error 등은 caller에 surfaced되지 않는다. 모든 event가 순서대로 처리되거나 emitEvent가 업무 결과 성공을 확인한다는 전제로 설계하지 않는다.

OSDK action으로 backing data를 바꾸면 host view가 stale할 수 있다. refreshHostDataOnAction은 widget에 전달된 objectSet parameter를 host가 refresh하게 한다. 신규 set은 plugin default로 켜지만 기존 set은 수동 설정이 필요하고 widget별 override가 우선한다. 모든 외부 mutation 또는 object-set subscription을 자동 감지하는 보장은 아니다.

## OSDK는 현재 사용자의 권한을 따른다

SDK resource를 선택하는 것과 Ontology APIs enablement는 별도다. ISO 또는 Enable widget set unscoped API access workflow 권한이 있는 역할이 API를 켠다. Runtime client는 window.location.origin과 createFoundryWidgetTokenProvider를 사용하고 실제 접근은 현재 사용자 token/권한을 따른다. Service user로 모든 사용자의 권한을 통합하는 consumer client credentials 모델과 다르다.

허용 endpoint에는 일부 Admin user/profile/search API가 있고 Ontology API enablement 후 Ontologies/Functions namespace와 Upload Media가 포함된다. Development 안내의 non-Ontology API 차단 설명에 이 명시된 예외가 있으므로 모든 Admin/Media API가 허용되거나 모두 불가하다고 단정하지 않는다. 목록 밖 API와 object set subscriptions는 지원하지 않는다.

## Iframe capability는 여러 단계로 허용한다

기본 iframe은 browser 기능을 제한한다. Developer가 permissions에 camera/microphone/autoplay 또는 allow-downloads/forms/popups를 요청하고 host builder가 별도로 opt-in한다. 일부는 checkpoint 확인도 요구한다. Camera/microphone은 그 뒤에도 최종 사용자 browser permission이 필요하다. Request 선언만으로 browser 접근이 허용되지 않으며 denied/unsupported 상태를 처리한다.

추가 iframe attribute로 고정 CSP를 임의 확장할 수 없다. External request는 차단되며 외부 service는 function/webhook 같은 Foundry resource로 감싼다. Browser persistent storage(localStorage/sessionStorage/IndexedDB)는 지원하지 않는다. Dedicated worker는 가능하지만 shared/service worker는 지원하지 않는다.

Workshop은 숨겨진 layout의 widget을 기본 unmount하여 iframe local state를 버린다. 필요하면 display optimization으로 mounted를 유지하거나 host variable/saved state/Ontology로 상태를 옮긴다. Keep mounted는 browser reload를 넘는 영구 보존이 아니다.

## URL과 다운로드의 실행 시점

Workshop Open URL event를 widget event에 bind하면 popup 권한을 추가하지 않고 링크를 열 수 있다. 같은 event의 직접 string update는 동기지만 downstream transformed URL은 비동기여서 이전 값이 열릴 수 있다. 완성된 URL의 갱신 시점을 맞춘다.

직접 popup을 열면 새 window도 widget sandbox 제약을 상속하므로 download에는 별도 allow-downloads가 필요할 수 있다. Dev server cross-origin asset은 download 대신 새 tab으로 열릴 수 있어 production과 구분한다. Blob URL은 사용 후 revoke하고 asset fetch는 ?no-inline 등으로 data URI의 CSP 문제를 피한다.

## 출처

- [Palantir, Custom widgets](https://www.palantir.com/docs/foundry/custom-widgets)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/custom-widgets/core-concepts)
- [Palantir, Parameters and events](https://www.palantir.com/docs/foundry/custom-widgets/parameters-and-events)
- [Palantir, Use OSDK](https://www.palantir.com/docs/foundry/custom-widgets/use-osdk)
- [Palantir, Iframe attributes](https://www.palantir.com/docs/foundry/custom-widgets/iframe-attributes)
- [Palantir, Open a URL](https://www.palantir.com/docs/foundry/custom-widgets/open-url-in-workshop)
- [Palantir, Develop and preview](https://www.palantir.com/docs/foundry/custom-widgets/development)
- [Palantir, Embedding in Workshop](https://www.palantir.com/docs/foundry/custom-widgets/embedding-in-workshop)

## 관련 문서

- [[Palantir-Custom-Widget-Development-and-Distribution|개발과 발행]]
- [[Palantir-App-Pairing-and-Command-State|앱 간 state update]]
- [[Palantir-Checkpoint-Scope-and-Evidence|Checkpoint 확인 경계]]
