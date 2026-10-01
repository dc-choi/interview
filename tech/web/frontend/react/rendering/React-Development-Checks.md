---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React 개발 검사와 act

## StrictMode 계약

`<StrictMode>`는 추가 설정 props 없이 내부 tree에 개발 전용 검사를 적용한다. production build에 이 검사 동작이 추가되는 것은 아니다. 내부 child가 개별적으로 opt out할 수 없고 적용 범위를 바꾸려면 boundary를 옮긴다.

| 검사 | 드러내는 결함 |
|---|---|
| pure 함수 추가 호출 | 받은 array mutation, render 전역값 변경 |
| Effect setup→cleanup→setup | subscription, timer, request cleanup 누락 |
| callback ref setup→cleanup→setup | node registry 누적, stale ref |
| deprecated API 경고 | UNSAFE class lifecycle 등 오래된 계약 |

component body, useState initializer/updater, useMemo 계산, useReducer와 일부 class constructor/render/shouldComponentUpdate가 pure 검사 대상이다. event handler 자체를 임의로 두 번 호출하는 기능은 아니다. 중복 log를 숨기거나 once ref로 검사만 우회하는 대신 mutation과 cleanup을 고친다.

root에서 전체 앱을 감싸는 것과 하위 일부를 감싸는 경우를 구분한다. root가 StrictMode가 아니면 initial mount에서 child Effect만 이중 실행하는 등 production에서 불가능한 동작은 적용하지 않는다.

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

callback ref가 Map에 node를 추가하면 cleanup에서 그 node도 제거한다. category 변경과 unmount를 반복해 registry 크기를 확인한다. DevTools의 두 번째 render log는 흐리게 표시되거나 설정으로 숨길 수 있으나 결함 해결과는 별개다.

## act 계약

`await act(async actFn)`은 test의 render나 interaction과 관련된 React update가 적용된 뒤 assertion하도록 queue를 flush하는 helper다. actFn은 인자 없이 async interaction unit을 실행하고 act 결과로 UI 값을 반환받지 않는다. async boundary를 넘는 React update도 처리한다.

```jsx
import { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
await act(async () => root.render(<Counter />));
const button = container.querySelector('button');
await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
console.assert(container.textContent.includes('1'));
await act(async () => root.unmount());
container.remove();
```

DOM test environment와 Counter가 있는 예제이며 browser event 대상 container를 document에 연결한다. render, click, Effect 결과 assertion을 각각 논리적 interaction 경계로 묶는다. timer/network stub 자체의 완료는 test 환경에 맞춰 기다려야 한다.

sync act는 동작하는 경우가 있어도 React scheduling에 따라 범위를 예측하기 어렵고 공식 문서는 async/await 사용을 권장하며 미래 제거를 예고한다. React Testing Library helper는 act와 환경 flag를 제공할 수 있어 설치된 test tool 계약을 먼저 쓴다. 환경 경고가 나오면 `IS_REACT_ACT_ENVIRONMENT` 설정과 test integration을 확인한다.

## captureOwnerStack 계약

`captureOwnerStack()`은 인자가 없고 개발 중 현재 **node를 만든 component의 Owner Stack**을 string 또는 null로 반환한다. render, Effect, React event handler, root error handler에서 읽을 수 있다. timeout, await 뒤, custom DOM event handler는 React-controlled 실행 범위 밖이므로 null일 수 있다.

Component Stack은 오류 node와 render tree의 parent 경로를 담는다. Owner Stack은 JSX를 생성한 경로이므로 children을 전달만 한 wrapper와 host DOM, sibling은 포함하지 않을 수 있다. 둘을 합쳐 UI 위치와 생성 책임을 조사한다.

```jsx
import * as React from 'react';
if (process.env.NODE_ENV !== 'production') {
  const ownerStack = React.captureOwnerStack();
  console.log(ownerStack);
}
```

production에서는 함수 export 자체가 없을 수 있으므로 공용 bundle에서 named import를 무조건 호출하지 않는다. namespace import와 개발 조건으로 접근한다. custom DOM listener에 stack을 넣으려면 Effect setup 중 미리 capture하고 callback에 그 문자열을 전달한다. console.error를 감싸 overlay를 만든다면 원래 logger 호출과 복수 인자 처리도 유지한다.

## 이해 확인

1. props mutation과 Effect cleanup 누락, ref registry 누락을 StrictMode에서 각각 관찰한다.
2. 하위 StrictMode만 적용했을 때 root 검사와 같은 initial Effect 동작을 기대하면 안 되는 이유를 설명한다.
3. act 이전/이후 DOM과 document.title assertion의 시점을 비교한다.
4. 동일 오류의 Component Stack과 Owner Stack에서 wrapper가 다르게 나타나는 이유를 설명한다.

## 출처

- [React, StrictMode](https://react.dev/reference/react/StrictMode)
- [React, act](https://react.dev/reference/react/act)
- [React, captureOwnerStack](https://react.dev/reference/react/captureOwnerStack)

## 관련 문서

- [[React-Render-Purity-and-Trees]]
- [[React-Error-Boundaries]]
- [[React-Effects]]
