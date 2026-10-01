---
tags: [web, frontend, react, transition, suspense, deferred]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Transitions and Deferred Values", "React 비긴급 render"]
---

# React Transition과 deferred value

입력의 즉각적인 반응과 큰 결과 UI의 갱신은 긴급도가 다르다. Transition/deferred는 비긴급 render를 중단하고 최신 입력을 먼저 처리하게 한다. 계산 자체를 더 빠르게 만들거나 callback을 worker thread에서 실행하는 기능은 아니다.

## useTransition 계약

`useTransition()`은 인자 없이 `[isPending, startTransition]`을 반환한다. `startTransition(action)`은 Action을 **그 자리에서 인자 없이 호출**하고 동기적으로 예약한 state update를 비긴급 update로 표시한다. startTransition의 반환값은 없다. callback에 넘긴 async 작업을 await하면 그 작업은 Transition의 완료 범위에 포함된다.

isPending은 시작할 때 true가 되고 모든 Action이 끝나고 최종 state가 화면에 표시될 때까지 진행 상태를 나타낸다. startTransition identity는 안정적이다. linter가 생략을 허용하면 dependency에서 생략할 수 있다. 여러 진행 중 Transition을 React가 함께 batch하는 현재 제한 때문에 독립 요청마다 완전히 분리된 pending indicator라고 가정하지 않는다.

```jsx
import { useState, useTransition } from 'react';

const Tabs = () => {
  const [tab, setTab] = useState('about');
  const [pending, startTransition] = useTransition();
  return <>
    <button onClick={() => startTransition(() => setTab('posts'))}>
      {pending ? '전환 중' : '게시글'}
    </button>
    <button onClick={() => startTransition(() => setTab('about'))}>소개</button>
    <TabContent tab={tab} />
  </>;
};
```

느린 posts render 도중 about을 누르면 React는 비긴급 render를 중단하고 최신 선택을 처리할 수 있다. React가 중단할 수 있는 render 경계와 한 함수 안의 긴 synchronous 계산은 다르므로, 하나의 거대한 blocking 함수가 Transition만으로 선점 가능해진다고 보지는 않는다.

### await, timer와 Action prop

```jsx
const updateQuantity = nextQuantity => {
  startTransition(async () => {
    const saved = await saveQuantity(nextQuantity);
    startTransition(() => setQuantity(saved));
  });
};
```

현재 계약에서는 await 뒤 setter를 비긴급으로 표시하려면 **추가 startTransition**으로 감싼다. 바깥 Action이 async 작업을 기다리는 것과 이후 setter의 우선순위는 다른 문제다. `setTimeout` callback도 나중에 실행되므로 timer 안의 setter를 감싸야 한다. `console.log(1); startTransition(() => console.log(2)); console.log(3);`의 순서는 1, 2, 3이다.

재사용 button의 `action`/`submitAction` prop은 callback을 `startTransition(async () => { await action(); })` 안에서 호출하는 계약으로 제공한다. 부모 callback이 sync/async여도 완료를 기다릴 수 있다. prop 이름은 관례이며 자동 실행 메커니즘이 아니다. Action 이름만 붙인 일반 onClick은 Transition이 아니다. 즉각적인 수량, pending과 임시 결과는 [[React-Action-State#useOptimistic 계약|useOptimistic]]으로 보완한다.

### input, Suspense와 navigation

controlled text input을 정하는 state는 change event에서 동기적으로 갱신한다. 이 state 자체를 Transition으로 바꾸면 입력 반응이 맞지 않는다. 즉시 input state와 비긴급 결과 state를 나누거나 값 하나와 useDeferredValue를 조합한다.

이미 보여 준 Suspense content가 새 update에서 suspend하면 Transition은 이를 전체 fallback으로 숨기기보다 기존 화면을 유지하게 한다. 시작 button이나 header에 pending 상태를 표시하면 사용자가 반응을 확인할 수 있다. 아직 공개하지 않은 **nested Suspense boundary**의 모든 데이터까지 기다리는 것은 아니므로 새 영역의 fallback은 보일 수 있다.

Suspense를 지원하는 router/framework는 navigation update를 Transition으로 표시하는 방식이 적합하다. 중간 render를 중단할 수 있고 기존 화면을 유지하며 관련 Action 완료도 기다린다. 이는 router의 preload, URL history와 요청 cache를 대신 구현하는 기능은 아니다.

### 오류와 완료 순서

useTransition의 Action이 throw하거나 rejected Promise를 반환하면 해당 Hook을 호출하는 component를 감싼 Error Boundary로 fallback을 표시할 수 있다. 일반 click handler의 모든 비동기 예외를 Error Boundary가 잡는다는 일반 규칙으로 확대하지 않는다.

component 밖에서 시작하려면 React의 standalone `startTransition`을 사용한다. 이 함수는 isPending을 제공하지 않고 component와 연결되지 않으므로 그 Transition의 오류를 component의 Error Boundary가 처리하는 것도 기대하지 않는다.

Action의 **요청 완료 순서를 자동 보장하지 않는다**. 이전 요청이 늦게 끝나 최신 state를 덮는 경우가 있다. await 뒤 추가 startTransition을 넣어도 순서 문제는 해결되지 않는다. 앞 결과에 의존하는 순차 작업은 useActionState, 고급 병렬 흐름은 직접 queue, request identity나 abort 정책이 필요하다. abort는 server mutation의 rollback이 아니라는 점도 함께 확인한다.

### useTransition 문제 진단과 이해 확인

- input 값이 늦으면 input state setter를 긴급 update로 되돌린다.
- Transition으로 처리되지 않으면 setter가 scope 안에서 즉시 호출됐는지, await/timer 경계를 지났는지 본다.
- callback이 즉시 실행되면 정상 동작이다. callback 실행 자체를 지연하는 API가 아니다.
- 결과가 오래된 값이면 요청 시작/완료 순서를 기록하고 ordering 정책을 확인한다.
- 느린 tab render 중 다른 tab을 선택해 최신 선택과 pending UI를 확인한다.
- nested Suspense가 표시되는 이유와 standalone 함수의 pending/오류 한계를 설명한다.

## useDeferredValue 계약

`useDeferredValue(value, initialValue?)`는 value의 지연된 버전을 반환한다. value는 임의 타입이고 선택적 initialValue는 첫 render에 대신 보여 줄 값이다. 생략하면 첫 render에서는 이전 값이 없으므로 value를 그대로 반환한다.

일반 update에서 React는 먼저 최신 value와 이전 deferred value로 render하고, 이어 새 deferred value로 background render를 시도한다. 새 입력이 오면 이 작업을 버리고 최신 값으로 다시 시작할 수 있다. 비교는 `Object.is`다. 이미 Transition 안의 update라면 새 value를 반환하고 추가 deferred render를 만들지 않는다.

### 오래된 결과를 유지하며 갱신

```jsx
import { memo, useDeferredValue, useState } from 'react';

const SlowResults = memo(({ query }) => <Results query={query} />);
const Search = () => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const stale = query !== deferredQuery;
  return <>
    <label>검색 <input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div aria-busy={stale} style={{ opacity: stale ? 0.6 : 1 }}>
      <SlowResults query={deferredQuery} />
    </div>
  </>;
};
```

입력은 최신 query, 결과는 이전 query를 잠시 쓴다. 값이 뒤처짐을 표시해 최신 검색 결과로 오해하지 않게 한다. 큰 child render를 늦추려는 성능 패턴에서는 memo/동등한 최적화가 있어야 긴급 parent render 때 이전 props로 child 작업을 건너뛸 수 있다. deferred 값을 쓰는 것만으로 모든 child가 긴급 render를 건너뛰지는 않는다.

Suspense를 활성화하는 data source와 연결하면 background render가 suspend하는 동안 기존 결과를 유지한다. 새 결과가 준비되면 commit한다. Effect는 background render를 시도했다는 이유만으로 실행되지 않으며 실제 commit 후 실행된다. cache가 없는 일반 Effect fetch는 이 Suspense 동작을 자동으로 얻지 못한다.

### identity, 요청과 delay의 경계

primitive 값이나 이미 유지되는 object를 입력으로 쓴다. `useDeferredValue({ query })`처럼 render마다 새 object를 만들면 관계없는 render도 background 작업을 예약할 수 있다. 필요한 primitive를 defer하거나 기준 object의 owner/identity를 정한다.

고정 delay는 없다. 긴급 render를 마치면 가능한 빨리 background 작업을 시작하고 사용자의 후속 입력이 오면 중단한다. fast device에서는 차이가 작고 느린 device에서는 더 뒤처질 수 있다. debounce는 조용한 시간이 지난 뒤, throttle은 빈도를 제한해 실행한다. 이 두 방법도 실행 순간의 render가 blocking일 수 있다.

useDeferredValue는 요청 횟수를 줄이거나 network를 취소하지 않는다. 각 입력의 요청은 계속 시작될 수 있고 응답 cache 때문에 backspace가 빨라질 수 있다. 요청 절약이 목적이면 query 계층의 debounce/cache와 조합한다. deferred는 결과의 표시와 render 우선순위를 조절한다.

### useDeferredValue 문제 진단과 이해 확인

child가 계속 input을 막으면 memo 경계와 다른 새 props를 확인한다. 매 render background 작업이 생기면 새 object identity를 확인한다. 첫 화면부터 늦추고 싶으면 initialValue를 명시한다. pending 요청 수가 줄지 않는 것은 정상이며 표시된 query와 요청한 query를 구분한다.

1. 값 a를 보여 준 뒤 ab 입력, 다시 abc 입력 때 기존 결과, 최종 commit과 Effect 실행 시점을 설명한다.
2. CPU throttling으로 input 반응을 비교하되 deferred를 제거해도 결과 자체의 정확성은 유지되는지 확인한다.
3. 이미 Transition인 update와 optional initialValue의 첫 render 동작을 비교한다.

## 출처

- [React, useTransition](https://react.dev/reference/react/useTransition)
- [React, useDeferredValue](https://react.dev/reference/react/useDeferredValue)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Action-State|Action과 optimistic UI]]
- [[React-Memoization-Hooks|memoization 계약]]
- [[React-Server-State-and-API|조회와 cache]]
