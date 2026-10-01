---
tags: [web, frontend, react, ref, dom]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Refs and DOM", "React ref와 DOM"]
---

# React ref와 DOM

## Escape hatch의 사용 범위

React는 props와 state에서 UI를 계산하고 commit으로 DOM을 맞춘다. ref와 Effect는 이 흐름만으로 처리할 수 없는 browser API, 외부 widget, connection과 연결하는 수단이다. 업무 데이터 흐름 대부분을 ref로 관리하면 React가 변화와 화면의 관계를 추적할 수 없게 된다.

| 목적 | 값이나 로직의 위치 |
|---|---|
| 화면에 표시할 값 기억 | state |
| props/state에서 만들 수 있는 표시 값 | render 중 계산 |
| 사용자 action 처리 | event handler |
| render와 무관한 timer id, DOM node 기억 | ref |
| 현재 화면 조건에 외부 시스템 맞추기 | Effect |

## useRef로 render와 무관한 값 기억하기

`useRef(initialValue)`는 `{ current: initialValue }` 형태의 object를 만들고 같은 component instance의 후속 render에서도 같은 object를 반환한다. `current`는 JavaScript property여서 바꾸면 즉시 읽을 수 있다. 변경을 알리는 setter가 없으므로 re-render를 예약하지 않는다. 화면 출력에 필요한 값은 state에 둔다.

- component 안의 일반 지역 변수는 render할 때 다시 초기화된다. 다음 handler에서도 필요한 timeout id를 저장하기에는 적절하지 않다.
- module 변수는 여러 component instance가 공유한다. debounce timer id를 module에 두면 한 버튼이 다른 버튼의 예약 작업을 취소한다.
- ref는 instance별로 유지된다. timeout 취소, interval 중단과 외부 객체 기억에 사용할 수 있다.
- 초기화를 제외하면 render 중 `ref.current`를 읽거나 쓰지 않는다. 같은 props/state에서 같은 JSX가 나오는 render의 성질이 깨진다. 값이 없을 때 한 번만 예측 가능하게 객체를 만드는 초기화는 예외다.
- `useRef`를 state에 담은 object로 생각할 수는 있지만 이는 이해를 위한 모델이며 React 내부 구현을 단정하는 설명은 아니다.

### stopwatch에서 state와 ref 나누기

시작 시각과 현재 시각은 화면의 경과 시간을 계산하므로 state에 둔다. interval id는 중단에만 사용하므로 ref에 둔다. Start를 다시 눌렀을 때 이전 interval을 먼저 지우고, component가 사라질 때도 정리한다.

```jsx
import { useEffect, useRef, useState } from 'react';

const Stopwatch = () => {
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(null);
  const intervalRef = useRef(null);
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleStart = () => {
    const time = Date.now();
    setStartedAt(time);
    setNow(time);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setNow(Date.now()), 50);
  };
  const seconds = startedAt === null ? 0 : (now - startedAt) / 1000;
  return <>
    <output>{seconds.toFixed(2)}</output>
    <button onClick={handleStart}>시작</button>
    <button onClick={() => clearInterval(intervalRef.current)}>중단</button>
  </>;
};
```

### 지연된 handler에서 최신 값 읽기

timeout callback이 state를 읽으면 예약한 render의 snapshot을 본다. 전송 버튼을 누른 시점의 내용이 필요한 경우에는 이 동작이 맞다. 실행 시점의 최신 입력이 필요한 경우에는 화면용 state와 최신 값용 ref를 함께 두고 입력 handler에서 둘을 갱신할 수 있다.

```jsx
const [text, setText] = useState('');
const textRef = useRef(text);
const handleChange = event => {
  const nextText = event.target.value;
  setText(nextText);
  textRef.current = nextText;
};
const handleSend = () => {
  setTimeout(() => alert(textRef.current), 1000);
};
```

다른 경로에서도 text를 변경한다면 ref 갱신을 놓치지 않아야 한다. ref 복제를 모든 state에 적용하지 않고 최신 값이 필요한 비동기 경계를 확인한다. Effect가 등록한 callback에서 최신 값을 읽는 문제는 [[React-Effect-Dependencies-and-Events#Effect Event로 최신 값과 재동기화 조건 나누기|Effect Event]]도 검토한다.

## DOM ref의 연결 시점

`<input ref={inputRef} />`를 반환하면 React가 commit에서 DOM node를 ref에 연결한다. 첫 render에는 아직 DOM이 없어 `current`가 `null`이며, update render 중에도 아직 이전 DOM일 수 있다. 영향을 받는 ref는 DOM 변경 전에 비우고 변경 후 해당 node로 연결한다. node가 제거되면 object ref는 `null`이 된다.

```jsx
const inputRef = useRef(null);
const handleSubmit = event => {
  event.preventDefault();
  save(inputRef.current.value);
};
// <form onSubmit={handleSubmit}><input ref={inputRef} /></form>
```

DOM은 보통 event handler나 Effect에서 읽는다. 검색 버튼의 click에서 `inputRef.current.focus()`를 호출하면 해당 instance의 input을 잡는다. 같은 component가 여러 번 사용될 때 `id`와 전역 `document.querySelector`로 찾으면 다른 instance를 잡거나 id가 중복될 수 있다. 화면 등장 시 focus를 옮겨야 한다면 [[React-Effects-and-Custom-Hooks#동기화와 cleanup|Effect]]에서 처리한다.

## 목록 ref와 callback cleanup

항목마다 `map()` 안에서 `useRef()`를 호출하면 Hook의 최상위 호출 규칙을 어긴다. 항목 수가 고정되지 않았다면 callback ref로 id와 node의 `Map`을 관리할 수 있다. 부모 ref에서 `querySelectorAll()`로 찾는 방법도 있지만 selector가 DOM 구조에 결합된다.

다음은 React 19 이상의 callback ref cleanup 형태다. node를 연결할 때 등록하고, 연결을 해제할 때 반환한 cleanup이 map에서 제거한다.

```jsx
const nodesRef = useRef(null);
const getNodes = () => {
  if (nodesRef.current === null) nodesRef.current = new Map();
  return nodesRef.current;
};
const rows = items.map(item => (
  <li key={item.id} ref={node => {
    const nodes = getNodes();
    nodes.set(item.id, node);
    return () => { nodes.delete(item.id); };
  }}>{item.label}</li>
));
const scrollToItem = id => {
  getNodes().get(id)?.scrollIntoView({ block: 'nearest' });
};
```

callback ref는 node를 argument로 받아 선택적인 cleanup function을 반환한다. 같은 DOM이라도 다른 callback identity를 전달하면 이전 cleanup 후 새 setup을 수행한다. cleanup을 반환하지 않으면 호환 동작으로 detach 때 callback을 null로 다시 호출하며 현재 reference는 이 fallback의 향후 제거를 예고한다. React 19에서는 cleanup을 명시해 연결/해제를 대칭으로 만든다.

callback ref도 개발 Strict Mode에서 추가 setup/cleanup을 거칠 수 있다. cleanup이 빠지면 사라진 node가 map에 남는 문제를 발견할 수 있다. `useRef`의 TypeScript 초기값과 React major별 타입 차이는 [[TS-React-Type-Contracts#useRef 타입|ref 타입]]을 따른다.

## 자식 component의 DOM과 imperative handle

React 19 이상에서는 자식 function component가 `ref`를 prop으로 받고 실제 DOM에 전달할 수 있다. 자식이 ref를 사용하지 않으면 부모가 DOM을 자동으로 얻는 것은 아니다.

```jsx
const SearchInput = ({ ref }) => <input ref={ref} />;
// 부모: const inputRef = useRef(null);
// <SearchInput ref={inputRef} />
// 검색 handler: inputRef.current.focus();
```

DOM 전체를 노출하면 부모가 style이나 내부 구조까지 바꿀 수 있다. 일부 명령만 허용할 경계가 필요할 때 `useImperativeHandle`로 handle을 좁힌다.

```jsx
const SearchInput = ({ ref }) => {
  const realInputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus() { realInputRef.current.focus(); }
  }), []);
  return <input ref={realInputRef} />;
};
```

부모의 `current`는 이 경우 DOM이 아니라 `focus()`만 제공하는 object다. 일반적인 props로 표현할 수 있는 상태에는 imperative API를 추가하지 않는다.

## state update 뒤 DOM과 flushSync

`flushSync(callback)`는 callback을 즉시 실행하고 포함된 update를 동기적으로 commit한 뒤 undefined를 반환한다. setter는 update를 queue에 넣으므로 바로 다음 줄에서 DOM을 읽으면 아직 이전 목록이나 이전 선택 항목을 읽을 수 있다. event 안에서 새 항목을 추가한 직후 그 항목으로 scroll해야 한다면 `react-dom`의 `flushSync`로 commit을 동기적으로 완료할 수 있다.

```jsx
import { flushSync } from 'react-dom';

const handleAdd = newTodo => {
  flushSync(() => setTodos(current => [...current, newTodo]));
  listRef.current.lastChild.scrollIntoView({ block: 'nearest' });
};
```

선택된 항목에만 ref를 주는 carousel도 같은 이유로 update 뒤 새 ref를 읽어야 한다. `flushSync`는 성능을 해치고 pending Effect나 callback 밖 update까지 처리하거나 Suspense fallback을 다시 표시할 수 있다. 필요한 browser 연동 경계에 제한한다. render나 Effect 본문에서 호출하지 않는다. 이 위치의 호출은 noop과 lifecycle warning이 될 수 있다. 우선 browser/event callback으로 옮긴다. queueMicrotask로 render 뒤 flush를 예약하는 escape hatch도 있지만 추가 synchronous render로 비용이 더 커 마지막 수단이다.

print 직전 browser가 DOM을 필요로 하는 beforeprint listener에서는 flushSync로 인쇄용 state를 반영하고 afterprint에서 복귀할 수 있다. listener 설치 자체는 Effect에서 하되 flush 호출은 실제 beforeprint callback에서 실행한다. component가 사라질 때 두 listener를 cleanup한다.

## React가 관리하는 DOM의 변경 경계

focus, scroll과 측정은 일반적인 ref 사용이다. React가 관리하는 node를 직접 `remove()`하거나 children을 추가하면 이후 React commit과 충돌해 잘못된 화면이나 crash가 생길 수 있다. 표시 여부와 목록 변경은 state/JSX로 표현한다. 외부 widget이 자식을 소유하려면 React가 자식 목록을 갱신하지 않는 빈 container 같은 명확한 경계를 둔다.

video는 ref로 `play()`/`pause()`를 호출할 수 있지만 state의 boolean만 바꾼다고 실제 재생이 바뀌지는 않는다. browser 내장 controls까지 사용한다면 `onPlay`/`onPause`로 화면 상태도 맞춘다. `play()` 실패를 처리해야 하는 실제 player는 두 상태의 동기화와 오류 처리를 추가로 설계해야 한다.

## 이해 확인

1. ref counter를 JSX에 표시한 뒤 `current`만 증가시키면 왜 화면이 그대로인가? ref 변경은 render를 예약하지 않는다. 표시 값은 state로 옮긴다.
2. Send 뒤 re-render가 발생하면 지역 변수에 저장한 timeout id로 Undo가 실패하는 이유는? 지역 변수는 다시 초기화된다. 취소에 필요한 id는 instance ref에 둔다.
3. debounce 버튼 두 개가 서로 취소하면 무엇을 의심하는가? module timer 공유다. 각 instance에 ref를 두고 사라질 때 정리한다.
4. 새 항목 추가 직후 scroll이 한 항목 뒤처지는 이유는? 아직 queue의 update가 commit되지 않았다. 새 DOM이 필요한 실행 경계를 확인한다.
5. callback ref의 setup/cleanup 뒤 map 크기가 원래대로 돌아오는지, component 여러 개의 focus와 timer가 섞이지 않는지 확인한다.

## 출처

- [React, Escape Hatches](https://react.dev/learn/escape-hatches)
- [React, Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
- [React, Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)
- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)
- [React, flushSync](https://react.dev/reference/react-dom/flushSync)
- [React, StrictMode](https://react.dev/reference/react/StrictMode)

## 관련 문서

- [[React-State-Effects-and-Events|state, event와 form]]
- [[React-Effects-and-Custom-Hooks|외부 시스템 동기화]]
- [[React-Local-State-and-Persistence|지역 state와 영속화]]
- [[TS-React-Type-Contracts|React TypeScript 계약]]
