---
tags: [web, frontend, react, state, effect, event, form]
status: done
verified_at: 2026-08-04
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

Hooks는 function component 또는 custom Hook의 최상위에서 같은 순서로 호출한다. 조건문, loop, nested function에서 호출하지 않는다. `useCallback`은 function identity를 안정화할 필요가 있을 때 쓰는 performance optimization이다. event handler를 component 내부에 선언했다는 이유만으로 일괄 적용하지 않고 memoized child나 Effect dependency 등 실제 소비자를 확인한다.

## event handler

JSX에는 함수 호출 결과가 아니라 handler 함수를 전달한다.

```jsx
<button onClick={handleSave}>저장</button>
```

React event는 browser event propagation을 따르므로 parent handler까지 bubble할 수 있다. 의도적으로 막을 때만 `stopPropagation()`을 사용하고, default browser action을 막을 때는 `preventDefault()`를 사용한다. 접근성을 위해 click 가능한 `div`보다 의미에 맞는 `button`, `a`, form control을 우선한다.

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
- [React, Responding to Events](https://react.dev/learn/responding-to-events)
- [React DOM, input](https://react.dev/reference/react-dom/components/input)
- IT Share, [Hooks 종류](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161773)
- IT Share, [React render 과정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161774)
- IT Share, [Accordion component 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161775)
- IT Share, [Event 연결](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161777)
- IT Share, [Event 종류](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161778)
- IT Share, [Form](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161779)
- IT Share, [설문 form 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161780)
