---
tags: [web, frontend, react, custom-hook, effect, subscription]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Custom Hooks", "React custom Hook"]
---

# React custom Hook

## stateful logic의 재사용

custom Hook은 Hook을 사용하는 로직을 함수로 추출해 component들이 같은 동작을 재사용하게 한다. `use` 다음에 대문자로 시작하는 이름을 쓴다. component가 `useOnlineStatus()`로 필요한 값을 선언하면 구독과 cleanup의 구현을 직접 다루지 않아도 된다. Hook은 JSX뿐 아니라 임의의 값을 반환할 수 있다.

custom Hook은 component render의 일부로 호출되므로 본문도 순수해야 한다. Hook에 전달한 props/state는 다음 render에서 최신 입력이 되고, Hook 안의 Effect도 해당 reactive dependency를 따라 재동기화한다. 외부 동작을 Hook 함수의 본문에서 바로 수행하는 것은 추출 전과 동일하게 잘못된 render side effect다.

- `useState`, `useEffect`와 custom Hook은 function component 또는 custom Hook 최상위에서 호출한다. 조건, loop와 event handler 안에서 호출하지 않는다.
- Hook을 사용하지 않는 순수한 정렬 함수는 `getSorted()`처럼 일반 함수로 둔다. render 중 부르는 모든 함수에 `use`를 붙일 필요는 없다.
- 구현이 단순하더라도 확정된 API 계약상 Hook이 될 함수에는 호출 제약을 유지할 수 있다. 추측만으로 모든 함수를 Hook으로 만들지는 않는다.
- Hook 호출 순서의 이해 모델은 [[React-State-Effects-and-Events#Hook 호출 순서와 함수 identity|Hook 호출 규칙]]을 따른다.

## 로직 공유와 state 공유의 차이

같은 custom Hook을 두 번 호출해도 내부 state가 하나로 합쳐지지 않는다. 각 호출은 독립적인 state/Effect를 만든다. online status처럼 같은 외부 source를 구독하면 값이 동시에 변할 수 있지만 이것을 공유 state라는 뜻으로 해석하지 않는다.

```jsx
import { useState } from 'react';

const useFormInput = initialValue => {
  const [value, setValue] = useState(initialValue);
  return { value, onChange: event => setValue(event.target.value) };
};
const Form = () => {
  const firstInput = useFormInput('');
  const secondInput = useFormInput('');
  return <>
    <label>첫 입력 <input {...firstInput} /></label>
    <label>둘째 입력 <input {...secondInput} /></label>
  </>;
};
```

첫 input의 값이 바뀌어도 둘째 input은 바뀌지 않는다. `useState` 한 번을 감싸는 것만으로 별도 Hook이 필요한 것은 아니며 이 예제는 호출의 독립성을 설명한다. 실제 값을 여러 component가 함께 소유해야 하면 state를 올리고 props/Context/store로 전달한다.

## 입력과 외부 callback의 경계

`useChatRoom({ roomId, serverUrl, onReceiveMessage })`의 roomId/serverUrl는 연결 조건이다. 변경되면 기존 연결을 끊고 다시 연결해야 한다. message callback은 도착한 사건을 표현하는 로직이며 부모 render로 함수가 새로 만들어졌다고 연결을 다시 만들 필요가 없을 수 있다.

```jsx
import { useEffect, useEffectEvent } from 'react';
import { createConnection } from './chat.js';

const useChatRoom = ({ roomId, serverUrl, onReceiveMessage }) => {
  const onMessage = useEffectEvent(onReceiveMessage);
  useEffect(() => {
    const connection = createConnection({ roomId, serverUrl });
    connection.on('message', message => onMessage(message));
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, serverUrl]);
};
```

Effect Event는 Hook 내부에서 선언하고 로컬 Effect가 등록한 callback에서 호출한다. 호출자는 일반 함수를 전달한다. component에서 Effect Event를 만든 뒤 이 Hook에 넘기지는 않는다. 부가 표시 값이 최신으로 읽히는 것과 연결 조건이 재동기화되는 것의 차이는 [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]를 따른다.

## 목적별 Hook과 추출 기준

`useChatRoom`, `useOnlineStatus`, `useMediaQuery`, `useIntersectionObserver`처럼 입력과 동작이 드러나는 API를 먼저 정한다. 이름을 붙이기 어렵고 component state 대부분을 넘겨야 한다면 책임이 아직 충분히 분리되지 않았을 수 있다.

- 외부 시스템의 구독, 오류 처리와 cleanup이 반복되거나 하나의 목적을 드러낼 수 있을 때 추출한다.
- 코드가 비슷해도 서로 다른 조건에 맞추는 Effect를 하나로 합치지 않는다. 도시 조회와 지역 조회는 같은 조회 Hook을 **각각 호출**해 독립적인 동기화 조건을 유지한다.
- `useMount(fn)`, `useEffectOnce(fn)`, `useUpdateEffect(fn)`처럼 시점만 감싸는 Hook은 dependency와 재동기화를 숨기기 쉽다. 효과의 목적을 표현하는 Hook을 사용한다.
- Hook으로 옮겼다는 사실만으로 재실행, 중복 요청과 오류가 해결되지 않는다. 이전 동작과 cleanup을 보존하고 입력/결과 계약을 확인한다.
- 단순 fade-in은 CSS animation으로 충분할 수 있다. 여러 animation을 조정하는 imperative 로직이 커지면 외부 객체/시스템이 그 동작을 담당하고 Hook은 시작/중단만 연결할 수도 있다.

조회 Hook은 URL을 입력으로 받고 data/loading/error를 반환하는 API를 둘 수 있다. 호출자마다 raw Effect를 반복하는 것보다 cache나 framework 조회 방식으로 내부를 바꾸기 쉽다. 추출만으로 server fetching, deduplication과 waterfall까지 해결됐다고 보지는 않는다.

### Promise 읽기와 조회 API의 교체

현재 React의 `use(promise)`는 Promise의 결과를 render에서 읽고, pending이면 Suspense fallback, 실패면 Error Boundary로 연결한다. 매 render 새 Promise를 만드는 `use(fetch(url))`를 일반적인 client 조회 해법으로 복사하지 않는다. cache, framework나 Server Component에서 제공한 동일한 Promise instance를 다시 사용할 수 있어야 한다.

목적별 조회 Hook의 입력/출력 계약을 정해 두면 이런 데이터 읽기 방식으로 내부를 교체할 때 component 수정 범위를 줄일 수 있다. 학습 문서에 있는 미래의 조회 형태와 현재 프로젝트에서 지원하는 데이터 계층을 구분한다.

## 외부 store 구독을 전용 API로 구현하기

snapshot은 immutable해야 하고 변경이 없으면 같은 참조를 반환해야 한다. 매번 새 object를 만드는 getSnapshot은 render loop를 만들 수 있다. SSR의 초기 snapshot 전달, Transition 도중 blocking 재시작과 재구독 진단은 [[React-External-Store-and-Debug-Hooks#useSyncExternalStore 계약|외부 store 계약]]에 있다. 복잡한 공유 Hook의 DevTools label이 필요할 때는 [[React-External-Store-and-Debug-Hooks#useDebugValue 계약|useDebugValue]]로 inspect 시점의 formatting을 제공할 수 있다.

mutable 외부 값은 React 밖에서 바뀐다. `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`는 변화 알림 구독과 현재 snapshot 읽기를 연결한다. subscribe는 unsubscribe를 반환하고, server snapshot은 server rendering과 hydration에 사용할 기준을 제공한다.

```jsx
import { useSyncExternalStore } from 'react';

const subscribe = callback => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};
const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;
export const useOnlineStatus = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
```

subscribe를 module에 두면 render마다 새 구독 함수를 넘기는 것을 피한다. 이 예제의 server snapshot `true`는 초기 HTML의 표시 기준이며 server가 사용자 browser의 현재 연결 상태를 안다는 뜻은 아니다. snapshot은 같은 외부 값에 대해 안정된 결과를 반환해야 한다.

state의 초기값을 true로 두고 online/offline event만 기다리는 구현은 시작부터 offline인 사용자의 값을 놓칠 수 있다. 위 방식은 현재 browser snapshot을 읽는다. Hook의 반환 계약이 같은 boolean이라면 내부를 수동 Effect에서 전용 구독 API로 바꿔도 호출 component를 바꿀 필요가 없다.

## interval Hook의 합성

counter state 갱신과 interval 자원 관리를 분리한다. delay 변경은 timer를 다시 만들고, callback 변경은 다음 tick에서 최신 callback을 실행한다. `null`을 pause 값으로 쓰는 아래 API는 정지 의도를 명시한다.

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

const useInterval = (callback, delay) => {
  const onTick = useEffectEvent(callback);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => onTick(), delay);
    return () => clearInterval(id);
  }, [delay]);
};
const useCounter = delay => {
  const [count, setCount] = useState(0);
  useInterval(() => setCount(current => current + 1), delay);
  return count;
};
```

매 render 새 callback이 dependency가 되어 timer를 초기화하면 1초 counter 때문에 함께 사용하는 2초 interval이 실행될 기회를 잃을 수 있다. Effect Event는 이 callback의 의미가 재설정 조건이 아니라 tick 동작일 때 사용한다. fixed callback에 updater만 필요한 단순 counter라면 raw Effect도 충분하다.

## 지연된 값과 debounce 구분

`usePointerPosition()`의 결과를 `useDelayedValue(position, delay)`에 넣으면 한 Hook의 출력이 다른 Hook의 입력이 된다. 각 호출의 state가 독립적이므로 같은 위치 입력을 서로 다른 delay로 처리하거나 앞의 지연 출력을 다음 Hook에 넣어 움직임의 경로를 만들 수 있다.

| 동작 | 예약 처리 | 결과 |
|---|---|---|
| debounce | 입력이 바뀔 때 이전 timeout을 취소 | 멈춘 뒤 마지막 값만 반영한다 |
| 지연된 경로 재생 | 각 변경의 timeout을 유지 | 각 위치가 일정 시간 뒤 차례로 반영된다 |

모든 Effect에 동일한 timeout cleanup을 넣으면 이 두 계약을 바꿔 버릴 수 있다. 연속 이동의 후행 경로를 표현하는 경우 이전 위치의 예약을 매 변경 취소하지 않는다. 실제 사용에서는 화면이 사라질 때 pending 작업을 정리할지, 입력 이벤트 빈도와 예약 수를 제한할지까지 따로 판단한다. 교육용 지연 예제를 보편적인 데이터 동기화나 debounce 구현으로 사용하지 않는다.

## 이해 확인

1. 같은 useFormInput을 두 번 호출했는데 한 입력이 다른 입력도 바꾼다면 공유한 module state나 잘못 전달한 props를 확인한다. Hook 추출 자체가 state를 공유하지는 않는다.
2. room/server 변경은 재연결하고 부모의 알림 callback 변경은 연결을 유지하면서 최신 동작을 적용하는지 확인한다.
3. 1초 counter와 2초 배경 interval을 함께 사용해 두 timer가 서로의 render 때문에 초기화되지 않는지 확인한다.
4. offline 상태에서 시작하고 online/offline을 전환했을 때 최초 snapshot과 구독 변경이 UI에 반영되는지 확인한다.
5. 후행 움직임과 debounce를 각각 빠른 연속 입력으로 확인한다. 취소 여부에 따라 중간 값이 보존되는지 설명한다.

## 출처

- [React, Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React, You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React, useEffectEvent](https://react.dev/reference/react/useEffectEvent)
- [React, useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [React, use](https://react.dev/reference/react/use)

## 관련 문서

- [[React-Effects-and-Custom-Hooks|Effect와 외부 시스템 동기화]]
- [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]
- [[React-Refs-and-DOM|ref와 DOM]]
- [[React-State-Management|공유 state 관리]]
- [[React-Server-State-and-API|server state와 API]]
