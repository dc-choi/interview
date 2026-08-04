---
tags: [web, frontend, react, jsx, component]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["React Core Mental Model", "React JSX와 Component"]
---

# React 핵심 mental model

React는 사용자 인터페이스를 component라는 JavaScript 함수의 조합으로 기술하는 library다. React 자체가 routing, data fetching과 배포 방식을 모두 정하지는 않는다. 새 production app은 React가 권장하는 framework를 먼저 검토하고, client-only SPA나 학습 환경에서는 Vite 같은 build tool을 선택할 수 있다.

SPA는 문서 전체를 매번 다시 받지 않고 client routing과 state로 화면을 갱신하는 배포 형태다. React를 사용한다고 자동으로 SPA가 되거나, SPA가 모든 서비스에 더 효율적인 것은 아니다.

## JSX는 UI를 기술하는 JavaScript syntax

JSX는 HTML 문자열이 아니라 JavaScript로 변환되는 syntax extension이다. JSX element는 React element description이 되고, renderer가 render와 commit을 거쳐 DOM을 갱신한다.

```jsx
function Greeting({ name }) {
  return <h1 className="title">Hello, {name}</h1>;
}
```

- tag는 닫고 여러 sibling은 하나의 parent 또는 Fragment로 묶는다.
- 대부분의 DOM property는 `className`, `htmlFor`처럼 JavaScript property 이름을 따른다.
- 중괄호에는 expression을 넣을 수 있지만 statement인 `if`, `for`를 직접 넣지는 않는다.
- `null`, `undefined`, boolean은 child로 보통 표시되지 않지만 숫자 `0`은 표시된다.
- 일반 object를 그대로 child로 렌더링하면 오류가 난다. 필요한 property나 변환 결과를 렌더링한다.

`count && <Badge />`는 count가 0일 때 0을 렌더링할 수 있다. boolean 조건으로 만들거나 삼항 연산자를 사용한다. 조건이 복잡하면 render 전에 변수나 작은 component로 분리한다.

## list와 key

```jsx
items.map(item => <Row key={item.id} item={item} />)
```

key는 같은 parent 아래 sibling 사이에서 안정적이고 고유해야 한다. React가 이전 element와 다음 element의 identity를 대응시키는 단서이며 child props로 자동 전달되지 않는다. 순서가 바뀌거나 삽입, 삭제되는 list에 index를 key로 쓰면 state가 다른 행에 연결될 수 있다.

## component, props와 state

component는 JSX를 반환하는 함수이며 같은 입력에는 같은 출력을 계산하는 순수한 render를 지향한다. props는 parent가 전달하는 읽기 전용 입력이다. `children`은 tag 사이에 전달된 React node이며 component 자체를 전달한다는 의미로 한정되지 않는다.

함수 component의 기본값은 JavaScript default parameter로 표현한다.

```jsx
function Button({ tone = "primary", children }) {
  return <button className={`button ${tone}`}>{children}</button>;
}
```

state는 component 함수 안의 일반 변수가 아니라 React가 render tree 위치와 연결해 보존하는 snapshot이다. setter는 즉시 현재 변수를 변경하지 않고 다음 render를 요청한다. 이전 state에 의존하면 updater 함수를 사용하고 object와 array는 mutation 대신 새 값을 만든다.

Class component는 기존 codebase에서 계속 지원되지만 React 공식 새 문서는 function component와 Hooks를 중심으로 가르친다. 기존 class lifecycle을 무조건 변환하기보다 동작과 error boundary 같은 class-only 경계를 확인하고 점진적으로 migration한다.

## Virtual DOM 설명의 경계

React는 이전 render 결과와 새 결과를 비교해 필요한 host mutation을 commit한다. 이를 흔히 virtual DOM이라고 부르지만 항상 직접 DOM 조작보다 빠르다는 보장은 아니다. component 분해, stable key, state 배치와 측정되지 않은 memoization이 실제 성능에 더 직접적인 영향을 준다. 우선 정확한 state model을 만들고 profiler로 병목을 확인한다.

## 관련 문서

- [[React-State-Effects-and-Events|State, Effect와 event]]
- [[React-Application-Design|React application 설계]]
- [[TS-React-Type-Contracts|React TypeScript 계약]]

## 출처

- [React, Describing the UI](https://react.dev/learn/describing-the-ui)
- [React, Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React, Rendering Lists](https://react.dev/learn/rendering-lists)
- [React, Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)
- [React, State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React, Component](https://react.dev/reference/react/Component)
- IT Share, [React란?](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161297)
- IT Share, [React의 특징](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161758)
- IT Share, [JSX란?](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161760)
- IT Share, [JSX에서 JavaScript 사용하기](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161761)
- IT Share, [JSX 조건 렌더링](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161762)
- IT Share, [JSX list 렌더링](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161763)
- IT Share, [JSX styling](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161764)
- IT Share, [JSX 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161765)
- IT Share, [Component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161767)
- IT Share, [Props](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161768)
- IT Share, [State](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161769)
- IT Share, [Class component와 function component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161770)
- IT Share, [강의 component 실습](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161771)
