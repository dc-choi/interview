---
tags: [palantir, custom-widgets, workshop, osdk]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Custom Widget 상태와 보안"]
---

# Custom Widget 상태와 보안

Custom widget은 Workshop에 custom frontend를 추가하는 iframe component다. 현재 host 지원은 Workshop이며 일반 독립 OSDK app과 runtime 제약이 다르다. Widget set은 code/assets와 version을 묶는 Compass resource이고 widget은 그 안의 개별 entry point/configuration이다. 개별 widget은 set의 권한을 상속한다.

## Parameter와 event가 host 상태 계약이다

Configuration은 최대 parameter 50개/event 50개이며 ID는 camelCase다. Primitive Boolean/date/number/string/timestamp와 primitive array, objectSet, Ontology scenario RID, mapTileLayer를 전달한다. Date는 YYYY-MM-DD, timestamp는 timezone 포함 ISO8601이다. Struct와 object-set filter는 first-class parameter type이 아니지만 objectSet parameter가 filter를 포함한 set definition을 가리킬 수는 있다. ObjectSet parameter는 OSDK의 object type 또는 interface를 allowedType으로 정의하며, 값은 고정 object 목록이거나 그 type에 filter를 적용한 set이고 비어 있을 수도 있다.

Workshop variable을 parameter에 bind하고 event의 parameterUpdateIds로 수정 가능한 parameter를 정한다. emitEvent의 update와 host event side effect를 연결한다. Scenario parameter는 Ontology Scenario의 isolated sandbox에서 object read/action apply에 사용할 RID이며 다른 scenario 기능 전체와 같은 계약으로 보지 않는다.

ObjectSet parameter는 RID와 instantiated OSDK ObjectSet을 함께 제공하며 host definition 변경/data invalidation 시 둘 다 바뀐다. FoundryWidget에 client를 주고 experimental useObjectSet hook을 쓰려면 OsdkProvider2도 감싼다. Null set일 때 hook을 조건부 호출하는 대신 set이 있을 때 별도 view component를 render한다.

Widget이 ObjectSet으로 event를 내보내면 SDK가 temporary set을 만들고 RID를 보낸다. 같은 event를 짧은 간격으로 여러 번 emit하면 마지막 호출만 전달하고 이전 호출은 버린다(원문은 ObjectSet parameter 갱신 절에서 설명한다). Temporary set 생성 중 network error 등은 caller에 surfaced되지 않는다. 모든 event가 순서대로 처리되거나 emitEvent가 업무 결과 성공을 확인한다는 전제로 설계하지 않는다.

OSDK action으로 backing data를 바꾸면 host view가 stale할 수 있다. refreshHostDataOnAction은 widget에 전달된 objectSet parameter를 host가 refresh하게 한다. 신규 set은 plugin default로 켜지만 기존 set은 수동 설정이 필요하고 widget별 override가 우선한다. 모든 외부 mutation 또는 object-set subscription을 자동 감지하는 보장은 아니다.

## Map tile layer는 읽기 전용 선택값이다

mapTileLayer parameter는 Foundry에 구성된 raster/vector tile source 중 builder가 고른 layer를 넘긴다. Playground와 Workshop Widget setup panel 모두 해당 parameter의 displayName(예시는 Map tiles) 아래에서 layer를 고르며, Workshop은 variable binding이 아니라 layer selector를 쓴다. 값은 tileSourceId를 담은 객체이며 읽기 전용이라 widget event로 바꿀 수 없다. 원문은 이 parameter를 쓰기 전에 `@osdk/widget.client`, `@osdk/widget.client-react`, `@osdk/widget.vite-plugin`을 latest로 갱신하라고만 안내하고 최소 버전은 밝히지 않는다.

Widget은 공식 예시의 `${window.location.origin}/api/v3/media/tileSources/${tileSourceId}/style?preview=true` URL로 Mapbox Style Specification JSON을 받아(`preview=true`가 필수인지는 원문이 밝히지 않는다) Mapbox GL JS나 MapLibre GL JS로 그린다. 이 tile 요청은 지원 endpoint에 포함된다. Strict CSP가 `blob:` worker URL을 막으므로 renderer worker를 widget asset에서 불러오도록 설정한다(Mapbox는 strict CSP bundle, MapLibre는 Vite worker 설정). Layer 선택이 바뀌거나 unmount될 때 map instance를 제거한다. MapLibre 예시는 이 CSP용 worker 설정을 쓰려고 최신 `maplibre-gl` release를 설치하고, map을 만들기 전에 `setWorkerUrl`로 worker를 지정하며 MapLibre CSS도 함께 불러온다.

Tile source는 Control Panel의 해당 space에서 Tiles를 열어 권한 있는 관리자가 추가하거나 바꾼다. Tiles 메뉴가 없거나 source 구성에 도움이 필요하면 Palantir Support에 문의한다. Marketplace는 custom widget이 쓰는 tile source를 패키징하지 않는다. 다른 enrollment에 설치한 Workshop module은 원본 enrollment의 tile source 참조를 유지하고 대상 enrollment에 source를 만들지 않는다. 설치 성공을 지도 표시 준비 완료로 보지 않고 대상 enrollment의 tile source를 따로 확인한다.

## OSDK는 현재 사용자의 권한을 따른다

Widget set overview의 Configure SDK에서 ontology와 resource를 고르고 `@custom-widget/sdk` dependency를 설치한다. In Foundry로 만든 repository의 `.npmrc`는 OSDK package를 Foundry에서 받도록 이미 구성되어 있어 수정하지 않는다. Outside of Foundry로 만들고 생성 시 OSDK package를 만들지 않았다면 project root `.npmrc`에 `@custom-widget` scope registry(widget set RID 경로)와 `${FOUNDRY_TOKEN}` 인증을 직접 둔다.

SDK resource를 선택하는 것과 Ontology APIs enablement는 별도다. Information Security Officer 기본 enrollment role 또는 Enable widget set unscoped API access workflow를 주는 custom enrollment role이 API를 켠다. Runtime client는 window.location.origin과 createFoundryWidgetTokenProvider를 사용하고 실제 접근은 현재 사용자 token/권한을 따른다. 모든 호출을 하나의 service user 권한으로 수행하는 client credentials 모델([[Palantir-Consumer-Identity-and-Application-Models|consumer 앱의 identity 모델]])과 다르다.

허용 endpoint에는 일부 Admin user/profile/search API와 mapTileLayer parameter로 만든 map tile 요청이 있고 Ontology API enablement 후 Ontologies/Functions namespace와 Upload Media가 포함된다. Develop and preview 안내도 runtime이 external request를 막고 지원 Foundry API endpoint와 map tile에만 접근한다고 설명하므로, 모든 Admin/Media API가 허용되거나 모두 불가하다고 단정하지 않는다. 목록 밖 API와 object set subscriptions는 지원하지 않는다.

## Iframe capability는 여러 단계로 허용한다

기본 iframe은 browser 기능을 제한한다. Developer가 widget config의 `permissions` 배열에 `allow` 값(camera, microphone, autoplay)이나 `sandbox` 값(allow-downloads, allow-forms, allow-modals, allow-popups)을 요청하고, host builder가 Workshop widget 설정의 Permissions 절(Parameters와 Events 다음)에서 별도로 opt-in한다. Enrollment에 해당 checkpoint가 구성되어 있으면 일부 attribute(allow-downloads, camera, microphone 등)의 opt-in에서 builder의 checkpoint 확인이 요구될 수 있다. 대부분의 widget은 추가 attribute가 필요 없으므로 실제로 쓰는 browser 기능만 요청한다.

| 필요한 동작 | 요청할 값 |
| --- | --- |
| `getUserMedia`로 camera/microphone 사용 | allow `camera`, `microphone` |
| `<video>`/`<audio>` 자동 재생 | allow `autoplay` |
| Blob URL이나 static asset download | sandbox `allow-downloads` |
| `window.print()` 인쇄 dialog | sandbox `allow-modals` |
| `target="_blank"` 링크로 새 tab 열기 | sandbox `allow-popups` |

Camera/microphone은 host 허용 뒤에도 최종 사용자 browser permission이 필요하다. Permissions API `query()`가 돌려주는 PermissionStatus의 state는 iframe attribute와 사용자 prompt 상태에 따라 granted, prompt, denied가 될 수 있다. Browser가 지원하지 않는 permission name이면 `query()`가 TypeError로 reject될 수 있다. Request 선언만으로 browser 접근이 허용되지 않으며 denied/unsupported 상태를 처리한다. 개발 중에는 custom widgets playground나 VS Code workspace에서 host 허용 없이 요청한 attribute를 임시로 시험할 수 있다. 그 환경에서 동작한 것과 별개로 실제 Workshop host에서는 builder의 opt-in이 따로 필요하다.

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
- [Palantir, Display map tiles](https://www.palantir.com/docs/foundry/custom-widgets/map-tiles)
- [Palantir, Iframe attributes](https://www.palantir.com/docs/foundry/custom-widgets/iframe-attributes)
- [Palantir, Checkpoint types](https://www.palantir.com/docs/foundry/checkpoints/checkpoint-types/)
- [MDN, Permissions: query() method](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query)
- [Palantir, Open a URL](https://www.palantir.com/docs/foundry/custom-widgets/open-url-in-workshop)
- [Palantir, Develop and preview](https://www.palantir.com/docs/foundry/custom-widgets/development)
- [Palantir, Embedding in Workshop](https://www.palantir.com/docs/foundry/custom-widgets/embedding-in-workshop)

## 관련 문서

- [[Palantir-Custom-Widget-Development-and-Distribution|개발과 발행]]
- [[Palantir-App-Pairing-and-Command-State|앱 간 state update]]
- [[Palantir-Checkpoint-Scope-and-Evidence|Checkpoint 확인 경계]]
