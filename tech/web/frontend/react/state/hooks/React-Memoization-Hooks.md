---
tags: [web, frontend, react, memoization, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Memoization Hooks", "React useMemo와 useCallback"]
---

# React useMemo와 useCallback

memoization은 이전 계산 결과나 function identity를 재사용하는 **성능 최적화**다. 삭제하면 application 동작이 틀어지는 이유가 있다면 state owner, dependency와 외부 동기화부터 고친다. React Compiler를 적용한 프로젝트에서는 값과 함수를 자동 memoize해 수동 호출의 필요가 줄어들 수 있다.

## useMemo 계약

`useMemo(calculateValue, dependencies)`는 순수한 계산의 결과를 반환한다. calculateValue는 인자 없이 실행하고 임의 타입 값을 반환한다. 첫 render에서 실행한 결과를 저장하며, 이후 dependency가 같으면 저장한 결과를, 다르면 새 계산 결과를 반환한다.

dependencies는 계산에서 참조하는 props/state와 component 본문의 reactive 값 전체를 고정 길이 inline 배열로 쓴다. 비교는 각 위치의 `Object.is`다. object의 내용이 같다는 이유로 같은 dependency가 되지는 않는다. Hook은 component/custom Hook 최상위에서 호출한다.

```jsx
const visibleItems = useMemo(() => {
  const options = { mode: 'prefix', query };
  return searchItems(items, options);
}, [items, query]);
```

options를 매 render 만들고 배열에 넣으면 매번 계산된다. 위처럼 계산 안에서 만들고 실제 입력 items/query를 dependency에 둔다. 기존 props/state를 mutation하지 않고 계산 중 새로 만든 object/array만 local하게 구성한다.

### 계산 비용과 child props

useMemo는 첫 계산을 빠르게 하지 않는다. 실제 비용이 큰 계산이면서 입력이 드물게 바뀌거나, 결과가 memo된 child의 props/다른 Hook의 dependency일 때 유효하다. 일반적인 작은 filter를 모두 감싸지 않는다. parent의 입력 state를 작은 child에 내려 계산 자체의 실행을 피하는 구조도 검토한다.

`filter`가 매번 새 array를 만들면 같은 내용이라도 child의 props는 달라진다. child를 memo하고 array 결과를 useMemo로 재사용해야 관계없는 theme 변경 때 child render를 건너뛸 수 있다. child 자신의 state나 Context가 바뀌는 것까지 차단하지 않는다. input이 실제 달라지면 계산과 해당 render는 필요하다.

```jsx
const List = memo(({ items }) => <ul>
  {items.map(item => <li key={item.id}>{item.title}</li>)}
</ul>);
const visible = useMemo(() => items.filter(item => item.active), [items]);
// return <List items={visible} />;
```

JSX node 자체도 immutable object라 `useMemo(() => <List items={visible} />, [visible])`로 같은 instance를 재사용할 수 있다. 그러나 조건별 JSX까지 Hook으로 감싸기는 불편하므로 일반적으로 component memo 경계를 둔다. JSX object 생성 자체는 보통 싸다.

### cache 수명과 Effect dependency

개발 중 파일 수정, 최초 mount의 Suspense 등 특정 이유로 cache가 버려질 수 있다. future virtualization 등의 cache 폐기 가능성을 correctness 계약으로 의존하지 않는다. 영구적인 값/instance가 필요하면 state 또는 ref의 수명 계약을 쓴다.

Effect가 options object 때문에 자주 실행되면 useMemo로 identity를 재사용할 수 있지만 cache는 semantic 보장이 아니다. **Effect 안에서 options를 만들고 실제 primitive 입력을 dependency로 두는 구조**가 더 직접적이다. 재동기화 조건을 memo cache가 유지되느냐에 맡기지 않는다.

### useMemo 문제 진단

- 계산이 두 번 호출되면 개발 Strict Mode의 순수성 검사와 실제 dependency 변경을 구분한다. 이전 props array를 수정해 항목이 두 번 추가되면 mutation을 고친다.
- object를 기대했는데 undefined이면 arrow 함수의 `{}` 본문에서 return을 빠뜨렸는지 확인한다. `() => { return { query }; }`로 명시할 수 있다.
- 매 render 다시 계산되면 dependency 배열 누락, render마다 새 object/function과 변경된 primitive를 확인한다. 두 render의 dependency 배열을 console global에 저장해 `Object.is`로 위치별 비교한다.
- map/loop 안의 Hook은 허용하지 않는다. 각 item component로 이동하거나 item 자체를 memo하여 계산까지 건너뛴다.

**이해 확인:** theme만 바꾸었을 때 filtering과 child render의 비용을 따로 측정한다. query가 바뀌면 필요한 계산은 실행되는지 확인하고, object dependency를 계산 내부로 옮겨 비교한다.

## useCallback 계약

`useCallback(fn, dependencies)`는 fn **자체**를 반환한다. 첫 render의 fn을 저장하고 dependency가 같으면 이전 fn, 다르면 이번 fn을 반환한다. React가 fn을 호출하지 않는다. fn은 임의 인자/반환 타입을 가진 일반 callback이며 호출 시점은 사용하는 코드가 정한다.

dependencies는 fn이 참조하는 reactive 값 전체이고 고정 길이 inline 배열이다. `Object.is`로 비교한다. 의미상 `useMemo(() => fn, dependencies)`와 같은 cache지만 중첩 계산 함수를 직접 쓸 필요가 없다. function expression은 render마다 만들어질 수 있으며, Hook은 그 생성을 막는 것이 아니라 이전 function을 반환한다.

```jsx
const handleSubmit = useCallback(order => {
  postOrder({ productId, referrer, order });
}, [productId, referrer]);
// memo된 ShippingForm에 onSubmit={handleSubmit} 전달
```

theme만 달라져도 productId/referrer가 같으면 memo된 child가 callback prop 때문에 render할 이유가 줄어든다. productId가 달라지면 새 callback이 새 상품을 처리해야 하므로 dependency를 빼지 않는다. memo가 없는 싸고 작은 child라면 callback identity 재사용이 체감 이득을 주지 않을 수 있다.

### updater, Effect와 custom Hook

```jsx
const addTodo = useCallback(text => {
  const todo = { id: crypto.randomUUID(), text };
  setTodos(current => [...current, todo]);
}, []);
```

이전 todos를 읽어 다음 값만 계산한다면 updater를 넘겨 todos 직접 읽기를 제거할 수 있다. id는 callback의 event 실행에서 생성하며 순수 updater가 id를 만들지 않는다. 다른 prop을 읽는다면 해당 dependency는 남긴다.

Effect가 createOptions function 때문에 재연결되면 useCallback을 적용할 수 있다. 하지만 함수가 Effect에서만 필요하면 **Effect 안으로 이동**하고 roomId 같은 실제 입력만 dependency로 둔다. cache를 외부 연결의 정확성 조건으로 쓰지 않는다.

custom Hook이 navigate/goBack처럼 사용자에게 함수를 반환한다면 useCallback으로 identity를 재사용해 호출자가 memo/Effect dependency를 최적화할 여지를 줄 수 있다. 내부에서 사용하는 dispatch가 Context 등 외부 입력이면 dependency에 포함한다. `useEffectEvent`는 호출 위치와 identity 계약이 다르므로 반환 callback을 대체할 수 없다.

### useCallback 문제 진단

cache는 useMemo와 마찬가지로 파일 수정/초기 Suspense 같은 조건에서 버릴 수 있다. 함수가 보관되어야 하는 state라면 function state wrapper, imperative instance라면 ref를 검토한다. 모든 함수에 기계적으로 적용하면 dependency 추적과 읽기 비용만 늘 수 있다.

매 render 다른 함수가 반환되면 배열 누락과 위치별 dependency 변경을 검사한다. 항상 새 객체 하나만 있어도 child의 memo가 무력화될 수 있다. map 안에서 item별 useCallback이 필요하면 Report 같은 item component를 추출해 최상위에서 호출한다. item component 전체를 memo하는 편으로 callback Hook을 없앨 수도 있다.

**이해 확인:** memo된 form에 stable callback을 전달할 때 theme 변경과 내부 count 변경을 비교한다. callback을 제거해도 제출 결과는 같은지 확인하고, 오래된 productId를 읽는다면 dependency를 고친다.

## 성능을 판단하는 기준

먼저 render 순수성, 불필요한 state update Effect, 과도한 state lifting을 확인한다. children 구성을 통해 wrapper state와 content의 render를 나눌 수도 있다. 전체를 memoize하기 전에 실제로 느린 interaction과 비용의 위치를 확인한다.

console.time/timeEnd로 계산을 측정하고 React DevTools Profiler로 render 비용을 본다. development Strict Mode의 추가 호출은 production 성능과 다르다. production build, 사용자에 가까운 device와 CPU throttling 조건을 비교한다. memoization 전후 숫자가 좋아졌다는 근거 없이 callback 개수나 Hook 사용량을 성능 지표로 쓰지 않는다.

## 출처

- [React, useMemo](https://react.dev/reference/react/useMemo)
- [React, useCallback](https://react.dev/reference/react/useCallback)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Effect-Dependencies-and-Events|dependency의 실제 의미]]
- [[React-Transitions-and-Deferred-Values|계산 재사용과 우선순위 조절]]
- [[React-Core-Mental-Model|render와 성능 측정]]
