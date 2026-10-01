---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React use와 resource 읽기

## use 계약

`use(resource)`는 render 중 resource를 읽는 API다. `use`는 일반 Hook의 호출 순서 제한과 달리 조건과 반복문 안에서도 쓸 수 있으나 **component나 custom Hook 내부**에서 호출한다. try/catch로 감싸지 않는다.

| resource | 반환 | 대기/오류 계약 |
|---|---|---|
| context object | 가장 가까운 상위 provider 값, 없으면 static default | RSC에서 context 읽기는 지원하지 않음 |
| cache한 Promise | resolved value | pending은 Suspense, reject는 가까운 Error Boundary |
| `browser()` 반환값 | browser에서 undefined | server에서 suspend, server 상위 Suspense 필요 |

context value가 Promise라면 context를 읽는 호출과 Promise를 푸는 호출은 별개다.

```jsx
function Profile() {
  const profilePromise = use(ProfileContext);
  const profile = use(profilePromise);
  return <h1>{profile.label}</h1>;
}
```

provider를 너무 높은 곳에 두면 RSC에서 새 Promise를 만들기 위해 넓은 server tree를 다시 가져올 수 있다. 실제 data 소비 범위에 맞춘다.

## Promise identity와 cache 소유

```jsx
function Results({ resultsPromise }) {
  const results = use(resultsPromise);
  return results.map(result => <p key={result.id}>{result.title}</p>);
}
```

같은 resource에 **같은 Promise instance**를 재사용해야 한다. render마다 `fetch`, async 함수 호출, 기존 Promise의 `.then`을 수행하면 새 Promise가 생긴다. 첫 mount 전 suspension은 state를 버리고 render를 처음부터 재시도하므로 render 안의 useMemo/useState만으로 첫 Promise를 고정하려 하지 않는다.

event, route loader나 Server Component에서 Promise를 만들고 전달하거나, framework/data layer의 cache를 사용한다. 간단한 module-level Map도 identity를 설명하는 학습용으로 쓸 수 있지만 invalidation, auth scope, retention, 오류 재시도는 별도 책임이다. React RSC의 `cache`를 browser app cache로 대체하지 않는다.

library 수준 cache가 Promise에 `status: pending | fulfilled | rejected`, `value`, `reason`을 기록하면 이미 준비된 값을 동기적으로 읽고 추가 render를 줄일 수 있다. React도 상태 없는 Promise를 추적하지만 일반 app이 이 protocol을 새로 구현해야 한다는 뜻은 아니다.

## 새로고침, preload와 error retry

새로고침은 기존 entry를 invalidation하고 새 Promise를 **state에 저장해** render를 요청한다. Map만 바꾸면 UI에 변경을 알리지 못한다. 이미 표시한 data를 유지하려면 update를 Transition으로 표시한다.

```jsx
function Page() {
  const [promise, setPromise] = useState(() => loadResults());
  const [isPending, startTransition] = useTransition();
  const refresh = () => {
    startTransition(() => setPromise(reloadResults()));
  };
  return (
    <>
      <button disabled={isPending} onClick={refresh}>새로고침</button>
      <Suspense fallback={<p>불러오는 중</p>}>
        <Results resultsPromise={promise} />
      </Suspense>
    </>
  );
}
```

여기서 loadResults/reloadResults는 data layer가 제공하는 cache 읽기/무효화 함수다. hover나 route 진입 전에 같은 cache를 preload하면 실제 읽기의 대기를 줄일 수 있다. preload Promise가 reject할 때 unhandled rejection이 생기지 않도록 data layer의 정책도 확인한다.

reject된 Promise를 같은 cache에서 다시 읽는 것은 재시도가 아니다. Error Boundary를 reset하는 것과 새로운 Promise를 만들거나 cache entry를 교체하는 일이 함께 필요하다. `use` 내부 throw는 Suspense protocol이므로 try/catch로 잡아 일반 오류 UI를 반환하면 `Suspense Exception` 오류가 발생할 수 있다.

## Server Component에서 Promise 전달

Server Component는 async/await로 읽을 수 있다. 생성 위치에서 바로 await하면 그 아래 tree가 기다리고, Promise를 더 깊은 component에 전달해 그곳에서 await 또는 use하면 그 영역만 기다린다. 경계 바깥 UI가 먼저 렌더링되는 이점을 선택한다.

Client Component는 render를 async로 만들지 않고 use로 읽는다. server→client Promise의 resolve 결과는 RSC에서 serializable한 타입이어야 한다. Promise를 전달했다는 이유로 함수나 비공개 DB 객체까지 보낼 수 있는 것은 아니다.

## browser-only resource

`browser(reason?)`는 React DOM 19.3 API다. Promise/context를 읽는 use와 달리 browser availability를 나타내는 resource를 반환한다. React v19.3.0 source의 `enableBrowserAPI = true`와 ReactDOM의 export로 지원 범위를 확인했다. 이전 React DOM 버전의 지원을 가정하지 않는다.

```jsx
import { use } from 'react';
import { browser } from 'react-dom';
function BrowserOnly() {
  use(browser('브라우저 API가 필요합니다.'));
  return <BrowserContent />;
}
```

server에서 가까운 Suspense fallback을 HTML로 제공하고 browser에서는 정상 렌더링한다. boundary 없이 server에서 읽으면 server rendering이 실패한다. RSC 앱에서는 Server Component가 아니라 Client Component에서 호출한다. 'use client' 선언만으로 SSR을 생략한다는 가정과도 구분한다.

## 이해 확인

1. cache한 Promise에 render 중 `.then`을 덧붙이면 왜 identity가 달라지는지 설명한다.
2. loading, rejection, retry에서 Suspense, Error Boundary, data cache의 책임을 나눈다.
3. 같은 URL을 재조회할 때 cache invalidation만으로 UI가 갱신되지 않는 이유를 설명한다.
4. server에서 바로 await하는 구조와 더 깊이 Promise를 전달하는 구조의 기다리는 영역을 비교한다.

## 출처

- [React, use](https://react.dev/reference/react/use)
- [React, v19.3.0 ReactDOM exports](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom/index.js)
- [React, v19.3.0 feature flags](https://github.com/facebook/react/blob/v19.3.0/packages/shared/ReactFeatureFlags.js)

## 관련 문서

- [[React-Suspense-and-Lazy]]
- [[React-Server-Cache-and-Taint]]
- [[React-Context-Creation]]
- [[React-Server-Components]]
- [[React-Error-Boundaries]]
