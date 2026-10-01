---
tags: [web, frontend, react, dom]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM component와 공통 prop"]
---

# React DOM component와 공통 prop

## built-in HTML과 SVG

React DOM은 웹의 HTML과 SVG element를 JSX로 지원한다. `div`, `button`, `audio`, `video`, `dialog`, `details`, `canvas`와 `svg`, `path`, `circle`, `foreignObject` 등 browser element를 사용할 수 있다. React Native의 native component와는 다른 renderer 계약이다.

일반 HTML/SVG prop는 DOM property 이름에 맞춘 camelCase가 기본이다. `class`는 `className`, `for`는 `htmlFor`, `tabindex`는 `tabIndex`로 쓴다. `aria-*`, `data-*`는 HTML 표기를 그대로 유지한다. SVG의 namespace attribute는 colon 대신 `xlinkHref`, `xmlLang`, `xmlnsXlink`처럼 쓴다. JSX로 변환했다고 해당 browser의 element/API 지원까지 생기는 것은 아니다.

form control은 [[React-DOM-Form-Controls]], form action은 [[React-DOM-Form-Actions]], resource와 metadata의 head 이동은 [[React-DOM-Resources-and-Metadata]]를 따른다.

## 공통 prop 계약

| prop | 값과 의미 | 주의 |
|---|---|---|
| `children` | element, string, number, portal, 빈 node, 이들의 배열 | void element는 children을 받을 수 없다 |
| `ref` | object ref 또는 callback ref, commit에서 DOM node 연결 | [[React-Refs-and-DOM#목록 ref와 callback cleanup]] |
| `dangerouslySetInnerHTML` | `{ __html: string 또는 TrustedHTML }` | children과 함께 쓸 수 없다 |
| `style` | CSS property object | 이름은 camelCase, number는 unitless property 외에는 px |
| `suppressContentEditableWarning` | boolean | 수동으로 contentEditable 내용을 소유하는 편집기 경계에서만 사용 |
| `suppressHydrationWarning` | boolean | 한 level의 불가피한 mismatch 경고만 억제 |

`contentEditable`에 React children까지 두면 사용자의 DOM 편집과 React commit이 경쟁한다. 경고를 숨기는 prop가 충돌을 해결하지는 않는다. hydration 억제 역시 서버/client 출력 불일치를 고치는 도구가 아니다.

표준 global prop도 지원한다. 식별/연결은 `id`, `htmlFor`, `slot`, `is`, 접근성과 표시 상태는 `role`, `aria-*`, `hidden`, `tabIndex`, `title`, 언어는 `lang`, `dir`, `translate`, 입력 힌트는 `autoCapitalize`, `inputMode`, `enterKeyHint`, `spellCheck`, drag는 `draggable`, structured data는 `itemProp` 등을 사용한다. `accessKey`는 기존 keyboard shortcut과 충돌할 수 있어 신중히 쓴다. `tabIndex`는 보통 `0` 또는 `-1`로 제한한다.

추가 custom attribute는 lowercase이며 `on`으로 시작하지 않는 이름에 문자열로 전달한다. `null`이나 `undefined`면 attribute를 제거한다. 표준 event와 custom element event는 임의 attribute와 별개의 계약이다.

## className과 동적 style

고정된 규칙은 CSS class에, 데이터에서 계산되는 값은 `style`에 둔다. React가 CSS 파일을 import하거나 배포하는 방식을 강제하지는 않는다.

```jsx
const Avatar = ({ size, selected }) => (
  <img
    src="/avatar.png" alt="사용자 프로필"
    className={selected ? 'avatar selected' : 'avatar'}
    style={{ width: size, height: size }}
  />
);
```

`style={{}}`는 별도 문법이 아니라 JSX expression 안의 JavaScript object다. 조건부 class가 짧으면 문자열을 직접 만든다. 여러 조건을 공유하는 기존 class helper가 있다면 재사용할 수 있다.

## raw HTML과 Trusted Types

JSX text는 markup 문자열을 화면의 text로 처리한다. 실제 HTML을 삽입하려면 명시적인 `dangerouslySetInnerHTML` 경계를 통과해야 한다. 저장소나 API에서 온 HTML이라고 신뢰할 수 있는 것은 아니다. 타인의 입력으로 `<img onerror=...>` 같은 markup를 만들면 XSS가 생길 수 있다.

```jsx
// sanitizedHTML은 검증된 sanitizer 또는 trusted policy의 출력이다.
const markup = { __html: sanitizedHTML };
return <article dangerouslySetInnerHTML={markup} />;
```

`{ __html }` object는 HTML을 생성하는 경계 가까이에서 만든다. Trusted Types를 강제하는 사이트에서는 policy가 만든 `TrustedHTML`을 그대로 전달할 수 있다. React가 문자열로 강제 변환하지 않지만 policy 자체가 입력을 신뢰/정제할 책임은 남는다. Markdown parser를 쓴다는 사실만으로 남의 HTML이 안전해지는 것은 아니다.

## custom element의 attribute와 property

`<my-element>`처럼 dash가 있는 tag, 또는 built-in element의 `is` prop는 custom element로 취급한다. attribute는 markup에 보이는 string이고 property는 JavaScript 값이다. React는 기본적으로 JSX 값을 attribute로 전달하여 배열 등은 문자열로 직렬화한다. construction 때 element에 존재하는 property는 임의 JavaScript 값을 전달할 대상으로 인식한다.

```jsx
class TagList extends HTMLElement {
  constructor() {
    super();
    this.items = undefined;
  }
  connectedCallback() {
    this.textContent = this.items.join(', ');
  }
}
customElements.define('tag-list', TagList);
// React가 property를 인식하므로 배열을 문자열로 잃지 않는다.
const Example = () => <tag-list items={['react', 'dom']} />;
```

custom element가 `CustomEvent`를 보내면 `on` prefix로 받는다. 이름은 case-sensitive이며 dash를 보존한다. `onsay-hi`와 `onsayHi`는 다른 event다. handler에서 `event.detail`을 읽고, custom element 자체가 붙인 browser listener는 해당 element의 lifecycle에서 정리한다.

## 이해 확인

1. `style={{ width: 100, opacity: 0.5 }}`에서 단위가 달라지는 이유는? width는 px가 붙고 opacity는 unitless다.
2. array를 custom element에 넘겼는데 `a,b`라는 문자열이 됐다면 무엇을 확인하는가? construction 때 같은 이름의 property가 존재하는지 확인한다.
3. hydration 경고를 숨겼는데 DOM이 이상한 이유는? 경고 억제는 출력 일치나 DOM 보정을 보장하지 않는다.

## 출처

- [React DOM, Components](https://react.dev/reference/react-dom/components)
- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)

## 관련 문서

- [[React-DOM-Events]]
- [[React-Components-and-JSX]]
- [[React-Refs-and-DOM]]
