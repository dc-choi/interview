---
tags: [cs, javascript, browser, dom, event]
status: index
category: "CS - JavaScript"
aliases: ["JS Browser APIs", "브라우저 API"]
---

# 브라우저 API

browser가 제공하는 host API — DOM node tree 조작, event 전파와 위임, Fetch/XHR 네트워크, CSS transition과 animation. 언어 기능이 아니라 host가 주는 기능이라는 경계를 기준으로 묶는다.

- [[Browser-Fetch-and-XHR|브라우저 Fetch와 XHR]]: HTTP 오류, 응답 두 단계와 deadline, body와 Headers 계약, object URL 수명, CORS
- [[Browser-Fetch-and-XHR-XMLHttpRequest|XMLHttpRequest의 상태, 이벤트와 응답 해석]]: readyState와 event 순서, Promise wrapping, responseType과 charset
- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]: node tree 구조와 생성, property와 attribute, label 연결, node 제거 실패 조건, XSS와 NodeList 함정
- [[Event-Bubbling-Capturing|DOM event 전파와 위임]]: capture/target/bubble 3단계 dispatch, listener 실행 순서와 AbortController, 위임 target 판별, Shadow DOM retargeting
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]: transition 배치와 timing function, vendor prefix 순서, Web Animations API, 접근성

## 함께 볼 문서

- [[자바스크립트(JS)|JavaScript(JS)]]
