---
tags: [web, frontend, react, dom, portal, ssr]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React portal과 browser 전용 render"]
---

# React portal과 browser 전용 render

## React DOM API 경계

`react-dom`은 DOM renderer의 portal, 동기 flush와 resource hint API를 제공한다. 앱 bootstrap은 `react-dom/client`, HTML 생성은 `react-dom/server`, 정적 사전 생성은 `react-dom/static` entry point를 사용한다. React Native renderer에 이 API를 그대로 적용하지 않는다.

React 19에서 `render`, `hydrate`, `unmountComponentAtNode`, `findDOMNode`, `renderToNodeStream`, `renderToStaticNodeStream`은 제거됐다. 각각 createRoot, hydrateRoot, root.unmount, 명시적 ref 또는 현재 server API를 사용한다. 제거된 API와 현재도 제공되는 legacy string renderer는 구분한다.

## createPortal

`createPortal(children, domNode, key?)`는 다른 DOM 위치에 배치할 React node를 반환한다. children은 JSX, Fragment, string/number, 배열 등 React가 렌더링할 값이며 domNode는 호출 때 이미 존재해야 한다. key는 선택적인 string/number다. update에서 domNode를 바꾸면 portal content가 다시 만들어진다.

```jsx
import { createPortal } from 'react-dom';
const Sidebar = ({ target }) => (
  <main>
    <p>기본 본문</p>
    {createPortal(<HelpPanel />, target, 'help')}
  </main>
);
```

portal은 DOM 위치만 바꾼다. context, state와 event 전파는 원래 React tree의 parent/child 관계를 유지한다. portal 내부 click은 DOM 조상에 없는 React parent의 onClick도 실행할 수 있다. 필요한 경우 내부에서 propagation을 막거나 portal의 React 위치를 올린다.

modal/tooltip이 overflow hidden container에서 잘리면 portal로 DOM container 바깥에 표시할 수 있다. 하지만 portal 자체가 접근 가능한 modal을 만들지는 않는다. focus 진입/복귀, keyboard 이동, dialog 의미와 배경의 상호작용을 별도로 관리한다. native dialog나 기존 접근성 component가 필요를 만족하면 해당 기능을 우선한다.

## 외부 markup와 widget의 container

서버가 만든 비-React sidebar와 본문이 따로 있어도 portal을 쓰면 하나의 React tree로 state/context를 공유할 수 있다. 독립 roots는 같은 shared tree가 아니다.

외부 map widget이 생성한 popup node에도 portal을 넣을 수 있다. widget 생성은 Effect에서 하고 target node가 확보된 뒤 state로 저장해 다음 render에 portal을 포함한다.

```jsx
const [popupNode, setPopupNode] = useState(null);
// widget의 실제 설치/제거는 Effect의 setup/cleanup에서 수행한다.
return <>
  <div ref={mapContainerRef} />
  {popupNode && createPortal(<PopupContent />, popupNode)}
</>;
```

portal은 React를 실제 외부 DOM node의 owner로 만드는 경계다. widget cleanup, popup 제거, React children 갱신 책임이 충돌하지 않게 한다. target이 null인 채 createPortal을 호출하지 않는다.

## browser

2026-10-01 v19.3 reference에 공개된 `browser(reason?)`는 opaque value를 반환한다. component에서 `use(browser())`로 읽으면 server rendering을 중단해 가장 가까운 Suspense fallback을 남기고 browser에서는 undefined로 반환해 정상 rendering을 계속한다. browser API를 사용하는 Client Component가 대상이며 Server Component에서 호출하지 않는다.

```jsx
import { Suspense, use, useState } from 'react';
import { browser } from 'react-dom';

const LocalDraft = () => {
  use(browser('localStorage의 초안이 필요함'));
  const [draft] = useState(() => localStorage.getItem('draft') ?? '');
  return <p>{draft}</p>;
};
const App = () => <Suspense fallback={<p>초안 준비 중</p>}>
  <LocalDraft />
</Suspense>;
```

server에서는 Suspense 경계가 필수이며 없으면 render가 실패한다. browser()만 호출하면 아무 효과가 없고 반환값을 throw하지 않는다. `use`와 같이 conditional/early return 이후 호출할 수 있어 기본 server data가 있을 때는 SSR하고 없을 때만 browser로 넘기는 custom Hook을 만들 수 있다.

reason은 선택적인 string 또는 function이다. 서버 renderer가 opaque value를 만날 때마다 reason function을 호출하며 browser에서는 호출하지 않는다. string/function 반환값은 bailout error의 `cause`가 된다. stack이 필요하고 생성 비용을 browser에서 피하려면 `() => new Error(...)`를 전달한다. reason은 HTML에 직렬화하지 않는다.

## intentional bailout과 abort

`onBrowserBailout(error, errorInfo)`는 browser 전용 content를 Suspense fallback으로 넘긴 상황을 기록한다. errorInfo에는 componentStack이 있다. 의도적인 bailout은 server onError나 hydrateRoot onRecoverableError를 호출하지 않는다. Suspense 경계가 없어 실패하면 일반 error callback으로 보고한다.

```jsx
const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() { pipe(response); },
  onBrowserBailout(error, info) {
    console.log({ cause: error.cause, componentStack: info.componentStack });
  },
});
// 외부 deadline 정책에서 호출한다.
const stopWaiting = () => abort(browser('server render 시간 초과'));
```

AbortSignal 기반 renderer에는 `controller.abort(browser(reason))`를 전달할 수 있다. unfinished Suspense boundary를 browser가 완성하도록 넘기며 각 recovered boundary를 onBrowserBailout으로 보고한다. ordinary abort/error와 의도적인 browser bailout의 관측 경로를 섞지 않는다.

browser API의 현재 reference에는 Canary/Experimental banner가 없고 v19.3.0 ReactDOM export에서도 확인된다. 예제의 Canary package pin만으로 API 전체를 Canary라고 판정하지 않는다. 기존 React 버전에서 무조건 사용할 수 있다는 뜻은 아니므로 설치 버전과 framework renderer를 확인한다.

## 이해 확인

1. portal에 들어간 child가 parent context를 잃는가? DOM 위치만 바뀌어 React tree의 context를 유지한다.
2. browser()를 throw하면 되는가? 아니다. component에서는 use로 소비한다.
3. intentional bailout을 onError에서 못 찾는 이유는? onBrowserBailout이 별도 관측 경로다.

## 출처

- [React DOM, APIs](https://react.dev/reference/react-dom)
- [React DOM, createPortal](https://react.dev/reference/react-dom/createPortal)
- [React DOM, browser](https://react.dev/reference/react-dom/browser)

- [React, ReactDOM exports v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/shared/ReactDOM.js)

## 관련 문서

- [[React-Refs-and-DOM]]
- [[React-DOM-Client-Roots]]
- [[React-DOM-Streaming-SSR]]
