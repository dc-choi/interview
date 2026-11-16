---
tags: [web, frontend, react, dom, ssr, streaming]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM streaming SSR"]
---

# React DOM streaming SSR

## server API와 shell

`react-dom/server`는 React tree를 HTML로 렌더링한다. 서버/빌드의 최상위에서 사용하며 보통 framework가 호출한다. SSR은 HTML 생성 시점과 전송을 다루는 계약이며 Server Components의 module 실행 경계와 같은 개념이 아니다.

Node.js에서는 `renderToPipeableStream`, Web Streams 기반 runtime에서는 `renderToReadableStream`을 쓴다. Node에서도 Web Stream API를 제공하지만 공식 overview는 성능 때문에 Node 전용 API를 권장한다. tree는 대체로 html/head/body를 포함하는 전체 document이며 React가 doctype/bootstrap script를 생성하고 client는 같은 tree를 hydrate한다.

shell은 Suspense 안에 없는 content와 초기 fallback을 포함해 가장 먼저 전송할 화면이다. 모든 것을 root Suspense 하나로 감싸면 shell이 spinner만 될 수 있다. 최소한의 layout과 cover, nested data 영역의 fallback을 조합해 읽을 수 있는 첫 화면을 만든다.

## renderToPipeableStream

`renderToPipeableStream(reactNode, options?)`는 즉시 `{ pipe, abort }`를 반환한다. pipe는 Node Writable로 HTML을 보내고 abort는 unfinished rendering을 중단해 나머지 browser rendering으로 넘긴다. 하나의 결과는 writable 하나에만 pipe한다.

```jsx
import { renderToPipeableStream } from 'react-dom/server';
const renderPage = response => {
  let didError = false;
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onError(error) { didError = true; console.error(error); },
    onShellReady() {
      response.statusCode = didError ? 500 : 200;
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      pipe(response);
    },
    onShellError() {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<h1>페이지를 준비하지 못했습니다</h1>');
    },
  });
};
```

shell이 준비되면 `onShellReady`, shell 실패면 `onShellError(error)`, 모든 content 완료면 `onAllReady`다. shell 실패 때는 아직 byte를 보내지 않았고 ShellReady/AllReady를 호출하지 않는다. crawler/정적 생성이 전체 결과를 기다려야 하면 onAllReady에서 pipe한다. 그렇게 하면 progressive loading의 이점은 없다.

## renderToReadableStream

`await renderToReadableStream(reactNode, options?)`는 shell 준비 시 `ReadableStream`으로 resolve한다. shell 실패는 Promise reject이므로 try/catch로 별도 HTML을 보낸다. 반환 stream의 `allReady` Promise는 전체 rendering 완료를 뜻한다.

```jsx
import { renderToReadableStream } from 'react-dom/server';
const renderPage = async () => {
  try {
    const stream = await renderToReadableStream(<App />, {
      bootstrapScripts: ['/main.js'],
      onError(error) { console.error(error); },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('<h1>페이지를 준비하지 못했습니다</h1>', {
      status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};
```

Web API에는 Node의 onShellReady/onShellError/onAllReady를 넣지 않는다. shell Promise, reject, stream.allReady가 각각 대응한다. crawler에서는 Response를 반환하기 전에 allReady를 await할 수 있다. runtime/framework가 response를 어떻게 전송하는지도 확인한다.

## 공통 옵션

| option | 값과 기능 |
|---|---|
| `bootstrapScripts` | client hydration bootstrap URL 배열, 생략하면 해당 script 없음 |
| `bootstrapModules` | module bootstrap URL 배열 |
| `bootstrapScriptContent` | inline bootstrap source string |
| `formState` | Server Function form 결과, hydrateRoot와 같은 값 |
| `identifierPrefix` | useId prefix, hydrateRoot와 동일 |
| `namespaceURI` | 기본 HTML, SVG/MathML root namespace 변경 |
| `nonce` | CSP script nonce string 또는 script/style nonce object |
| `progressiveChunkSize` | chunk byte 크기, 기본값은 renderer heuristic |
| `onError` | recoverable/fatal server error 보고, 기본 console.error |
| `onBrowserBailout` | intentional browser() bailout의 error와 componentStack |
| `onHeaders` | resource hint를 Link/103 Early Hints로 보내는 callback |
| `maxHeadersLength` | onHeaders 내용 상한, UTF-16 code unit 기준 기본 2000 |
| `importMap` | imports/scopes object, module script 이전에 inline importmap 출력 |

2026-10-01 streaming reference의 importMap option은 **Canary badge**가 붙어 있다. 공개 method가 stable이라고 모든 option까지 stable로 단정하지 않는다. importMap의 nonce는 script에도 적용된다. 설치 버전/framework가 이 option을 노출하는지 확인한다.

Node의 onHeaders는 `{ Link: ... }` descriptor이고 Web API의 onHeaders는 Headers instance다. 힌트가 없어도 callback을 호출하며 상한 이후 추가 hint는 header에 넣지 않는다. script/style/image hint를 현재 요청 header에 반영하기 전에 response 전송 상태와 framework의 Early Hints 지원을 확인한다.

custom onError로 crash reporter를 연결할 때 console.error 등 기본 관측을 놓치지 않는다. formState는 SSR response와 hydration이 공유하는 state 계약이지 임의로 user input을 HTML에 삽입하는 문자열 옵션이 아니다.

## Suspense와 점진적 HTML

```jsx
const ProfilePage = () => (
  <ProfileLayout>
    <ProfileCover />
    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar />
      <Suspense fallback={<PostsSkeleton />}><Posts /></Suspense>
    </Suspense>
  </ProfileLayout>
);
```

shell과 fallback을 먼저 전송하고 suspended content가 준비되면 나머지 HTML과 fallback을 바꾸는 inline script를 전송한다. initial HTML을 점진적으로 보여주는 것과 hydration이 완료되어 event가 작동하는 시점은 다르다. promise를 use로 읽거나 lazy/framework의 Suspense source를 사용할 때 suspend하며 Effect/event 내부 fetch를 자동으로 감지하지 않는다.

## shell 오류, boundary 오류와 status code

shell 오류는 유의미한 초기 HTML을 만들지 못하므로 Node onShellError 또는 Web reject 경계에서 500/fallback shell을 선택한다. shell 밖 Suspense content 오류는 fallback HTML을 보내고 client에서 다시 시도한다. client에서도 실패하면 가까운 Error Boundary가 화면을 결정한다. server에서 실패했지만 client가 성공하면 서버 onError와 client onRecoverableError로 복구를 관측한다.

status/header는 전송을 시작하기 전에 결정한다. shell 전에 발생한 boundary 오류를 didError에 기록해 status를 바꿀 수 있지만 전송 후 발생한 모든 오류를 status에 반영할 수는 없다. 반드시 404 여부를 response code로 알려야 하는 데이터는 shell 준비 전에 확인하거나 shell로 올리는 조건을 검토한다. NotFoundError 같은 업무 error 타입을 관측하고 404/500을 구분할 수 있다.

## build asset map과 CSP

hash된 asset path는 build 결과 map에서 읽고 server/client App에 같은 map을 전달한다. key가 `main.js`라면 `assetMap['main.js']`를 쓰며 slash가 붙은 다른 key를 조회하지 않는다.

bootstrapScriptContent에 데이터를 넣을 때 JSON.stringify만으로 임의 user content를 script-safe하게 만든다고 가정하지 않는다. 신뢰된 build manifest와 user 제공 데이터를 구분하고, 실제 app 데이터는 framework의 안전한 serialization 계약을 사용한다. nonce 역시 request별 CSP 정책에 맞추고 정적 cache에 재사용하지 않는다.

## timeout과 abort

Node는 `abort(reason?)`, Web은 options.signal과 AbortController를 사용한다. deadline 뒤 abort하면 남은 fallback을 보내고 browser가 content rendering을 시도한다. timeout과 request disconnect가 끝난 뒤 timer/listener를 정리하는 책임은 caller에 있다. 의도적으로 browser로 넘길 때는 browser(reason)과 onBrowserBailout을 사용한다.

```jsx
const controller = new AbortController();
const streamPromise = renderToReadableStream(<App />, { signal: controller.signal });
// 실제 deadline/disconnect 정책이 발생한 경계에서 실행한다.
const stop = () => controller.abort();
```

## 요청자별 렌더링 사례

X는 2026-11-04 공식 엔지니어링 블로그에서 사람, 검색 크롤러와 링크 미리보기 봇에 따로 쓰던 서버 세 개를 React streaming SSR 서버 하나로 합친 과정을 공개했다. 아래 수치와 판단은 그 글의 자체 측정과 설명이다.

| 요청자 | 응답 | 이유 |
|---|---|---|
| 사람 | shell을 먼저 보내고 데이터가 오는 대로 각 Suspense 경계를 스트리밍 | 첫 화면을 빨리 보이게 한다 |
| 검증된 검색 크롤러 | 모든 경계가 해결될 때까지 기다린 완성 문서. hydration하지 않으므로 클라이언트 번들, 라우터 상태와 placeholder가 없다 | 위 onAllReady, allReady처럼 전체 완료를 기다리는 경로에 해당한다(해석). 판별은 User-Agent가 아니라 엣지가 검증한 IP로 해 성능 측정 도구가 크롤러 경로를 타거나 헤더만 바꾼 요청이 비싼 경로를 요구하지 못하게 했고, 검증되지 않은 요청은 비로그인 방문자와 같은 응답을 받는다 |
| 링크 미리보기 봇 | 라우트의 데이터 로딩과 head 태그만 실행해 제목, 설명과 카드 이미지를 반환 | 본문 렌더링과 본문에만 필요한 요청을 생략한다 |

- **완성 문서 크기:** Google 문서는 Google 검색용 크롤링에서 Googlebot이 지원 파일 형식의 첫 2MB(압축 해제 기준, PDF는 64MB)만 가져오고 HTML이 참조하는 CSS와 JavaScript는 리소스마다 따로 가져온다고 설명한다(2026-11-16 대조). X는 긴 스레드의 HTML이 2.2~3.5MB가 되어 뒤쪽 답글이 잘리자 아이콘을 문서 앞의 숨은 sprite 하나로 모으고, 구조화 데이터의 중복 텍스트와 URL을 줄이고, JavaScript가 실행돼야 의미가 있는 출력을 크롤러 문서에서 뺐다.
- **데이터 전달:** 정규화된 Relay store를 HTML에 직렬화하면 원래 GraphQL 응답보다 4~5배 컸다. 서버가 받은 응답을 JSON 텍스트로 한 번만 싣고 브라우저가 빈 store에 다시 재생하게 바꿨다. 아무도 읽지 않은 응답은 스트림이 끝난 뒤 30초 동안 보관한다.
- **hydration 시작:** 진입 스크립트가 deferred module이면 브라우저가 문서 파싱을 마친 뒤 실행하므로, 스트리밍 문서에서는 마지막 경계가 도착할 때까지 hydration이 늦어진다. async module로 바꾸자 대화 조회를 5초 늦춘 시험에서 React가 589ms에 붙었고 문서 파싱은 6,017ms에 끝났다.
- **대가:** 서버가 데이터를 가져와 렌더링한 뒤 응답하므로 로그인 상태의 첫 바이트는 중앙값 430~560ms로 기존 앱(300ms 미만)보다 늦었다. 대신 느린 네트워크 조건에서 프로필과 게시물은 JavaScript가 도착하기 전에 보였다.

## 이해 확인

1. Web render 함수가 resolve했다면 모든 data가 로드됐는가? shell만 준비됐을 수 있다. allReady는 별도다.
2. streaming 뒤 404를 발견했을 때 status를 바꿀 수 있는가? 이미 전송을 시작했으면 바꿀 수 없다.
3. Suspense 안 fetch를 Effect로 옮기면 서버 대기를 유지하는가? Effect fetch는 server rendering을 suspend하지 않는다.
4. onError를 custom logger로 바꾸면 Error Boundary 화면까지 자동 제공하는가? 관측 callback과 UI fallback 경계는 별개다.

## 출처

- [React DOM, Server APIs](https://react.dev/reference/react-dom/server)
- [React DOM, renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [React DOM, renderToReadableStream](https://react.dev/reference/react-dom/server/renderToReadableStream)

- [React, ReactDOMFizzServerNode v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/server/ReactDOMFizzServerNode.js)
- [Google Search Central, Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot) — 2026-11-16 파일 크기 한도와 리소스별 적용 대조
- [Rebuilding the global town square from scratch — X Engineering Blog, Yagiz Nizipli](https://blog.x.com/en/engineering/rebuilding-the-global-town-square-from-scratch) — 2026-11-04 게시. 수치는 X의 실험실과 운영 측정
- [X.com을 처음부터 다시 구축하기 - 서버 3개를 하나로 — GeekNews](https://news.hada.io/topic?id=37245)

## 관련 문서

- [[React-DOM-Client-Roots]]
- [[React-DOM-Prerender]]
- [[React-DOM-Resume]]
- [[React-DOM-Legacy-Server-Rendering]]
- [[React-Server-Components]]
- [[React-Server-Boundaries]]
- [[Shadow-Traffic|Shadow Traffic (재작성 검증과 전환 사례)]]
- [[Module-Federation|Module Federation (재작성 중 기능 공유)]]
