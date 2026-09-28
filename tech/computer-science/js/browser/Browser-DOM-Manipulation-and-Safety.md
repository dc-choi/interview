---
tags: [cs, javascript, browser, dom, xss, nodelist]
status: done
verified_at: 2026-09-27
category: "CS - JavaScript"
aliases: ["Browser DOM Manipulation", "브라우저 DOM 조작과 안전성"]
---

# 브라우저 DOM 조작과 안전성

DOM은 document를 node tree로 표현하는 platform-neutral model이다. HTML tag, DOM node와 JavaScript object는 관련되지만 같은 말이 아니다. `Document`, `Element`, `Text`, `Comment` 등은 서로 다른 node type이고 browser API object로 노출된다.

## node tree와 생성

```ts
const item = document.createElement("li");
item.textContent = userName;
list.append(item);
```

- `createElement`는 Element를, `createTextNode`는 Text node를 만든다.
- `append`는 node/string 여러 개, `appendChild`는 한 Node를 받고 반환 의미도 다르다.
- node를 조립한 `DocumentFragment`를 `append`, `appendChild`, `insertBefore`로 삽입하면 fragment의 자식 node가 문서로 이동하고 fragment는 빈 상태로 남는다. loop에서 문서에 바로 append하는 방식보다 빠르다고 단정할 수 없고 엔진에 따라 더 느릴 수도 있으므로 조립 코드의 가독성으로 선택하고, 성능은 실제 rendering workload로 측정한다.
- `cloneNode()`는 인자를 생략하면 false로 동작해 node 자신과 attribute만 복제하고 child Text node를 포함한 subtree는 뺀다. `input`과 `textarea`는 cloning steps로 현재 value와 dirty value flag도 복제하고, `input`은 checkedness, dirty checkedness flag와 indeterminateness도 복제한다. shadow host에 `attachShadow()`의 `clonable: true`나 `<template shadowrootmode>`의 `shadowrootclonable`로 만든 shadow root가 있으면 인자와 관계없이 shadow root와 그 안의 node까지 복제된다. 내용까지 복제하려면 `cloneNode(true)`를 쓴다. attribute로 지정한 inline event handler는 복제되지만 `addEventListener`나 `onclick` property로 등록한 listener는 복제되지 않는다. 같은 문서에 넣을 복제본은 `id`를 바꿔 중복을 피한다.
- DOM mutation 뒤 style/layout/paint 시점은 rendering pipeline과 browser 최적화에 달려 있다.

## property와 attribute

HTML attribute는 markup의 문자열 상태이고 DOM property는 현재 object state다. 이름이 같아도 항상 같은 type/동기화 규칙은 아니다.

- image에는 `src`, `alt`, intrinsic `width`/`height`를 명시해 접근성과 layout shift를 고려한다.
- application metadata는 유효한 `data-*` attribute와 `dataset`을 사용한다. `data-user-id`는 `dataset.userId`로 읽고, `dataset.userRole = "admin"` 대입은 `data-user-role` attribute를 만든다. 값은 문자열로 저장된다.
- boolean attribute는 존재 자체가 true인 경우가 있어 문자열 `"false"`를 설정해도 false가 아닐 수 있다.
- URL property는 browser가 현재 document 기준으로 resolve할 수 있고 attribute 원문과 다르게 보일 수 있다.
- `input`에서 text 입력 계열의 `value`와 checkbox, radio의 `checked`는 content attribute가 초기값이고 같은 이름의 IDL property가 현재값이다. `value` attribute는 `defaultValue` property에 반영되고 `value` property는 현재 값을 돌려준다. `disabled`, `required`, `name` 같은 대부분의 attribute는 IDL property가 content attribute를 그대로 반영한다.
- 사용자가 값을 바꾸거나 script가 `value` property에 대입하면 dirty value flag가 켜진다. 그 전에는 `setAttribute("value", v)`가 현재 값도 바꾸지만 이후에는 attribute만 바뀐다. form reset은 flag를 끄고 현재 값을 attribute 값으로 되돌린다.
- `checked` attribute는 `defaultChecked` property에 반영된다. 사용자 조작이나 `checked` 대입 뒤에는 attribute를 바꿔도 현재 상태가 바뀌지 않는다. checkbox와 radio의 `value` property는 선택 여부와 무관하게 `value` attribute를 돌려주고, attribute가 없으면 `"on"`이다.

사용자 URL을 anchor/image에 넣기 전에 `new URL(value, base)`로 parse하고 허용 scheme/origin을 검증한다. 새 window를 여는 link에는 opener 정책과 referrer 정책을 함께 검토한다.

## textContent, innerText와 innerHTML

| API | 의미 |
|---|---|
| `textContent` | node의 text content, markup으로 parse하지 않음 |
| `innerText` | rendered text에 가까운 layout-aware 표현 |
| `innerHTML` | HTML fragment serialization/parsing |

외부 문자열을 표시할 때 기본은 `textContent` 또는 node 생성이다. `innerText`는 style/layout을 고려해 hidden text와 line break가 달라지고 layout 계산 비용을 유발할 수 있다. `innerHTML`은 injection sink이므로 trusted constant, 검증된 sanitizer와 CSP Trusted Types 같은 정책 없이 사용자 입력을 넣지 않는다.

`innerHTML` setter는 문자열을 parse한 결과로 element의 descendant 전체를 교체한다. `el.innerHTML += html`은 기존 내용을 serialize한 문자열에 이어 붙여 다시 parse하므로 기존 자식도 새 node로 바뀐다. 미리 잡아 둔 node 참조는 문서에서 떨어지고, 새 node에는 `addEventListener`로 등록했던 listener가 없다. 기존 node를 유지하며 markup을 덧붙이려면 `insertAdjacentHTML(position, html)`을 쓴다. position은 `beforebegin`(element 앞 형제), `afterbegin`(첫 자식 앞), `beforeend`(마지막 자식 뒤), `afterend`(element 뒤 형제)이고, 형제 위치는 parent가 없거나 Document이면 `NoModificationAllowedError`다(ShadowRoot나 DocumentFragment가 parent면 삽입된다).

`insertAdjacentHTML`도 sanitization을 하지 않는 injection sink다. `innerHTML`로 넣은 `<script>`는 실행되지 않지만 `<img src="x" onerror="...">`처럼 event handler content attribute를 가진 markup은 삽입만으로 script를 실행하므로, script 미실행을 XSS 방어로 보지 않는다.

```ts
// 안전한 text 표시
output.textContent = input.value;
```

HTML sanitization은 regex replace로 구현하지 않는다. attribute URL, SVG/MathML, mutation과 browser parser context까지 다뤄야 한다.

## form data로 node 만들기

input의 `value`는 untrusted string이다. DOM에 추가하기 전에 다음을 분리한다.

1. schema/length validation
2. URL/email 등 domain parse
3. text node/property assignment
4. submit default 동작과 오류 UX

frontend validation은 UX이며 server-side validation/authorization을 대체하지 않는다.

## node 제거

modern Element/Node는 `node.remove()`를 사용할 수 있고 parent가 명확하면 `parent.removeChild(child)`도 가능하다. 제거 전에 현재 parent/connected 상태와 event/resource cleanup을 확인한다. 같은 text를 가진 첫 `li`를 지우는 방식은 identity가 모호하므로 stable data ID와 selector escaping을 사용한다.

## id 조회와 window named access

`document.getElementById(id)`는 tree order에서 처음 나오는 element 하나를 반환하고 없으면 `null`이다. 같은 id가 여러 개여도 오류 없이 첫 element만 돌려준다. 이 method는 Document와 DocumentFragment(ShadowRoot 포함)에만 있어 element 하위 검색은 `element.querySelector()`를 쓴다.

Window는 id를 가진 element와 `name`이 비어 있지 않은 `embed`, `form`, `img`, `object` element 등을 named property로 노출한다. 선언하지 않은 전역 이름 `apple`이 `<li id="apple">`로 해석되고 같은 이름이 여러 개면 HTMLCollection이 되는 이유다. 변수 선언이 아니라 Window prototype chain에 있는 named properties object의 property 조회다.

- Window의 own property가 아니라서 sloppy script의 `delete apple`은 true를 반환해도 값이 계속 조회된다.
- 같은 이름을 `var`, `let`, `const`로 선언하면 identifier로 읽을 때 그 binding이 먼저 찾아져 element를 가린다.
- `window.config || defaultConfig`처럼 선언되지 않았을 수 있는 전역 이름을 읽는 코드는 script 없이 주입한 `<a id="config">` 같은 markup만으로 읽는 값이 바뀐다(DOM clobbering). sanitizer가 script를 막아도 id와 name은 남길 수 있다. `let`, `const` 선언은 window property를 만들지 않아 `window.config` 조회는 계속 clobber될 수 있으므로, 전역 설정은 선언한 identifier나 module scope 값으로 읽고 `window`, `document` property 조회에 기대지 않는다. element는 `getElementById`나 `querySelector`로 찾는다.

## NodeList와 Array

DOM collection은 명세가 따로 static이라고 정하지 않으면 live다. `getElementsByTagName`, `getElementsByClassName`, `children`은 live HTMLCollection을, `childNodes`는 live NodeList를 반환하고, `querySelectorAll`은 static NodeList를 반환한다. 같은 NodeList type이라도 반환한 API에 따라 live 여부가 다르다.

- NodeList는 `length`, `item`, iterator와 modern browser의 `forEach`를 제공할 수 있지만 Array가 아니다.
- 범위를 벗어난 `item(index)`는 `null`, bracket access는 `undefined`일 수 있다.
- `Array.from(list)`/`[...list]`는 현재 항목의 snapshot Array를 만든다.
- live collection을 mutation하며 순회하면 index가 바뀔 수 있으므로 snapshot 또는 역순을 사용한다.
- 태그 사이의 줄바꿈과 들여쓰기는 parser가 버리는 일부 위치를 빼면 whitespace만 담은 Text node로 DOM에 남는다. `childNodes`, `firstChild`, `nextSibling`, `hasChildNodes()`는 이 node를 포함하므로 element만 다루려면 `children`, `firstElementChild`, `nextElementSibling`, `childElementCount`를 쓴다.

## image gallery 설계

thumbnail이 큰 image URL을 `data-*`에 들고 있는 예제는 동작하지만 실제 UI에는 다음 계약이 필요하다.

- `alt`, keyboard activation과 focus state
- allowed URL/origin과 실패 placeholder
- width/height, responsive `srcset`/`sizes`
- loading/decode race와 이전 요청 취소
- 개별 listener 대신 event delegation 가능성

CSS layout은 legacy `float`보다 flex/grid가 의도를 더 잘 표현하는지 검토한다. image 아래 baseline gap은 무조건 margin 오류가 아니며 inline formatting context/display/vertical-align을 확인한다.

## 출처

- [DOM Standard, Nodes](https://dom.spec.whatwg.org/#nodes)
- [DOM Standard, NodeList and HTMLCollection](https://dom.spec.whatwg.org/#old-style-collections)
- [DOM Standard, Clone a node](https://dom.spec.whatwg.org/#concept-node-clone)
- [HTML Standard, dynamic markup insertion](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html)
- [Trusted Types](https://w3c.github.io/trusted-types/dist/spec/)
- [HTML Standard, The input element](https://html.spec.whatwg.org/multipage/input.html), [HTML Standard, The textarea element](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element), [HTML Standard, Named access on the Window object](https://html.spec.whatwg.org/multipage/nav-history-apis.html#named-access-on-the-window-object), [Web IDL Standard, Named properties object](https://webidl.spec.whatwg.org/#named-properties-object), [ECMAScript Language Specification, Global Environment Records](https://tc39.es/ecma262/#sec-global-environment-records)
- [MDN, Element: innerHTML property](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML), [MDN, Element: insertAdjacentHTML() method](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML), [MDN, Node: cloneNode() method](https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode), [MDN, DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment), [MDN, Handling whitespace](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Text/Whitespace)
- [OWASP Cheat Sheet Series, DOM Clobbering Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)
- [모던 자바스크립트 딥다이브 스터디 #8-2 (CH 39 DOM) — FE재남](https://www.youtube.com/watch?v=KfmXaEVbVJY)
- DOM tree/생성: [node tree](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102055), [Text node](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102171), [image/attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102172), [innerHTML/innerText](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102173)
- form/삭제: [form node 1](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102174), [form node 2](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102175), [node 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102176), [조건 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102177), [NodeList/Array](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102178)
- image gallery: [구조](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102179), [layout](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102180), [onclick/data attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102181), [addEventListener/dataset](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102182)

## 관련 문서

- [[Event-Bubbling-Capturing|DOM event 전파와 위임]]
- [[Code-Readability-Dark-Patterns|JavaScript DOM code 가독성]]
- [[Security-Headers#CSP — 심층 방어의 핵심 계층|Content Security Policy]]
- [[XSS|Cross-Site Scripting]]
