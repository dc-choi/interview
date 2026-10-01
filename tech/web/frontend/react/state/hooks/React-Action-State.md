---
tags: [web, frontend, react, action, optimistic, form]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Action State", "React Action 결과와 낙관적 UI"]
---

# React Action 결과와 낙관적 UI

Action은 Transition 안에서 실행되는 작업이다. 비동기 요청과 state 변경을 포함할 수 있다. `useActionState`는 작업의 순서와 결과를, `useOptimistic`은 작업 도중 잠시 보여 줄 값을 담당한다. 실행 우선순위와 await 경계는 [[React-Transitions-and-Deferred-Values|Transition]]을 함께 읽는다.

## useActionState 계약

`useActionState(reducerAction, initialState, permalink?)`는 `[state, dispatchAction, isPending]`을 반환한다. 첫 state는 initialState, 이후에는 reducerAction의 결과다. initialState는 첫 dispatch 이후 무시한다. dispatchAction identity는 안정적이고 isPending은 이 Hook에 dispatch한 작업이 아직 pending인지 나타낸다.

`reducerAction(previousState, actionPayload?)`는 다음 state를 반환하는 sync/async 함수다. previousState는 앞 작업의 반환 결과이며 첫 작업은 initialState를 받는다. payload는 dispatchAction에 넘긴 값이고 form submission이면 FormData다. `useReducer`의 순수 reducer와 달리 요청, 알림 같은 부수 효과를 수행할 수 있고 개발 Strict Mode가 reducerAction을 순수성 검사로 두 번 호출하지 않는다.

### queue와 실행 경계

같은 Hook의 여러 dispatch는 **순차 실행**한다. 앞 작업의 결과를 다음 작업에 전달해야 하므로 1초 작업 네 개는 약 4초 걸릴 수 있다. UI의 즉각적인 반응은 optimistic state로 표현한다. 서로 독립적인 병렬 작업이 목적이면 `useState`와 Transition 또는 별도 요청 계층을 검토한다.

dispatchAction은 Action 안에서 호출한다. 직접 handler에서 부르면 `startTransition(() => dispatchAction(payload))`로 감싼다. `<form action={dispatchAction}>`와 `<button formAction={dispatchAction}>`는 React의 Action 경계에서 실행된다. custom component의 action prop은 **그 component가 실제로 Transition 안에서 callback을 호출하는 계약**이 있어야 한다. 이름에 Action이 붙었다는 사실만으로 자동 wrapping되지 않는다.

```jsx
import { useActionState } from 'react';
import { saveTitle } from './api.js';

const initialState = { title: '', error: null };
const saveAction = async (previous, formData) => {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...previous, error: '제목을 입력하세요.' };
  const result = await saveTitle(title);
  if (!result.ok) return { ...previous, error: result.message };
  return { title: result.title, error: null };
};
const Editor = () => {
  const [state, action, pending] = useActionState(saveAction, initialState);
  return <form action={action}>
    <label>제목 <input name="title" defaultValue={state.title} required /></label>
    <button disabled={pending}>저장</button>
    <p role="status">{pending ? '저장 중' : state.error ?? state.title}</p>
  </form>;
};
```

예제의 saveTitle은 `{ ok, title, message }` 결과 계약을 가진 외부 API다. 입력 검사와 권한 검사는 server에서도 수행한다. 반환 state의 타입을 initialState와 맞추고, TypeScript가 추론하지 못하면 명시적인 state 타입을 둔다. reducerAction 안에서 await **이후 다른 setter**를 Transition으로 갱신하려면 추가 startTransition으로 감싼다. reducerAction의 반환값으로 이 Hook의 state를 갱신하는 것은 별도 setter 호출과 구분한다.

### 여러 action type, form과 서버 응답

payload에 `type`을 넣어 add/remove/reset의 의미를 나누고 각 branch가 다음 state를 반환하게 할 수 있다. optimistic setter와 dispatchAction을 같은 Action 안에서 호출하면 수량은 즉시 바뀌고 확정 결과는 queue를 따라 반영된다. form의 button `name`/`value`도 FormData에 담아 branch 선택에 사용할 수 있다.

Server Function과 사용할 때 initialState와 payload는 React가 지원하는 직렬화 타입이어야 한다. hydration이 끝나기 전에도 서버 응답을 표시하는 점진적 향상을 지원한다. permalink는 JavaScript가 로드되기 전 제출할 목적 URL이며, 도착 페이지에 **같은 form component, 같은 reducerAction과 permalink**가 있어야 state를 이어 받을 수 있다. 상호작용이 가능해진 뒤에는 permalink가 영향을 주지 않는다.

### 오류, 취소와 reset

예상 가능한 검증 오류는 state로 반환해 inline UI로 표현한다. 예상하지 못한 오류를 throw하면 뒤에 대기하던 작업을 취소하고 가까운 Error Boundary로 연결한다. 오류 때문에 이후 action이 실행되지 않는다면 먼저 앞 작업이 throw했는지 확인한다. 모든 예외를 성공 state로 바꾸는 catch는 서버 변경 실패를 숨길 수 있다.

AbortController는 진행 중 요청을 종료하거나 signal이 이미 aborted인 대기 작업을 빨리 끝내는 데 사용할 수 있다. 이 정책은 직접 구현해야 하고 **요청 취소는 서버 write rollback이 아니다**. 부수 효과를 무시하거나 재시도해도 안전한 작업인지 확인한다. 취소를 정상 반환으로 처리할 때도 확정되지 않은 서버 수량을 성공으로 표시하지 않는다.

내장 reset dispatcher는 없다. reducerAction의 reset payload branch에서 initial state를 반환하거나 owner component의 key를 바꿔 remount한다. form의 성공 후 uncontrolled input reset은 Hook의 결과 state reset과 다른 기능이다.

### useActionState 문제 진단과 이해 확인

- pending이 변하지 않거나 Transition 밖 호출 오류가 나오면 Action 경계를 확인한다.
- formData.get이 실패하면 FormData를 두 번째 인자로 받는지 확인한다.
- 작업이 건너뛰어지면 이전 throw와 queue 취소를 확인한다.
- render 중 dispatch는 허용하지 않는다. JSX에서 호출한 handler와 무조건 dispatch를 제거한다.
- 연속 add/remove가 실제 순서로 실행되는지, expected error는 UI에 남고 unexpected error는 Boundary로 가는지 확인한다.
- form reset 뒤에도 result state가 남는 이유, abort 후 서버 write가 남을 수 있는 이유를 설명한다.

## useOptimistic 계약

`useOptimistic(value, reducer?)`는 `[optimisticState, setOptimistic]`을 반환한다. value는 **pending Action이 없을 때 보여 줄 기준값**이다. Action 중 optimistic update를 등록하면 임시 값을 보여 주고, Action이 끝나면 그 시점의 value로 수렴한다. 이것은 서버의 성공을 대신 확정하는 저장소가 아니다.

선택적 reducer는 순수한 `(currentState, action) => nextOptimisticState` 함수다. reducer가 없으면 setter에 다음 값 또는 순수 updater를 넘긴다. reducer가 있으면 setter 인자를 reducer의 action 인자로 해석한다. setter는 반환값이 없고 Action 안에서 호출해야 한다.

### 임시 값, 기준값 갱신과 실패

```jsx
const [items, setItems] = useState(initialItems);
const [optimisticItems, removeOptimistic] = useOptimistic(
  items, (current, id) => current.filter(item => item.id !== id)
);
const [error, setError] = useState(null);
const removeItem = id => {
  setError(null);
  startTransition(async () => {
    removeOptimistic(id);
    try {
      await deleteItem(id);
      startTransition(() => {
        setItems(current => current.filter(item => item.id !== id));
      });
    } catch {
      setError('삭제하지 못했습니다. 다시 시도하세요.');
    }
  });
};
```

여기서 목록을 그릴 때 optimisticItems를 사용하고 error는 `role="alert"` 등에 연결한다. 실패하면 기준 items가 바뀌지 않아 삭제한 항목이 다시 보인다. 이 UI 복원은 서버 트랜잭션을 되돌리는 기능이 아니다. 성공해도 기준값을 바꾸지 않으면 작업 종료 후 예전 UI로 돌아간다. 서버가 보정한 결과가 있으면 그 값을 기준 state에 반영한다.

Action의 await와 새 값의 Suspense 준비가 끝날 때 optimistic 결과와 기준값이 같은 commit에서 수렴하므로 임시 state를 지우는 별도 render를 작성하지 않는다. `useOptimistic(false)`에서 true를 등록하면 pending만 임시로 표현하고 종료 후 false로 돌아오는 button을 만들 수 있다. Action prop 내부에서 사용하려면 해당 prop의 호출자가 Transition을 유지하며 async callback을 await해야 한다.

### updater와 reducer 선택

updater는 단순 토글/증감의 표현을 줄이고, reducer는 항목 ID나 여러 action type을 받아 전이 규칙을 모으는 데 적합하다. **React 19.3.0에서는 순수 functional updater와 reducer 모두 pending 중 바뀐 최신 기준값에 재적용된다.** 시작 시점 배열을 closure로 복사한 고정값 setter와 구분한다.

예를 들어 기준값이 `['a']`인 동안 임시 항목 local을 추가하고, pending 중 기준값이 `['a', 'external']`로 바뀌면 `setOptimistic(current => [...current, 'local'])`과 같은 reducer 모두 external을 유지한다. 반면 시작 시 만든 `[...items, 'local']`을 고정값으로 넘기면 external을 놓칠 수 있다.

2026-10-01 공식 useOptimistic 설명은 updater가 시작 시 state만 본다고 적지만, React 19.3.0의 `updateOptimisticImpl`과 `basicStateReducer` 구현 및 실행 결과는 위와 같다. 기준값 변경만을 이유로 updater를 금지하지 않고, 전이의 복잡성과 action 구조로 선택한다. 다른 버전 적용 시 이 차이를 다시 확인한다.

목록 추가는 event에서 id를 만들고 reducer가 `{ ...item, pending: true }`를 붙여 임시 항목을 추가한다. 서버의 확정 목록이 반영되면 pending 표시를 제거한 실제 항목으로 바뀐다. follow 여부와 follower count는 하나의 reducer 결과로 계산해 모순을 피한다. add/remove/quantity 변경은 action type별로 immutable하게 처리한다. 삭제 항목을 즉시 숨기는 대신 `deleting` flag를 두어 흐리게 표시하고 재시도 UI를 유지할 수도 있다.

### pending 표시와 문제 진단

optimistic 값과 기준값의 차이는 미확정 **표시 차이**를 알려 준다. 두 값이 같아지는 no-op 또는 원래 값으로 토글한 요청까지 완료됐다고 보장하지 않는다. 전체 작업 진행은 useTransition/useActionState의 isPending, 항목별 진행은 reducer의 pending flag로 표현한다.

Action 밖 setter는 경고와 함께 잠깐 임시 값을 보였다가 기준값으로 돌아갈 수 있다. render 중 optimistic setter는 오류다. 값이 오래된 데이터에 기반하면 고정값 전달과 closure를 확인하고 필요한 상대 전이를 순수 updater 또는 reducer로 표현한다. 같은 base에 여러 pending 변경을 적용할 때 중복 id와 이미 삭제된 항목의 정책을 확인한다.

**이해 확인:** pending 중 서버 목록을 갱신하고 새 optimistic 항목이 최신 목록 위에 남는지 확인한다. 실패, 서버 보정값, no-op 요청에서 각각 어떤 값과 pending 표시가 남아야 하는지 설명한다.

## 출처

- [React, useActionState](https://react.dev/reference/react/useActionState)
- [React, useOptimistic](https://react.dev/reference/react/useOptimistic)
- [React, ReactFiberHooks v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberHooks.js)
- [React, useTransition](https://react.dev/reference/react/useTransition)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Transitions-and-Deferred-Values|Transition와 deferred UI]]
- [[React-State-Hook-Contracts|순수 reducer와 setter]]
- [[React-State-Structure|state 구조와 수명]]
- [[React-Server-State-and-API|서버 결과와 mutation]]
