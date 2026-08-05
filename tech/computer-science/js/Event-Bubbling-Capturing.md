---
tags: [cs, javascript, dom, event, delegation]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["이벤트 버블링과 캡처링", "DOM Event Propagation"]
---

# DOM event 전파와 위임

event dispatch는 target까지 내려가는 capture phase, target phase, 다시 올라오는 bubble phase를 따라 listener를 호출한다. 모든 event가 bubbling/composed되는 것은 아니며 Shadow DOM retargeting까지 고려하면 단순 부모/자식 도식보다 event path와 각 event type의 contract를 확인해야 한다.

## listener 등록

```ts
const controller = new AbortController();

menu.addEventListener("click", onMenuClick, {
  capture: false,
  passive: false,
  once: false,
  signal: controller.signal,
});
```

- `onclick` property는 해당 property에 handler 하나를 저장해 재할당하면 앞 handler를 덮는다.
- `addEventListener`는 여러 listener와 capture/once/passive/signal option을 지원한다.
- 같은 type/callback/capture 조합의 중복 등록 의미를 확인하고 cleanup에는 같은 callback identity 또는 AbortSignal을 쓴다.
- inline HTML event handler는 markup/code/CSP를 섞으므로 사용하지 않는다.

## capture, target, bubble

capture listener는 target으로 내려가는 path에서, bubble listener는 target 이후 위로 올라가는 path에서 실행된다. target phase에서도 capture flag에 따른 listener ordering이 있으므로 단순히 target은 한 번이라고 가정하지 않는다.

`stopPropagation()`은 이후 node로의 전파를 막지만 같은 target에 등록된 다른 listener까지 막지는 않는다. 그것까지 필요하면 `stopImmediatePropagation()`을 사용한다. 둘 다 default action을 취소하지 않으며 form/link의 취소에는 cancelable event에서 `preventDefault()`를 사용한다.

전파 중단은 component 간 결합을 숨길 수 있어 modal/drag처럼 필요한 경계에서만 쓴다. event를 받지 않기 위해 무조건 stopPropagation을 곳곳에 넣지 않는다.

## target과 currentTarget

- `event.target`: dispatch의 target, Shadow DOM에서는 retarget될 수 있음
- `event.currentTarget`: 현재 실행 중 listener가 등록된 EventTarget
- `event.composedPath()`: dispatch path의 ordered target 목록

`currentTarget`은 listener 실행 중에만 의미 있고 async callback에서 나중에 읽으면 `null`일 수 있으므로 필요한 값을 먼저 저장한다.

`isTrusted`는 user agent가 생성한 event인지와 관련되고 `dispatchEvent`로 보낸 synthetic event는 false다. 하지만 사용자 의도/authorization/bot 방지의 보안 신호는 아니다. server는 event 신뢰 여부와 관계없이 인증/인가/CSRF/idempotency를 검증한다.

## event delegation

부모에 listener 하나를 두고 bubbling target을 분기하면 이후 추가된 descendant도 처리할 수 있다.

```ts
function onMenuClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const item = target.closest("[data-menu-id]");
  if (!item || !menu.contains(item)) return;
  selectMenu(item.getAttribute("data-menu-id"));
}
```

- icon/span처럼 nested element가 target일 수 있어 `closest`를 사용한다.
- selector match 뒤 delegation root 안에 있는지도 검증한다.
- focus처럼 bubble하지 않는 event는 `focusin` 또는 capture를 검토한다.
- non-composed event는 Shadow DOM boundary를 넘지 않을 수 있다.
- delegation은 listener 수를 줄이지만 거대한 root의 모든 event를 비싼 selector로 처리하면 비용/결합이 늘 수 있다.

동적 element에 listener가 자동 등록되는 것이 아니라 이미 존재하는 ancestor listener가 올라온 event를 처리하는 것이다.

## callback this

ordinary `addEventListener` callback의 `this`는 일반적으로 `currentTarget`과 같고 arrow callback은 lexical `this`를 사용한다. `target`/`currentTarget`을 명시적으로 읽는 편이 callback 형식 변경에도 안전하다.

## 출처

- [DOM Standard, Events](https://dom.spec.whatwg.org/#events)
- [DOM Standard, EventTarget](https://dom.spec.whatwg.org/#interface-eventtarget)
- listener/전파: [onclick/addEventListener](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102184), [stopPropagation](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102185), [isTrusted/dispatch](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102189), [capture/bubble/currentTarget](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102190)
- delegation: [개요](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102191), [target/currentTarget](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102192), [동적 menu 1](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102193), [동적 menu 2](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102194)

## 관련 문서

- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 callback]]
- [[Security-Headers#CSP — 심층 방어의 핵심 계층|Content Security Policy]]
- [[CSRF|CSRF]]
