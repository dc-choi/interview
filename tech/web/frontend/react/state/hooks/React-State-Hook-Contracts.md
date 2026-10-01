---
tags: [web, frontend, react, state, reducer, context]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React State Hook Contracts", "React state Hook 계약"]
---

# React state Hook 계약

snapshot, batching과 immutable update의 원리는 [[React-State-Updates|state update]], tree identity와 reset은 [[React-State-Structure|state 구조]], 공유 owner는 [[React-State-Management|공유 state]]에서 다룬다. 여기서는 호출/반환과 오류 경계를 정한다.

## useState 계약

`useState(initialState)`는 `[state, setState]`를 반환한다. 초기 인자는 첫 render의 값이고 이후 render에서는 무시한다. 인자가 함수면 **인자 없는 순수 initializer**로 호출해 결과를 저장한다. 비싼 초기 계산은 `useState(createInitialState)` 또는 `useState(() => createInitialState(input))`로 넘겨 매 render의 선행 계산을 피한다. 초기 prop이 달라졌다고 기존 state가 다시 초기화되지 않는다.

`setState(nextState)`는 값을 교체하거나, 함수 인자를 순수 updater로 queue에 등록한다. updater는 pending state 하나를 받아 다음 state를 반환한다. setter 자체의 반환값은 없고 실행 중의 state 변수도 즉시 바뀌지 않는다. queue 순서와 여러 updater의 조합은 [[React-State-Updates#batching과 update queue|update queue]]를 따른다.

- setter identity는 안정적이다. linter가 생략을 허용하면 Effect dependency에서 생략할 수 있고 넣어도 setter 자체가 재실행 원인이 되지 않는다.
- `Object.is`로 다음 값이 같으면 component/child render를 건너뛰는 최적화를 한다. React가 component를 먼저 호출할 수도 있으므로 함수 호출 자체가 없다는 보장은 아니다.
- update는 batch될 수 있다. DOM을 즉시 읽기 위한 강제 flush는 드문 경계이며 일반 state 변경마다 사용하지 않는다.
- 개발 Strict Mode는 initializer/updater를 추가 호출하고 한 결과를 버려 순수성을 검사한다. click handler를 React가 그 검사 때문에 두 번 호출하는 것은 아니다.

```jsx
import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => {
    setCount(current => current + 1);
    setCount(current => current + 1);
  }}>{count}</button>;
};
```

number counter, string input, boolean checkbox와 여러 독립 field는 같은 계약을 사용한다. checkbox는 `event.target.checked`, text는 `event.target.value`를 읽는다. object와 array는 전체 다음 값을 반환하며 object setter는 부분 병합하지 않는다. 중첩 copy와 Immer draft 경계는 [[React-State-Updates#object는 변경한 경로를 복사한다|object update]]를 따른다.

### 함수 저장과 render 중 조건부 조정

함수 자체를 저장하려면 `useState(() => someFunction)`과 `setState(() => nextFunction)`으로 감싼다. 그냥 함수 인자를 넘기면 initializer/updater로 실행한다. 이 wrapper는 identity 성능 최적화인 `useCallback`과 목적이 다르다.

과거 render의 값과 비교해야 하며 계산, key reset과 handler로 해결할 수 없는 드문 경우에는 **현재 render 중인 component 자신의 state만**, 수렴하는 조건 안에서 조정할 수 있다.

```jsx
const [previous, setPrevious] = useState(count);
const [trend, setTrend] = useState(null);
if (previous !== count) {
  setPrevious(count);
  setTrend(count > previous ? 'increase' : 'decrease');
}
```

React는 해당 JSX를 버리고 child를 render하기 전에 현재 component를 재시도한다. 조건과 `setPrevious(count)`가 없으면 반복 render에 빠진다. 다른 component의 setter, DOM 변경이나 외부 부수 효과를 허용하는 예외가 아니다. state 조정이 Effect로 두 번 commit되는 문제를 줄일 수 있지만 기본 설계로 쓰지 않는다.

### useState 문제 진단

setter 뒤 log가 이전 값이면 snapshot 동작이다. 다음 값을 즉시 써야 하면 지역 변수로 계산한다. 화면이 바뀌지 않으면 같은 object를 mutation한 뒤 넘겼는지 확인한다. `Too many re-renders`면 무조건적인 render setter와 `onClick={handleClick()}`를 찾는다. initializer/updater 두 번 호출에서 항목이 중복되면 기존 array의 mutation이나 부수 효과를 제거한다.

**이해 확인:** 0에서 updater를 두 번 등록하면 2가 되는 이유, function state wrapper의 필요성, prop 변경과 key 변경의 reset 차이를 설명한다.

## useReducer 계약

`useReducer(reducer, initialArg, init?)`는 `[state, dispatch]`를 반환한다. reducer는 `(state, action) => nextState`인 순수 함수다. action/state는 임의 타입이지만 action은 보통 `type`과 최소 payload를 갖는다. `init`이 없으면 initialArg가 초기 state이고, 있으면 `init(initialArg)`가 초기 state다. 인자를 계산해 넘기는 것과 initializer 자체를 넘기는 것은 비용이 다르다.

```jsx
const createInitial = name => ({ name, count: 0 });
const reducer = (state, action) => {
  if (action.type === 'increment') return { ...state, count: state.count + 1 };
  if (action.type === 'rename') return { ...state, name: action.name };
  throw new Error(`Unknown action: ${action.type}`);
};
const [state, dispatch] = useReducer(reducer, initialName, createInitial);
// event handler에서 dispatch({ type: 'increment' });
```

`dispatch(action)`은 반환값 없이 다음 render의 변경을 요청한다. 현재 handler의 state는 이전 snapshot이다. 예상 다음 값이 필요하면 순수 reducer를 `reducer(state, action)`으로 직접 계산할 수 있지만 React가 처리할 전체 pending queue를 대신한 결과라고 보지는 않는다.

- dispatch identity는 안정적이고 linter가 허용하면 dependency에서 생략할 수 있다.
- `Object.is`로 이전 결과와 같으면 render를 건너뛰는 최적화를 한다. 같은 state를 수정해 반환하지 않는다.
- 개발 Strict Mode는 reducer와 initializer를 추가 호출한다. 시간, 무작위 id 생성과 요청은 reducer 밖에서 처리하고 결과를 action에 담는다.
- 한 action은 한 사용자 interaction의 의미를 표현한다. 관련 field가 여럿 바뀌어도 field별 action 연쇄를 강제하지 않는다.
- object/array reducer와 Immer 기반 reducer는 문법이 달라도 이전 state를 보존해야 한다.

### useReducer 문제 진단

일부 field가 undefined이면 `{ count: nextCount }`처럼 나머지 field를 버렸는지 확인한다. 전체 state가 undefined이면 해당 case의 `return`, action type 오타와 switch의 미처리 branch를 검사한다. 알 수 없는 action에서 throw하거나 TypeScript의 exhaustive check로 누락을 드러낸다. render loop와 오래된 log의 진단은 setter와 동일한 snapshot/handler 경계를 따른다.

**이해 확인:** `useReducer(reducer, makeInitial())`와 세 번째 인자 init의 차이를 설명하고, unknown action과 기존 state mutation을 각각 재현해 진단한다.

## useContext 계약

`useContext(SomeContext)`는 `createContext`로 만든 **동일 Context object**를 받고 가장 가까운 상위 provider의 value를 반환/구독한다. provider가 전혀 없을 때만 createContext의 고정 defaultValue가 적용된다. Context object 자체는 현재 값을 저장하는 일반 object가 아니다.

```jsx
const ThemeContext = createContext('light');
const Button = () => {
  const theme = useContext(ThemeContext);
  return <button className={theme}>확인</button>;
};
const App = () => <ThemeContext value="dark">
  <Button />
  <ThemeContext value="light"><Button /></ThemeContext>
</ThemeContext>;
```

첫 button은 dark, nested provider 안의 button은 light를 읽는다. React 19의 `<Context value={...}>`와 React 18 이전의 `<Context.Provider>` 문법을 적용 버전에 맞춰 구분한다. 같은 component에서 provider를 반환해도 그 component의 `useContext`는 자기 **위** provider를 읽는다. 이 구조로 heading depth를 읽고 자식에게 `level + 1`을 제공할 수 있다.

provider value가 `Object.is`에서 달라지면 해당 Context를 읽는 consumer가 새 값을 받아 render된다. `memo`는 새 Context 전달을 차단하지 않는다. 여러 Context는 독립적이며 provider를 별도 component로 추출해도 원래 state owner가 자동으로 옮겨지지 않는다. state와 dispatch Context 분리, reducer 결합은 [[React-State-Management#reducer와 Context 결합|공유 state 구성]]을 따른다.

object/function을 value로 매 render 새로 만들면 관계없는 owner render에도 consumer update가 생긴다. 실제 비용을 확인하고 `useCallback`으로 함수, `useMemo`로 value object를 재사용한다. Context 전체가 바뀔 때 특정 field만 구독하는 selector API를 `useContext` 자체가 제공하는 것은 아니다.

### useContext 문제 진단

- 값이 보이지 않으면 React DevTools의 provider 위치와 실제 consumer tree를 확인한다.
- value가 undefined인 provider는 default로 돌아가지 않는다. value prop 누락과 다른 prop 이름 사용도 undefined를 제공하는 원인이다.
- symlink/빌드가 Context module을 중복 생성하면 provider와 consumer object가 다를 수 있다. 양쪽 object의 `===`를 검사하고 import/번들 구조를 고친다.

**이해 확인:** provider 없음, value undefined, nested provider의 세 경우를 비교한다. memo된 consumer가 Context 변경에 render되는 이유와 provider를 반환한 component가 읽는 값을 설명한다.

## 출처

- [React, useState](https://react.dev/reference/react/useState)
- [React, useReducer](https://react.dev/reference/react/useReducer)
- [React, useContext](https://react.dev/reference/react/useContext)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-State-Updates|snapshot과 queue]]
- [[React-State-Structure|state 구조와 reset]]
- [[React-State-Management|공유 state와 Context]]
- [[React-Action-State|부수 효과가 가능한 reducerAction]]
