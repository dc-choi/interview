---
tags: [cs, javascript, dom, event, delegation]
status: done
verified_at: 2026-10-01
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

- `onclick` property는 해당 property에 handler 하나를 저장해 재할당하면 앞 handler를 덮고, `null`을 대입하면 해제된다.
- `addEventListener`는 여러 listener와 capture/once/passive/signal option을 지원한다.
- listener는 type, callback, capture 세 값으로 식별한다. 세 값이 모두 같은 두 번째 등록은 무시되고, 같은 callback이라도 capture가 다르면 별도 listener다.
- `removeEventListener`도 이 세 값만 비교한다. 셋째 인자 boolean은 `{ capture }`와 같고 `once`, `passive`, `signal`은 제거 대상 판별에 쓰이지 않으므로, capture로 등록한 listener는 capture를 `true`로 넘겨야 제거된다.
- 인자 자리에서 바로 만든 익명 함수나 호출할 때마다 새로 만든 `bind` 결과는 등록한 것과 다른 function object라 제거되지 않는다. callback을 변수에 담아 두거나 AbortSignal로 해제한다.
- inline HTML event handler는 markup/code/CSP를 섞으므로 사용하지 않는다.
- 같은 EventTarget, 같은 phase의 listener는 등록 순서대로 호출된다. dispatch는 target마다 호출 직전에 listener 목록을 복제하므로, listener 안에서 같은 target에 새로 등록한 listener는 이번 dispatch에서 실행되지 않는다. 반대로 아직 호출되지 않은 listener를 제거하면 이번 dispatch에서도 실행되지 않는다.
- `onclick` 같은 event handler도 처음 non-null 값을 대입할 때 listener 하나로 목록에 들어간다. 재대입은 그 자리를 유지한 채 함수만 바꾸므로 호출 순서는 첫 대입 전에 `addEventListener`로 등록한 listener, 현재 handler, 첫 대입 뒤 등록한 listener 순이다. `null` 대입은 그 listener를 제거하고, 다시 대입하면 목록 끝에 새로 붙는다.
- 앞 listener가 만든 상태를 뒤 listener가 읽는 로직은 등록 코드의 위치에 암묵적으로 결합된다. 순서가 중요하면 한 listener 안에서 호출 순서를 드러낸다.
- 구형 IE 호환성을 이유로 `onclick`을 고를 근거는 약하다. MDN compatibility data 기준 `addEventListener`는 IE 9부터 지원됐고, 지원 판단은 현재 대상 browser matrix로 한다.

## capture, target, bubble

capture listener는 target으로 내려가는 path에서, bubble listener는 target 이후 위로 올라가는 path에서 실행된다. target phase에서도 capture flag에 따른 listener ordering이 있으므로 단순히 target은 한 번이라고 가정하지 않는다.

`stopPropagation()`은 이후 node로의 전파를 막지만 같은 target에 등록된 다른 listener까지 막지는 않는다. 그것까지 필요하면 `stopImmediatePropagation()`을 사용한다. 둘 다 default action을 취소하지 않으며 form/link의 취소에는 cancelable event에서 `preventDefault()`를 사용한다.

전파 중단은 component 간 결합을 숨길 수 있어 modal/drag처럼 필요한 경계에서만 쓴다. event를 받지 않기 위해 무조건 stopPropagation을 곳곳에 넣지 않는다.

## target과 currentTarget

- `event.target`: dispatch의 target, Shadow DOM에서는 retarget될 수 있음
- `event.currentTarget`: 현재 실행 중 listener가 등록된 EventTarget
- `event.composedPath()`: dispatch path의 ordered target 목록

`currentTarget`은 listener 실행 중에만 의미 있고 async callback에서 나중에 읽으면 `null`일 수 있으므로 필요한 값을 먼저 저장한다.

`isTrusted`는 user agent가 생성한 event인지와 관련되고 `dispatchEvent`로 보낸 synthetic event는 false다. `true`도 사용자가 직접 조작했다는 뜻은 아니다. `scrollTo()`, `scrollIntoView()`, `scrollTop` 대입처럼 API로 일으킨 스크롤에도 user agent가 `scroll` event를 보내므로 `true`이고, 반대로 `element.click()`은 legacy 예외라 `isTrusted`가 false인 `click`을 보낸다. 사용자 스크롤과 코드 스크롤을 구분해야 하면 스크롤을 일으키는 코드가 직접 상태를 남긴다. 어느 쪽이든 사용자 의도/authorization/bot 방지의 보안 신호는 아니다. server는 event 신뢰 여부와 관계없이 인증/인가/CSRF/idempotency를 검증한다.

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

- target은 icon/span처럼 의도보다 안쪽 element일 수도, 항목의 padding이나 항목 사이 간격을 눌렀을 때의 `li`, `ul`처럼 바깥 element일 수도 있다. `closest()`는 target 자신부터 조상 방향으로 selector를 검사하고 없으면 null을 반환해 두 경우를 모두 거른다.
- event target은 pointer capture가 없으면 hit test 결과, 즉 그 위치에서 가장 위에 그려진 element다. block box는 기본적으로 부모 너비를 채우고 padding과 border 영역도 그 element에 속하므로, 글자 옆 빈 공간을 눌러도 그 element가 target이 된다. `event.target.src`를 바로 읽으면 바깥 element가 target일 때 undefined이고, 이 값을 `img.src`에 대입하면 문자열 `"undefined"`가 되어 문서 기준 상대 URL을 요청해 깨진 image가 된다. 값을 읽기 전에 `closest()` 결과의 null 여부와 필요한 attribute를 확인한다.
- selector match 뒤 delegation root 안에 있는지도 검증한다.
- focus처럼 bubble하지 않는 event는 `focusin` 또는 capture를 검토한다. `mouseenter`, `mouseleave`도 bubble하지 않아 위임에는 ancestor의 capture listener나 `mouseover`, `mouseout`을 쓴다. capture listener는 pointer가 들어가거나 나간 element마다 한 번씩 실행되므로 `event.target`으로 대상을 거르고, `mouseover`, `mouseout`은 pointer가 descendant 사이를 오갈 때도 발생한다는 점을 처리한다.
- non-composed event는 Shadow DOM boundary를 넘지 않을 수 있다.
- delegation은 listener 수를 줄이지만 거대한 root의 모든 event를 비싼 selector로 처리하면 비용/결합이 늘 수 있다.

동적 element에 listener가 자동 등록되는 것이 아니라 이미 존재하는 ancestor listener가 전달된 event를 처리하는 것이다.

## synthetic event와 dispatchEvent

`new Event(type, init)`나 `new CustomEvent(type, { detail })`로 만든 event를 `dispatchEvent()`로 보낸다. listener에 넘길 값은 `CustomEvent`의 `detail`에 담고, 생략하면 `null`이다.

```ts
const saved = new CustomEvent("cart:saved", { bubbles: true, cancelable: true, detail: { cartId: "c-1" } });
const proceeded = form.dispatchEvent(saved); // listener가 모두 실행된 뒤 반환, preventDefault()가 호출됐으면 false
```

- `bubbles`, `cancelable`, `composed`의 기본값은 모두 false다. ancestor에서 위임으로 받으려면 `bubbles: true`, listener의 `preventDefault()`를 반영하려면 `cancelable: true`가 필요하다. bubble하지 않는 event도 ancestor의 capture listener는 실행된다.
- `dispatchEvent()`는 listener를 동기로 모두 실행한 뒤 반환한다. listener에서 던진 예외는 호출자에게 전파되지 않고 uncaught exception으로 보고되므로 호출부의 `try/catch`로 잡을 수 없다.
- listener는 event interface가 아니라 type 문자열로 고른다. `new Event("click")`도 `click` listener를 실행한다.
- Node.js도 전역 `EventTarget`, `Event`, `CustomEvent`를 제공하지만 계층이 없어 capture와 bubble 전파가 없다. listener가 예외를 던지거나 reject되는 Promise를 반환하면 `process.nextTick()`에서 uncaught exception이 돼 기본적으로 프로세스가 종료된다. `removeEventListener`의 options는 object로만 문서화돼 있다. boolean 셋째 인자는 v26.8.2까지 capture `false`로 취급돼 capture listener 대신 같은 callback의 non-capture listener가 제거됐고 v26.9.0부터 capture로 해석된다. 2026-09-27 기준 최신인 v24.21.0, v22.23.3 소스에는 이 처리가 없으므로 여러 버전을 지원하면 `{ capture: true }`로 넘긴다 (Node.js v26.10.0 문서와 태그 소스 기준).

## callback this

ordinary `addEventListener` callback의 `this`는 일반적으로 `currentTarget`과 같고 arrow callback은 lexical `this`를 사용한다. `target`/`currentTarget`을 명시적으로 읽는 편이 callback 형식 변경에도 안전하다.

## 출처

- [DOM Standard, Events](https://dom.spec.whatwg.org/#events)
- [DOM Standard, EventTarget](https://dom.spec.whatwg.org/#interface-eventtarget)
- [DOM Standard, invoke](https://dom.spec.whatwg.org/#concept-event-listener-invoke), [DOM Standard, closest()](https://dom.spec.whatwg.org/#dom-element-closest)
- [HTML Standard, Event handler IDL attributes](https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-idl-attributes), [HTML Standard, activate an event handler](https://html.spec.whatwg.org/multipage/webappapis.html#activate-an-event-handler), [CSSOM View Module, Scrolling events](https://drafts.csswg.org/cssom-view/#scrolling-events), [W3C, Pointer Events](https://w3c.github.io/pointerevents/)
- [MDN, EventTarget: dispatchEvent() method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent), [MDN, Element: mouseleave event](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseleave_event), [MDN browser-compat-data, EventTarget](https://github.com/mdn/browser-compat-data/blob/main/api/EventTarget.json)
- [Node.js v26.10.0, Events: EventTarget and Event API](https://nodejs.org/docs/v26.10.0/api/events.html#eventtarget-and-event-api)
- [EventTarget removeEventListener does not match all listeners, Issue #65244 — nodejs/node](https://github.com/nodejs/node/issues/65244), [Node.js v26 changelog — nodejs/node](https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V26.md)
- [lib/internal/event_target.js v26.8.2 — nodejs/node](https://github.com/nodejs/node/blob/v26.8.2/lib/internal/event_target.js), [lib/internal/event_target.js v26.9.0 — nodejs/node](https://github.com/nodejs/node/blob/v26.9.0/lib/internal/event_target.js), [lib/internal/event_target.js v24.21.0 — nodejs/node](https://github.com/nodejs/node/blob/v24.21.0/lib/internal/event_target.js), [lib/internal/event_target.js v22.23.3 — nodejs/node](https://github.com/nodejs/node/blob/v22.23.3/lib/internal/event_target.js)
- listener/전파: [onclick/addEventListener](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102184), [stopPropagation](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102185), [isTrusted/dispatch](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102189), [capture/bubble/currentTarget](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102190)
- delegation: [개요](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102191), [target/currentTarget](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102192), [동적 menu 1](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102193), [동적 menu 2](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102194)
- [모던 자바스크립트 딥다이브 스터디 #10-1 (CH 40 이벤트) — FE재남](https://www.youtube.com/watch?v=vPeuNKiWPiA)

## 관련 문서

- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 callback]]
- [[Security-Headers#CSP — 심층 방어의 핵심 계층|Content Security Policy]]
- [[CSRF|CSRF]]
