---
tags: [web, frontend, react, dom, ssr, ssg]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React partial prerender와 resume"]
---

# React partial prerender와 resume

## prelude, postponed와 hydration

partial prerender는 미리 만들 수 있는 HTML과 아직 끝나지 않은 Suspense content를 분리한다. `prelude`는 먼저 배포/전송할 HTML이며 `postponed`는 rendering을 이어가는 opaque JSON-serializable state다. 같은 결과의 둘을 저장하고 request 시 data와 같은 React tree를 준비해 이어간다. resume는 browser hydration이 아니다. resume가 남은 서버 HTML을 만들고 hydrateRoot가 browser interactivity를 연결한다.

완전히 prerender된 component와 그 children은 이어가기에서 생략할 수 있지만 root부터 unfinished subtree를 찾기 위해 다시 rendering한다. 모든 parent render가 없어지는 최적화로 이해하지 않는다. 렌더링 순수성, request별 data와 tree/asset identity가 중요하다.

## resume

`await resume(reactNode, postponedState, options?)`는 Web ReadableStream을 반환한다. reactNode는 prerender에 사용한 같은 tree이며 postponedState는 저장한 opaque object다. shell이 준비되면 resolve, 실패하면 reject하고 stream.allReady는 전체 완료 Promise다.

```jsx
import { resume } from 'react-dom/server';
const continuePage = async (postponed, writable) => {
  const stream = await resume(<App />, postponed);
  await stream.pipeTo(writable);
};
```

이미 보낸 prelude 뒤에 resume stream을 이어 붙인다. 이 stream 하나를 새로운 전체 document인 것처럼 prelude 없이 배포하지 않는다. crawler 등 전체 content를 기다릴 때는 allReady를 사용할 수 있고 shell/recovery 정책은 Web streaming과 같다.

resume options는 `nonce`, `signal`, `onError`, `onBrowserBailout`이다. nonce는 streaming의 request CSP 경계, signal은 abort, 오류/bailout callback은 [[React-DOM-Streaming-SSR]]/[[React-DOM-Portals-and-Browser]]와 같다.

## resumeToPipeableStream

`resumeToPipeableStream(reactNode, postponedState, options?)`는 Node에서 **즉시** `{ pipe, abort }`를 반환한다. reference Intro의 await는 필요하지 않으며 이 함수의 반환이 Promise라는 뜻으로 옮기지 않는다.

```jsx
import { resumeToPipeableStream } from 'react-dom/server';
const continuePage = (postponed, response) => {
  const { pipe } = resumeToPipeableStream(<App />, postponed, {
    onShellReady() { pipe(response); },
    onShellError(error) { console.error(error); },
  });
};
```

Node options는 `nonce`, `onAllReady`, `onShellReady`, `onShellError`, `onError`, `onBrowserBailout`이다. onAllReady에서 pipe하면 전체 결과를 기다려 progressive reveal이 없다. abort(reason)은 pending content를 client로 넘길 수 있다. Web의 signal option과 Node의 abort method를 혼동하지 않는다.

## resume의 재설정 제한

resume 계열에는 bootstrapScripts, bootstrapScriptContent, bootstrapModules와 identifierPrefix를 다시 전달하지 않는다. 기존 prerender의 postponedState가 이 설정을 보유하므로 최초 단계에 지정한다. 필요하다면 bootstrap을 writable에 직접 넣는 설계도 있지만 안전한 serialization/CSP 처리를 함께 다뤄야 한다.

prerender에는 nonce가 없기 때문에 resume에 nonce를 줄 때는 prerender 단계에 script를 이미 넣지 않았는지 확인한다. prelude에 있는 script와 request CSP nonce가 다른 설계는 차단/보안 오류가 생길 수 있다. nonce를 사용하는 경로에서는 어느 단계가 script를 출력하는지 함께 검증한다.

resume output을 이어갈 root/props를 임의로 바꾸거나 postponed 내부를 고쳐 순서를 맞추지 않는다. 원래 build의 prelude/postponed와 compatible한 tree를 묶어 관리한다. API가 opaque state를 JSON으로 저장할 수 있다고 형식의 영구 호환성을 보장하는 것은 아니다.

## resumeAndPrerender

`await resumeAndPrerender(reactNode, postponedState, options?)`는 이전 prerender를 이어가되 새 data가 모두 준비되거나 중단될 때까지 기다려 `{ prelude, postponed }`를 반환한다. prelude는 추가 HTML의 Web Stream이며 unfinished 상태가 남으면 다음 resumeAndPrerender 또는 server resume로 넘길 수 있다. 성공/실패와 대기 계약은 prerender와 같다.

```jsx
import { resumeAndPrerender } from 'react-dom/static';
const continueBuild = async postponed => {
  const result = await resumeAndPrerender(<App />, postponed);
  const appendedHTML = await new Response(result.prelude).text();
  return { appendedHTML, postponed: result.postponed };
};
```

options는 `signal`, `onError`, `onBrowserBailout`이며 nonce는 없다. 초기 script/identifierPrefix 설정을 continuation에서 다시 만들지 않는다. reference usage의 bootstrapScripts 예시와 parameter 계약이 충돌하므로 최초 prerender 단계에서 설정하는 경계를 따른다.

## resumeAndPrerenderToNodeStream

`await resumeAndPrerenderToNodeStream(reactNode, postponedState, options?)`는 같은 static continuation을 Node Stream으로 반환한다. `{ prelude, postponed }`의 prelude는 Node Readable이며 Web Stream이 아니다. options는 `signal`, `onError`, `onBrowserBailout`이다. nonce는 request-specific 값이므로 이 단계에도 넣지 않는다.

```jsx
import { resumeAndPrerenderToNodeStream } from 'react-dom/static';
import { pipeline } from 'node:stream/promises';
const continueBuild = async (postponed, writable) => {
  const { prelude, postponed: next } =
    await resumeAndPrerenderToNodeStream(<App />, postponed);
  await pipeline(prelude, writable);
  return next;
};
```

미완료 상태는 같은 Node static API로 더 생성하거나 Node server의 resumeToPipeableStream으로 최종 streaming한다. Web server 함수 이름 resume와 존재하지 않는 resumeToNodeStream 이름을 혼용하지 않는다.

## 단계 선택

| 현재 결과/목적 | 다음 단계 |
|---|---|
| 전체 prerender 완료, postponed null | HTML 배포, 필요하면 client hydration |
| 더 많은 static data를 기다려 생성 | resumeAndPrerender 계열 |
| 요청 data가 준비되며 점진적으로 reveal | resume/resumeToPipeableStream |
| server 대기를 포기하고 browser로 넘김 | streaming abort, browser reason이면 별도 bailout 관측 |
| 사용자 interaction 연결 | hydrateRoot |

server component의 파일 directive만으로 partial prerender가 자동 구성되는 것은 아니다. framework가 이 build/request 단계와 storage를 제공하는지 확인한 뒤 직접 renderer를 호출한다.

## 이해 확인

1. resume가 hydration을 대체하는가? 서버 HTML 이어가기와 browser event 연결은 다른 단계다.
2. resumeToPipeableStream에 await가 필수인가? 즉시 object 반환이므로 아니다.
3. Node static continuation의 prelude에 pipeTo를 쓸 수 있는가? Node Stream이므로 pipe/pipeline을 사용한다.
4. 다음 static 단계도 timeout됐을 때 무엇을 보존하는가? 새 추가 prelude와 다음 postponed를 같은 결과로 보존한다.
5. nonce를 어느 단계에 적용하는가? 정적 cache 단계가 아니라 request streaming과 실제 script 출력 경계다.

## 출처

- [React DOM, resume](https://react.dev/reference/react-dom/server/resume)
- [React DOM, resumeToPipeableStream](https://react.dev/reference/react-dom/server/resumeToPipeableStream)
- [React DOM, resumeAndPrerender](https://react.dev/reference/react-dom/static/resumeAndPrerender)
- [React DOM, resumeAndPrerenderToNodeStream](https://react.dev/reference/react-dom/static/resumeAndPrerenderToNodeStream)

- [React, ReactDOMFizzStaticNode v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/server/ReactDOMFizzStaticNode.js)
- [React, ReactDOMFizzServerNode v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/src/server/ReactDOMFizzServerNode.js)

## 관련 문서

- [[React-DOM-Prerender]]
- [[React-DOM-Streaming-SSR]]
- [[React-DOM-Client-Roots]]
