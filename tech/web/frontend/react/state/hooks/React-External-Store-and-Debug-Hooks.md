---
tags: [web, frontend, react, external-store, subscription, hydration, devtools]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React External Store and Debug Hooks", "React 외부 store 구독과 Hook 진단"]
---

# React 외부 store 구독과 Hook 진단

React 밖의 mutable 데이터는 변경만으로 React render를 예약하지 않는다. 외부 store/browser API를 구독해 **변화 알림과 안정된 snapshot 읽기**를 연결한다. UI가 모두 React에 속하면 useState/useReducer를 우선 사용하고 기존 비React 시스템을 통합할 때 이 경계를 검토한다.

## useSyncExternalStore 계약

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`는 현재 store snapshot을 반환한다.

- subscribe는 callback 하나를 받아 구독하고 unsubscribe cleanup을 반환한다. store 변경 때 callback을 부르면 React가 getSnapshot을 다시 읽는다.
- getSnapshot은 component가 읽을 snapshot을 반환한다. store가 안 바뀐 동안 반복 호출은 **같은 값**을 반환해야 한다. 바뀐 snapshot을 `Object.is`로 비교하여 render 필요성을 판단한다.
- getServerSnapshot은 server HTML 생성과 client hydration 때 사용할 초기 snapshot을 반환한다. server와 초기 client 데이터가 같아야 하며 보통 서버 snapshot을 직렬화해 전달한다.

getServerSnapshot을 생략하고 server render하면 오류가 난다. 의미 있는 server 값이 없으면 Suspense/client-only fallback 경계로 처리할 수 있다. 서버에서 browser API를 직접 읽을 수 있다고 가정하지 않는다. client hydration 때는 server snapshot, 이후에는 실제 client snapshot을 읽는 역할을 구분한다.

### snapshot 불변성과 caching

immutable store가 최신 array/object를 유지하면 그 참조를 직접 반환한다. mutable store는 실제 변경이 있을 때만 새 immutable snapshot을 만들고 변경 없을 때는 이전 snapshot을 반환한다. 매 getSnapshot에서 `{ todos: store.todos }`를 만들면 데이터가 같아도 매번 새 object라 무한 render와 cached snapshot 경고를 만들 수 있다.

```jsx
import { useSyncExternalStore } from 'react';

let todos = [];
const listeners = new Set();
const store = {
  getSnapshot() { return todos; },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add(todo) {
    todos = [...todos, todo];
    for (const listener of listeners) listener();
  },
};
const Todos = () => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <ul>{snapshot.map(todo => <li key={todo.id}>{todo.text}</li>)}</ul>;
};
```

이 예제는 client-only 외부 store의 최소 snapshot 계약이다. state tool 추천이나 server 요청별 store 설계 예제가 아니다. id와 validated 데이터는 store.add 호출자가 제공하고 반환 array를 UI에서 수정하지 않는다. React 통합을 위해 직접 store를 새로 만들 필요가 없다면 현재 library의 adapter를 사용한다.

### browser 값과 custom Hook

[[React-Custom-Hooks#외부 store 구독을 전용 API로 구현하기|useOnlineStatus]]는 navigator.onLine을 snapshot으로, window의 online/offline을 변화 알림으로 사용한다. 초기부터 offline인 값을 단순 Effect listener만으로 놓치는 문제를 피한다. 하지만 navigator.onLine의 boolean은 특정 서버 요청이 성공할 것이라는 보장이 아니므로 저장 실패 처리는 별도로 유지한다.

custom Hook으로 감싸 boolean 등의 공개 계약을 유지하면 여러 component가 같은 외부 source를 읽을 수 있다. 각 호출의 구독/수명은 해당 component에 속하며 custom Hook 자체가 저장소를 만드는 것은 아니다.

subscribe를 module에 두면 같은 함수가 전달되어 불필요한 재구독을 피한다. userId처럼 구독 대상이 바뀌면 그 입력을 dependency로 둔 useCallback을 사용한다. 함수 identity를 감추려고 필요한 대상 변경까지 생략하지 않는다. getSnapshot도 현재 선택과 store revision에 맞는 데이터를 읽어야 한다.

### server snapshot의 전달

getServerSnapshot이 server에서 true를 반환하고 hydration에서도 true를 반환하는 online status 예제는 초기 HTML의 표시 기준을 정한 것이다. server가 browser의 실제 연결 상태를 안다는 뜻이 아니다. store 데이터를 반환할 때는 server가 사용한 값을 client에게 전달하여 동일한 초기 내용을 읽어야 한다.

server HTML에 직렬화한 initial store를 포함하거나 framework의 data 전달 계약을 사용할 수 있다. `<script>`를 직접 작성한다면 사용자 데이터의 안전한 직렬화와 escaping이 필요하다. hydration의 store를 다시 API로 조회해서 다른 값이 나오는 방식은 최초 snapshot 일치를 대신하지 못한다.

### Transition와 Suspense의 경계

비긴급 Transition 동안 store가 바뀌면 React는 commit 직전에 getSnapshot을 다시 확인한다. 처음 읽은 값과 다르면 **blocking update로 다시 시작**하여 화면의 component들이 같은 store 버전을 읽게 한다. 외부 store mutation을 startTransition으로 감쌌다는 이유만으로 React state와 같은 비긴급 versioning을 얻는 것은 아니다.

store 값에 따라 `use(fetch(...))` 또는 lazy component를 선택해 suspend하는 패턴은 권장하지 않는다. 외부 mutation은 비긴급 Transition으로 표시할 수 없어 가까운 Suspense fallback이 이미 보이던 content를 대체할 수 있다. 데이터 요청/navigation의 pending UI는 React state/router 경계와 함께 설계한다.

### useSyncExternalStore 문제 진단과 이해 확인

- cached snapshot 경고: 데이터 변경 없이 getSnapshot이 매번 새 object를 만드는지 확인한다.
- render마다 재구독: inline subscribe function identity를 확인하고 module/useCallback으로 옮긴다.
- hydration mismatch: server snapshot의 내용과 초기 client snapshot 전달 경로를 대조한다.
- 예상보다 blocking: Transition 중 store version 변화와 commit 직전 재확인을 확인한다.
- 구독 해제 후에도 callback 실행: unsubscribe와 실제 library cleanup이 같은 listener를 제거하는지 확인한다.

1. store 미변경 상태에서 getSnapshot을 여러 번 호출한 결과의 `Object.is`와 변경 이후 참조를 비교한다.
2. mount/unmount, 구독 대상 변경과 browser offline 시작을 각각 확인한다.
3. server snapshot 없이 SSR하는 경우와 데이터가 다른 hydration의 오류를 구분한다.

## useDebugValue 계약

`useDebugValue(value, format?)`는 custom Hook이 React DevTools에서 보여 줄 label을 지정하며 반환값은 없다. value는 임의 타입이다. 선택적 format은 DevTools가 component를 **실제로 inspect할 때** value 하나를 받아 표시용 결과를 반환한다. formatter가 없으면 value 그대로 표시한다.

```jsx
import { useDebugValue, useSyncExternalStore } from 'react';

const useStoreStatus = store => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useDebugValue(snapshot, value => {
    return `revision=${value.revision}, items=${value.items.length}`;
  });
  return snapshot;
};
```

store의 snapshot은 위 불변성 계약을 지켜야 한다. 반환값은 여전히 snapshot이며 DevTools label이 UI state가 되는 것은 아니다. `useDebugValue(date, date => date.toDateString())`처럼 formatting을 함수로 넘기면 inspect하지 않은 render에서 비용을 피할 수 있다. `useDebugValue(expensiveFormat(value))`는 argument 계산이 매 render 발생한다.

### 사용 범위와 이해 확인

공유 library의 복잡한 custom Hook 내부 구조를 사람이 해석하기 쉽게 만들 때 유용하다. 모든 단순 useState wrapper에 label을 추가할 필요는 없다. custom Hook 최상위에서 호출하고 조건부 inspect 여부를 코드로 추측해 Hook 호출을 바꾸지 않는다. 사용자 민감 정보를 DevTools label에 불필요하게 노출하지 않는다.

label이 화면에 안 보이는 것은 정상이다. React DevTools의 해당 component/custom Hook에서 확인한다. format이 호출되지 않으면 component를 inspect했는지 확인한다. 이미 render에서 실행한 formatting 비용을 formatter의 지연 실행이 줄여 주지는 않는다.

**이해 확인:** inspect하지 않은 render와 inspect 시 formatter 실행을 비교한다. label을 제거해도 Hook의 데이터 반환/구독/화면 결과는 같은 이유를 설명한다.

## 출처

- [React, useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [React, useDebugValue](https://react.dev/reference/react/useDebugValue)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Custom-Hooks|custom Hook과 online 구독]]
- [[React-State-Management|state owner와 구독 위치]]
- [[React-Transitions-and-Deferred-Values|비긴급 update]]
