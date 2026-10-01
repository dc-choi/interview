---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Suspense와 lazy loading

## Suspense 계약

`<Suspense children={...} fallback={...}>`는 child tree가 준비되지 않았을 때 fallback React node를 표시하고 준비되면 실제 UI를 드러낸다. fallback 자체가 suspend하면 더 가까운 상위 Suspense가 기다린다. Suspense는 요청을 시작하는 HTTP client나 error boundary가 아니다.

| 준비를 기다리는 원인 | 범위 |
|---|---|
| `lazy(load)` | component code의 Promise |
| `use(promise)` | cache한 Promise 또는 framework/RSC가 전달한 Promise |
| `<link rel="stylesheet" precedence="...">` | stylesheet 준비, timeout 존재 |
| streaming SSR | boundary HTML이 전달되는 시간 |
| ViewTransition update의 새 font/image | timeout까지 준비를 기다림, 일반 Suspense만으로는 기다리지 않음 |
| `defer={true}` | CPU render를 뒤로 미루는 Experimental 확장 |

Effect나 event handler에서 `fetch`를 호출하는 것만으로는 boundary가 활성화되지 않는다. `defer`의 기본값은 false이고, 원문에서 Experimental로 표시되어 안정 버전 일반 계약과 구분한다. ViewTransition의 font/image 준비와 browser-only resource는 React 19.3 계약이다. `defer`는 v19.3.0 source에서도 `enableCPUSuspense = __EXPERIMENTAL__`로 분리되어 있다.

## 경계는 사용자에게 보여 줄 순서

```jsx
<Suspense fallback={<PageSkeleton />}>
  <Biography biographyPromise={biographyPromise} />
  <Suspense fallback={<ListSkeleton />}>
    <Albums albumsPromise={albumsPromise} />
  </Suspense>
</Suspense>
```

하나의 boundary 아래 child는 함께 드러난다. 중간 component를 추출해도 가장 가까운 boundary가 같으면 동작이 유지된다. 위에서는 소개가 준비되면 page skeleton이 사라지고, 앨범은 준비될 때 따로 드러난다. 모든 component를 개별 boundary로 감싸지 않고 실제 loading 디자인 단위에 맞춘다.

첫 mount 전에 suspend한 render의 state는 보존되지 않는다. React가 처음부터 다시 시도하므로 render 안에서 만든 Promise나 state에 의존해 첫 suspension을 넘기려 하지 않는다. 이미 표시된 tree가 다시 suspend하면 일반 urgent update는 fallback을 표시하고, 숨길 때 layout Effect를 cleanup하고 다시 보일 때 setup한다.

2026-10-01 레퍼런스는 마지막 reveal부터 300ms 내 준비된 boundary를 함께 reveal하는 batching을 설명한다. 이를 업무 timer나 순서 제어 보장으로 사용하지 않는다.

## 이미 보이는 화면 유지와 identity 변경

`startTransition(() => setPage(nextPage))`는 새 화면이 suspend할 때 이미 표시된 영역을 유지할 수 있다. 새로 mount되는 nested boundary까지 전부 기다리는 기능은 아니다. pending 표시는 `useTransition`으로 얻고, input 값은 즉시 갱신하되 결과 일부만 늦추려면 `useDeferredValue`를 쓴다.

```jsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;
return (
  <>
    <input value={query} onChange={e => setQuery(e.target.value)} />
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <Suspense fallback={<ListSkeleton />}>
        <Results query={deferredQuery} />
      </Suspense>
    </div>
  </>
);
```

같은 resource의 갱신에는 이전 결과 유지가 자연스럽지만 다른 사용자의 profile로 이동할 때 이전 사람의 내용을 유지하면 오해를 준다. `key={userId}`를 boundary나 상위 page에 주면 다른 content로 취급해 경계를 reset한다. key를 바꾸는 것은 pending 표시를 켜는 옵션이 아니라 UI identity 변경이다.

## SSR, 오류와 resource 조합

streaming SSR에서 child가 server error를 던지면 가까운 Suspense fallback을 HTML로 보내고 client에서 다시 시도할 수 있다. client에서도 실패하면 Error Boundary가 오류 UI를 표시한다. 따라서 server fallback을 보고 모든 오류가 해결됐다고 판단하지 않는다.

browser-only 확장인 `use(browser())`는 server에서 suspend하고 browser에서 `undefined`를 반환한다. server에는 상위 Suspense가 필요하고 RSC 앱에서는 Client Component에서 사용한다. React 19.3의 `react-dom` export이며 resource 계약은 [[React-Resources-and-Use#browser-only resource]]에 연결한다.

stylesheet는 precedence가 있는 React-managed link가 준비될 때까지 기다린다. ViewTransition이 Suspense를 밖에서 감싸면 fallback→content를 update/cross-fade로 처리하고, fallback과 content 각각을 감싸면 별도 exit/enter가 된다. ViewTransition reveal은 새 font와 visible image를 기다릴 수 있으며 image에 `onLoad`가 있으면 해당 image는 대기에서 빠진다.

## lazy 계약

`lazy(load)`는 인자 없는 load가 반환하는 Promise/thenable을 첫 render에서 실행하고, resolve된 object의 `.default` component를 렌더링하는 **새 component type**을 반환한다. load 호출 전에는 code를 읽지 않으며 load Promise와 resolve 결과를 cache한다. reject 사유는 가까운 Error Boundary에 전달한다.

```jsx
import { lazy, Suspense } from 'react';
const Preview = lazy(() => import('./Preview.js'));

function Editor({ showPreview }) {
  return showPreview ? (
    <Suspense fallback={<p>미리보기 불러오는 중</p>}>
      <Preview />
    </Suspense>
  ) : null;
}
```

- module 최상위에 선언한다. component 안에서 lazy를 매번 만들면 type identity가 달라져 state가 reset된다.
- load 결과의 default는 function, memo, forwardRef 등 valid component type이어야 한다. dynamic import와 code splitting 지원은 bundler/framework 계약도 확인한다.
- code Promise cache와 data cache, server request cache는 서로 다르다. 다시 숨겼다가 보여도 같은 lazy 선언의 code는 다시 로드하지 않지만 data 최신성까지 보장하지 않는다.
- SSR shell, 초기 bundle과 waterfall을 함께 검토한다. 다운로드를 늦추는 것이 처음 클릭의 대기 비용으로 옮겨갈 수 있다.

## 이해 확인

1. Effect fetch와 `use(cachedPromise)`를 같은 boundary 안에 넣고 어떤 쪽이 fallback을 활성화하는지 예측한다.
2. 소개와 목록을 단일/중첩 boundary로 배치하고 loading sequence를 비교한다.
3. 재조회에서는 이전 결과를 유지하고 다른 resource로 이동할 때는 key로 reset하는 이유를 설명한다.
4. render 내부 lazy 선언을 module로 옮겨 state reset 문제를 재현, 수정한다.
5. Promise rejection 처리와 loading fallback을 각각 어느 경계가 담당하는지 설명한다.

## 출처

- [React, Suspense](https://react.dev/reference/react/Suspense)
- [React, lazy](https://react.dev/reference/react/lazy)
- [React, v19.3.0 feature flags](https://github.com/facebook/react/blob/v19.3.0/packages/shared/ReactFeatureFlags.js)

## 관련 문서

- [[React-Resources-and-Use]]
- [[React-Transitions-and-Animation]]
- [[React-Error-Boundaries]]
- [[React-Server-State-and-API]]
