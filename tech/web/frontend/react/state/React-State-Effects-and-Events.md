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

`useEffect`는 network, browser API, subscription과 React 밖 widget을 현재 화면 조건에 맞춘다. props/state에서 계산 가능한 값은 render에서 만들고, 특정 action의 저장/전송은 해당 event handler에서 처리한다. 동기화 시작, cleanup, race condition과 불필요한 Effect의 대안은 [[React-Effects-and-Custom-Hooks|외부 시스템 동기화]]를 따른다.

### dependency 배열의 세 형태

배열 생략은 매 commit 뒤, `[]`는 해당 mount에서 시작, `[a, b]`는 첫 실행과 dependency 변경 때 재동기화한다. 앱 전체에서 한 번이라는 보장은 아니며 개발 Strict Mode는 setup/cleanup을 추가 검사한다. [[React-Effects-and-Custom-Hooks#dependency 배열의 세 형태|실행 조건]]과 [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]에서 상세를 다룬다.

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

모든 element가 모든 event를 지원하지는 않으므로 필요한 event는 [[React-DOM-Events|event object와 handler 계약]]과 React DOM reference에서 확인한다.

### 업무 event prop와 전파 순서

custom component는 `onSave`, `onUploadImage`처럼 업무 action을 표현하는 callback prop을 받을 수 있다. 내부에서 browser element의 `onClick`에 연결하거나 keyboard 동작에서도 같은 callback을 사용할 수 있다. built-in element에는 지원하는 browser event 이름을 사용한다.

click은 조상의 `onClickCapture`가 내려오는 capture, 대상 handler, 조상 `onClick`으로 올라가는 bubble 순서로 처리된다. 대상 handler의 `stopPropagation()`은 이후 bubble을 막지만 이미 실행된 조상 capture를 되돌리지는 않는다. 일반적인 React `onScroll`은 부모로 bubble하지 않으므로 scroll을 처리할 element에 직접 연결한다.

자식 handler에서 로컬 작업을 한 뒤 부모의 callback을 명시적으로 호출하면 업무 실행 순서를 추적하기 쉽다. 자동 bubble과 같은 개념은 아니며 propagation을 막아도 직접 호출한 callback은 실행된다.

```jsx
const SaveButton = ({ onSave }) => (
  <button onClick={event => {
    event.stopPropagation();
    onSave();
  }}>저장</button>
);
```

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

input/textarea/select의 props, 다중 제출 값과 caret/remount 진단은 [[React-DOM-Form-Controls]], function action과 제출 pending은 [[React-DOM-Form-Actions]]를 따른다.

validation은 제출 가능 여부와 오류 표시 시점을 나눠 설계한다. render 과정에서 state를 다시 설정하는 loop를 만들지 않고, 가능한 값은 기존 field state에서 계산한다.

### controlled input이 깨지는 경우

1. `value`만 연결하고 `onChange`가 없으면 입력할 수 없다. `onChange`에서 state를 동기적으로 갱신하지 않으면 React가 매 keystroke 뒤 지정한 `value`로 되돌린다. object state를 편집한다면 `{ ...memo, body, updatedAt }`처럼 나머지 field를 보존한다.
2. `value`가 `undefined`로 시작했다가 문자열이 되면 uncontrolled에서 controlled로 바뀌어 위의 전환 금지를 어긴다. 아직 답하지 않은 질문이나 API 값이 `null`, `undefined`일 수 있으면 `value={answer ?? ""}`처럼 항상 문자열을 넘긴다.
3. checkbox는 `value`가 아니라 `checked`로 연결하고 `e.target.checked`를 읽는다.
4. 최대 선택 개수를 넘을 때 state 갱신을 거부해도 checkbox가 uncontrolled면 DOM은 계속 체크된다. 거부형 validation은 `checked={selected.includes(option.id)}`처럼 input이 React state를 source of truth로 둘 때만 동작한다.

글자 수 제한은 `maxLength`로 두고 제한이 없는 option이면 `undefined`를 넘긴다. React DOM은 값이 `null`이나 `undefined`인 attribute를 출력하지 않는다.

## useRef와 DOM 참조

`useRef`는 instance별로 render 사이에 같은 object를 유지하지만 `current` 변경은 render를 예약하지 않는다. 화면에 필요한 값은 state에 두고, DOM ref는 commit 이후 event handler나 Effect에서 읽는다. timeout 취소, 목록 callback ref, 자식 DOM 노출과 flushSync는 [[React-Refs-and-DOM|ref와 DOM]]을 따른다.

## 관련 문서

- [[React-Core-Mental-Model|React 핵심 mental model]]
- [[React-Effects-and-Custom-Hooks|외부 시스템 동기화]]
- [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]
- [[React-Refs-and-DOM|ref와 DOM]]
- [[React-Custom-Hooks|custom Hook]]
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
