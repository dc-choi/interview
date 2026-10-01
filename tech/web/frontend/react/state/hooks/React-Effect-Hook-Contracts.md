---
tags: [web, frontend, react, effect, effect-event, lifecycle]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Effect Hook Contracts", "React Effect Hook 계약"]
---

# React Effect Hook 계약

외부 동기화와 불필요한 Effect 제거는 [[React-Effects-and-Custom-Hooks|Effect의 책임]], dependency 조정은 [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]], 재사용은 [[React-Custom-Hooks|custom Hook]]을 따른다. 여기서는 API 계약과 구체적인 외부 자원의 경계를 정한다.

## useEffect 계약

`useEffect(setup, dependencies?)`는 undefined를 반환한다. setup은 동기화 시작 로직이며 선택적으로 cleanup 함수를 반환한다. component가 commit되면 setup, dependency가 바뀐 commit 뒤에는 **이전 값의 cleanup 후 새 값의 setup**, 제거 뒤에는 마지막 cleanup을 실행한다.

dependencies는 setup이 사용하는 props/state와 component 본문의 reactive 변수/function 전체를 고정 길이 inline 배열에 적는다. 각 값은 `Object.is`로 비교한다. 배열 생략은 매 commit, `[]`는 reactive 입력 없는 해당 mount의 동기화, `[a, b]`는 해당 입력 변화에 따른 재동기화다. component/custom Hook 최상위에서 선언하고 조건이 필요하면 setup 안에서 검사한다.

```jsx
useEffect(() => {
  if (!isOpen) return;
  const dialog = dialogRef.current;
  dialog.showModal();
  return () => dialog.close();
}, [isOpen]);
```

Effect가 동기화하는 값은 isOpen이고, cleanup은 **그 실행에서 연 dialog**를 닫는다. 매 실행에서 최신 ref를 다시 추측해 다른 node를 정리하지 않는다. 개발 Strict Mode의 추가 setup/cleanup으로 자원이 중복되면 정리 계약을 고친다. 실행을 ref로 한 번만 허용해 감추지 않는다.

### paint와 server의 경계

interaction이 아닌 Effect는 일반적으로 browser paint를 먼저 허용한다. interaction에서 비롯된 Effect는 paint 전에 실행될 수 있고, 그 안의 setter가 처리되기 전에 paint가 일어날 수도 있다. useEffect를 paint 뒤라는 절대 시점으로 사용하지 않는다. paint를 막아 위치 측정을 완료해야 하면 useLayoutEffect, alert처럼 뒤로 미룰 필요가 있으면 timer 경계를 검토한다.

Effects는 server rendering에서 실행되지 않는다. SSR와 첫 hydration render는 같은 output이어야 한다. client-only storage가 필요한 UI는 첫 render를 공통 fallback으로 두고 Effect에서 mounted를 바꾼 뒤 표시할 수 있다. 느린 connection에서 fallback과 전환이 오래 보일 수 있으므로 필요한 경우에만 사용하고 CSS만으로 가능한 표시 차이도 검토한다.

### 외부 자원의 구체적인 적용

| 외부 시스템 | setup와 cleanup |
|---|---|
| 채팅 연결 | 선택 server/room으로 connect, 이전 connection disconnect |
| window pointer listener | handler 등록, **같은 함수**로 해제 |
| interval | timer 생성, 반환한 timer id로 clear |
| animation 객체 | 현재 DOM ref로 instance 생성/start, 해당 animation stop |
| dialog | isOpen일 때 showModal, 해당 dialog close |
| IntersectionObserver | node observe, 같은 observer disconnect |
| map/video 등 widget | instance의 imperative API를 현재 props에 맞춰 호출 |

observer의 callback은 entry의 isIntersecting을 읽고 threshold가 전체 노출인지 일부 노출인지 선택한다. 특정 node 기준 구독을 custom Hook으로 추출하면 결과 state와 화면 표시 로직을 나눌 수 있다. custom Hook에서도 listener callback이 매 render 바뀌면 dependency에 따라 재등록되는 것이 정상이다. callback을 Effect Event로 바꿀지는 **재등록 조건이 아니라 외부 사건의 최신 처리**인지 판단한다.

MapWidget 같은 객체가 전달받은 DOM node만 소유하고 외부 구독/자원을 만들지 않는 계약이면 node와 instance의 garbage collection으로 정리가 충분할 수 있다. 소켓, 전역 listener나 별도 resource를 유지하는 실제 library까지 cleanup 불필요라고 일반화하지 않는다. zoomLevel이 바뀌면 같은 instance의 setZoom을 호출하고 instance 수명과 props 동기화를 구분한다.

### async 조회와 순서

setup 자체를 async 함수로 만들면 cleanup 대신 Promise를 반환하므로 안에서 async 함수를 선언/호출하고 cleanup은 동기적으로 반환한다. 각 실행에 ignore flag를 두어 이전 query의 늦은 성공/실패가 최신 UI를 덮지 않게 한다. 실제 요청 취소와 응답 반영 무시는 다른 계약이다.

```jsx
useEffect(() => {
  let ignore = false;
  setResult(null);
  loadResult(query).then(
    value => { if (!ignore) setResult(value); },
    error => { if (!ignore) setError(error); }
  );
  return () => { ignore = true; };
}, [query]);
```

이 예제의 loading/error reset과 이전 결과 유지 정책은 제품에 맞춰 보완한다. raw Effect 조회는 SSR data, cache, dedup와 preload를 제공하지 않고 parent fetch 뒤 child fetch의 waterfall을 만들기 쉽다. framework 조회 API 또는 client cache를 먼저 검토하고, 직접 조회한다면 각 정책을 명시한다.

### dependency 조정과 문제 진단

이전 state를 다음 state 계산에만 읽으면 updater로 읽기를 제거한다. 객체/함수가 Effect에서만 필요하면 setup 안에서 만들어 실제 primitive dependency를 둔다. 고정 module 상수는 render에 따라 바뀌지 않는다. 최신 부가값을 외부 사건에서 읽을 때만 Effect Event를 검토한다. 이를 dependency 삭제의 편법으로 쓰지 않는다.

- 매 render 재실행: 배열 누락과 값별 `Object.is`를 검사한다. object/function identity가 실제 원인인지 본다.
- 무한 loop: Effect가 state를 바꾸고 그 state가 dependency를 바꾸는 두 조건을 찾는다. 외부 시스템이 없다면 Effect 제거를 먼저 검토한다.
- unmount 전에 cleanup: dependency 변화와 개발 검사의 정상 수명이다. setup 없이 cleanup만 하는 로직은 책임을 다시 확인한다.
- flicker: DOM 측정을 paint 전에 끝내야 하는지 확인하고 좁은 layout Effect로 옮긴다.

**이해 확인:** room/server 변경과 입력 text 변경을 각각 실행해 연결 수를 비교한다. 빠른 query A/B 조회에서 A 응답을 늦춰도 B 결과와 오류가 보존되는지 확인한다. Strict Mode 재시작 뒤 listener/timer가 하나인지 설명한다.

## useEffectEvent 계약

`useEffectEvent(callback)`은 callback과 **같은 인자/반환 signature**의 Effect Event 함수를 반환한다. callback은 임의 인자와 값을 사용하고, 호출할 때 그 시점의 **최신 committed render**의 props/state를 읽는다. render 중 임시로 계산한 미commit 값을 보장하는 API가 아니다.

component/custom Hook 최상위에서 선언해 같은 component의 useEffect/useLayoutEffect/useInsertionEffect 또는 다른 Effect Event에서 호출한다. 해당 Effect가 등록한 timer/listener callback에서도 호출할 수 있다. render, 사용자 click handler와 다른 component/Hook으로의 전달은 허용하지 않는다.

### identity와 비반응 부분

Effect Event function identity는 **매 render 바뀌도록 설계되어 있다**. stable callback이 아니다. dependency에 넣으면 불필요한 재실행을 일으키고 linter도 금지한다. 일반 child callback이나 custom Hook의 반환 API가 필요하면 일반 함수/useCallback을 사용한다.

```jsx
const onConnected = useEffectEvent(connectedRoom => {
  if (!muted) notify(connectedRoom, theme);
});
useEffect(() => {
  const connection = createConnection(roomId);
  connection.on('connected', () => onConnected(roomId));
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

room 변경은 재연결 조건이라 dependency로 남긴다. muted/theme는 연결 사건에서 최신 표시 조건으로 읽고, 변경 자체로 재연결하지 않는다. connectedRoom은 사건 당시 값을 인자로 보존한다. 로컬 Effect Event 함수가 바뀌어도 이전 구독 callback에서 호출하면 최신 committed callback 로직을 사용한다.

### timer, listener와 custom Hook

timer는 delay 변경 때 다시 만들되 tick의 increment는 최신값으로 읽을 수 있다. pointer listener는 구독을 유지하며 최신 canMove로 이동 처리만 막을 수 있다. canMove가 false일 때 구독 자체를 해제해야 한다면 해당 값을 Effect의 dependency로 둬야 한다. 자원 활성화와 사건 처리 조건은 다르다.

custom `useInterval(callback, delay)`는 일반 callback을 받아 내부에서 useEffectEvent로 감싼다. caller가 이미 Effect Event를 만든 뒤 Hook에 넘기지 않는다. `delay === null`의 pause 계약과 clearInterval cleanup은 별도로 유지한다. updater만으로 고정 증가량을 처리할 수 있다면 추가 Effect Event 없이 충분하다.

### useEffectEvent 문제 진단과 이해 확인

render 호출 오류는 render 계산을 Effect Event로 감싼 것이 원인이다. dependency lint는 Event를 배열에서 제거하고 실제 연결 조건이 빠졌는지 다시 확인한다. click/child 전달 lint면 regular callback으로 바꾼다. 페이지 URL 로그를 `[]` Effect의 Event 안에 숨기면 URL 변경 방문을 놓친다. URL은 dependency, cart count 같은 부가값만 Event에서 읽는다.

**이해 확인:** theme/mute를 빠르게 바꿔도 연결은 유지되고 다음 사건은 최신 값을 읽는지 확인한다. delay 변경은 재예약되는지, 외부 listener의 활성 여부가 요구사항과 맞는지 비교한다. identity가 stable이 아닌 이유를 설명한다.

## 출처

- [React, useEffect](https://react.dev/reference/react/useEffect)
- [React, useEffectEvent](https://react.dev/reference/react/useEffectEvent)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Effects-and-Custom-Hooks|외부 동기화와 Effect 제거]]
- [[React-Effect-Dependencies-and-Events|dependency와 최신 값]]
- [[React-Custom-Hooks|custom Hook]]
- [[React-Layout-and-Insertion-Effects|paint와 style 삽입]]
