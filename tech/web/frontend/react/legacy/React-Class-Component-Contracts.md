---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React class component 계약

## Component 계약

`class MyComponent extends Component`에서 필수 method는 `render()`다. class는 계속 지원되지만 신규 UI는 function component를 우선한다. Hook을 class method에서 호출할 수 없다. 기존 code를 migration할 때 state 병합, lifecycle, error boundary, snapshot 계약을 먼저 확인한다.

| 입력/field | 계약 |
|---|---|
| this.props | parent의 읽기 전용 입력 |
| this.state | object snapshot, setState로 변경 |
| this.context | static contextType에 선언한 context, class 하나당 하나 |
| static defaultProps | missing/undefined prop의 default, null에는 적용 안 됨 |
| static contextType | createContext 반환 object, 상위 provider의 값 |

## constructor와 render

`constructor(props)`는 초기 props를 받고 반환값이 없다. `super(props)` 뒤에 초기 state 설정과 method bind를 수행한다. subscription, network request와 DOM side effect를 넣지 않는다. 직접 this.state 초기화는 constructor에서 하고 다른 method에서는 setState를 쓴다. class field 초기화도 가능하다.

```jsx
class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0, label: '횟수' };
    this.increment = this.increment.bind(this);
  }
  increment() {
    this.setState(state => ({ count: state.count + 1 }));
  }
  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

method를 callback으로 직접 넘기면 instance this가 사라질 수 있어 bind 또는 caller wrapper가 필요하다. render()는 인자 없이 props/state/context에서 React node(element, text, 숫자, portal, 빈 node, node array)를 계산한다. DOM/network 작업은 handler나 commit lifecycle로 보낸다.

SSR에서도 constructor와 render가 실행되지만 didMount/willUnmount 같은 commit lifecycle은 server에서 실행되지 않는다. StrictMode는 개발 중 constructor/render를 추가 호출하고 한 결과를 버릴 수 있다. render 결과가 commit으로 이어지는 일대일 관계를 가정하지 않는다.

## setState와 forceUpdate

`setState(nextState, callback?)`는 update를 enqueue하고 반환값이 없다. object를 주면 기존 state에 shallow merge한다. updater는 `(pendingState, props)`를 받아 병합할 object를 반환하는 순수 함수다. 같은 event에서 여러 update를 누적할 때 updater를 쓴다.

```jsx
this.setState(state => ({ count: state.count + 1 }));
this.setState(state => ({ count: state.count + 1 }));
```

호출 직후 this.state는 실행 중인 snapshot이다. commit 뒤 읽기는 optional callback 또는 componentDidUpdate에서 한다. 여러 update는 batch될 수 있으며 강제 동기 flush는 드물게 필요하더라도 비용이 있다. function useState는 object를 병합하지 않고 교체하므로 migration에서는 field별 state로 나누거나 updater에 spread를 둔다.

`forceUpdate(callback?)`는 shouldComponentUpdate를 거치지 않고 render를 요청하고 callback은 commit 뒤 실행한다. 반환값은 없다. 외부 store를 직접 render에서 읽으며 forceUpdate하는 신규 구현보다 useSyncExternalStore의 subscription contract를 사용한다.

## shouldComponentUpdate와 PureComponent

`shouldComponentUpdate(nextProps, nextState, nextContext)`는 true면 render 필요, false면 생략 가능 hint를 반환한다. 기본은 true이고 initial render나 forceUpdate에서는 호출되지 않는다. 다음 context는 static contextType을 선언했을 때만 의미가 있다.

이는 성능 최적화이고 생략을 절대 보장하지 않는다. false가 child 자신의 state update를 막지 않는다. 생략한 update에는 getSnapshotBeforeUpdate/componentDidUpdate도 실행되지 않는다. deep equality나 JSON.stringify 비용으로 rendering보다 큰 지연을 만들지 않는다.

`PureComponent`는 Component subclass이며 props와 state를 shallow compare하는 shouldComponentUpdate와 비슷하다. 읽는 context가 바뀌면 다시 render하고 nested state/object를 mutate하면 reference가 같아 update를 잘못 생략할 수 있다.

```jsx
class Label extends PureComponent {
  render() { return <strong>{this.props.text}</strong>; }
}
```

function으로 옮길 때 props render 생략은 memo에 대응한다. PureComponent와 달리 memo는 state를 비교하지 않고 useState setter의 동일 값 처리는 별도다. Compiler 적용 여부와 실제 비용을 확인하면 수동 memo가 불필요할 수 있다.

## derived state

`static getDerivedStateFromProps(props, state)`는 initial mount와 후속 render 전에 실행되고 state patch object 또는 null을 반환한다. instance this에 접근하지 않고 순수해야 한다. parent props 변경뿐 아니라 own state update로 발생한 render에도 호출된다.

props를 state로 복사해 두 owner를 만들기 전에 render 계산, 제한된 memoization, fully controlled 입력이나 key reset을 검토한다. 드물게 user identity 변경에 따라 state 일부를 조정해야 하면 이전 identity를 state에 명시하고 변경 조건을 확인한다. side effect를 수행할 자리는 componentDidUpdate다.

static getDerivedStateFromError와 componentDidCatch는 [[React-Error-Boundaries]]에서 다룬다. snapshot/commit/UNSAFE method는 [[React-Class-Lifecycles]]에 연결한다.

## 이해 확인

1. 같은 event에서 object setState 두 번과 updater 두 번의 count를 예측한다.
2. class shallow merge를 하나의 object useState로 옮길 때 사라지는 field를 찾는다.
3. PureComponent에 같은 object를 mutate해 넘겼을 때 render 생략 오류를 설명한다.
4. shouldComponentUpdate false가 descendant state까지 고정하는 것은 아닌 이유를 설명한다.
5. derived state를 없애고 render 계산이나 key reset으로 바꿀 수 있는 조건을 찾는다.

## 출처

- [React, Component](https://react.dev/reference/react/Component)
- [React, PureComponent](https://react.dev/reference/react/PureComponent)

## 관련 문서

- [[React-Core-Mental-Model]]
- [[React-Class-Lifecycles]]
- [[React-Error-Boundaries]]
- [[React-Memo-and-Profiler]]
