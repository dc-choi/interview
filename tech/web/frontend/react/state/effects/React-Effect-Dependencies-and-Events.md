---
tags: [web, frontend, react, effect, dependency, effect-event]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Effect Dependencies and Events", "React dependency와 Effect Event"]
---

# React dependency와 Effect Event

## reactive value와 재동기화

Effect의 dependency는 임의로 선택하는 실행 스위치가 아니라 그 Effect가 읽는 reactive value를 기술한다. props, state, Context에서 얻은 값과 component render 중 만든 변수/함수도 해당한다. `selectedServerUrl ?? settings.defaultServerUrl`처럼 계산한 값 역시 render 결과에 따라 바뀔 수 있으므로 reactive하다.

이전 실행의 cleanup은 그 실행이 기억한 값을 정리하고, 새 setup은 이번 render의 값을 읽는다. cleanup에 최신 state가 적용된다고 가정하지 않는다. dependency 비교는 같은 위치의 값을 `Object.is`로 비교한다.

| 값 | dependency 판단 |
|---|---|
| Effect에서 읽는 props/state/계산 값 | 변경에 맞춰 동기화하려면 포함한다 |
| module에 정의한 고정 상수/함수 | render에 따라 바뀌지 않으므로 제외할 수 있다 |
| 같은 component의 `useState` setter, `useRef` object | identity가 안정적이며 linter가 확인할 수 있으면 생략 가능하다 |
| 부모가 prop으로 전달한 ref/function | 부모가 바꿀 수 있으므로 같은 안정성을 가정하지 않는다 |
| `ref.current`, 전역 mutable 값 | 변경이 render를 예약하지 않으므로 배열에 넣어도 구독이 되지 않는다 |
| Effect Event | dependency에 넣지 않는다. 일반 callback identity와 다른 계약이다 |

`location.pathname`이나 외부 store의 mutable 값은 React에 변화를 알리지 않고 바뀔 수 있다. 이를 dependency에 적는 것으로 감지 기능이 생기지는 않는다. router의 reactive API나 `useSyncExternalStore`처럼 구독하는 API를 사용한다.

## dependency를 줄이는 순서

`exhaustive-deps` 경고를 끄거나 `[]`로 강제하면 첫 render의 closure를 계속 쓰는 문제가 생길 수 있다. dependency를 바꾸기 전에 로직과 선언 위치를 바꾸고, 그 결과를 배열에 반영한다.

1. 특정 submit/click 때문이라면 [[React-State-Effects-and-Events#event handler|event handler]]로 옮긴다.
2. 서로 다른 외부 시스템이나 조회 조건을 맞추고 있다면 Effect를 독립적인 과정으로 나눈다.
3. 이전 state로 다음 state를 계산할 뿐이면 updater로 직접 읽기를 제거한다.
4. 객체/함수가 의미 없이 매 render 새로 만들어지는지 확인한다.
5. 동기화 조건은 유지하면서 외부 이벤트 처리 시점의 최신 값이 필요하면 Effect Event로 나눈다.

### independent synchronization process

국가에 따른 도시 조회와 도시에 따른 지역 조회를 하나로 묶어 `[country, city]`로 실행하면 city 변경 때 국가의 도시 목록도 다시 조회한다. 각각 country, city에 의존하는 별도 Effect로 두고 각 요청을 정리한다. 행성/장소 select도 같은 구조다. 코드 재사용은 [[React-Custom-Hooks|custom Hook]]에서 처리한다.

### updater로 이전 state 읽기 제거

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.on('message', received => {
    setMessages(current => [...current, received]);
  });
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

`setMessages([...messages, received])`를 쓰면 messages가 dependency가 되어 메시지마다 재연결한다. updater는 React가 queue를 처리할 때 이전 state를 인자로 받으므로 Effect에서 messages를 읽을 필요가 없다. 이것으로 roomId, isMuted 같은 **다른 값을 직접 읽는 의존성까지** 제거되는 것은 아니다.

매초 `setCount(count + 1)`을 하고 `[count]`를 두어 interval을 재생성하는 문제도 `setCount(current => current + 1)`로 해결할 수 있다. 일정한 증가량이면 추가 Hook 없이 충분하다.

### 객체와 함수의 identity

```js
Object.is({ roomId: 'general' }, { roomId: 'general' }); // false
Object.is('general', 'general'); // true
```

객체와 함수는 내용이 같아도 새로 만들면 다른 identity다. Effect dependency가 되는 `options`를 render마다 만들면 message 입력이나 theme 변경에도 재연결한다.

| 값의 성격 | 조정 방법 |
|---|---|
| props/state를 읽지 않는 고정 객체/함수 | component 밖으로 옮긴다 |
| roomId 같은 reactive 값으로 만드는 객체/함수 | Effect 안에서 만들고 실제 입력을 dependency로 둔다 |
| 부모가 넘긴 객체 | 필요한 primitive 값을 render에서 꺼내고 Effect 안에서 API용 객체를 만든다 |
| 순수한 `getOptions()`가 반환하는 객체 | render에서 호출해 primitive 값을 꺼낼 수 있다 |
| 호출에 side effect가 있는 handler 함수 | render에서 호출하지 않는다. 외부 이벤트 callback이면 Effect Event 가능 여부를 판단한다 |

```jsx
const { roomId, serverUrl } = options;
useEffect(() => {
  const connection = createConnection({ roomId, serverUrl });
  connection.connect();
  return () => connection.disconnect();
}, [roomId, serverUrl]);
```

이 코드는 options 자체가 새로 만들어져도 실제 방과 서버가 같으면 연결을 유지한다. 재동기화 조건을 분명하게 표현할 수 있다면 primitive prop을 직접 받는 API도 검토한다. 실제 consumer가 identity를 필요로 하기 전부터 모든 함수를 `useCallback`으로 감싸지는 않는다.

## Effect Event로 최신 값과 재동기화 조건 나누기

사용자는 roomId가 바뀌면 재연결을 원하지만 알림 theme가 바뀌었다고 재연결을 원하지 않을 수 있다. theme를 dependency에서 몰래 빼면 오래된 theme를 읽는다. `useEffectEvent`는 외부 사건 처리에 필요한 최신 committed props/state를 읽으면서 그 값의 변경만으로 Effect를 다시 시작하지 않게 한다.

```jsx
import { useEffect, useEffectEvent } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ roomId, theme }) => {
  const onConnected = useEffectEvent(connectedRoomId => {
    showNotification(`연결된 방: ${connectedRoomId}`, theme);
  });
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected(roomId));
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
  return <h1>{roomId}</h1>;
};
```

roomId는 연결의 조건이므로 Effect에서 읽고 배열에 둔다. theme는 연결됐을 때 알림을 표현하는 조건이므로 Effect Event에서 최신 값을 읽는다. theme 변경 자체가 알림을 보내거나 재연결하는 원인이 되지는 않는다.

### 당시 값과 최신 값 구분

지연 알림에서 방 이름까지 Effect Event 내부의 roomId를 읽으면 이전 방에서 예약한 알림이 새 방의 이름을 보여줄 수 있다. 사건을 식별하는 roomId/visitedUrl은 Effect에서 인자로 전달하고, theme/cart item count 같은 부가 정보만 최신 값으로 읽는다.

```jsx
const onVisit = useEffectEvent(visitedUrl => {
  logVisit(visitedUrl, numberOfItems);
});
useEffect(() => {
  const id = setTimeout(() => onVisit(url), 1000);
  return () => clearTimeout(id);
}, [url]);
```

여기서는 URL이 바뀌면 아직 실행되지 않은 이전 방문 로그를 취소한다. 모든 방문을 보존해야 한다면 취소 정책이 달라지므로 제품의 집계 의도를 먼저 정한다. 인자로 넘긴 URL은 예약한 실행의 값이고 item count는 호출 시점의 최신 값이다.

### timer와 조건부 listener

interval의 delay는 변경되면 timer를 다시 만들어야 하지만 tick 때의 increment는 timer를 재설정하지 않고 최신 값으로 읽을 수 있다.

```jsx
const onTick = useEffectEvent(() => {
  setCount(current => current + increment);
});
useEffect(() => {
  const id = setInterval(() => onTick(), delay);
  return () => clearInterval(id);
}, [delay]);
```

increment를 dependency로 둔 구현도 값은 맞지만, 1초가 되기 전에 계속 변경하면 timer가 반복 초기화되어 tick이 멈춘 것처럼 보인다. 반대로 delay까지 Effect Event 안에 숨기면 주기를 변경해도 timer가 다시 생성되지 않는다. **재동기화해야 하는 입력을 숨기지 않는 것**이 핵심이다.

pointer listener에서 canMove 변경 때 구독을 끊어야 한다면 Effect에서 canMove를 읽고 `[canMove]`로 재동기화한다. 같은 구독을 유지하면서 callback 처리만 중단한다면 Effect Event에서 최신 canMove를 읽을 수 있다. 두 방식은 자원의 활성 여부가 다르다.

### callback prop와 연결 설정 구분

부모가 매 render 새 `onReceiveMessage`를 전달해도 연결을 다시 만들 필요가 없다면 Effect/Hook 안에서 해당 호출을 Effect Event로 감싼다. 반면 암호화 설정에 따라 달라지는 createConnection까지 비반응으로 감싸면 설정 변경이 무시된다. `isEncrypted`와 roomId를 입력으로 전달하고 Effect 안에서 연결 API를 선택해야 한다.

animation도 시작 시점의 duration만 필요한지, 진행 중 duration 변경을 즉시 반영해야 하는지에 따라 재동기화 조건이 달라진다. dependency의 많고 적음만으로 최적화를 판단하지 않는다.

## Effect Event의 제한

`useEffectEvent(callback)`은 callback과 같은 인자/반환 signature의 함수를 반환한다. 이 함수는 최신 **committed render**를 읽는다. 다른 render에서 계산했지만 아직 commit하지 않은 값의 최신성을 보장하는 뜻은 아니다. 정확한 호출 위치와 lint 오류별 진단은 [[React-Effect-Hook-Contracts#useEffectEvent 계약|API 계약]]을 따른다.

- `useEffectEvent`는 component/custom Hook 최상위에서 선언하고 사용하는 Effect 가까이에 둔다.
- 반환한 함수는 로컬 Effect나 그 Effect가 등록한 timer/listener callback에서 호출한다. 다른 Effect Event에서도 호출할 수 있다. render나 사용자 click handler에서 호출하지 않는다.
- Effect Event 자체를 다른 component나 custom Hook에 전달하지 않는다. Hook에는 일반 callback을 전달하고 Hook 내부에서 감싼다.
- Effect Event는 dependency에 넣지 않는다. 현재 공식 reference의 함수 identity는 매 render 달라지므로 stable callback이라는 이유로 설명하지 않는다.
- 불필요한 재실행을 피하기 위한 보편적인 도구가 아니다. 외부 사건 처리에 해당하는 비반응 부분에 사용한다. linter 경고를 피하려고 reactive 연결 조건을 옮기지 않는다.
- `onTick`, `onConnected`, `onVisit`처럼 사건의 의미로 이름 짓는다. `onMount`처럼 실행 시점만 이름에 담으면 reactive 작업을 숨기기 쉽다.

API 예제는 현재 React 문서 기준이며 적용할 프로젝트에서 React와 Hook lint 설정의 지원을 확인한다. 구버전 프로젝트에 예제를 그대로 넣기보다 기존 dependency/cleanup을 맞추는 해법부터 검토한다.

## 이해 확인

1. theme 변경에 채팅이 다시 연결된다. 원인이 callback theme 읽기인지 매 render 만든 options identity인지 구분하고 각각 알림의 Effect Event 또는 primitive dependency로 해결한다.
2. mute 변경은 재연결하지 않고 다음 메시지부터 적용되는가? room 변경은 새 연결을 만드는가? 서로 다른 반응 조건을 따로 확인한다.
3. 1초가 되기 전 increment를 연속 변경해도 tick은 계속되고, delay 변경에는 timer가 새 주기를 따르는지 확인한다.
4. 오래된 방의 지연 알림에서 당시 방과 최신 theme를 구분해 보여주는가? 이전 알림 취소가 요구된다면 timeout cleanup도 확인한다.
5. `[]` Effect가 오래된 값을 읽으면 linter 억제를 먼저 확인한다. 함수가 무엇을 읽는지 추적하고, updater만으로 다른 prop의 최신 값 문제도 해결됐다고 판단하지 않는다.

## 출처

- [React, Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [React, Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)
- [React, Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)
- [React, useEffectEvent](https://react.dev/reference/react/useEffectEvent)

## 관련 문서

- [[React-Effects-and-Custom-Hooks|외부 시스템 동기화와 불필요한 Effect]]
- [[React-Custom-Hooks|custom Hook]]
- [[React-Refs-and-DOM|ref와 DOM]]
- [[React-State-Effects-and-Events|state, event와 form]]
