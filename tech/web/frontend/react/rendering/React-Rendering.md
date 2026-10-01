---
tags: [web, frontend, react, rendering]
status: index
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React rendering API

## 내장 component 선택

사용자 component는 함수와 JSX로 정의하고, 내장 component는 그 subtree를 React가 처리하는 방식을 정한다. 모두 DOM wrapper를 만든다고 생각하지 않고 grouping, 준비, 수명, 검사, 측정, animation의 목적을 구분한다.

| 목적 | component | 선택 기준과 비용 |
|---|---|---|
| sibling 그룹화 | [[React-Fragment-and-DOM-Groups\|Fragment]] | DOM wrapper 없이 JSX와 key를 묶는다. layout/semantic element가 필요하면 실제 tag를 쓴다 |
| 준비되지 않은 UI 표시 | [[React-Suspense-and-Lazy\|Suspense]] | code/resource가 suspend할 때 fallback, reveal 순서를 정한다. 임의 Effect fetch를 감지하지 않는다 |
| UI 수명 보존 | [[React-Activity\|Activity]] | state/DOM을 보존하며 hidden subtree의 Effect를 정리한다. 보존 memory와 pre-render 비용이 든다 |
| DOM 변화 animation | [[React-Transitions-and-Animation\|ViewTransition]] | Transition/Suspense 변화의 snapshot을 연결한다. React 19.3과 browser 지원을 구분한다 |
| 개발 중 결함 탐지 | [[React-Development-Checks\|StrictMode]] | render, Effect, ref 재실행으로 cleanup/purity 문제를 드러낸다 |
| render 비용 측정 | [[React-Memo-and-Profiler\|Profiler]] | subtree commit의 render duration을 보고한다. profiling overhead와 production build 설정이 있다 |

각 boundary는 독립 목적을 가져 조합할 수 있다. Suspense fallback에 Activity가 필요한지는 대기 UX와 state 보존을 함께 판단하고, Profiler boundary는 사용자 reveal 단위와 반드시 같을 필요가 없다.

## 함께 사용하는 API

- [[React-Resources-and-Use|Promise, context와 browser-only resource 읽기]]
- [[React-Suspense-and-Lazy|lazy code loading과 Suspense]]
- [[React-Transitions-and-Animation|startTransition, addTransitionType과 animation]]
- [[React-Memo-and-Profiler|memo와 실제 비용 비교]]
- [[React-Server-Cache-and-Taint|Server Component의 request cache와 taint]]
- [[React-APIs|react package API 선택]]

## 출처

- [React, Built-in React Components](https://react.dev/reference/react/components)
