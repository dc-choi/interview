---
tags: [web, frontend, react, dom, hydration, ssr]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React client root와 hydration"]
---

# React client root와 hydration

## client entry point

`react-dom/client`는 browser DOM node와 React tree를 연결한다. framework가 bootstrap을 소유하면 일반 component에서 root를 다시 만들지 않는다. 빈 container는 createRoot, React가 서버/빌드에서 만든 HTML이 있는 container는 hydrateRoot다. static 생성이라고 전부 non-hydratable인 것은 아니며 renderToStaticMarkup output만 별도 non-interactive 계약이다.

2026-10-01 기준 client overview의 오래된 IE9 지원 문구는 현재 React 19에 적용하지 않는다. React 18 upgrade guide는 IE 지원 종료와 React 17 유지 대안을 명시한다. browser support는 현재 제품 버전과 framework의 지원 정책으로 확인한다.

## createRoot 계약

`createRoot(domNode, options?)`는 DOM element를 받아 `{ render, unmount }` root object를 반환한다. React가 container 내부 DOM을 관리하지만 호출만으로 화면이 나오지는 않는다.

```jsx
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
if (!container) throw new Error('root container 없음');
const root = createRoot(container);
root.render(<App />);
```

`root.render(reactNode)`는 JSX, createElement 결과, string/number, null/undefined 등을 받아 undefined를 반환한다. 첫 render는 container 기존 HTML을 비운다. 같은 root를 다시 render하면 기존 tree와 identity를 맞춰 필요한 부분을 update하며 구조가 같으면 state를 유지한다. 일반 앱에서는 component state로 갱신하므로 root.render 반복을 업무 API로 만들 필요가 드물다.

root.render 다음 줄에 새 DOM/Effect가 이미 완료됐다고 보장하지 않는다. 반드시 동기 DOM 결과가 필요한 외부 연동이라면 [[React-Refs-and-DOM#state update 뒤 DOM과 flushSync]]의 제한을 검토한다.

## root option과 오류 보고

createRoot의 두 번째 argument, hydrateRoot의 세 번째 argument가 options다. root.render에는 두 번째 options를 넘기지 않는다.

| option | 호출 계약 |
|---|---|
| `onCaughtError` | Error Boundary가 잡은 error와 `{ componentStack }` |
| `onUncaughtError` | Boundary가 잡지 못한 error와 errorInfo |
| `onRecoverableError` | React가 자동 복구한 error와 errorInfo, 원인이 error.cause일 수 있음 |
| `identifierPrefix` | 해당 root의 useId prefix, multi-root ID 충돌 방지 |

production 보고에는 error object, componentStack, 오류 종류를 함께 남긴다. callback을 등록했다는 사실은 사용자 fallback을 제공했다는 뜻이 아니다. development에서 기본 overlay/보고를 활용할지 custom handler를 쓸지 별도로 결정한다.

```jsx
const root = createRoot(container, {
  onRecoverableError(error, info) {
    reportError({ error, componentStack: info.componentStack, kind: 'recoverable' });
  },
  identifierPrefix: 'comments-',
});
```

## root.unmount와 여러 root

`root.unmount()`는 argument 없이 undefined를 반환하며 component cleanup, event listener, state를 포함해 React tree를 떼어낸다. 외부 tab/widget이 root container나 조상을 제거할 때 React에게도 unmount를 알려 subscription 등의 cleanup이 수행되게 한다.

unmount한 root object에는 다시 render할 수 없고 `Cannot update an unmounted root` 오류가 난다. 같은 DOM container에 새로운 root를 만드는 것은 가능하다. 전부 React인 앱은 보통 하나의 root이며 부분 React 페이지는 독립 영역별 root를 만들 수 있다. 여러 DOM 위치에 shared state/context가 필요한 하나의 앱이면 [[React-DOM-Portals-and-Browser#createPortal]]을 검토한다.

## hydrateRoot 계약

`hydrateRoot(domNode, reactNode, options?)`는 서버가 렌더링한 DOM node와 같은 출력의 React node를 받아 기존 HTML을 재사용하고 component logic을 연결한다. `{ render, unmount }` root를 반환하므로 일반적으로 추가 root.render 호출은 필요 없다. 전체 document를 JSX로 만들었다면 `hydrateRoot(document, <App />)`로 연결한다.

```jsx
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />, {
  identifierPrefix: 'app-',
  onRecoverableError(error, info) { reportError({ error, info }); },
});
```

공통 root options 외에 `formState`가 있다. Server Function이 useActionState form submission/permalink에 대해 만든 결과를 server renderer와 hydrateRoot에 같은 값으로 전달해야 제출 state로 hydration한다. 이 wiring은 보통 framework가 수행한다. identifierPrefix도 server renderer와 같아야 한다.

hydration 완료 전에 `root.render()`를 호출하면 기존 서버 HTML을 지우고 root 전체를 client render로 전환한다. 완료 후 동일 구조의 tree를 update하면 일반 render처럼 state를 유지한다. unmount 계약은 createRoot와 같다.

## mismatch는 출력 계약 위반

서버 HTML과 첫 client render가 같아야 한다. development mismatch 경고가 있고 attribute 차이를 전부 patch한다는 보장은 없다. 복구가 됐다고 문제를 남겨두면 성능 저하 또는 잘못된 node의 event 연결이 생길 수 있다.

- root 내부 server markup 주위의 extra whitespace.
- render 중 `typeof window` 조건으로 다른 UI 반환.
- browser-only API와 server/client에서 다른 data/timezone.
- build asset map, 초기 data, useId prefix 불일치.

`suppressHydrationWarning={true}`를 불가피한 단일 element의 attribute/text에 쓴다. 한 level만 적용하고 mismatched text를 patch하지 않는다. 반복적으로 생기는 불일치를 해결하는 방법은 아니다.

## 두 번의 render와 browser 전용 UI

의도적으로 server snapshot을 보인 뒤 client UI로 바꾸려면 첫 pass에서 server와 같은 값을 렌더링하고 Effect에서 isClient state를 변경한다. hydration 뒤 추가 render가 발생해 느리거나 화면 전환이 어색할 수 있다.

```jsx
const ClientTime = ({ initial }) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return <p>{isClient ? new Date().toLocaleTimeString() : initial}</p>;
};
```

server UI가 필요 없이 browser에서만 렌더링할 component라면 지원하는 버전에서 [[React-DOM-Portals-and-Browser#browser|use(browser())와 Suspense]]를 검토한다. mounted flag와 동일한 목적의 unconditional boilerplate를 덧붙이지 않는다.

## bootstrap 오류 진단

1. root만 만들고 render를 빼면 화면이 없다.
2. `Target container is not a DOM element`는 id typo, script 실행 시점, null node, JSX를 container로 넘긴 경우를 확인한다.
3. `Functions are not valid as a React child`는 `root.render(App)` 대신 `<App />`, JSX factory는 호출 결과를 넘겼는지 확인한다.
4. render의 options 경고는 options를 root 생성 함수로 옮긴다.
5. 서버 HTML이 처음부터 다시 생성되면 createRoot를 hydration 대상에 썼는지 확인한다. focus/scroll/입력도 잃을 수 있다.

## 이해 확인

1. 빈 root와 SSR root의 bootstrap 차이는? createRoot 후 render, hydrateRoot에 초기 JSX 직접 전달이다.
2. unmount 후 render가 실패하면 어떻게 하는가? 같은 container를 재사용하려면 새 root를 생성한다.
3. 서버와 client prefix가 다른 useId는 무엇을 깨뜨리는가? label/field와 기타 ID 연결 및 hydration output 일치다.

## 출처

- [React DOM, Client APIs](https://react.dev/reference/react-dom/client)
- [React DOM, createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [React DOM, hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)

- [How to Upgrade to React 18 — React](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)

## 관련 문서

- [[React-DOM-Streaming-SSR]]
- [[React-DOM-Prerender]]
- [[React-DOM-Portals-and-Browser]]
