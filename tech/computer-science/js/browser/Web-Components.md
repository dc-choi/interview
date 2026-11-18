---
tags: [cs, javascript, browser, dom, web-components, design-system]
status: done
verified_at: 2026-11-18
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

작은 조직에서 디자인 시스템을 직접 운영하면 프레임워크 교체 비용을 줄일 수 있지만, 컴포넌트 문서, 접근성 검증과 버전 배포를 맡을 사람이 있어야 자산으로 남는다(적용 제안). 표준 API만으로 작성할 수도 있고 Lit 같은 라이브러리로 반응형 렌더링을 보탤 수도 있다. 컴포넌트별 상태 재현, 문서와 접근성 검사는 [[Storybook|Storybook]]에 모을 수 있다.

## Lit으로 작성하기

Lit은 `LitElement`를 상속한 클래스로 custom element를 만들고, `observedAttributes`와 `attributeChangedCallback`을 직접 쓰는 대신 반응형 속성 선언으로 attribute 변환과 다시 그리기를 맡긴다. 아래는 Lit 3 문서를 2026-11-15에 대조한 기준이다.

- **공개 속성**: `@property()`로 선언한다. 기본으로 속성 이름을 소문자로 바꾼 attribute와 연결되므로 `helperText`는 `helpertext`가 되고, `helper-text`가 필요하면 `attribute` 옵션으로 이름을 정한다. `type`은 attribute 문자열을 속성 값으로 바꾸는 런타임 변환 기준이지 타입 검사가 아니다. `reflect: true`면 속성 값이 attribute로 다시 쓰여 CSS 속성 선택자로 상태를 꾸밀 수 있다. 기본값은 `false`다.
- **내부 상태**: `@state()`로 선언한다. 바뀌면 다시 그리지만 attribute가 없고 바깥에서 쓰지 않는 값이며, 옵션은 `hasChanged`만 받는다. 열림 여부나 비밀번호 표시 여부처럼 사용자가 주입하지 않는 상태가 여기에 해당한다.
- **갱신 주기**: 속성 변경이나 `requestUpdate()`가 갱신을 예약하고, 다음 그리기 전 microtask 시점에 한 번 실행한다. 예약 뒤 시작 전까지의 여러 변경은 한 번의 갱신으로 묶이며, 끝나면 `updateComplete` promise가 resolve된다. 테스트에서 속성을 바꾼 직후 DOM을 확인하려면 이 promise를 기다린다.
- **이벤트**: 컴포넌트의 결과는 `CustomEvent`로 알리고 값은 `detail`에 담는다. 다른 shadow root 바깥의 조상까지 받게 하려면 `bubbles: true`와 `composed: true`를 함께 준다. `composed`만 주고 `bubbles`를 빼면 보낸 요소와 그 요소를 품은 shadow host에서만 받을 수 있다.

```ts
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('password-input')
export class PasswordInput extends LitElement {
  @property() label = '';
  @property({ type: Boolean, reflect: true }) required = false;
  @state() private visible = false;

  render() {
    return html`
      <label>${this.label}<input type=${this.visible ? 'text' : 'password'} ?required=${this.required} @input=${this.onInput}></label>
      <button @click=${() => { this.visible = !this.visible; }}>표시</button>
      <slot name="helper-text"></slot>`;
  }

  private onInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new CustomEvent('value-change', { detail: { value }, bubbles: true, composed: true }));
  }
}
```

React 앱에 배포할 때는 `@lit/react`의 `createComponent()`로 React 래퍼를 만들 수 있다. 래퍼는 `tagName`, `elementClass`, `react`(React 객체)와 `events` 옵션을 받는다. 요소에 `in` 검사로 확인되는 prop은 property로, `events`에 적은 prop은 `addEventListener()`로, 나머지는 attribute로 넘긴다. `events: { onvaluechange: 'value-change' }`처럼 handler prop 이름을 이벤트 이름에 연결하고, TypeScript에서는 `'value-change' as EventName<CustomEvent<{ value: string }>>`로 handler 인자의 이벤트 타입을 지정한다. Lit 문서는 React가 JSX 속성을 attribute로 보아 property를 설정할 방법이 없고, 이벤트는 `addEventListener()` 대신 이벤트 속성으로 다뤄 복잡한 컴포넌트에는 `ref`와 명령형 코드가 필요하다는 점을 래퍼가 필요한 이유로 든다. 2026-11-17 확인 기준 Lit 문서는 React 19를 언급하지 않는다. 반면 현재 React 문서는 custom element의 이벤트를 `on` 뒤에 이벤트 이름을 그대로 붙인 JSX 속성(`onvalue-change`)으로 받을 수 있고 이벤트 이름은 대소문자를 구분하며 하이픈을 지원한다고 설명한다. 이 문서는 적용 버전을 밝히지 않으므로, 래퍼는 사용하는 React 버전에서 property와 이벤트 전달을 확인한 뒤 타입이 붙은 prop과 이벤트가 필요할 때 고르는 선택지로 본다.

Decorator 설정은 빌드 결과에 영향을 준다. Lit은 TypeScript에서 당분간 `experimentalDecorators: true`와 `useDefineForClassFields: false`를 권한다. 표준 decorator를 쓰면 `@property()`, `@state()` 같은 decorator를 class field가 아닌 auto-accessor(`@property() accessor label = ''`)에 붙여야 한다. 위 예시는 experimental decorator 설정을 전제로 한다.

## 빌드한 컴포넌트를 순수 HTML 페이지에 붙이기

프레임워크가 없는 페이지나 서버가 HTML을 그리는 백오피스에서는 빌드한 ES module을 `<script type="module">`로 불러오면 정의된 태그를 마크업에 바로 쓸 수 있다. Module script는 `defer` 없이도 기본으로 지연 실행된다([[JavaScript-ES-Modules|ES Modules]]).

- **의존성을 빼고 빌드한 경우**: 결과 파일에 `import { LitElement } from 'lit'` 같은 bare specifier가 남는다. Import map이 없으면 module specifier는 절대 URL이나 상대 URL이어야 하므로, `<script type="importmap">`의 JSON `imports`에 이름과 실제 URL을 적는다. `lit/decorators.js`처럼 하위 경로도 쓰면 끝에 `/`를 붙인 접두사 항목을 함께 두며, 이때 값도 `/`로 끝나야 한다. 가리킨 파일이 다시 다른 bare specifier를 import하면 그 이름도 map에 있어야 한다. Import map은 그 specifier를 쓰는 module script보다 먼저 선언되고 처리돼야 한다. Import map을 하나만 허용하는 브라우저 버전은 어떤 module보다도 먼저 나와야 하므로 모든 module script 앞에 둔다.
- **의존성을 포함해 빌드한 경우**: 파일 하나만 불러오면 된다. 다만 Lit 문서는 재사용 패키지를 배포할 때 번들, 압축과 최적화를 하지 말고 앱이 맡게 하라고 하며, 번들이 앱에 여러 버전의 Lit을 들일 수 있다고 설명한다. 한 페이지가 Lit을 포함한 번들 여러 개를 불러오면 번들마다 Lit 사본을 싣는다. 같은 문서는 CDN 사용을 지원하려면 CDN용 module과 운영 배포용 module을 명확히 나누라고 권한다.
- **페이지 코드와 주고받기**: 문자열 설정은 `setAttribute()`, 객체와 배열은 요소의 property에 직접 대입한다. `setAttribute()`는 값을 문자열로 바꿔 저장하므로 객체를 그대로 넘기면 `[object Object]` 같은 문자열이 된다([[Browser-DOM-Manipulation-and-Safety|attribute와 property 차이]]). Lit 컴포넌트가 속성을 `type: Object`나 `type: Array`로 선언했다면 JSON 문자열 attribute를 `JSON.parse()`로 되돌리지만, 이는 컴포넌트가 정한 변환이다. 컴포넌트가 보낸 결과는 `addEventListener()`로 받고, `CustomEvent`의 `detail`은 이벤트를 만들 때 넘긴 데이터를 그대로 돌려준다.

```html
<script type="importmap">
  { "imports": { "lit": "/vendor/lit/index.js", "lit/": "/vendor/lit/" } }
</script>
<script type="module" src="/dist/components.js"></script>

<password-input label="비밀번호"></password-input>
<script type="module">
  const input = document.querySelector('password-input');
  input.setAttribute('label', '새 비밀번호');
  input.required = true;
  input.addEventListener('value-change', (e) => {
    console.log(e.detail.value);
  });
</script>
```

예시는 `/vendor/lit/`에 다른 bare specifier가 없는 독립 빌드를 두었다고 가정한다. npm의 lit 3 패키지 파일을 그대로 복사하면 진입 파일이 `@lit/reactive-element`, `lit-html`, `lit-element`를 다시 import하므로 이 이름과 `/` 접두사 항목도 map에 넣어야 한다.

## 면접 체크포인트

- Shadow DOM이 막는 것(스타일 누수, DOM 선택자 간섭)과 막지 못하는 것(같은 페이지 스크립트의 접근)을 구분해 설명할 수 있는가.
- 디자인 토큰을 shadow DOM 안으로 전달하는 방법으로 custom property 상속과 `::part()`의 차이를 말할 수 있는가.
- React 19 전후로 웹 컴포넌트에 객체 prop을 넘기는 방식이 어떻게 달라졌는가.
- Lit의 `@property`와 `@state`를 공개 API 여부로 구분하고, 이벤트를 shadow root 밖으로 보내는 옵션을 말할 수 있는가.

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
- [Lit, Reactive properties](https://lit.dev/docs/components/properties/)
- [Lit, Lifecycle](https://lit.dev/docs/components/lifecycle/)
- [Lit, Events](https://lit.dev/docs/components/events/)
- [Lit, Decorators](https://lit.dev/docs/components/decorators/)
- [Lit, React](https://lit.dev/docs/frameworks/react/)
- [MDN, `<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) — 2026-11-18 선언 순서, JSON 형식과 접두사 항목 규칙 확인
- [MDN, `<script>`: The Script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script) — 2026-11-18 module script의 기본 지연 실행과 URL specifier 조건 확인
- [MDN, CustomEvent: detail property](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
- [Lit, Publishing](https://lit.dev/docs/tools/publishing/) — 2026-11-18 재사용 패키지의 번들 금지 권고와 CDN용 module 분리 권고 확인
- [lit 3 index.js — unpkg](https://unpkg.com/lit@3/index.js) — 2026-11-18 진입 파일의 bare specifier import 확인
- [React, Common components (custom HTML elements)](https://react.dev/reference/react-dom/components#custom-html-elements) — 2026-11-17 custom element 이벤트의 `on` 접두사 연결 확인
- [프론트 스택 1편. 웹 컴포넌트로 진행하는 이유 (Web Components vs Frameworks) — 하찮은오후](https://www.youtube.com/watch?v=h1QFZn0hqrQ) — 2026-11-01 업로드, 정리의 계기. 사실은 위 1차 출처로 대조
- [프론트 스택 2편. 개발 스택 선정: Lit과 Storybook을 선택한 이유 — 하찮은오후](https://www.youtube.com/watch?v=TEFl9Y3bFDQ) — 2026-11-04 업로드, Lit 절의 계기. 사실은 Lit 문서로 대조
- [프론트 스택 4편. Lit 기반 웹 컴포넌트 제작 실습 — 하찮은오후](https://www.youtube.com/watch?v=aidWA-QjRXk) — 2026-11-08 업로드, React 래퍼 절의 계기. 사실은 Lit 문서로 대조
- [프론트 스택 5편. HTML 및 웹 프로젝트 적용 예제 실습 — 하찮은오후](https://www.youtube.com/watch?v=Zy-H2NeA3fM) — 2026-11-11 업로드, 순수 HTML 연결 절의 계기. 사실은 MDN과 Lit 문서로 대조

## 관련 문서

- [[JS-Browser-APIs|브라우저 API]]
- [[Event-Bubbling-Capturing|DOM event 전파와 위임]] — Shadow DOM retargeting
- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작과 안전성]]
- [[React-DOM-Components|React DOM 컴포넌트]] — React의 attribute와 property 계약
- [[Storybook|Storybook]] — 컴포넌트 상태 재현, 자동 문서와 접근성 검사
