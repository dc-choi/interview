---
tags: [cs, javascript, browser, dom, xss, nodelist]
status: done
verified_at: 2026-08-04
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
- `DocumentFragment`로 여러 node를 구성하면 중간 tree mutation을 줄일 수 있지만 성능은 실제 rendering workload로 측정한다.
- DOM mutation 뒤 style/layout/paint 시점은 rendering pipeline과 browser 최적화에 달려 있다.

## property와 attribute

HTML attribute는 markup의 문자열 상태이고 DOM property는 현재 object state다. 이름이 같아도 항상 같은 type/동기화 규칙은 아니다.

- image에는 `src`, `alt`, intrinsic `width`/`height`를 명시해 접근성과 layout shift를 고려한다.
- application metadata는 유효한 `data-*` attribute와 `dataset`을 사용한다.
- boolean attribute는 존재 자체가 true인 경우가 있어 문자열 `"false"`를 설정해도 false가 아닐 수 있다.
- URL property는 browser가 현재 document 기준으로 resolve할 수 있고 attribute 원문과 다르게 보일 수 있다.

사용자 URL을 anchor/image에 넣기 전에 `new URL(value, base)`로 parse하고 허용 scheme/origin을 검증한다. 새 window를 여는 link에는 opener 정책과 referrer 정책을 함께 검토한다.

## textContent, innerText와 innerHTML

| API | 의미 |
|---|---|
| `textContent` | node의 text content, markup으로 parse하지 않음 |
| `innerText` | rendered text에 가까운 layout-aware 표현 |
| `innerHTML` | HTML fragment serialization/parsing |

외부 문자열을 표시할 때 기본은 `textContent` 또는 node 생성이다. `innerText`는 style/layout을 고려해 hidden text와 line break가 달라지고 layout 계산 비용을 유발할 수 있다. `innerHTML`은 injection sink이므로 trusted constant, 검증된 sanitizer와 CSP Trusted Types 같은 정책 없이 사용자 입력을 넣지 않는다.

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

## NodeList와 Array

`querySelectorAll`은 static NodeList를 반환하지만 모든 NodeList가 static인 것은 아니다. 일부 오래된 API collection은 live다. HTMLCollection도 별도 collection type이다.

- NodeList는 `length`, `item`, iterator와 modern browser의 `forEach`를 제공할 수 있지만 Array가 아니다.
- 범위를 벗어난 `item(index)`는 `null`, bracket access는 `undefined`일 수 있다.
- `Array.from(list)`/`[...list]`는 현재 항목의 snapshot Array를 만든다.
- live collection을 mutation하며 순회하면 index가 바뀔 수 있으므로 snapshot 또는 역순을 사용한다.

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
- [HTML Standard, dynamic markup insertion](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html)
- [Trusted Types](https://w3c.github.io/trusted-types/dist/spec/)
- DOM tree/생성: [node tree](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102055), [Text node](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102171), [image/attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102172), [innerHTML/innerText](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102173)
- form/삭제: [form node 1](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102174), [form node 2](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102175), [node 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102176), [조건 삭제](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102177), [NodeList/Array](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102178)
- image gallery: [구조](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102179), [layout](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102180), [onclick/data attribute](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102181), [addEventListener/dataset](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102182)

## 관련 문서

- [[Event-Bubbling-Capturing|DOM event 전파와 위임]]
- [[Code-Readability-Dark-Patterns|JavaScript DOM code 가독성]]
- [[Security-Headers#CSP — 가장 큰 한 방|Content Security Policy]]
- [[XSS|Cross-Site Scripting]]
