---
tags: [web, frontend, react, dom, ssr]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React legacy HTML string renderer"]
---

# React legacy HTML string renderer

## legacy는 제거와 다르다

renderToString/renderToStaticMarkup는 stream을 쓸 수 없는 환경의 제한된 API로 현재도 제공된다. React 19에서 제거한 renderToNodeStream/renderToStaticNodeStream과 구분한다. string renderer는 data loading을 기다리거나 준비되는 순서대로 content를 stream하지 않는다.

## renderToString

`renderToString(reactNode, options?)`는 HTML string을 즉시 반환한다. options의 identifierPrefix는 useId prefix이며 hydrateRoot와 같은 값이어야 한다. 서버가 만든 HTML을 client의 hydrateRoot로 interactive하게 연결할 수 있다.

```jsx
import { renderToString } from 'react-dom/server';
const html = renderToString(<App />, { identifierPrefix: 'app-' });
// client: hydrateRoot(container, <App />, { identifierPrefix: 'app-' });
```

component가 suspend하면 가장 가까운 Suspense fallback을 출력하고 data resolution을 기다리지 않는다. server data가 준비돼야 final HTML에 포함된다면 streaming SSR 또는 static prerender를 사용한다. stream을 지원하지 않는 환경에서는 제한을 이해하고 사용한다.

## renderToStaticMarkup

`renderToStaticMarkup(reactNode, options?)`도 HTML string을 반환하고 options.identifierPrefix를 받지만 결과는 **hydrate할 수 없는** non-interactive HTML이다. React로 email 또는 동작이 필요 없는 page를 만들 때 적합하다. suspend하면 즉시 fallback HTML을 출력한다.

```jsx
import { renderToStaticMarkup } from 'react-dom/server';
const emailHTML = renderToStaticMarkup(<ReceiptEmail />);
```

static이라는 이름만 보고 SSG에서 무조건 이 API를 고르지 않는다. interactive하게 hydrate할 정적 page는 prerender 계열의 결과와 bootstrap을 검토한다.

## client에서 HTML이 필요할 때

browser에 react-dom/server를 import하면 server renderer 때문에 bundle이 커질 수 있어 피한다. React output을 DOM에 렌더링하고 innerHTML을 읽을 수 있다. root.render는 즉시 DOM 완료를 보장하지 않으므로 동기 serialization이 꼭 필요한 경계에서 flushSync를 사용하고 root를 정리한다.

```jsx
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
const iconToHTML = () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  flushSync(() => root.render(<Icon />));
  const html = container.innerHTML;
  root.unmount();
  return html;
};
```

일반 render path 안에서 호출하지 않는다. HTML 문자열이 필요 없으면 JSX/DOM을 그대로 사용해 serialization을 생략한다. 출력 HTML을 다시 삽입할 때는 raw HTML의 신뢰 경계를 별도로 지킨다.

## 이해 확인

1. renderToString으로 lazy page를 생성했는데 fallback만 나오는 이유는? 즉시 string API가 suspended content를 기다리지 않는다.
2. renderToStaticMarkup의 output을 hydrateRoot에 줄 수 있는가? non-hydratable 계약이다.
3. build 시 모든 data를 기다리면서 나중 interactivity도 필요하면? prerender와 hydrateRoot를 검토한다.

## 출처

- [React DOM, renderToString](https://react.dev/reference/react-dom/server/renderToString)
- [React DOM, renderToStaticMarkup](https://react.dev/reference/react-dom/server/renderToStaticMarkup)

## 관련 문서

- [[React-DOM-Streaming-SSR]]
- [[React-DOM-Prerender]]
- [[React-DOM-Components]]
