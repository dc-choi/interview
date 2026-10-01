---
tags: [web, frontend, react, dom, resource, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM resource와 metadata"]
---

# React DOM resource와 metadata

## document head와 resource 소유권

resource/metadata component는 JSX에서의 위치와 실제 DOM 위치가 다를 수 있다. React 19의 head 이동, resource 중복 제거와 stylesheet 준비 처리를 이해하고 사용한다. 외부 script는 준비되기 전에 component가 commit될 수 있으므로 stylesheet와 같은 Suspense 계약이라고 가정하지 않는다.

| component | 특수 처리 조건 | 중복/수명 |
|---|---|---|
| `title` | document title이며 SVG 내부/itemProp가 아님 | 동시에 하나만 렌더링 |
| `meta` | itemProp 없음 | document head로 이동 |
| 일반 `link` | itemProp와 load/error handler 없음 | document head로 이동 |
| stylesheet `link` | `rel="stylesheet"`, `precedence`, onLoad/onError/disabled 없음 | href로 중복 제거, 로딩 중 suspend |
| `style` | `href`, `precedence` | href로 중복 제거/순서 지정, inline 내용은 로딩 suspend 없음 |
| 외부 `script` | `src`, `async={true}`, 수동 load/error 관리 없음 | src로 중복 제거, head 이동 |

특수 관리되는 stylesheet/script/style은 렌더링 뒤 prop 변경이 무시되고 development에서 경고할 수 있다. component가 unmount되어도 resource DOM이 남을 수 있으므로 local component 수명과 resource의 전역 수명을 같다고 가정하지 않는다.

## img

`src`는 URL, `alt`는 대체 text이며 장식 이미지는 `alt=""`로 둔다. `width`/`height`를 알면 공간을 먼저 확보해 layout shift를 줄인다. `srcSet`/`sizes`는 viewport와 layout에 맞는 후보 선택에 사용한다. `crossOrigin`, `referrerPolicy`, `useMap`, `onLoad`, `onError`도 지원한다.

- `loading`: `'eager'` 기본 또는 `'lazy'`.
- `fetchPriority`: `'auto'` 기본, `'high'`, `'low'`의 상대 힌트.
- `decoding`: `'auto'` 기본, `'async'`, `'sync'`로 다른 content 표시와 decode 관계를 제안한다.

`src=""`는 현재 페이지를 다시 요청할 수 있어 React가 development에서 경고하고 attribute를 생략한다. 이미지가 없으면 tag를 생략하거나 `src={null}`로 둔다. img는 children과 dangerouslySetInnerHTML을 허용하지 않는다.

```jsx
const ProductImages = () => <>
  <img src="/hero.jpg" alt="대표 상품" width={800} height={600} />
  <img src="/detail.jpg" alt="상품 상세" loading="lazy" />
  <img src="/related.jpg" alt="관련 상품" fetchPriority="low" />
</>;
```

server rendering은 기본적으로 img의 preload hint를 만든다. `loading="lazy"`, `fetchPriority="low"`, picture/noscript 내부, data URL src/srcSet은 자동 preload 대상에서 빠진다. framework image component가 lazy를 기본으로 추가할 수도 있으므로 실제 underlying img prop를 확인한다. 힌트는 link element 또는 Link response header로 나갈 수 있고 명시적인 hint는 [[React-DOM-Resource-Hints#preload]]로 만든다.

client `<ViewTransition>` update에서는 새 이미지 또는 src/srcSet이 바뀐 이미지를 load/decode까지 기다릴 수 있다. subtree 내부, non-empty src이고 lazy/onLoad opt-out이 없을 때의 동작이다. synchronous update에는 기다리지 않는다. streamed Suspense reveal의 visible image에도 기다림이 있으며 timeout으로 무한 대기를 피한다. `fetchPriority="low"`는 server preload를 막지만 이 client 대기를 막지는 않는다. `loading="lazy"` 또는 `onLoad`는 client opt-out이다. ViewTransition의 채널/애니메이션 계약은 해당 component 문서를 따른다.

## link와 stylesheet precedence

`rel`은 필수 관계 문자열이고 `href`는 resource URL이다. icon/apple-touch-icon은 `sizes`, preload/modulepreload는 `as`와 image의 `imageSrcSet`/`imageSizes`를 사용한다. 공통 resource 설정은 `crossOrigin`(fetch preload에는 필요), `referrerPolicy`, `fetchPriority`, `hrefLang`, `integrity`, `type`이다.

```jsx
const Page = () => <>
  <link rel="icon" href="/icon.png" />
  <link rel="canonical" href="https://example.com/articles/react" />
  <link rel="stylesheet" href="/base.css" precedence="base" />
  <link rel="stylesheet" href="/page.css" precedence="page" />
  <main>본문</main>
</>;
```

precedence string은 우선순위 enum이 아니다. 처음 발견한 값이 낮고 나중 발견한 값이 높은 group이며 같은 값의 link/style/preinit stylesheet를 함께 둔다. CSS의 specificity 등 다른 cascade 규칙도 적용된다. href가 같은 stylesheet는 한 link로 deduplicate한다.

`media`는 media query, `title`은 alternative stylesheet 이름이다. `disabled`, `onLoad`, `onError`는 자동 stylesheet 처리를 끄므로 수동 수명 관리가 필요하다. precedence가 없는 stylesheet도 자동 처리 대상이 아니다. `itemProp` link는 특정 item metadata라 현재 위치에 남는다. `blocking="render"`로 전체 표시를 막기보다 React의 Suspense 경계를 검토한다.

## style

`children`은 필수 CSS string이고 `href`는 실제 다운로드 URL을 요구하는 값이 아니라 중복 제거 identity다. `precedence`는 stylesheet ordering에 참여한다. `media`, `nonce`, `title`도 일반 prop로 지원하지만 precedence 특수 처리에서는 추가 prop가 제한될 수 있으므로 기대한 attribute를 확인한다.

```jsx
const Badge = () => <>
  <style href="badge-v1" precedence="components">{
    '.badge { border-radius: 4px; padding: 4px; }'
  }</style>
  <span className="badge">새 항목</span>
</>;
```

inline style sheet는 font/image URL을 포함해도 그 resource 로딩 때문에 Suspense fallback을 보여주지 않는다. CSS rule 변경마다 같은 href를 재사용하면 최초 resource와 충돌하므로 identity와 불변 내용을 맞춘다.

## script

inline이면 JavaScript source string `children`, 외부면 `src` 중 하나를 지정한다. inline은 head로 이동하거나 deduplicate하지 않는다. `type`은 classic/module/importmap, `noModule`은 module 지원 browser용 legacy fallback을 구분한다. `nonce`는 CSP 허용 값, `integrity`는 SRI, `crossOrigin`, `fetchPriority`, `referrerPolicy`는 요청 정책이다.

```jsx
<script async src="/analytics.js" />
<script nonce={nonce}>{'window.appReady = true;'}</script>
```

async script는 다운로드를 병렬로 시작하고 준비되면 실행한다. document parse 완료 뒤 순서대로 실행하는 defer와 같지 않으며 async script 사이의 실행 순서를 보장하지 않는다. React streaming에서는 `defer`보다 async를 권장하지만 서로 의존하는 script에 async를 붙이면 dependency 순서를 별도로 해결해야 한다.

위 inline script 예시는 서버 HTML을 browser가 파싱하는 실행 문맥으로 읽는다. React 19.3의 client mount로 만든 일반 `<script>`는 inert하며, DOM에 tag가 있어도 inline JavaScript가 실행되지 않는다. `src`와 `async`를 갖고 React의 resource 처리 대상이 되는 외부 script와 구분한다.

`onLoad`/`onError`를 주면 자동 script resource 처리에서 제외된다. 이 외부 script를 client에서 새로 mount하면 일반 inert script 생성 경로가 되어, 단순히 callback을 기다려도 SDK가 로드되지 않을 수 있다. client SDK는 framework가 지원하는 script component나 명시적인 DOM loader를 사용하고 준비, 중복 로드와 cleanup을 관리한다. 이벤트 없이 같은 src+async script를 여러 번 렌더링하면 하나로 관리한다. 준비를 앞당겨도 되는 script는 [[React-DOM-Resource-Hints#preinit]]을 사용할 수 있다.

## meta와 title

meta는 `name`, `charSet`, `httpEquiv`, `itemProp` 중 의미에 맞는 하나를 지정한다. charSet은 UTF-8 선언이고 name/itemProp/httpEquiv의 실제 값은 `content`로 전달한다. itemProp는 document 전체가 아니라 특정 item을 설명하므로 head 이동을 하지 않는다.

```jsx
const Article = ({ page }) => <>
  <title>{`게시글 목록 ${page}`}</title>
  <meta name="description" content="React 지식 문서 목록" />
  <article itemScope>
    <meta itemProp="description" content="React DOM 계약" />
    본문
  </article>
</>;
```

title children은 하나의 text 값이어야 한다. `<title>목록 {page}</title>`는 text와 number 배열이 되므로 interpolation으로 single string을 만든다. text만 반환하는 component도 가능하다. title이 SVG 안에 있으면 그래픽 접근성 이름이며 document title 이동을 하지 않는다. itemProp title도 해당 item 위치에 남는다. 동시에 여러 document title을 렌더링하면 browser/search engine 동작을 보장할 수 없다.

## 이해 확인

1. lazy image와 low-priority image가 같지 않은 이유는? lazy는 근처까지 요청을 미룰 수 있고 low는 상대 fetch priority다.
2. base/high라는 이름만으로 precedence 순서가 정해지는가? 처음 발견한 group 순서가 기준이다.
3. inline CSS의 font 로딩을 Suspense가 기다리는가? inline stylesheet는 그 로딩을 suspend하지 않는다.
4. script가 render됐는데 SDK가 undefined인 이유는? 일반 client mount script는 inert일 수 있고, resource script도 commit과 loading/execution 완료는 별개다.
5. title interpolation과 두 child 조각의 차이는? title은 single text value가 필요하다.

## 출처

- [React DOM, img](https://react.dev/reference/react-dom/components/img)
- [React DOM, link](https://react.dev/reference/react-dom/components/link)
- [React DOM, style](https://react.dev/reference/react-dom/components/style)
- [React DOM, script](https://react.dev/reference/react-dom/components/script)
- [React, ReactFiberConfigDOM v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js)
- [React DOM, meta](https://react.dev/reference/react-dom/components/meta)
- [React DOM, title](https://react.dev/reference/react-dom/components/title)

- [MDN, script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [React, possibleStandardNames v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/shared/possibleStandardNames.js)

## 관련 문서

- [[React-DOM-Resource-Hints]]
- [[React-DOM-Components]]
- [[React-DOM-Streaming-SSR]]
