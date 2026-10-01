---
tags: [web, frontend, react, dom, ssr, ssg]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React static prerender"]
---

# React static prerender

## static entry point와 생성 시점

`react-dom/static`은 Suspense data를 기다린 뒤 HTML을 만드는 사전 생성 API다. server streaming SSR이 shell부터 전송하는 것과 달리 전체 rendering을 기다렸다가 결과 stream을 받는다. stream 타입 반환이 progressive rendering을 의미하지 않는다. data source는 use/lazy/framework처럼 rendering을 suspend해야 하며 Effect/event fetch는 기다리지 않는다.

| runtime | API | 반환 prelude |
|---|---|---|
| Web Streams | `prerender` | Web ReadableStream |
| Node.js Streams | `prerenderToNodeStream` | Node Readable |

Node에서도 Web API를 제공하지만 현재 reference는 Node 전용 API를 성능상 권장한다. 이 API의 static HTML은 bootstrap script와 hydrateRoot를 사용해 interactive하게 만들 수 있다. [[React-DOM-Legacy-Server-Rendering#renderToStaticMarkup]]의 non-hydratable 결과와 구분한다.

## prerender

`await prerender(reactNode, options?)`는 성공 시 `{ prelude, postponed }`, 실패 시 reject다. reactNode는 전체 html document의 JSX가 보통이다. prelude는 생성된 HTML의 Web Stream이고 postponed는 미완료 rendering을 이어갈 JSON-serializable opaque object다. 모두 끝났으면 postponed는 null이다.

```jsx
import { prerender } from 'react-dom/static';
const generatePage = async () => {
  const { prelude, postponed } = await prerender(<App />, {
    bootstrapScripts: ['/main.js'],
  });
  return { html: await new Response(prelude).text(), postponed };
};
```

Web Stream을 string으로 모을 때 `new Response(prelude).text()`는 chunk 사이 UTF-8 code point를 올바르게 decode한다. 직접 reader를 쓴다면 `TextDecoder`의 streaming mode와 마지막 flush를 사용한다. 각 byte chunk를 독립적으로 UTF-8 변환하면 한글 등 문자가 split된 경계에서 손상될 수 있다.

## prerenderToNodeStream

`await prerenderToNodeStream(reactNode, options?)`도 `{ prelude, postponed }`를 반환하지만 prelude는 Node Readable이다. 생성이 완료된 결과를 파일, response 등의 writable로 pipe할 수 있다.

```jsx
import { prerenderToNodeStream } from 'react-dom/static';
import { pipeline } from 'node:stream/promises';
const generatePage = async writable => {
  const { prelude, postponed } = await prerenderToNodeStream(<App />, {
    bootstrapScripts: ['/main.js'],
  });
  await pipeline(prelude, writable);
  return postponed;
};
```

HTTP로 HTML을 전송할 때는 `Content-Type: text/html; charset=utf-8`을 사용한다. string이 필요하면 `prelude.setEncoding('utf8')` 뒤 async iteration으로 모을 수 있다. pipeline은 writable completion/error를 다루므로 prelude 생성 완료와 실제 전송 완료를 구분한다.

## prerender 옵션

두 API는 다음 static generation options를 지원한다.

| option | 계약 |
|---|---|
| `bootstrapScripts` | client bootstrap script URL 배열 |
| `bootstrapModules` | module bootstrap URL 배열 |
| `bootstrapScriptContent` | inline script content |
| `identifierPrefix` | useId prefix, hydration에서도 동일 |
| `namespaceURI` | HTML 기본 또는 SVG/MathML root |
| `importMap` | imports/scopes, module script 전에 출력 |
| `onHeaders` | Node Link descriptor 또는 Web Headers를 Link/103 Early Hints로 전달 |
| `maxHeadersLength` | header 내용 상한, 기본 2000 UTF-16 code units |
| `progressiveChunkSize` | HTML chunk byte 크기 |
| `signal` | AbortSignal, 사전 생성을 중단하고 미완료 상태 보존 |
| `onError` | server 오류 관측 |
| `onBrowserBailout` | browser()로 의도적으로 browser에 넘긴 경계 관측 |

static reference에서는 importMap에 streaming reference와 같은 Canary badge가 표시되지 않는다. 동일 renderer의 option이므로 설치 package와 framework 지원 여부를 확인하고 이 표만으로 채널 차이를 확정하지 않는다. v19.3.0 구현에서 Node static onHeaders는 `{ Link: ... }` descriptor이고 Web static은 Headers instance다. Node static reference에 있는 Headers 설명은 구현과 달라 구분해 사용한다.

**nonce는 prerender 옵션이 아니다.** CSP nonce는 요청마다 고유해야 하는데 미리 생성해 cache할 HTML에 동일 nonce를 넣으면 안전하지 않다. request 시 resume 단계에 nonce를 적용하는 설계와 실제 script 배치를 함께 확인한다.

## Suspense data 완료를 기다리기

```jsx
const Page = () => (
  <Layout>
    <Cover />
    <Suspense fallback={<PostsSkeleton />}><Posts /></Suspense>
  </Layout>
);
```

Posts가 Suspense source를 읽는 동안 prerender 결과 Promise는 기다린다. rendering 결과를 즉시 string으로 만드는 renderToString과 달리 최종 posts HTML이 prelude에 들어갈 수 있다. 사전 생성 중 대기시간이 길면 build/request 정책에서 timeout, 실패와 재시도를 결정한다. stream이 시작되지 않는다고 SSR용 onShellReady를 추가하는 것은 목적이 다르다.

## abort와 partial prerender

```jsx
const controller = new AbortController();
const result = prerender(<App />, { signal: controller.signal });
// build deadline 등 실제 정책에서 호출할 중단 함수다.
const stopWaiting = () => controller.abort();
const { prelude, postponed } = await result;
```

중단 시 이미 생성된 HTML은 prelude에 있고 unfinished Suspense boundary는 fallback으로 남을 수 있다. postponed가 있는 결과는 나중에 [[React-DOM-Resume#resume]] 또는 resumeAndPrerender 계열로 이어갈 수 있다. ordinary fatal shell failure/reject와 정상적으로 보존된 partial result를 같은 성공으로 처리하지 않는다.

prelude와 postponed는 같은 generation 결과로 저장한다. postponed는 opaque object라 내부 field를 수정하거나 별도 schema로 변환하지 않는다. build asset map, 초기 props와 document tree 역시 다음 단계와 같아야 한다. final HTML에 필요한 사용자별 data를 정적 결과에 섞어 다른 사용자에게 cache하지 않도록 request-dependent 경계를 분리한다.

## troubleshooting과 이해 확인

1. 전체 app을 기다린 뒤 stream이 나오는 것은 오류인가? static 생성의 계약이다. progressive response가 필요하면 streaming SSR을 사용한다.
2. prelude가 string이 아닌 이유는? Web/Node Stream으로 읽거나 전송할 수 있는 결과다.
3. postponed가 null이면 resume가 필요한가? 모두 완료된 결과이므로 필요 없다.
4. HTML과 postponed의 서로 다른 build 결과를 섞어도 되는가? tree/asset/상태 계약이 달라져 이어갈 근거가 없다.
5. cache할 HTML에 request nonce를 미리 넣을 수 있는가? nonce를 정적 결과에 재사용하지 않는다.

## 출처

- [React DOM, Static APIs](https://react.dev/reference/react-dom/static)
- [React DOM, prerender](https://react.dev/reference/react-dom/static/prerender)
- [React DOM, prerenderToNodeStream](https://react.dev/reference/react-dom/static/prerenderToNodeStream)

- [React, ReactDOMFizzStaticNode v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/server/ReactDOMFizzStaticNode.js)

## 관련 문서

- [[React-DOM-Streaming-SSR]]
- [[React-DOM-Resume]]
- [[React-DOM-Client-Roots]]
