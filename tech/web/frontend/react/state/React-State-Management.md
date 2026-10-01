---
tags: [web, frontend, react, state-management, redux, recoil]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React State Management", "React 전역 상태 관리"]
---

# React 공유 state 관리

전역 상태 도구는 prop drilling을 없애는 만능 계층도, performance 최적화 자체도 아니다. 먼저 state의 종류와 owner를 분류한다.

| 상태 | 기본 위치 |
|---|---|
| input, open/closed, hover | 가장 가까운 component |
| sibling이 공유하는 draft | 가까운 공통 parent로 lift |
| theme, auth session 같은 tree context | Context |
| 복잡한 client domain transition | reducer 또는 외부 store |
| API cache와 request lifecycle | server-state library/router |
| URL로 공유할 filter와 step | router search/path parameter |

State를 무조건 root나 store로 올리면 update 영향 범위와 결합이 커진다. Context도 value identity가 바뀌면 consumer가 update되므로 state와 dispatch context 분리, provider 범위와 selector 지원 여부를 검토한다. 분리해도 dispatch Provider에 render마다 새 object literal을 넘기면 `Object.is` 비교에서 새 값이 되어 dispatch만 쓰는 consumer도 다시 render되고, `memo`로 감싼 component도 새 context 값은 받는다. 함수는 `useCallback`, object는 `useMemo`로 안정화하거나 `useReducer`의 `dispatch`처럼 identity가 유지되는 값을 공급한다. Context의 TypeScript 경계는 [[TS-React-Type-Contracts#Context의 null 경계|Context 타입]]에 있다.

## 공통 parent로 state 올리기

sibling의 값을 함께 바꿔야 하면 각 child의 state를 제거하고 가장 가까운 공통 parent가 한 값을 소유하게 한다. 먼저 child가 고정 prop으로 동작하게 만든 뒤 parent state와 변경 handler를 연결한다. state마다 owner 하나를 정하는 것이며 application의 모든 state를 한곳에 모으라는 뜻은 아니다.

예를 들어 accordion에서 panel별 `isActive`를 두면 둘 다 열릴 수 있다. parent가 `activeId` 하나를 소유하고 child에 `isActive={activeId === panel.id}`와 `onShow={() => setActiveId(panel.id)}`를 넘기면 하나만 열린다는 조건을 구조로 표현한다. 검색어도 SearchBar와 결과 List의 공통 parent가 소유하고 결과는 render에서 계산한다.

중요한 값이 props로 결정되면 controlled, 자체 state로 결정되면 uncontrolled라고 부른다. 하나의 component 안에서도 값별로 두 방식을 섞을 수 있다. parent의 조율이 필요한 값만 props로 제어하고 leaf의 임시 UI state는 가까이 둔다.

## reducer로 전이 규칙을 모은다

initializer, dispatch의 snapshot/identity와 undefined 결과 진단은 [[React-State-Hook-Contracts#useReducer 계약|useReducer 계약]]을 따른다. 비동기 side effect와 앞 작업의 반환값에 의존하는 순차 전이는 [[React-Action-State#useActionState 계약|reducerAction]]의 다른 책임이다. 여러 handler의 state 갱신이 반복되거나 같은 invariant를 지켜야 하면 `useReducer`로 모은다. handler는 무슨 일이 일어났는지를 action으로 보내고 `(state, action) => nextState`가 변경 규칙을 결정한다.

```jsx
const tasksReducer = (tasks, action) => {
  switch (action.type) {
    case 'added': return [...tasks, action.task];
    case 'changed': return tasks.map(task =>
      task.id === action.task.id ? action.task : task);
    case 'deleted': return tasks.filter(task => task.id !== action.id);
    default: throw new Error(`Unknown action: ${action.type}`);
  }
};
const [tasks, dispatch] = useReducer(tasksReducer, []);
// event handler에서 dispatch({ type: 'deleted', id: taskId });
```

reducer도 queue를 거쳐 render에서 실행되므로 순수해야 한다. API 요청, timer, alert나 id 생성은 event/외부 계층에서 하고 결과를 action에 담는다. 기존 object/array는 immutable하게 바꾼다. 다섯 field의 reset도 사용자 interaction 하나라면 `formReset` action 하나로 표현한다.

`useState`는 단순 변경에 코드가 적고, reducer는 action과 함수가 추가되는 대신 복잡한 전이를 독립적으로 검사하기 쉽다. action 순서로 결과를 추적하고, 고정 state/action에서 다음 state와 이전 state 미변경을 확인한다. Immer가 이미 있다면 draft 기반 reducer를 쓸 수 있지만 React reducer 자체가 mutation을 허용하는 것은 아니다.

## Context로 먼 subtree에 전달한다

Context는 `createContext(defaultValue)`로 만들고 필요한 child가 `useContext`로 읽는다. 가장 가까운 상위 provider의 값이 선택되며 provider가 없을 때 default를 사용한다. 중간 component는 해당 prop을 전달할 필요가 없다. 별도 Context들은 서로 독립이고 nested provider는 자기 subtree에서 같은 Context 값을 덮어쓴다.

provider의 value가 undefined이면 default를 쓰지 않고 undefined를 읽는다. symlink/번들 중복으로 Context object가 다르면 provider와 consumer가 연결되지 않으므로 양쪽 object의 `===`를 확인한다([[React-State-Hook-Contracts#useContext 문제 진단|Context 진단]]).

같은 component에서 Context를 읽고 provider를 반환하면 읽는 값은 자기 provider 위의 값이다. 예를 들어 Section이 상위 heading level을 읽고 `level + 1`을 child에 제공해 깊이를 누적할 수 있다. React 19에서는 `<TasksContext value={tasks}>`가 provider 문법이며 이전 버전의 `<TasksContext.Provider value={tasks}>`도 구분해 이해한다.

Context에 넣기 전에 props 전달과 `<Layout><Posts posts={posts} /></Layout>` 같은 children 구성을 검토한다. Context는 theme, 현재 account나 먼 component들이 공유하는 state처럼 실제 subtree 공통값에 적합하다.

## reducer와 Context 결합

```jsx
const TasksContext = createContext(null);
const TasksDispatchContext = createContext(null);
const TasksProvider = ({ children }) => {
  const [tasks, dispatch] = useReducer(tasksReducer, []);
  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>
        {children}
      </TasksDispatchContext>
    </TasksContext>
  );
};
```

state는 Provider component가 계속 소유한다. 읽는 child는 state Context, action만 보내는 child는 dispatch Context를 읽는다. 필요하면 `useTasks`, `useTasksDispatch`와 provider/reducer를 한 module로 모아 연결부를 숨긴다. 누락된 provider의 `null` 처리 계약은 [[TS-React-Type-Contracts#Context의 null 경계|Context 타입]]에서 정한다. state/dispatch 분리는 context 변경 구독을 나누지만 parent render 자체를 모두 막는 보장은 아니다.

## 구독 위치가 re-render 범위를 정한다

React는 parent가 다시 render되면 기본적으로 child도 다시 render한다. props가 바뀌었는지와 무관하게 owner의 render가 subtree로 전파되므로, 최상위 component의 state를 바꾸면 그 값을 쓰지 않고 전달만 하는 중간 component까지 다시 실행된다. `memo`는 props가 같으면 건너뛰게 하는 성능 최적화일 뿐 보장이 아니다. 외부 store는 값을 component 밖에 두고 구독한 component와 그 subtree만 갱신하므로, 어느 component에서 store를 읽느냐가 update 범위를 정한다.

- `useSelector`는 action이 dispatch될 때마다 selector를 실행하고 이전 결과와 `===`로 비교해 다르면 그 component를 다시 render한다. `state => ({ count: state.count, user: state.user })`처럼 매번 새 object를 반환하면 관련 없는 action에도 매번 render된다. 작은 값을 고르는 `useSelector`를 여러 번 호출하거나 `shallowEqual` 비교, `createSelector`로 memoize한 selector를 쓴다. 한 component가 slice 전체를 실제로 쓰면 한 번에 읽는다.
- Page 수준에서 draft 전체를 구독하면 입력 한 번마다 page 전체가 다시 render된다. 값이 필요한 가장 작은 component로 구독을 내린다. 목록은 id 배열만 고르고 각 item component가 자기 entry를 읽는다(Redux Style Guide의 Strongly Recommended 규칙).
- 저장 button처럼 요청 body로 draft 전체가 필요하지만 화면에 보여 주지 않는 값은 page에서 꺼내 handler로 넘기지 않는다. button을 별도 component로 떼어 그 안에서 읽으면 편집 때 button만 다시 render되고, thunk의 `getState()`로 click 시점에 읽으면 구독 자체가 없다.
- 값을 쓰기만 하는 component는 구독하지 않는 API를 쓴다. Redux의 `useDispatch`는 store를 구독하지 않는다. Recoil에서 구독 없이 쓰는 hook은 `useSetRecoilState`이고, `useRecoilValue`와 `useRecoilState`는 둘 다 구독하므로 읽기 전용 hook으로 바꾼다고 render가 줄지 않는다.
- 질문 개수처럼 여러 component가 쓰는 파생 값은 selector 하나로 계산해 재사용한다. 결과가 primitive이거나 memoize되어 참조가 유지되면 원본이 바뀌어도 결과가 같을 때 re-render가 생기지 않는다.
- [[Atomic-Design#순수 컴포넌트와 부수 효과 계층|Atomic Design]]은 Atom부터 Template까지 store를 직접 읽지 않고 props로 받게 한다. 구독을 내릴 때는 표현 component 대신 그 옆의 작은 container가 구독하고 props로 넘겨 두 규칙을 함께 지킨다. 다른 화면에서도 쓸 공통 component는 store에 직접 연결하지 않는다.
- 전역 store의 값은 component unmount와 무관하게 남는다. 제출 뒤 응답을 비우지 않으면 새 응답을 시작해도 이전 답과 진행률이 남으므로, 흐름이 끝날 때와 route가 바뀔 때 reset한다([[React-Form-Builder-Practice#생성과 수정 mode|생성과 수정 mode]]).

최적화 전후는 React DevTools Profiler로 측정한다([[React-Core-Mental-Model|핵심 mental model]]).

## custom Hook의 의미

Custom Hook은 stateful logic을 재사용하지만 호출한 component끼리 state를 자동 공유하지 않는다. 각 호출은 독립 state를 갖는다. Context나 external store를 내부에서 읽는 Hook이라면 그 저장소 때문에 공유되는 것이다.

Hook 이름은 `use`로 시작하고 Rules of Hooks를 지킨다. `useCurrentQuestion`처럼 domain query를 제공하면 component가 store shape에 직접 결합되지 않지만, 반환 계약과 error/empty 상태를 숨기지 않는다. URL parameter를 읽는 Hook의 파싱, 검증과 이름 규칙은 [[React-Routing-and-Styling#route parameter는 Hook 한곳에서 해석한다|route parameter Hook]]을 따른다.

## Recoil을 새 선택지로 권장하지 않기

Recoil은 atom과 derived selector로 dependency graph를 만드는 실험적 library였다. 강의의 atom, selector와 async selector는 당시 API를 이해하는 역사적 예제로는 쓸 수 있다.

공식 GitHub repository는 2025-01-01 owner에 의해 archive되어 read-only다. 2026년 신규 production project의 기본 선택으로 권장하지 않고, 기존 사용자는 React major 호환성, SSR, unresolved issue와 migration 비용을 평가한다. 다른 store를 고를 때도 API 유사성만 보지 않고 maintenance, concurrent rendering 지원과 team ownership을 확인한다.

## Redux는 Redux Toolkit으로

Redux가 필요한 경우 공식 권장 방식은 Redux Toolkit과 React-Redux Hooks API다.

### data flow와 3원칙

1. component가 사용자 event 등에서 action을 dispatch한다. action은 무슨 일이 일어났는지 기술한 plain object로 `type`과 보통 `payload`를 가진다. action creator는 이 object를 만드는 함수라 type 문자열 오타와 중복을 줄인다.
2. store가 reducer `(state, action) => nextState`를 실행해 결과를 새 state로 저장한다.
3. store가 구독 중인 UI에 알리고, 각 component는 자기가 읽는 부분이 바뀌었는지 확인해 바뀐 component만 다시 render한다.

공식 3원칙이 이 흐름의 전제다. 전역 state는 단일 store 안의 object tree에 둔다(single source of truth). state를 바꾸는 유일한 방법은 무슨 일이 일어났는지 기술한 action을 발행하는 것이다(state is read-only). 변경은 pure reducer로 기술한다(changes are made with pure functions). 공식 문서는 이 저수준 방식을 손으로 구현하지 말고 Redux Toolkit의 `configureStore`와 `createSlice`를 쓰라고 안내한다.

### Redux Toolkit 구성

```typescript
const surveySlice = createSlice({
  name: "survey",
  initialState,
  reducers: {
    questionAdded(state, action) {
      state.questions.push(action.payload);
    },
  },
});
```

Reducer는 pure transition이고 side effect를 실행하지 않는다. Redux Toolkit은 Immer를 사용해 mutation처럼 보이는 안전한 immutable update를 작성하게 한다. action은 setter보다 domain event로 이름 짓고 derived data는 selector로 계산한다. draft 재할당과 수정 뒤 return 같은 Immer 함정은 [[React-Form-Builder-Practice#Immer draft 규칙|Immer draft 규칙]]에 정리했다.

- `configureStore`는 slice reducer object를 받으면 `combineReducers`로 root reducer를 만든다. 기본 middleware는 production에서 thunk뿐이고 개발 build에서 immutability, serializability와 action creator 오사용 검사를 더한다. Redux DevTools Extension 연결도 기본으로 켠다.
- `createSlice`는 내부에서 `createAction`과 `createReducer`를 써서 reducer key와 같은 이름의 action creator를 만든다. action type은 `slice name/reducer key`라 위 예시의 action은 `"survey/questionAdded"`다.
- root를 react-redux의 `Provider`로 감싸 store를 주입하고 component는 `useSelector`로 읽고 `useDispatch`로 보낸다. 설치 package는 `@reduxjs/toolkit`과 `react-redux`다.
- Redux DevTools는 dispatch된 action과 그에 따른 state 변화 이력을 보여 transition이 의도대로 일어났는지 확인하게 한다. action을 setter가 아니라 event로 이름 지어야 이 log가 읽힌다.
- 질문 추가 popover의 열림 여부처럼 한 component만 쓰는 UI 상태는 local state로 두고 domain 변경만 dispatch한다. 위 상태 표를 적용한 경계다.

### middleware와 thunk

Reducer는 같은 입력에 같은 결과를 내야 하므로 지연, 실패와 외부 의존이 있는 API 호출을 할 수 없다. Redux middleware는 action을 dispatch한 시점과 reducer에 도달하는 순간 사이의 확장 지점이다. `store => next => action` 형태로 action을 받아 로직을 실행한 뒤 `next(action)`으로 넘기거나, 다른 action을 dispatch하거나, 넘기지 않고 멈출 수 있다. [[Middleware패턴이란|Middleware 패턴]]의 pipeline이 dispatch 경로에 적용된 것이다.

thunk middleware는 받은 action이 함수이면 `dispatch`와 `getState`를 넘겨 실행하고, plain object면 `next(action)`으로 넘긴다. 함수 안에서 API를 호출하고 시작, 성공, 실패를 각각 action으로 dispatch하므로 reducer는 결과를 저장만 한다.

- `configureStore`가 thunk를 기본으로 넣으므로 직접 만든 thunk middleware를 다시 등록하지 않는다. custom middleware는 `middleware: getDefaultMiddleware => getDefaultMiddleware().concat(custom)`으로 기본값을 유지한 채 더한다. RTK 2부터 `middleware` 옵션은 array를 받지 않고 이 callback만 받으며, callback에서 `[custom]`만 반환하면 thunk와 개발 검사가 모두 빠진다.
- `createAsyncThunk`는 Promise 결과에 따라 `type/pending`, `type/fulfilled`, `type/rejected` action을 dispatch하고 `meta`에 `requestId`와 `arg`를 담는다. `condition`이 `false`를 반환하면 실행 전에 건너뛰고 기본값에서는 action도 dispatch하지 않는다. 실행 중 취소는 dispatch 결과의 `abort()`와 payload creator의 `thunkAPI.signal`로 한다.
- middleware와 thunk는 늦게 도착한 이전 응답을 자동으로 버리지 않는다. `surveyId`가 빠르게 바뀌면 이전 요청의 `fulfilled`가 나중에 도착해 최신 draft를 덮을 수 있다. 공식 예제처럼 state에 현재 `requestId`를 두고 다른 id의 결과를 무시하거나, 요청을 시작한 Effect의 cleanup에서 `abort()`한다.

API data는 hand-written middleware부터 만들기보다 RTK Query를 먼저 검토한다. imperative async workflow는 thunk, reactive workflow는 listener middleware를 사용할 수 있다. form의 모든 keystroke를 Redux에 저장하는 관행은 보통 필요 없으며 live preview처럼 여러 영역이 즉시 공유해야 하는 이유가 있는지 확인한다. 편집 중 값을 form에 두고 적용 시점에만 store에 commit하는 구조는 [[React-Form-Builder-Practice#편집 form의 적용 시점 commit|편집 form의 적용 시점 commit]]을 참고한다.

## 관련 문서

- [[React-Server-State-and-API|Server state와 API]]
- [[React-Local-State-and-Persistence|지역 state]]
- [[React-State-Structure|state 구조와 identity]]
- [[React-State-Updates|snapshot과 immutable update]]
- [[Event-Sourcing|Event와 state transition]]
- [[React-Form-Builder-Practice|form builder의 store 적용]]
- [[TS-React-Type-Contracts|Context와 reducer 타입]]

## 출처

- [React, Managing State](https://react.dev/learn/managing-state)
- [React, Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [React, Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [React, Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React, Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [React, memo](https://react.dev/reference/react/memo)
- [React, useContext](https://react.dev/reference/react/useContext)
- [React, useReducer](https://react.dev/reference/react/useReducer)
- [Redux, Style Guide](https://redux.js.org/style-guide/)
- [Redux, Three Principles](https://redux.js.org/understanding/thinking-in-redux/three-principles)
- [Redux, Redux Overview and Concepts](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)
- [Redux, Middleware](https://redux.js.org/understanding/history-and-design/middleware)
- [Redux, Writing Logic with Thunks](https://redux.js.org/usage/writing-logic-thunks)
- [Redux, Side Effects Approaches](https://redux.js.org/usage/side-effects-approaches)
- [Redux Toolkit, Getting Started](https://redux.js.org/toolkit/introduction/getting-started)
- [Redux Toolkit, configureStore](https://redux.js.org/toolkit/api/configureStore)
- [Redux Toolkit, getDefaultMiddleware](https://redux.js.org/toolkit/api/getDefaultMiddleware)
- [Redux Toolkit, createSlice](https://redux.js.org/toolkit/api/createSlice)
- [Redux Toolkit, createAsyncThunk](https://redux.js.org/toolkit/api/createAsyncThunk)
- [Redux Toolkit, Migrating to RTK 2.0 and Redux 5.0](https://redux.js.org/toolkit/usage/migrating-rtk-2)
- [React Redux, Hooks](https://redux.js.org/react-redux/api/hooks)
- [Recoil, useSetRecoilState](https://recoiljs.org/docs/api-reference/core/useSetRecoilState/)
- [Recoil, useRecoilValue](https://recoiljs.org/docs/api-reference/core/useRecoilValue/)
- [Recoil GitHub repository, archived](https://github.com/facebookexperimental/Recoil)
- IT Share, [React render 과정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161774)
- IT Share, [공유 state 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161812)
- IT Share, [Recoil](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161813)
- IT Share, [Recoil data 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161814)
- IT Share, [Custom Hook](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161815)
- IT Share, [Redux Toolkit으로 data 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161836)
- IT Share, [Redux async API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161837)
- IT Share, [Progress bar](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161823)
- IT Share, [저장 기능](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161839)
