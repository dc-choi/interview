---
tags: [web, frontend, react, state, snapshot, immutability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React State Updates", "React state snapshot과 update queue"]
---

# React state snapshot과 update queue

## 상호작용과 update 흐름

React의 상호작용은 event handler가 state 변경을 요청하고, 새 state로 UI를 계산한 뒤 필요한 DOM 변경을 적용하는 흐름이다. event 연결은 [[React-State-Effects-and-Events#event handler|event handler]], 값을 보관하는 방법은 [[React-Local-State-and-Persistence#component의 기억으로서 state|지역 state]]와 함께 읽는다.

| 단계 | 하는 일 | 구분할 점 |
|---|---|---|
| trigger | 최초 root render 또는 component/조상 state 변경으로 render 요청 | setter가 현재 변수를 즉시 바꾸는 단계가 아니다 |
| render | component 함수를 호출하고 하위 component까지 UI를 계산 | 같은 입력에서 같은 결과를 내는 순수 계산이다 |
| commit | 계산한 결과를 DOM에 반영 | 기존 DOM과 차이가 있는 부분을 변경한다 |
| browser paint | browser가 변경된 화면을 그린다 | React component 호출과 다른 의미의 rendering이다 |

parent state가 바뀌면 기본적으로 그 아래 component도 render된다. render되었다고 DOM을 전부 지우고 다시 만드는 것은 아니다. 매초 시간 text가 바뀌어도 같은 위치에 남은 uncontrolled input의 입력은 유지될 수 있다. DOM 유지와 component state 유지의 identity 규칙은 [[React-State-Structure#tree 위치와 key로 state 수명 정하기|tree 위치와 key]]에 있다.

render 중 기존 object를 수정하거나 network 요청을 보내지 않는다. 개발 Strict Mode에서 component를 추가 호출하는 것은 이런 순수성 위반을 찾는 검사다. 실제 성능 문제가 확인되기 전에 subtree 전체를 memoization하는 방식으로 대응하지 않는다.

## state는 render의 snapshot

setter는 반환값 없이 다음 render의 state 변경을 요청한다. setter identity는 안정적이며, 다음 값이 이전 값과 `Object.is`로 같으면 render를 건너뛰는 최적화를 한다. React가 component를 먼저 호출할 수도 있어 호출 횟수 자체를 correctness에 사용하지 않는다. 함수 자체를 state로 보관하는 wrapper와 initializer/updater의 구분은 [[React-State-Hook-Contracts#useState 계약|useState 호출 계약]]에 있다.

각 render는 그 시점의 props, state, 지역 변수와 event handler를 가진다. setter를 호출하면 다음 render를 요청하며, 실행 중인 handler가 이미 읽은 state 변수는 바뀌지 않는다.

```jsx
// 이 render에서 count가 0이었다면 두 log 모두 0이다.
const handleClick = () => {
  console.log(count);
  setCount(count + 1);
  console.log(count);
};
```

handler 안의 state를 해당 render의 실제 값으로 치환해 보면 결과를 예측하기 쉽다. `setCount(count + 1)` 세 번은 `setCount(1)` 세 번이므로 0에서 3이 아니라 1이 된다.

timer와 `await`가 있어도 closure가 생성된 render의 snapshot을 본다. 제출 뒤 수신자를 바꿔도 이전 제출 handler가 예약한 메시지는 제출 당시 수신자와 내용을 사용한다. 이 동작이 필요한 제출도 있고 최신 값을 필요로 하는 동기화도 있으므로 읽을 시점을 먼저 정한다. setter 다음에 바로 써야 하는 계산 결과는 지역 변수에 두고 사용한다.

## batching과 update queue

같은 event handler 안의 여러 update는 처리될 때까지 queue에 쌓일 수 있고, handler가 끝난 뒤 함께 반영된다. 서로 다른 의도적인 click을 하나의 event로 묶지는 않는다. 첫 click으로 submit button을 비활성화했다면 다음 click은 갱신된 UI를 기준으로 처리한다.

이전 state에 의존하는 변화는 updater를 넘긴다. updater의 인자는 앞서 queue에서 처리한 결과다.

```jsx
setCount(current => current + 1);
setCount(current => current + 1);
setCount(current => current + 1); // 0에서 시작했다면 최종 3
```

| 초기값 0에서 등록한 queue | 순서대로 계산 | 다음 state |
|---|---|---|
| 값 1, 값 1, 값 1 | 1로 교체, 1로 교체, 1로 교체 | 1 |
| +1 updater 세 번 | 0 → 1 → 2 → 3 | 3 |
| 값 5, +1 updater | 5로 교체, 5 + 1 | 6 |
| 값 5, +1 updater, 값 42 | 5로 교체, 6, 42로 교체 | 42 |

값 전달은 그 지점의 누적 결과를 새 값으로 교체한다. updater는 누적 결과를 받아 변환한다. updater는 render 과정에서 처리되므로 순수해야 한다. network 요청, timer 등록이나 다른 setter 호출을 넣지 않는다. 개발 Strict Mode에서 updater를 추가 호출해도 같은 결과가 나와야 한다.

여러 비동기 작업의 완료 횟수에도 같은 규칙을 적용한다.

```jsx
const handleBuy = async () => {
  setPending(current => current + 1);
  try {
    await buyItem();
    setCompleted(current => current + 1);
  } finally {
    setPending(current => current - 1);
  }
};
```

오래된 `pending - 1`로 덮어쓰면 동시 요청이나 완료 순서 변화 때 음수가 될 수 있다. updater는 현재 누적값을 기준으로 감소한다. 이 예시의 실패 메시지 처리는 호출부의 오류 정책에 연결하고, 완료 횟수는 성공 때만 늘린다.

## object는 변경한 경로를 복사한다

state object는 읽기 전용 snapshot으로 다룬다. `person.name = value`는 setter를 거치지 않고 이전 snapshot도 훼손한다. 새 object를 setter에 넘기고 바꾸지 않는 field는 보존한다.

```jsx
const handleChange = event => {
  const { name, value } = event.target;
  setPerson(current => ({ ...current, [name]: value }));
};

setPerson(current => ({
  ...current,
  address: { ...current.address, city: nextCity },
}));
```

object spread는 한 단계만 복사한다. `address.city`를 바꾸려면 새 `address`와 이를 가리키는 새 `person`을 만든다. `setPerson({ name: nextName })`는 병합이 아니라 교체이므로 다른 field가 사라진다.

object가 겉으로 중첩되어 보여도 실제로는 다른 object를 참조한다. 두 component가 같은 초기 object를 가리키면 한쪽의 mutation이 다른 쪽에도 영향을 줄 수 있다. 새로 만들고 아직 공유하지 않은 object를 구성하는 local mutation은 가능하지만 기존 state와 그 안의 참조를 수정하지 않는다.

불변성은 변경 추적, 참조 기반 비교와 undo/redo에 필요한 이전 snapshot을 보존한다. 깊은 copy가 반복되면 [[React-State-Structure#깊은 관계는 id로 평탄화한다|state 평탄화]]를 먼저 검토한다. Immer를 쓰면 Proxy draft의 변경을 기록해 새 state를 만든다. draft를 수정하는 문법이 기존 state를 직접 수정해도 된다는 뜻은 아니다.

## array와 내부 object를 함께 갱신한다

| 작업 | 기존 state를 바꾸는 방식 | 새 array를 만드는 방식 |
|---|---|---|
| 추가 | `push`, `unshift` | `[...current, item]`, `[item, ...current]` |
| 삭제 | `pop`, `shift`, `splice` | `filter`, `slice` |
| 항목 교체 | `current[i] = item` | `map` |
| 중간 삽입 | `splice` | 앞 `slice`, 새 항목, 뒤 `slice`를 spread |
| 정렬/역순 | 원본 `sort`, `reverse` | 먼저 `[...current]`로 복사한 뒤 적용 |

`slice`는 복사이고 `splice`는 mutation이다. 이름이 비슷해도 state에서의 효과는 다르다.

```jsx
setItems(current => current.map(item =>
  item.id === changedId ? { ...item, done: nextDone } : item
));
setItems(current => current.filter(item => item.id !== deletedId));
setItems(current => [
  ...current.slice(0, insertAt), newItem, ...current.slice(insertAt),
]);
setItems(current => [...current].sort(compareItems));
```

새 array를 만들었어도 내부 object는 같은 참조일 수 있다. `[...items][0].done = true`는 원본 item을 바꾼다. 바꿀 item만 새 object로 만들어 array에 넣는다. 바꾸지 않은 item은 기존 참조를 유지해도 된다.

장바구니 수량 감소와 0인 항목 제거는 하나의 update에서 수행할 수 있다.

```jsx
setCart(current => current
  .map(item => item.id === changedId
    ? { ...item, quantity: item.quantity - 1 }
    : item)
  .filter(item => item.quantity > 0)
);
```

반복되는 깊은 array 갱신은 구조 개선 또는 이미 쓰는 Immer로 줄인다. Immer에서도 mutation은 제공받은 draft 안에서만 한다.

## 이해 확인

- count가 0일 때 값 5, +1 updater, 값 42를 차례로 등록하면 왜 42인가?
- 새 array의 첫 object를 수정하면 왜 다른 목록도 변할 수 있는가?
- component render 횟수가 늘었는데 input의 DOM 값은 유지되는 이유를 설명할 수 있는가?

## 출처

- [React, Adding Interactivity](https://react.dev/learn/adding-interactivity)
- [React, Render and Commit](https://react.dev/learn/render-and-commit)
- [React, State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React, Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React, Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [React, Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [React, useState](https://react.dev/reference/react/useState)

## 관련 문서

- [[React-Local-State-and-Persistence|지역 state와 영속화]]
- [[React-State-Structure|state 구조와 수명]]
- [[React-State-Effects-and-Events|event와 Effect]]
- [[React-State-Management|공유 state와 reducer]]
