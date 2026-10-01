---
tags: [web, frontend, react, ref, imperative-handle, accessibility, identity]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Ref and Identity Hooks", "React ref와 접근성 id 계약"]
---

# React ref와 접근성 id 계약

ref는 render에 쓰지 않는 값을 보관하거나 imperative 동작을 연결한다. useId는 접근성 속성이 서로 가리킬 id를 제공한다. component state의 identity인 key와 DOM 접근성 id는 목적과 수명이 다르다.

## useRef 계약

`useRef(initialValue)`는 `{ current: initialValue }` 형태의 ref object를 반환한다. 처음 이후 initialValue는 무시하고 같은 object를 다시 반환한다. ref.current는 mutable하지만 바꿔도 React가 render를 예약하지 않는다. object는 각 component instance에 속하며 module 전역 변수처럼 모든 instance가 공유하지 않는다.

timer id, 외부 instance와 DOM node처럼 표시할 필요 없는 값을 보관한다. 화면에 보여 줄 count/시간은 state여야 한다. stopwatch는 now/startTime을 state, interval id를 ref에 둘 수 있다. 일반 지역 변수는 다음 render에서 초기화되므로 정지 button이 timer id를 읽는 용도로 충분하지 않다.

```jsx
const clicks = useRef(0);
const handleClick = () => {
  clicks.current += 1;
  alert(`누른 횟수: ${clicks.current}`);
};
// JSX에서 clicks.current를 표시해도 ref 변경만으로 숫자가 갱신되지는 않는다.
```

### render 순수성과 초기화

render 중 ref.current를 읽거나 쓰지 않는다. 같은 props/state/Context로 같은 JSX를 계산해야 하는데 ref에 숨긴 mutable 입력은 React의 render 재시도와 충돌할 수 있다. event handler와 Effect에서 읽고 쓴다. ref가 기존 state object를 가리킨다고 그 object의 mutation까지 허용되는 것은 아니다.

`useRef(new Player())`는 React가 첫 결과만 저장해도 JavaScript가 new Player를 매 render 실행한다. 비싼 instance의 **예측 가능한 초기화에 한해서** 다음 패턴을 사용할 수 있다.

```jsx
const playerRef = useRef(null);
if (playerRef.current === null) {
  playerRef.current = new Player();
}
```

같은 결과를 구성하는 초기화라는 좁은 예외이며 subscription/DOM 변경을 constructor에서 실행하는 해법이 아니다. 타입의 null 검사를 줄이려면 event에서 호출할 getPlayer가 비어 있을 때 만들고 non-null instance를 반환하는 구조도 쓸 수 있다. 개발 Strict Mode에서는 component 추가 호출로 두 ref가 만들어지고 하나는 버려질 수 있다. 이 때문에 외부 자원의 시작/해제를 render에 넣지 않는다.

### DOM attach와 custom component

DOM node에 `<input ref={inputRef}>`로 전달하면 React가 commit에서 node를 current에 넣고 제거 시 null로 바꾼다. mount 이전, 제거 이후, 조건부 node가 없을 때 null 경계를 처리한다. focus/scrollIntoView/play/pause는 event/Effect에서 호출하며 DOM 구조와 media Promise 오류도 고려한다. 구체적인 DOM 조작은 [[React-Refs-and-DOM|ref와 DOM]]을 따른다.

custom component에 ref prop을 전달했다고 내부 node가 자동 노출되지는 않는다. React 19 function component에서 `{ ref, ...props }`를 받아 원하는 DOM node로 전달한다. React 18 이전에는 forwardRef로 받는 경계를 구분한다. 목록을 querySelectorAll로 찾는 방식은 실제 DOM 구조에 의존하며 데이터 id/ref map을 쓸지 선택한다.

### useRef 문제 진단과 이해 확인

화면이 갱신되지 않으면 ref로 UI state를 대체했는지 확인한다. custom node가 null이면 ref 수신/전달과 해당 node의 존재를 확인한다. instance가 반복 생성되면 함수 인자가 매 render 선행 계산되는지 본다. timer 재시작 시 이전 timer를 정리하지 않으면 id 하나만 덮어쓰고 기존 timer가 남는다.

**이해 확인:** ref count와 state count의 click 반응을 비교한다. 조건부 input을 제거한 뒤 current 값, 두 component instance의 ref 격리와 expensive initializer 호출을 설명한다.

## useImperativeHandle 계약

`useImperativeHandle(ref, createHandle, dependencies?)`는 받은 ref에 노출할 handle을 지정하고 undefined를 반환한다. createHandle은 인자 없는 함수이며 임의 타입을 반환할 수 있지만 보통 제한된 method object다.

dependencies는 createHandle이 참조하는 reactive 값 전체를 고정 길이 inline 배열에 적고 `Object.is`로 비교한다. 값이 바뀌거나 배열을 생략하면 handle을 다시 만들고 ref에 할당한다. `[]`에 reactive prop을 숨기면 method가 오래된 값을 읽을 수 있다. 내부 ref object는 stable이어도 그 안의 DOM node는 attach/remove 과정에서 바뀔 수 있다.

```jsx
import { useImperativeHandle, useRef } from 'react';

const SearchInput = ({ ref, ...props }) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => {
    return {
      focus() { inputRef.current?.focus(); },
      scrollIntoView() { inputRef.current?.scrollIntoView(); },
    };
  }, []);
  return <input {...props} ref={inputRef} />;
};
```

parent에는 focus/scrollIntoView만 보이고 전체 DOM node의 style/innerHTML 같은 임의 변경 API는 노출하지 않는다. public ref를 input에 동시에 직접 연결해 custom handle을 덮어쓰지 않는다. parent는 자신의 ref.current가 존재할 때 event에서 method를 호출한다.

여러 child의 scroll과 focus를 `scrollAndFocusComment()`라는 목적별 method로 묶을 수도 있다. component 경계를 넘어 DOM 세부 구조를 공개하지 않고 imperative operation의 의미를 전달한다. 하지만 open/close처럼 `isOpen` prop으로 표현할 수 있는 UI state는 props/Effect로 연결한다. 모든 child에 imperative setter를 만드는 패턴으로 확대하지 않는다.

### useImperativeHandle 문제 진단과 이해 확인

parent가 DOM style에 접근하려다 실패하면 node 대신 handle을 노출한 계약을 확인한다. method가 오래된 prop을 쓰면 dependencies를 고친다. ref가 null이면 component/node의 수명과 React 버전에 맞는 ref 전달을 확인한다. focus를 위해 public handle을 받는 parent가 render 중 method를 부르지 않게 한다.

**이해 확인:** parent가 focus는 할 수 있어도 DOM node 전체는 수정할 수 없는 이유를 설명한다. prop으로 표현 가능한 modal 상태와 imperative scroll의 선택 기준을 비교한다.

## useId 계약

`useId()`는 인자 없이 해당 component의 해당 호출에 연결된 **unique id string**을 반환한다. component/custom Hook 최상위에서 호출한다. 접근성 속성의 참조 연결을 위해 사용하고 데이터의 영구 id, list key와 `use()` cache key로 사용하지 않는다. mount 중 유지되는 id라고 render/재시도 전체에서 영구 고정인 데이터 key로 가정하지 않는다.

```jsx
import { useId } from 'react';

const PasswordField = () => {
  const id = useId();
  return <>
    <label htmlFor={`${id}-input`}>비밀번호</label>
    <input id={`${id}-input`} type="password" aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`}>서비스의 비밀번호 조건을 확인하세요.</p>
  </>;
};
```

같은 component가 여러 번 표시돼도 hardcoded id가 충돌하지 않는다. id 하나를 prefix로 삼아 input/hint 등 관련 요소의 id를 만든다. 모든 속성마다 Hook을 따로 호출할 필요는 없다. label은 htmlFor/id, 설명은 aria-describedby/id로 연결하며 오류의 접근성 표시도 같은 원칙을 따른다.

### hydration과 여러 root

SSR와 hydration에는 같은 component tree가 필요하다. 전역 nextId++는 서버 output 순서와 client hydration 순서가 달라 id가 어긋날 수 있다. useId는 component의 parent path를 이용해 같은 tree에서 이 순서 차이를 다룬다. server/client가 다른 tree를 만들었는데 id 생성기만 바꿔 mismatch를 해결할 수는 없다.

한 page에 독립 React root가 여러 개면 createRoot/hydrateRoot의 identifierPrefix를 root별로 다르게 지정해 충돌을 피한다. server-rendered root는 server renderer의 identifierPrefix와 client hydrateRoot의 prefix가 같아야 한다. root 하나인 일반 application에서 임의의 prefix 설정을 추가할 필요는 없다.

현재 useId는 async Server Component에서 사용할 수 없다. 접근성 구조를 어느 Client Component에서 생성할지, framework가 제공하는 server-safe 식별 방식이 필요한지 경계를 정한다. list의 stable key는 저장한 데이터 id에서 가져온다.

### useId 문제 진단과 이해 확인

label이나 설명이 다른 field로 연결되면 하드코딩 id와 반복 component의 충돌을 찾는다. hydration mismatch면 tree와 root prefix를 비교한다. list item이 초기화되면 useId로 key를 대체했는지 확인한다. data cache가 매 render 달라지면 useId를 data key로 쓰고 있는지 본다.

**이해 확인:** PasswordField 두 개의 연결 속성이 각각 자기 요소를 가리키는지 확인한다. 같은 prefix의 두 root, SSR/client prefix 차이와 list data key의 세 문제를 구분한다.

## 출처

- [React, useRef](https://react.dev/reference/react/useRef)
- [React, useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)
- [React, useId](https://react.dev/reference/react/useId)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Refs-and-DOM|DOM 조작과 수명]]
- [[React-State-Structure|state의 tree identity와 key]]
- [[React-Layout-and-Insertion-Effects|layout 측정]]
