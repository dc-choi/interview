---
tags: [web, frontend, react, jsx, component]
status: done
verified_at: 2026-09-30
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
- component 이름은 대문자로 시작한다. 소문자 tag(`<section>`)는 HTML element로, 대문자로 시작하는 tag(`<Profile />`)는 component로 해석되므로 `<hello />`라고 쓰면 같은 이름의 함수가 호출되지 않는다.

`count && <Badge />`는 count가 0일 때 0을 렌더링할 수 있다. boolean 조건으로 만들거나 삼항 연산자를 사용한다. 조건이 복잡하면 render 전에 변수나 작은 component로 분리한다.

## 진입점: react와 react-dom

`react` package는 component와 Hooks 같은 UI 기술 API를, `react-dom`은 그 결과를 browser DOM에 연결하는 web 전용 API를 제공한다. client 진입 file은 root를 한 번 만들고 최상위 component를 렌더링하며, 이 component가 전체 tree의 root가 된다.

```jsx
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(<App />);
```

`ReactDOM.render(<App />, container)`는 React 18(2022-03)에서 deprecated됐고 React 19에서 제거됐다. 이 형태의 오래된 진입점은 React 19에서 동작하지 않으므로 `createRoot`로 바꾸고 `unmountComponentAtNode`도 `root.unmount()`로 대체한다. server가 만든 HTML을 이어받을 때는 `hydrateRoot`를 쓴다.

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

React 19는 function component의 `defaultProps`를 제거했다. 오래된 예제의 `Button.defaultProps = { ... }`는 default parameter로 옮긴다. class component는 ES6 대안이 없어 `defaultProps`를 계속 지원한다.

state는 component 함수 안의 일반 변수가 아니라 React가 render tree 위치와 연결해 보존하는 snapshot이다. setter는 즉시 현재 변수를 변경하지 않고 다음 render를 요청한다. 이전 state에 의존하면 updater 함수를 사용하고 object와 array는 mutation 대신 새 값을 만든다.

## class component를 읽는 기준

Hooks는 React 16.8에서 추가됐다. component 사이에서 stateful logic을 재사용하기 어렵고, 관련 없는 로직이 lifecycle method마다 흩어져 큰 component를 이해하기 어렵다는 문제가 도입 배경이다. Class component는 기존 codebase에서 계속 지원되지만 React 공식 문서는 새 코드에 권장하지 않고 function component와 Hooks를 중심으로 가르친다. 많은 library와 기존 service에 class code가 남아 있으므로 읽을 수 있어야 한다. 기존 class lifecycle을 무조건 변환하기보다 동작과 error boundary 같은 class-only 경계를 확인하고 점진적으로 migration한다.

- `React.Component`를 상속하고 `render()`가 반환한 JSX로 화면을 그린다.
- state는 `this.state` 하나의 object에 모으고 `this.setState`로 갱신한다. object를 넘기면 기존 state에 얕게 병합된다.
- `useState` setter는 병합하지 않고 값을 교체한다. class의 object state를 하나의 `useState`로 옮기면 `setForm(prev => ({ ...prev, name }))`처럼 펼쳐야 다른 field가 사라지지 않는다.

| 단계 | lifecycle 호출 순서 |
|---|---|
| mount | `constructor`, `static getDerivedStateFromProps`, `render`, `componentDidMount` |
| update | `static getDerivedStateFromProps`, `shouldComponentUpdate`, `render`, `getSnapshotBeforeUpdate`, `componentDidUpdate` |
| unmount | `componentWillUnmount` |

- `shouldComponentUpdate`가 `false`를 반환하면 그 update의 render를 건너뛴다. function component에서는 `memo`가 비슷한 최적화다.
- `getSnapshotBeforeUpdate`는 DOM이 바뀌기 직전 scroll 위치 같은 값을 읽는다. 현재 function component에는 대응 API가 없고, error boundary도 function component로 작성할 수 없다.
- `getDerivedStateFromProps`로 props를 state에 복사하는 코드는 derived state 때문에 장황해지고 추론하기 어려워지기 쉽다. render 중 계산이나 key로 state를 reset하는 방식을 먼저 검토한다.
- `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` 조합은 많은 경우 `useEffect`에 대응한다. 다만 method를 옮겨 적지 말고 외부 시스템 동기화 단위로 다시 설계한다([[React-State-Effects-and-Events#Effect는 외부 시스템 동기화|Effect는 외부 시스템 동기화]]).

method를 `onClick={this.handleReset}`처럼 그대로 넘기면 호출 시점에 instance를 잃어 `this`가 `undefined`가 되고 `this.setState`를 호출할 수 없다. constructor에서 `bind`하거나 호출부를 wrapper arrow로 감싼다.

```jsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.handleReset = this.handleReset.bind(this);
  }

  handleReset() {
    this.setState({ count: 0 });
  }

  render() {
    return <button onClick={this.handleReset}>초기화</button>;
  }
}
```

JSX의 `onClick={() => this.handleReset()}`도 동작하지만 render마다 새 callback을 만들므로 하위 component에 넘기면 추가 render를 일으킬 수 있다. react.dev 예시는 class field arrow(`handleClick = () => { ... }`)도 사용한다.

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
- [React, Your First Component](https://react.dev/learn/your-first-component)
- [React, createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [React, React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React Legacy Docs, Introducing Hooks](https://legacy.reactjs.org/docs/hooks-intro.html)
- [React Legacy Docs, Handling Events](https://legacy.reactjs.org/docs/handling-events.html)
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
- IT Share, [React render 과정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161774)
- IT Share, [Create React App 구조](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161784)
