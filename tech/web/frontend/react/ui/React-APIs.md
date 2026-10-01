---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React 내장 API 선택

## react package의 API 선택

Hook은 component가 state와 React 기능에 참여하는 호출이고, 내장 component는 JSX subtree의 처리 경계다. 나머지 API는 component type/context를 만들거나 scheduling, resource, 개발/test 지원을 제공한다. 함수라는 이유로 render 안에서 모두 호출해도 되는 것은 아니다.

| 필요한 동작 | API와 계약 | 판단 |
|---|---|---|
| 깊은 subtree에 입력 공유 | [[React-Context-Creation\|createContext]] + useContext/use | module에 context object를 만들고 provider가 값을 소유한다. context 생성만으로 state가 생기지 않는다 |
| 첫 표시까지 code 요청 지연 | [[React-Suspense-and-Lazy\|lazy]] | module에 component type을 만들고 Suspense와 Error Boundary를 둔다 |
| 동일 props의 render 비용 줄이기 | [[React-Memo-and-Profiler\|memo]] | pure component를 전제로 측정한다. Compiler와 state/context update를 함께 판단한다 |
| urgent 입력과 비긴급 UI 분리 | [[React-Transitions-and-Animation\|startTransition]] | controlled 입력 값은 즉시 반영한다. pending flag가 필요하면 useTransition을 쓴다 |
| Transition 원인별 animation | [[React-Transitions-and-Animation\|addTransitionType]] | 현재 Transition/commit의 원인을 나타낸다. 영구 navigation state는 별도로 둔다 |
| test interaction 완료 기다리기 | [[React-Development-Checks\|act]] | async render/interaction을 묶고 그 다음 assertion한다 |
| 개발 중 element 생성 원인 추적 | [[React-Development-Checks\|captureOwnerStack]] | development에만 있다. production에서도 import 가능한 namespace에서 유무를 guard한다 |
| server render 내 결과 공유 | [[React-Server-Cache-and-Taint\|cache, cacheSignal]] | Server Component render/request 범위다. browser query cache와 구분한다 |

`createContext`, `lazy`, `memo`, `cache`가 반환한 identity를 반복 render에서 새로 만들면 각각 다른 context/type/cache가 될 수 있다. module scope의 선언으로 공유하려는 경계를 정한다. `startTransition`과 `act`는 실행 작업을 감싸며 컴포넌트 type이나 영구 state를 만들지 않는다.

## resource는 state 없이 읽는다

`use(resource)`는 Promise의 resolved value, context의 최근 provider 값, `browser()`의 browser-only resource를 읽는다. resource를 component state에 복사할 필요는 없지만 **resource identity와 수명**은 data layer/server/framework가 관리해야 한다.

```jsx
function Message({ messagePromise }) {
  const message = use(messagePromise);
  const theme = use(ThemeContext);
  return <p className={theme}>{message}</p>;
}
```

Promise pending은 Suspense로, rejection은 Error Boundary로 연결한다. context는 provider update를 구독한다. `browser()`는 server에서 suspend하므로 상위 Suspense를 요구한다. 상세한 cache/retry/조건부 호출 계약은 [[React-Resources-and-Use]]에 둔다.

## 지원 범위와 이해 확인

React 19.3의 ViewTransition/addTransitionType/Fragment ref/browser API와 Experimental의 taint/defer를 구분한다. Server Component API는 component의 실행 위치도 확인한다. React DOM, legacy API와 Compiler는 별도 범위다.

1. lazy와 startTransition이 각각 어떤 identity/실행 범위를 만드는지 설명한다.
2. browser SWR cache를 React cache로 옮기면 같은 data 공유가 보장되지 않는 이유를 설명한다.
3. pending UI, code loading, render profiling 세 요구에 필요한 API와 boundary를 고른다.

## 출처

- [React, Built-in React APIs](https://react.dev/reference/react/apis)

## 관련 문서

- [[React-Rendering]]
- [[React-Rules-and-Call-Ownership]]
- [[React-Legacy]]
- [[React-Server-Components]]
- [[React-Compiler]]
