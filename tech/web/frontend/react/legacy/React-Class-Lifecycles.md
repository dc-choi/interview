---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React class lifecycle과 migration

## commit lifecycle 계약

render는 다음 UI 계산이고 아래 lifecycle은 실제 commit의 변화와 외부 동기화를 다룬다. method 이름을 function Hook으로 기계적으로 치환하지 않고 동기화 대상마다 setup/update/cleanup을 연결한다.

| method | 인자/반환 | 시점과 책임 |
|---|---|---|
| componentDidMount() | 인자 없음, 반환 없음 | mount commit 뒤 setup |
| componentDidUpdate(prevProps, prevState, snapshot?) | 이전 입력과 snapshot, 반환 없음 | initial mount 제외, update commit 뒤 변경 처리 |
| componentWillUnmount() | 인자 없음, 반환 없음 | 제거 전에 cleanup |
| getSnapshotBeforeUpdate(prevProps, prevState) | snapshot 또는 null 반환 | DOM mutation 직전 측정, didUpdate에 전달 |

mount에서 읽은 props/state가 바뀌면 didUpdate에서도 old resource cleanup과 new resource setup을 처리한다. didUpdate의 setState에는 이전 값과 현재 값을 비교하는 조건이 필요하고, 무조건 update하면 loop가 생긴다.

```jsx
class Room extends Component {
  componentDidMount() { this.connect(); }
  componentDidUpdate(prevProps) {
    if (prevProps.roomId !== this.props.roomId) {
      this.disconnect();
      this.connect();
    }
  }
  componentWillUnmount() { this.disconnect(); }
  connect() {
    this.connection = createConnection(this.props.roomId);
    this.connection.connect();
  }
  disconnect() { this.connection.disconnect(); }
  render() { return <h2>{this.props.roomId}</h2>; }
}
```

StrictMode 개발 검사에서 mount→unmount→mount를 수행할 수 있어 setup과 cleanup을 대칭으로 만든다. didMount/didUpdate 직후 setState가 paint 전 추가 render를 만들 수 있지만 비용이 늘어 initial state는 먼저 초기화하고 DOM 측정 의존 case만 신중히 사용한다. shouldComponentUpdate false이면 didUpdate와 snapshot이 생략될 수 있다.

## DOM snapshot 보존

chat list에서 항목 추가 직전 `scrollHeight - scrollTop`을 snapshot으로 저장하고 update 뒤 새 scrollHeight에서 그 값을 빼면 기존 위치를 유지할 수 있다.

```jsx
getSnapshotBeforeUpdate(prevProps) {
  if (prevProps.items.length < this.props.items.length) {
    const node = this.listRef.current;
    return node.scrollHeight - node.scrollTop;
  }
  return null;
}
componentDidUpdate(prevProps, prevState, snapshot) {
  if (snapshot !== null) {
    const node = this.listRef.current;
    node.scrollTop = node.scrollHeight - snapshot;
  }
}
```

render와 DOM mutation 사이에는 시간 간격이 있을 수 있어 render/UNSAFE method에서 읽은 layout으로 대체하지 않는다. snapshot은 임의 타입이나 null을 반환하고 didUpdate의 세 번째 인자가 된다. 현재 function component에 직접 대응하는 getSnapshotBeforeUpdate API는 없다. 이 경우 class 경계를 유지하는 것이 유효하다.

## deprecated 이름과 UNSAFE 계약

`componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate`는 UNSAFE 접두 이름으로 개명됐고 old 이름은 deprecated다. codemod가 이름을 바꿔도 suspension/재시도에 안전해지는 것은 아니다.

| method | 입력/반환 | 대안 |
|---|---|---|
| UNSAFE_componentWillMount() | 없음, 반환 없음 | 초기 state는 constructor/field, side effect는 didMount |
| UNSAFE_componentWillReceiveProps(nextProps, nextContext) | 다음 props/context, 반환 없음 | side effect는 didUpdate, 계산은 render/memo, reset은 controlled/key |
| UNSAFE_componentWillUpdate(nextProps, nextState) | 다음 props/state, 반환 없음 | side effect는 didUpdate, DOM 이전 측정은 snapshot |

willMount는 constructor 뒤 호출되며 server render에도 실행될 수 있다. willReceiveProps는 initial mount에는 없고 own setState만으로 보통 발생하지 않으며 props가 실제로 달라졌다는 의미도 아니다. willUpdate도 초기 mount에는 없고 setState/Redux dispatch처럼 state update를 유발하는 일을 수행하면 안 된다.

이 method들은 getDerivedStateFromProps 또는 getSnapshotBeforeUpdate를 구현하면 호출되지 않는다. willUpdate는 shouldComponentUpdate false에도 생략된다. Suspense가 render를 버리면 예정된 mount/update가 commit되지 않거나 다음 props가 달라질 수 있다. 외부 subscription/업무 동작을 commit 전 method에 두지 않는 것이 핵심이다.

## function component로 옮기는 순서

1. 현재 cleanup이 setup의 반대이고, didUpdate가 setup에 사용한 **모든** props/state 변경을 처리하는지 먼저 고친다.
2. 외부 시스템 하나의 connect/disconnect를 하나의 Effect로 옮긴다. 서로 다른 동기화는 독립 Effect로 나눈다.
3. state는 field별 useState 또는 reducer로, this.props는 function parameter로, static contextType은 useContext로 옮긴다.
4. paint 전에 DOM을 측정해야 하는 rare case는 layout Effect를 검토하고, 직접 대응이 없는 snapshot/error boundary 경계는 보존한다.

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

외부 시스템이 없는 lifecycle 계산은 Effect로 옮기기보다 render에서 도출하거나 event handler에 둔다. migration 성공은 코드 형태가 아니라 reconnect/cleanup/state preservation 동작으로 확인한다.

## 이해 확인

1. roomId 변경과 반복 mount에서 connection이 하나만 남도록 이전/새 resource를 추적한다.
2. DOM snapshot을 render에서 읽으면 안 되는 시간 간격을 설명한다.
3. UNSAFE 이름 변경만으로 suspension 중 부작용이 해결되지 않는 이유를 설명한다.
4. unrelated lifecycle 작업 둘을 각각 Effect로 옮기고 dependency와 cleanup을 확인한다.

## 출처

- [React, Component](https://react.dev/reference/react/Component)

## 관련 문서

- [[React-Class-Component-Contracts]]
- [[React-Effects]]
- [[React-Error-Boundaries]]
- [[React-Development-Checks]]
