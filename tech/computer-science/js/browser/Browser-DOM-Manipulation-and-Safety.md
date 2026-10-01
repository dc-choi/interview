---
tags: [cs, javascript, browser, dom, xss, nodelist]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
aliases: ["Browser DOM Manipulation", "브라우저 DOM 조작과 안전성"]
---

# 브라우저 DOM 조작과 안전성

DOM은 document를 node tree로 표현하는 platform-neutral model이다. HTML tag, DOM node와 JavaScript object는 관련되지만 같은 말이 아니다. `Document`, `Element`, `Text`, `Comment` 등은 서로 다른 node type이고 browser API object로 노출된다.

## node tree와 생성

tree의 root는 `<html>`이 아니라 `Document` node(`document`)다. `<!DOCTYPE html>`은 Document의 DocumentType 자식이고, `<html>`은 Document가 가질 수 있는 하나뿐인 element 자식인 document element(`document.documentElement`)다. `document.head`, `document.body`는 자주 쓰는 element로 가는 지름길이다.

- Element는 Element와 Text, Comment 같은 CharacterData node를 자식으로 가질 수 있고, DocumentType과 CharacterData는 자식이 없는 leaf다. 글자는 Text node로 element 아래에 붙인다. `textContent` 대입은 자식 전체를 Text node 하나로 바꾸는 지름길이다.
- 만든 node는 문서의 node에 연결해야 rendering 대상이 된다. `createElement`만 하고 연결하지 않은 element는 memory에만 있다.
- `nodeType`은 1 Element, 3 Text, 8 Comment, 9 Document, 10 DocumentType, 11 DocumentFragment로 종류를 구분한다(2 Attr, 4 CDATASection, 7 ProcessingInstruction도 있다).
- attribute(`Attr`)도 Node지만 parent와 자식을 갖지 않아 element의 자식이 아니다. `childNodes`에 나타나지 않고 `parentNode`는 null이며 소유 element는 `ownerElement`로 찾는다.
- `parentElement`는 parent가 Element일 때만 그 parent를, 아니면 null을 돌려준다. `document.documentElement.parentNode`는 Document이고 `parentElement`는 null이라 element만 따라 올라가는 loop는 여기서 멈춘다.

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
- content attribute를 reflect하는 표준 property(`class`를 반영하는 `className`, `src`, `alt` 등)는 대입이 곧 attribute 변경이라 markup에 보이지만, 정의되지 않은 이름을 대입하면(`img.userRole = "admin"`) element를 나타내는 JavaScript object에 일반 own property(expando)가 생길 뿐 attribute는 생기지 않는다. 같은 object에서 다시 읽으면 값이 나오지만 `outerHTML` 직렬화, devtools의 Elements 패널과 attribute selector에 나타나지 않고, attribute만 복제하는 `cloneNode()` 결과에도 없다. 반대로 `setAttribute`로 만든 임의 attribute에는 같은 이름의 property가 생기지 않는다.
- 표준에 없는 임의 이름의 attribute는 browser에서 동작해도 HTML 명세상 비적합이고 이후 표준 attribute와 이름이 충돌할 수 있다. 사용자 정의 값은 위의 `data-*`와 `dataset`에 둔다. custom element는 class에 getter와 setter를 정의해 반영을 직접 구현한다.
- `setAttribute`는 값을 문자열로 변환해 저장하고(`setAttribute("width", 400)` 뒤 `getAttribute("width")`는 `"400"`), HTML 문서의 HTML element에서는 이름을 ASCII 소문자로 바꾼다(`setAttribute("userRole", v)`는 `userrole` attribute가 된다). `getAttribute`는 원문 문자열이나 null을, property는 type이 있는 현재 값을 돌려준다.
- `img.width`, `img.height`는 대입하면 같은 이름의 attribute를 설정하지만, 읽으면 rendering 중일 때 content box 크기를 돌려준다. rendering되지 않으면 attribute 값, 그다음 natural 크기, 둘 다 없으면 0이다. CSS로 크기를 바꾼 image는 `img.width`와 `getAttribute("width")`가 다를 수 있다.

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

## label과 form control 연결

`<label for="user-name">`처럼 `for` 값을 control의 `id`와 같게 두거나 control을 `<label>` 안에 넣으면 그 control이 label의 labeled control이 된다.

- `for` 연결은 같은 tree에서 그 id를 가진 첫 element가 labelable element(`button`, hidden이 아닌 `input`, `meter`, `output`, `progress`, `select`, `textarea`, form-associated custom element)일 때만 성립한다. id 오타는 오류 없이 연결을 끊고, 중복 id는 tree order의 첫 element에 연결된다(아래 `getElementById`와 같은 첫 element 규칙).
- 연결된 label text는 screen reader가 control에 focus가 갈 때 읽는 이름이 된다. 옆에 글자만 두고 연결하지 않은 input은 이름 없는 입력칸으로 읽힐 수 있다.
- 주요 browser는 label 클릭을 연결된 control로 전달해 text input은 focus를 받고 checkbox와 radio는 토글된다. 명세는 이 동작을 platform 관례에 맡기므로 focus만 주는 platform도 있을 수 있다. 클릭 영역이 넓어지는 대신 label과 control의 공통 조상에 위임한 click listener는 사용자 클릭 한 번에 label의 click과 control로 전달된 click을 모두 받을 수 있으므로 `event.target`으로 분기한다([[Event-Bubbling-Capturing#event delegation|event delegation]]).

## form data로 node 만들기

input의 `value`는 untrusted string이다. DOM에 추가하기 전에 다음을 분리한다.

1. schema/length validation
2. URL/email 등 domain parse
3. text node/property assignment
4. submit default 동작과 오류 UX

frontend validation은 UX이며 server-side validation/authorization을 대체하지 않는다.

## node 제거

modern Element/Node는 `node.remove()`를 사용할 수 있고 parent가 명확하면 `parent.removeChild(child)`도 가능하다. 제거 전에 현재 parent/connected 상태와 event/resource cleanup을 확인한다. 두 API는 실패 방식이 다르다.

- `parent.removeChild(x)`는 x의 parent가 `parent`가 아니면 `NotFoundError` DOMException을 던지고, 성공하면 제거한 node를 반환한다. parent를 따로 조회해 두는 코드는 x가 이미 다른 container로 옮겨졌을 때 여기서 깨진다.
- `x.parentNode.removeChild(x)` 관용구는 x가 이미 떨어져 `parentNode`가 null이면 `TypeError`를 낸다. 삭제 버튼 연타, 두 code path의 중복 삭제, `innerHTML` 교체로 이미 떨어진 node 참조가 전형적인 재현 조건이다.
- `x.remove()`는 parent가 null이면 아무것도 하지 않고 반환한다(반환값은 undefined). 중복 호출에도 안전해야 하면 `remove()`를, 없는 node의 삭제를 버그로 드러내야 하면 `removeChild`를 고른다.
- 제거된 node도 변수, 배열, closure나 Map이 참조하면 detached DOM으로 memory에 남는다. cleanup에는 listener와 resource 해제뿐 아니라 참조 해제도 포함한다.

`document.querySelectorAll("li")`로 모은 항목의 `innerText`를 비교해 지우는 예제는 조기 종료가 없어 text가 일치하는 `li`를 모두 지운다.

- text가 같은 항목이 둘이면 하나만 지우려 해도 둘 다 지워지고, 첫 항목만 지우는 변형은 의도하지 않은 항목을 지울 수 있다. text는 identity가 아니므로 stable data ID로 대상을 지정하고, ID를 selector에 넣을 때는 `CSS.escape()`로 escape한다.
- `document.querySelectorAll("li")`는 navigation 같은 다른 목록의 `li`까지 포함한다. 대상 목록에서 `list.querySelectorAll(":scope > li")`로 범위를 좁힌다.
- `innerText`는 rendering 결과라 `text-transform`, 숨긴 자손, 공백 처리에 따라 값이 달라지고 layout 계산을 유발할 수 있다. text 비교가 꼭 필요하면 `textContent.trim()`을 쓴다.
- `querySelectorAll`의 static NodeList는 순회 중 삭제해도 줄지 않는다. 같은 loop를 live HTMLCollection과 index로 돌리면 삭제마다 뒤 항목이 당겨져 연속된 일치 항목을 건너뛴다(아래 NodeList 절).

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

CSS layout은 legacy `float`보다 flex/grid가 의도를 더 잘 표현하는지 검토한다.

- 크기: `width: 100%`는 부모 너비에 맞춰 원본보다 크게도 늘린다. 항상 영역을 채워야 하는 banner에 쓰고 흐려짐을 감수하거나 충분한 해상도를 `srcset`/`sizes`로 제공한다. 원본보다 커지면 안 되는 본문과 gallery image에는 부모가 좁을 때만 줄이는 `max-width: 100%`를 쓴다.
- 비율: `width`/`height` attribute는 같은 이름의 CSS property와 `aspect-ratio: auto w / h`의 presentational hint가 된다. CSS로 너비만 줄이면 attribute 높이가 남아 비율이 찌그러지므로 `height: auto`를 함께 둔다. attribute와 `max-width: 100%; height: auto`를 함께 쓰면 load 전 공간 확보와 비율 유지를 함께 얻는다.
- baseline 틈: image 아래 틈은 margin 오류가 아니라 inline formatting의 결과다. `img`는 inline replaced element라 기본 `vertical-align: baseline`에서 아래 margin edge가 줄의 baseline에 놓이고, line box가 부모 글꼴의 strut를 포함하므로 baseline 아래 descender 공간이 남는다.
- 틈을 없애는 방법별 부작용: `img { display: block }`은 inline 배치에서 빠져 틈이 사라지지만 부모의 `text-align: center`가 적용되지 않아 `margin-inline: auto`로 다시 정렬한다. `vertical-align: top`이나 `bottom`은 inline 배치를 유지한 채 틈을 없앤다. 부모의 `font-size: 0`이나 `line-height: 0`도 strut가 차지하는 높이를 없애지만, 같은 부모에 나중에 들어온 text가 보이지 않거나 겹치고 자손의 `em` 크기도 0 기준이 되므로 text가 들어올 수 있는 container에는 쓰지 않는다.
- float 부모: float된 자식은 normal flow에서 빠져 부모 높이 계산에 들어가지 않는다. 자식이 모두 float이면 부모 높이가 0이 되어 border와 background가 사라지고 뒤 내용이 float 옆으로 흘러든다. 부모에 `display: flow-root`를 두면 새 block formatting context가 float를 감싼다. `overflow: hidden`도 같은 효과가 있지만 확대 image와 focus outline까지 자른다.
- 퍼센트 합: 24% 너비와 1% 여백 네 개처럼 합이 정확히 100%인 배치는 여유가 없어, 기본 `box-sizing: content-box`에서 border 1px만 더해도 마지막 항목이 다음 줄로 떨어진다. flex나 grid의 `gap`은 간격을 너비 계산에서 분리한다.

## 출처

- [DOM Standard, Nodes](https://dom.spec.whatwg.org/#nodes)
- [DOM Standard, Node tree](https://dom.spec.whatwg.org/#node-trees), [DOM Standard, nodeType](https://dom.spec.whatwg.org/#dom-node-nodetype), [DOM Standard, Interface Attr](https://dom.spec.whatwg.org/#interface-attr), [DOM Standard, pre-remove](https://dom.spec.whatwg.org/#concept-node-pre-remove), [DOM Standard, remove()](https://dom.spec.whatwg.org/#dom-childnode-remove), [DOM Standard, setAttribute()](https://dom.spec.whatwg.org/#dom-element-setattribute)
- [DOM Standard, NodeList and HTMLCollection](https://dom.spec.whatwg.org/#old-style-collections)
- [DOM Standard, Clone a node](https://dom.spec.whatwg.org/#concept-node-clone)
- [HTML Standard, dynamic markup insertion](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html)
- [Trusted Types](https://w3c.github.io/trusted-types/dist/spec/)
- [HTML Standard, The input element](https://html.spec.whatwg.org/multipage/input.html), [HTML Standard, The textarea element](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element), [HTML Standard, Named access on the Window object](https://html.spec.whatwg.org/multipage/nav-history-apis.html#named-access-on-the-window-object), [Web IDL Standard, Named properties object](https://webidl.spec.whatwg.org/#named-properties-object), [ECMAScript Language Specification, Global Environment Records](https://tc39.es/ecma262/#sec-global-environment-records)
- [HTML Standard, The label element](https://html.spec.whatwg.org/multipage/forms.html#the-label-element), [HTML Standard, Semantics](https://html.spec.whatwg.org/multipage/dom.html#semantics-2), [HTML Standard, The innerText getter](https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute), [HTML Standard, img width and height](https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-width), [HTML Standard, Attributes for embedded content and images](https://html.spec.whatwg.org/multipage/rendering.html#attributes-for-embedded-content-and-images)
- [CSS 2.1, Line height calculations](https://www.w3.org/TR/CSS21/visudet.html#line-height), [CSS 2.1, 'Auto' heights for block formatting context roots](https://www.w3.org/TR/CSS21/visudet.html#root-height), [CSS Display Module Level 3, flow-root](https://drafts.csswg.org/css-display-3/#valdef-display-flow-root), [CSSOM, The CSS.escape() Method](https://drafts.csswg.org/cssom/#the-css.escape()-method)
- [MDN, Element: innerHTML property](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML), [MDN, Element: insertAdjacentHTML() method](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML), [MDN, Node: cloneNode() method](https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode), [MDN, DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment), [MDN, Handling whitespace](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Text/Whitespace), [MDN, label element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label)
- [OWASP Cheat Sheet Series, DOM Clobbering Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)
- [모던 자바스크립트 딥다이브 스터디 #8-2 (CH 39 DOM) — FE재남](https://www.youtube.com/watch?v=KfmXaEVbVJY)
- DOM tree/생성: [node tree](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102055), [Text node](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102171), [image/attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102172), [innerHTML/innerText](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102173)
- form/삭제: [form node 1](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102174), [form node 2](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102175), [node 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102176), [조건 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102177), [NodeList/Array](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102178)
- image gallery: [구조](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102179), [layout](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102180), [onclick/data attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102181), [addEventListener/dataset](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102182), [동적 menu 추가](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102193)

## 관련 문서

- [[Event-Bubbling-Capturing|DOM event 전파와 위임]]
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]
- [[Code-Readability-Dark-Patterns|JavaScript DOM code 가독성]]
- [[Security-Headers#CSP — 심층 방어의 핵심 계층|Content Security Policy]]
- [[XSS|Cross-Site Scripting]]
