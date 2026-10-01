---
tags: [web, frontend, react, dom, performance, resource]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM resource hint API"]
---

# React DOM resource hint API

## hint 선택과 실행 부작용

resource hint는 다운로드나 연결을 앞당기는 제안이다. browser가 반드시 실행하거나 완료하는 Promise가 아니며 모든 API는 반환값을 사용하지 않는다. framework가 이미 resource loading을 관리하면 같은 일을 추가하기 전에 실제 네트워크 병목을 확인한다.

| 알고 있는 것 | API | 시작할 작업 |
|---|---|---|
| host 후보만 있음 | `prefetchDNS` | DNS 조회 |
| 요청할 host가 확실함 | `preconnect` | 연결 준비 |
| resource URL은 알고 실행/적용은 나중 | `preload` | fetch |
| ESM URL, 실행은 나중 | `preloadModule` | module fetch |
| script/style을 지금 준비하고 적용해도 됨 | `preinit` | fetch 후 script 실행/style 삽입 |
| ESM을 지금 실행해도 됨 | `preinitModule` | module fetch/evaluate |

browser에서는 render, Effect, event 등에서 호출할 수 있다. SSR/RSC에서는 component render 또는 그 render에서 시작한 async context에서 호출해야 하고 다른 호출은 무시된다. arbitrary network 요청을 render에 허용하는 일반 규칙이 아니라 React가 관리하는 resource hint API의 특별한 계약이다.

## prefetchDNS

`prefetchDNS(href)`는 서버 URL string을 받아 해당 domain의 IP 조회를 제안한다. 같은 서버를 반복 호출해도 한 번과 같은 효과다. 현재 문서 host는 이미 조회되어 이득이 없다. 많은 후보 domain에 대한 speculative 준비라면 전체 preconnection 비용보다 DNS만 준비하는 방식이 유리할 수 있다.

```jsx
import { prefetchDNS } from 'react-dom';
const CheckoutButton = () => <button onClick={() => {
  prefetchDNS('https://payments.example.com');
  openCheckout();
}}>결제 시작</button>;
```

## preconnect

`preconnect(href, options?)`는 서버 URL string을 받아 연결 준비를 제안한다. 동일 server 반복은 deduplicate하고 현재 문서 host에는 이득이 없다. 이미 구체 URL을 알면 preload/preinit이 필요한 resource 자체를 가져오기 시작할 수 있다. 서버 후보 전부에 preconnect를 호출하면 사용하지 않을 연결 비용이 커질 수 있다. v19.3.0 구현은 선택적인 `{ crossOrigin }`도 받아 CORS 연결 정책을 맞출 수 있다. DNS 조회에는 crossOrigin option을 쓰지 않는다.

```jsx
preconnect('https://images.example.com');
```

## preload

`preload(href, options)`의 href는 resource URL이며 `options.as`는 필수다. audio/document/embed/fetch/font/image/object/script/style/track/video/worker 중 resource 목적과 일치시킨다. 가져오기만 앞당기며 script 실행이나 stylesheet 적용을 즉시 시작하는 preinit과 구분한다.

| option | 의미 |
|---|---|
| `crossOrigin` | anonymous/use-credentials, as fetch에는 필요 |
| `referrerPolicy` | 요청의 Referer 정책 |
| `integrity` | SRI hash |
| `type` | MIME type |
| `nonce` | CSP nonce |
| `fetchPriority` | auto/high/low |
| `imageSrcSet`, `imageSizes` | as image일 때 반응형 후보와 layout 크기 |

```jsx
preload('/hero.jpg', {
  as: 'image',
  imageSrcSet: '/hero-small.jpg 512w, /hero-large.jpg 1024w',
  imageSizes: '(max-width: 512px) 512px, 1024px',
});
preload('/font.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
preload('/app.css', { as: 'style' });
```

일반 resource는 같은 href, image는 같은 href/imageSrcSet/imageSizes일 때 equivalent call로 취급한다. 반응형 img의 srcSet/sizes와 hint를 맞추지 않으면 잘못된 크기를 추가로 요청할 수 있다. stylesheet 안에 필요한 font URL을 알고 있다면 CSS parsing을 기다리지 않고 font도 함께 hint할 수 있다.

## preloadModule

`preloadModule(href, options?)`는 ESM URL을 받는다. reference 예제는 `as: 'script'`를 명시하지만 v19.3.0 구현은 options와 as 생략도 지원한다. `crossOrigin`, `integrity`, `nonce`를 지정할 수 있고 같은 href 반복은 한 번과 같다. 일반 classic script는 preload를 사용한다. 다운로드 준비가 평가/실행 완료를 뜻하지 않는다.

```jsx
preloadModule('/editor.js', { as: 'script' });
```

## preinit

`preinit(href, options)`는 script 또는 stylesheet를 가져와 바로 실행/적용하는 경계다. `as`는 `'script'`/`'style'`; stylesheet ordering을 명시하려면 `precedence`를 지정한다. reference는 필수로 설명하지만 v19.3.0 구현은 생략도 허용하므로 API validation 필수 조건으로 단정하지 않는다. `crossOrigin`, `integrity`, `nonce`, `fetchPriority`도 지원한다. 같은 href의 반복은 deduplicate된다.

```jsx
preinit('/editor.css', { as: 'style', precedence: 'components' });
preinit('/analytics.js', { as: 'script' });
```

stylesheet precedence는 [[React-DOM-Resources-and-Metadata#link와 stylesheet precedence]]처럼 발견 순서의 group이다. reset/low/medium/high는 사용할 수 있는 이름 예시이지 임의 string을 막는 validation enum으로 설계하지 않는다. href가 같은 resource에 다른 정책을 나중 전달해 최초 로딩을 다시 구성한다고 기대하지 않는다.

preinit script는 다운로드 뒤 즉시 실행되므로 클릭 전에 실행하면 추적/연결 등 부작용도 일찍 시작한다. 나중 실행해야 하면 preload, ESM이면 아래 API를 고른다.

## preinitModule

`preinitModule(href, options?)`는 `as: 'script'`, `crossOrigin`, `integrity`, `nonce`를 받는다. v19.3.0 구현에서 options/as를 생략하면 script로 처리한다. module을 다운로드한 뒤 evaluate하며 같은 href 반복은 deduplicate한다. 다운로드만 필요하면 preloadModule, classic script/style이면 preinit이다.

```jsx
const StartEditor = () => <button onClick={() => {
  preinitModule('/editor.js', { as: 'script' });
  showEditor();
}}>편집 열기</button>;
```

hint API의 반환은 undefined이며 awaiting해서 SDK 준비를 보장할 수 없다. 실제 resource readiness는 resource loader/module import가 제공하는 계약을 사용한다.

## 이해 확인

1. preload 뒤 script global을 바로 호출하면 왜 실패할 수 있는가? 다운로드 hint이며 실행 완료 계약이 아니다.
2. 많은 후보 서버에 preconnect를 거는 대신 무엇을 비교하는가? prefetchDNS 비용과 실제 연결 사용률이다.
3. SSR handler 밖에서 preload를 호출했는데 hint가 안 나오는 이유는? React render async context 밖 호출은 무시된다.
4. stylesheet를 fetch만 하고 적용은 늦추려면? preload를 선택하고 preinit을 쓰지 않는다.

## 출처

- [React DOM, prefetchDNS](https://react.dev/reference/react-dom/prefetchDNS)
- [React DOM, preconnect](https://react.dev/reference/react-dom/preconnect)
- [React DOM, preload](https://react.dev/reference/react-dom/preload)
- [React DOM, preloadModule](https://react.dev/reference/react-dom/preloadModule)
- [React DOM, preinit](https://react.dev/reference/react-dom/preinit)
- [React DOM, preinitModule](https://react.dev/reference/react-dom/preinitModule)

- [React, ReactDOMFloat v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/shared/ReactDOMFloat.js)

## 관련 문서

- [[React-DOM-Resources-and-Metadata]]
- [[React-DOM-Streaming-SSR]]
