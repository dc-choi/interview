---
tags: [web, frontend, react, state-management, redux, recoil]
status: done
verified_at: 2026-08-04
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

State를 무조건 root나 store로 올리면 update 영향 범위와 결합이 커진다. Context도 value identity가 바뀌면 consumer가 update되므로 state와 dispatch context 분리, provider 범위와 selector 지원 여부를 검토한다.

## custom Hook의 의미

Custom Hook은 stateful logic을 재사용하지만 호출한 component끼리 state를 자동 공유하지 않는다. 각 호출은 독립 state를 갖는다. Context나 external store를 내부에서 읽는 Hook이라면 그 저장소 때문에 공유되는 것이다.

Hook 이름은 `use`로 시작하고 Rules of Hooks를 지킨다. `useCurrentQuestion`처럼 domain query를 제공하면 component가 store shape에 직접 결합되지 않지만, 반환 계약과 error/empty 상태를 숨기지 않는다.

## Recoil을 새 선택지로 권장하지 않기

Recoil은 atom과 derived selector로 dependency graph를 만드는 실험적 library였다. 강의의 atom, selector와 async selector는 당시 API를 이해하는 역사적 예제로는 쓸 수 있다.

공식 GitHub repository는 2025-01-01 owner에 의해 archive되어 read-only다. 2026년 신규 production project의 기본 선택으로 권장하지 않고, 기존 사용자는 React major 호환성, SSR, unresolved issue와 migration 비용을 평가한다. 다른 store를 고를 때도 API 유사성만 보지 않고 maintenance, concurrent rendering 지원과 team ownership을 확인한다.

## Redux는 Redux Toolkit으로

Redux가 필요한 경우 공식 권장 방식은 Redux Toolkit과 React-Redux Hooks API다.

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

Reducer는 pure transition이고 side effect를 실행하지 않는다. Redux Toolkit은 Immer를 사용해 mutation처럼 보이는 안전한 immutable update를 작성하게 한다. action은 setter보다 domain event로 이름 짓고 derived data는 selector로 계산한다.

API data는 hand-written middleware부터 만들기보다 RTK Query를 먼저 검토한다. imperative async workflow는 thunk, reactive workflow는 listener middleware를 사용할 수 있다. form의 모든 keystroke를 Redux에 저장하는 관행은 보통 필요 없으며 live preview처럼 여러 영역이 즉시 공유해야 하는 이유가 있는지 확인한다.

## 관련 문서

- [[React-Server-State-and-API|Server state와 API]]
- [[React-Local-State-and-Persistence|지역 state]]
- [[Event-Sourcing|Event와 state transition]]

## 출처

- [React, Managing State](https://react.dev/learn/managing-state)
- [React, Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [Redux, Style Guide](https://redux.js.org/style-guide/)
- [Redux, Redux Toolkit Overview](https://redux.js.org/redux-toolkit/overview/)
- [Redux, Side Effects Approaches](https://redux.js.org/usage/side-effects-approaches)
- [Recoil GitHub repository, archived](https://github.com/facebookexperimental/Recoil)
- IT Share, [공유 state 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161812)
- IT Share, [Recoil](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161813)
- IT Share, [Recoil data 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161814)
- IT Share, [Custom Hook](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161815)
- IT Share, [Redux Toolkit으로 data 관리](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161836)
- IT Share, [Redux async API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161837)
