---
tags: [cs, javascript, browser, dom, web-components, design-system]
status: done
verified_at: 2026-11-14
category: "CS - JavaScript"
aliases: ["Web Components", "웹 컴포넌트", "Custom Elements", "Shadow DOM"]
---

# 웹 컴포넌트

웹 컴포넌트는 브라우저 표준 API로 재사용할 UI 요소를 만드는 기술 묶음이다. 특정 프레임워크의 컴포넌트 모델 대신 HTML 요소 자체를 확장하므로, 여러 프레임워크가 공존하는 조직에서 디자인 시스템의 공통 계층으로 검토된다.

## 세 가지 구성 요소

| 구성 요소 | 하는 일 | 핵심 API |
|---|---|---|
| Custom elements | 새 태그와 그 동작을 정의 | `customElements.define()`, lifecycle callback |
| Shadow DOM | 요소에 캡슐화된 별도 DOM 트리를 붙임 | `attachShadow()`, `<template shadowrootmode>` |
| HTML templates | 렌더링되지 않는 마크업 틀과 내용 삽입 지점 | `<template>`, `<slot>` |

### Custom elements

- `HTMLElement`를 상속하는 autonomous 요소와 `HTMLImageElement` 같은 표준 요소를 상속하는 customized built-in 요소가 있다. Customized built-in은 `<p is="word-count">`처럼 쓰지만 Safari는 지원할 계획이 없다고 MDN이 밝히므로, 범용 디자인 시스템은 autonomous 요소를 기본으로 둔다.
- 이름은 소문자로 시작하고 하이픈을 포함해야 한다.
- Lifecycle callback은 `connectedCallback`, `disconnectedCallback`, `adoptedCallback`, `attributeChangedCallback`이고, 감시할 attribute는 static `observedAttributes` 배열로 선언한다. `connectedMoveCallback`을 정의하면 `Element.moveBefore()`로 옮길 때 연결과 해제 callback 대신 호출된다.

### Shadow DOM

- Shadow tree 안의 노드는 페이지 CSS의 영향을 받지 않고, shadow tree의 스타일도 바깥 페이지에 새지 않는다. 클래스 이름 충돌로 생기는 스타일 간섭을 막는 것이 주된 가치다.
- `open` 모드는 바깥 스크립트가 `shadowRoot`로 내부에 접근할 수 있고, `closed` 모드는 `shadowRoot`가 `null`이다. MDN은 closed 모드를 강한 보안 수단으로 보지 말라고 한다. 같은 페이지에서 도는 브라우저 확장 등으로 우회할 수 있어, 내부에 접근하지 말라는 표시에 가깝다.
- 바깥 페이지가 내부를 꾸미는 통로는 둘이다. 컴포넌트가 내부 요소에 `part` 속성을 붙여 열어 준 부분은 바깥에서 `::part()`로 고르고, 상속 속성은 shadow host에서 shadow tree로 이어진다. CSS 상속은 flat tree를 따르므로 `--`로 선언한 custom property도 안으로 상속되고, CSS Shadow Module Level 1 초안(2026-04-28 Editor's Draft)은 이를 테마 색 같은 값을 컴포넌트에 넘기는 방법으로 설명한다. `:host`는 바깥 통로가 아니라 shadow tree 안의 스타일시트에서 자기 host의 기본 스타일을 정하는 선택자다. 디자인 토큰을 custom property로 두면 프레임워크와 관계없이 같은 토큰을 주입할 수 있다.
- Shadow DOM은 `<template shadowrootmode="open">`으로 HTML에서 선언할 수도 있다. 파서가 이 template을 shadow root로 바꾸므로, 서버 렌더링한 컴포넌트를 JavaScript 실행 전에 그릴 때 쓴다.

### Templates와 slots

`<slot name="title">`처럼 이름 붙인 slot에는 같은 값의 `slot` 속성을 단 자식이 들어가고, `slot` 속성이 없는 자식은 이름 없는 기본 slot으로 간다. Slot 안의 내용은 채워지지 않았을 때의 기본값이다. 같은 이름의 slot이 둘이면 첫 slot에만 배정된다.

## 프레임워크 독립성의 실제 범위

웹 컴포넌트는 브라우저가 이해하는 태그라서 프레임워크 안에서도 렌더링할 수 있고, Custom Elements Everywhere는 2026-11-14 확인 기준 React 19, Vue 3, Angular 16의 테스트 통과를 100%로 표시한다. 하지만 데이터 전달 방식은 프레임워크마다 달랐다. React 18까지는 알 수 없는 prop을 property가 아닌 attribute로 넘겨 객체나 함수 값을 전달하기 어려웠다. React 19는 Custom Elements Everywhere 테스트를 모두 통과했다고 밝히며, 클라이언트에서는 요소 인스턴스에 같은 이름의 property가 있으면 property로, 없으면 attribute로 넘긴다. 서버 렌더링에서는 문자열, 숫자, `true` 같은 원시 값만 attribute로 출력하고 객체, 함수와 `false`는 생략한다.

따라서 프레임워크를 바꿀 때 컴포넌트 구현은 남기기 쉽지만, 연결 코드와 다음 항목은 다시 확인한다.

- 사용하는 프레임워크 버전이 property와 custom event를 어떻게 다루는가.
- 서버 렌더링이 필요하면 declarative shadow DOM과 hydration 순서를 어떻게 맞추는가.
- 폼과 접근성: 기본 `<input>`처럼 폼에 참여하려면 static `formAssociated = true`와 `attachInternals()`로 얻은 `ElementInternals`의 `setFormValue()`, `setValidity()`를 쓴다. `ElementInternals`의 `role`과 `aria*` 속성은 요소의 기본 접근성 의미를 정하며, 사용하는 쪽이 단 attribute가 이를 덮어쓴다.

## 언제 고르는가

| 상황 | 판단 |
|---|---|
| 여러 프레임워크나 레거시 페이지가 같은 UI를 써야 함 | 웹 컴포넌트가 공통 계층으로 유리하다 |
| 단일 프레임워크 앱 하나 | 그 프레임워크 컴포넌트가 상태 관리, 테스트 도구와 더 잘 맞는다 |
| 서버 렌더링과 SEO가 중요 | declarative shadow DOM 지원과 프레임워크의 SSR 처리를 먼저 확인한다 |
| 외부 스크립트로부터 내부 보호가 목적 | Shadow DOM은 스타일 캡슐화이지 보안 경계가 아니다. iframe이나 서버 측 통제를 검토한다 |

작은 조직에서 디자인 시스템을 직접 운영하면 프레임워크 교체 비용을 줄일 수 있지만, 컴포넌트 문서, 접근성 검증과 버전 배포를 맡을 사람이 있어야 자산으로 남는다(적용 제안). 표준 API만으로 작성할 수도 있고 Lit 같은 라이브러리로 반응형 렌더링을 보탤 수도 있다.

## 면접 체크포인트

- Shadow DOM이 막는 것(스타일 누수, DOM 선택자 간섭)과 막지 못하는 것(같은 페이지 스크립트의 접근)을 구분해 설명할 수 있는가.
- 디자인 토큰을 shadow DOM 안으로 전달하는 방법으로 custom property 상속과 `::part()`의 차이를 말할 수 있는가.
- React 19 전후로 웹 컴포넌트에 객체 prop을 넘기는 방식이 어떻게 달라졌는가.

## 출처

- [MDN, Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN, Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN, Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN, Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)
- [MDN, ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
- [MDN, Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
- [W3C CSSWG, CSS Shadow Module Level 1 (Editor's Draft)](https://drafts.csswg.org/css-shadow-1/)
- [React v19 — React Blog](https://react.dev/blog/2024/12/05/react-19)
- [Custom Elements Everywhere](https://custom-elements-everywhere.com/)
- [Lit, Documentation](https://lit.dev/docs/)
- [프론트 스택 1편. 웹 컴포넌트로 진행하는 이유 (Web Components vs Frameworks) — 하찮은오후](https://www.youtube.com/watch?v=h1QFZn0hqrQ) — 2026-11-01 업로드, 정리의 계기. 사실은 위 1차 출처로 대조

## 관련 문서

- [[JS-Browser-APIs|브라우저 API]]
- [[Event-Bubbling-Capturing|DOM event 전파와 위임]] — Shadow DOM retargeting
- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]
- [[React-DOM-Components|React DOM 컴포넌트]] — React의 attribute와 property 계약
