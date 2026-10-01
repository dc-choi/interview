---
tags: [web, frontend, react, state, effect, event, form]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React State and Effects", "React 이벤트와 폼"]
---

# React state, Effect와 event

React update는 trigger, render, commit 단계로 이해한다. state update가 render를 예약하면 React가 component 함수를 호출해 다음 UI를 계산하고, 이전 결과와 달라진 host node만 commit한다. render는 계산 단계이므로 network 요청, DOM 변경과 저장소 쓰기 같은 side effect를 수행하지 않는다.

## state update는 snapshot과 queue

event handler가 실행되는 동안 읽는 state는 해당 render의 snapshot이다.

```jsx
setCount(current => current + 1);
setCount(current => current + 1);
```

같은 event에서 이전 값에 의존하는 update를 연속 수행할 때 updater를 사용한다. React는 update를 batch할 수 있으므로 setter 직후 기존 변수에서 새 값을 읽는 방식으로 후속 로직을 만들지 않는다.

## Effect는 외부 시스템 동기화

`useEffect`는 component를 network, browser API, subscription, third-party widget 같은 외부 시스템과 동기화한다. class lifecycle 세 개를 하나로 줄인 문법이라고만 이해하면 불필요한 Effect가 늘어난다.

```jsx
useEffect(() => {
  const connection = connect(roomId);
  return () => connection.disconnect();
}, [roomId]);
```

- dependency는 개발자가 임의로 선택하는 실행 조건이 아니라 Effect가 읽는 reactive value에서 도출된다.
- cleanup은 unmount뿐 아니라 dependency가 바뀌어 다시 동기화하기 전에도 실행된다.
- 개발 Strict Mode는 잘못된 cleanup을 찾기 위해 setup과 cleanup을 추가 실행할 수 있다.
- props/state에서 계산 가능한 값은 render 중 계산하고 Effect로 복제 state를 만들지 않는다.
- 사용자 action에 따른 저장은 Effect보다 해당 event handler에서 수행하는 편이 원인을 보존한다.

### dependency 배열의 세 형태

| 형태 | 실행 시점 | 주의 |
|---|---|---|
| 생략 | 매 commit 뒤 | Effect가 state를 바꾸면 그 render 뒤 다시 실행된다 |
| `[]` | 첫 commit 뒤 한 번 | 개발 Strict Mode는 setup과 cleanup을 한 번 더 실행한다 |
| `[a, b]` | 첫 commit 뒤, 그리고 `Object.is` 비교로 값이 바뀐 commit 뒤 | 이전 실행의 cleanup이 이전 값으로 먼저 돈 뒤 새 setup이 실행된다 |

Effect는 render와 commit이 끝난 뒤 실행된다. click 같은 상호작용이 원인이 아니면 보통 browser가 화면을 그린 뒤 실행하고, 상호작용이 원인이면 paint 전에 실행될 수 있다.

- 무한 반복은 Effect가 state를 바꾸고 그 state가 re-render를 거쳐 Effect의 dependency를 다시 바꿀 때 생긴다. API 응답을 `then`에서 setState하는 Effect에 배열을 빼거나, 응답으로 만든 object나 array state를 dependency에 넣는 경우가 전형이다. dependency는 요청 입력(id, 검색어)으로 두고 결과 state는 넣지 않는다.
- `[value]` Effect에서 `addEventListener`만 하고 cleanup을 반환하지 않으면 value가 바뀔 때마다 listener가 쌓여 event 한 번에 handler가 여러 번 실행된다. cleanup은 등록한 것과 같은 함수 참조로 `removeEventListener`를 호출한다. 새로 만든 arrow를 넘기면 일치하는 listener가 없어 아무것도 해제되지 않는다.

## Hook 호출 순서와 함수 identity

Hooks는 function component 또는 custom Hook의 최상위에서 같은 순서로 호출한다. 조건문, loop, nested function에서 호출하지 않는다. 공식 문서의 단순화한 설명으로는 React가 component마다 Hook의 state를 호출 순서대로 놓인 slot 배열로 보관하고, render 전에 index를 0으로 되돌린 뒤 Hook 호출마다 다음 slot을 내준다. 어떤 render에서 조건 때문에 Hook 하나를 건너뛰면 뒤의 Hook이 다른 slot의 state를 읽는다. 조건에 따라 실행하려면 Hook 호출을 조건으로 감싸지 말고 Hook 안에서 분기한다.

```jsx
useEffect(() => {
  if (!enabled) return;
  const id = setInterval(() => setSeconds(current => current + 1), 1000);
  return () => clearInterval(id);
}, [enabled]);
```

`useCallback`은 function identity를 안정화할 필요가 있을 때 쓰는 performance optimization이다. event handler를 component 내부에 선언했다는 이유만으로 일괄 적용하지 않고 memoized child나 Effect dependency 등 실제 소비자를 확인한다. React 공식 문서도 `memo`로 감싼 child에 prop으로 넘기거나 다른 Hook의 dependency로 쓰는 경우 말고는 이득이 없다고 하며, React Compiler를 켜면 자동 memoization으로 수동 호출이 덜 필요해진다. identity가 필요하면 더 싼 방법부터 쓴다.

- props와 state를 읽지 않는 함수와 object는 component 밖으로 옮긴다. module이 load될 때 한 번 만들어지고 reactive value가 아니므로 dependency에서도 빠진다.
- 현재 state를 다음 state 계산에만 읽는다면 updater로 바꿔 dependency에서 state를 뺀다. `setTodos(current => [...current, todo])`처럼 쓰면 다른 reactive value를 읽지 않는 한 `useCallback(..., [])`로도 안전하다.
- dependency를 비운 `useCallback`이나 Effect 안에서 state를 직접 읽으면 첫 render의 snapshot을 계속 본다(stale closure). updater로 바꾸거나 읽는 값을 dependency에 넣고, lint 경고를 끄는 방식으로 배열을 줄이지 않는다.
- debounce처럼 내부에 timer를 가진 함수의 instance 유지는 [[React-Local-State-and-Persistence|localStorage 영속화]]의 debounce 절을 따른다.

## event handler

JSX에는 함수 호출 결과가 아니라 handler 함수를 전달한다.

```jsx
<button onClick={handleSave}>저장</button>
```

React event는 browser event propagation을 따르므로 parent handler까지 bubble할 수 있다. 의도적으로 막을 때만 `stopPropagation()`을 사용하고, default browser action을 막을 때는 `preventDefault()`를 사용한다. 접근성을 위해 click 가능한 `div`보다 의미에 맞는 `button`, `a`, form control을 우선한다.

HTML은 소문자 `onclick` 속성에 실행할 code 문자열을 넣지만 React는 camelCase `onClick`에 함수를 넘긴다. handler는 React event object를 받는다. 흔히 synthetic event라고 부르며 DOM event와 같은 표준 interface를 따르되 일부 browser 차이를 보정하고, 원래 browser event는 `e.nativeEvent`로 읽는다. [[Event-Bubbling-Capturing#synthetic event와 dispatchEvent|DOM 문서의 synthetic event]]는 script가 `dispatchEvent()`로 보낸 event를 뜻하는 다른 개념이다.

| React prop | 발생 조건 | 주의 |
|---|---|---|
| `onClick` | 같은 element에서 mousedown과 mouseup이 모두 끝난 뒤 | 누른 채 밖으로 나가 떼면 그 element의 click은 없고, 두 element를 모두 포함하는 가장 가까운 조상에서 발생한다 |
| `onMouseEnter`, `onMouseLeave` | pointer 진입과 이탈 | capture phase가 없고 떠나는 element에서 들어가는 element로 전파된다 |
| `onKeyDown` | 문자 입력 여부와 무관한 모든 key 눌림 | `onKeyPress`는 deprecated이므로 `onKeyDown`이나 `onBeforeInput`을 쓴다 |
| `onFocus`, `onBlur` | focus 획득과 해제 | browser의 focus, blur와 달리 React에서는 bubble한다 |
| input `onChange` | 사용자가 값을 바꿀 때마다(매 keystroke) | browser `input` event처럼 동작하며 값 확정 때 발생하는 DOM `change`와 다르다 |

모든 element가 모든 event를 지원하지는 않으므로 필요한 event는 React DOM reference에서 확인한다.

## controlled와 uncontrolled form

controlled input은 React state를 source of truth로 둔다.

```jsx
<input value={name} onChange={event => setName(event.target.value)} />
```

uncontrolled input은 DOM이 현재 값을 보관하고 `ref`나 form submission으로 읽는다. 둘 중 하나가 항상 우월한 것이 아니다.

- 실시간 validation, 다른 UI와 동기화가 필요하면 controlled 방식이 명시적이다.
- 큰 form의 render 비용이나 native form 흐름을 활용하려면 uncontrolled 또는 form library를 검토한다.
- 같은 input을 lifecycle 중 controlled와 uncontrolled 사이에서 바꾸지 않는다.
- label, error message 연결, focus와 keyboard 동작은 state 관리 방식과 별개의 접근성 계약이다.

validation은 제출 가능 여부와 오류 표시 시점을 나눠 설계한다. render 과정에서 state를 다시 설정하는 loop를 만들지 않고, 가능한 값은 기존 field state에서 계산한다.

### controlled input이 깨지는 경우

1. `value`만 연결하고 `onChange`가 없으면 입력할 수 없다. `onChange`에서 state를 동기적으로 갱신하지 않으면 React가 매 keystroke 뒤 지정한 `value`로 되돌린다. object state를 편집한다면 `{ ...memo, body, updatedAt }`처럼 나머지 field를 보존한다.
2. `value`가 `undefined`로 시작했다가 문자열이 되면 uncontrolled에서 controlled로 바뀌어 위의 전환 금지를 어긴다. 아직 답하지 않은 질문이나 API 값이 `null`, `undefined`일 수 있으면 `value={answer ?? ""}`처럼 항상 문자열을 넘긴다.
3. checkbox는 `value`가 아니라 `checked`로 연결하고 `e.target.checked`를 읽는다.
4. 최대 선택 개수를 넘을 때 state 갱신을 거부해도 checkbox가 uncontrolled면 DOM은 계속 체크된다. 거부형 validation은 `checked={selected.includes(option.id)}`처럼 input이 React state를 source of truth로 둘 때만 동작한다.

글자 수 제한은 `maxLength`로 두고 제한이 없는 option이면 `undefined`를 넘긴다. React DOM은 값이 `null`이나 `undefined`인 attribute를 출력하지 않는다.

## useRef와 DOM 참조

`useRef(initialValue)`는 `current` property 하나를 가진 object를 반환하고 다음 render에도 같은 object를 돌려준다. `current`를 바꿔도 re-render가 일어나지 않으므로 interval id나 이전 값처럼 화면 출력에 쓰지 않는 값을 담는다. 화면에 보여야 하는 값을 ref에 두면 바뀌어도 화면이 갱신되지 않으므로 state에 둔다.

```jsx
const inputRef = useRef(null);
const handleSubmit = event => {
  event.preventDefault();
  save(inputRef.current.value);
};
// <form onSubmit={handleSubmit}><input ref={inputRef} /></form>
```

- JSX의 `ref`로 연결하면 React가 DOM node를 만들어 화면에 둔 뒤 `current`에 그 node를 넣고, node가 화면에서 제거되면 `null`로 되돌린다. 첫 render 중에는 아직 초기값이므로 DOM ref는 event handler나 Effect에서 읽는다.
- 초기화를 제외하면 render 중에 `ref.current`를 읽거나 쓰지 않는다. render 결과가 ref 값에 따라 달라져 예측할 수 없게 된다.
- uncontrolled input의 값을 `id`와 `document.querySelector`로 찾으면 같은 component가 여러 번 render될 때 id가 중복되어 다른 instance의 element를 잡을 수 있다. ref는 해당 instance의 node를 직접 가리킨다.
- React 19 타입에서 `useRef`의 인수가 필수가 된 점과 ref 타입은 [[TS-React-Type-Contracts#useRef 타입|useRef 타입]]에 있다.

## 관련 문서

- [[React-Core-Mental-Model|React 핵심 mental model]]
- [[React-Local-State-and-Persistence|지역 state와 영속화]]
- [[TS-React-Type-Contracts|Event와 form 타입]]

## 출처

- [React, Render and Commit](https://react.dev/learn/render-and-commit)
- [React, Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React, Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [React, You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React, Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React, State: A Component's Memory](https://react.dev/learn/state-a-components-memory)
- [React, useEffect](https://react.dev/reference/react/useEffect)
- [React, Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies)
- [React, useCallback](https://react.dev/reference/react/useCallback)
- [React, useRef](https://react.dev/reference/react/useRef)
- [MDN, EventTarget: removeEventListener() method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
- [React, Responding to Events](https://react.dev/learn/responding-to-events)
- [React DOM, input](https://react.dev/reference/react-dom/components/input)
- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)
- [MDN, Element: click event](https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event)
- IT Share, [Hooks 종류](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161773)
- IT Share, [React render 과정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161774)
- IT Share, [Accordion component 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161775)
- IT Share, [Event 연결](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161777)
- IT Share, [Event 종류](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161778)
- IT Share, [Form](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161779)
- IT Share, [설문 form 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161780)
- IT Share, [Memo 수정과 선택](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161789)
- IT Share, [localStorage 영속화](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161792)
- IT Share, [Recoil selector로 API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161818)
- IT Share, [설문 응답 저장](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161819)
- IT Share, [답변 validation](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161822)
