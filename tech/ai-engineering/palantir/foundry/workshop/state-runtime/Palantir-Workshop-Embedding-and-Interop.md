---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop embedding과 cross-application 상태 계약"]
---

# Workshop embedding과 cross-application 상태 계약

Embedded Module은 published child를 사용하고 module interface variable을 parent와 map한다. Mapped variable은 parent definition/default/recompute를 사용하며 child definition은 무시된다. Reset도 parent default로 돌아간다. Child를 편집용으로 열 때도 현재 mapped 값으로 디버깅할 수 있다.

## Shared value와 독립 scope

Fully shared variable은 양쪽의 widget/event write가 연결되지만 child 내부의 별도 computed variable은 자동 parent propagation이 아니다. Overview의 명시 Set-variable 필요 안내와 widget 문서의 shared write 설명을 이 구분으로 읽고, 임의 child state가 전부 sync된다고 보장하지 않는다.

Child event configuration 자체를 parent에서 pass하는 기능은 없다. Parent layout 상태를 variable로 연결한다. Routing/state saving/auto-refresh 같은 module settings도 child에서 상속되지 않는다. Iframe은 별도 sandboxed module로 동작해 독립 refresh가 가능하다.

Child resource 권한은 parent와 별도이며 미허용이면 load 실패한다. Data Lineage는 embedded module provenance를 보고하지 않는다. Self-reference는 기본 render 방지이며 허용 시 recursion 위험을 검토한다. Map template의 derived ID는 child prefix 재등록과 어긋날 수 있어 parent에 original ID를 직접 두는 workaround가 있다.

## Loop

Object set/array의 각 item은 독립 instance scope다. Item을 나타내는 interface 값 외 추가 mapped 변수는 모든 instance와 parent가 공유한다. Item interface 자체를 child에서 바꾸면 예상치 못한 동작이 있다. Object-set paging은 첫10,000objects까지며 non-static single-type set은 PK tie-break sort 때문에 nonsortable PK에서 실패할 수 있다. Array는 순서를 보존한다.

Lazy instance loading은 초기 비용을 줄이지만 처음부터 보이는 nested embedding은 waterfall load가 생길 수 있다. Child config는 재사용해도 instance variable initialization 비용은 각각 있다. Mobile mode는 mobile child만 embed한다.

## Iframe와 외부 경계

External embed는 Foundry CSP, target frame-ancestors, 필요시 Foundry API CORS를 함께 맞춘다. embedded=true는 sidebar를 숨기는 UI 설정이다. URL parameter는 reload를 일으켜 자주 바뀌는 state에는 input/output messaging이 더 맞는다. Slate key/type과 WORKSHOP//SET_OUTPUT_VALUE/TRIGGER_WORKSHOP_EVENT 계약을 맞춘다. undefined는 default로, null은 clear로 구분한다.

Bidirectional custom widget은 useWorkshopContext로 variable/event definition을 교환한다. Object set은 preset type으로 filter되고 양방향10,000을 넘는 object는 잘려 나간다. Struct는 미지원이다. 일반 iframe은 Workshop global branch context를 상속하지 않아 Action이 main에 적용될 수 있다. Developer Console embedded app의 branch contract를 별도 확인한다.

Local-network allow는 사용자의 localhost service 접근을 허용한다. Mount 유지도 iframe의 권한이나 branch를 변경하지 않는다. Drag/drop은 object RID/set media type과 enrichment compatibility를 따르며 Object Set Title drag에는 data bank service와500미만objects가 필요하다. App Pairing의 state sync와 Commands의 operation 호출은 별개 capability다. 실제 embed/command는 실행하지 않았다.

## 출처

- [Palantir Workshop, commands](https://www.palantir.com/docs/foundry/workshop/commands)
- [Palantir Workshop, drag-and-drop](https://www.palantir.com/docs/foundry/workshop/drag-and-drop)
- [Palantir Workshop, embedded-modules](https://www.palantir.com/docs/foundry/workshop/embedded-modules)
- [Palantir Workshop, embedding-workshop-modules-overview](https://www.palantir.com/docs/foundry/workshop/embedding-workshop-modules-overview)
- [Palantir Workshop, loop-layouts](https://www.palantir.com/docs/foundry/workshop/loop-layouts)
- [Palantir Workshop, widgets-app-pairing](https://www.palantir.com/docs/foundry/workshop/widgets-app-pairing)
- [Palantir Workshop, widgets-embed-foundry-apps](https://www.palantir.com/docs/foundry/workshop/widgets-embed-foundry-apps)
- [Palantir Workshop, widgets-iframe](https://www.palantir.com/docs/foundry/workshop/widgets-iframe)
- [Palantir Workshop, workshop-cross-app-interactivity](https://www.palantir.com/docs/foundry/workshop/workshop-cross-app-interactivity)

## 관련 문서

- [[Palantir-Workshop]]
