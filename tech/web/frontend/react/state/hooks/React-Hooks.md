---
tags: [web, frontend, react, hooks]
status: index
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Hooks", "React 내장 Hook 선택"]
---

# React 내장 Hook 선택

## 내장 Hook의 책임

Hook은 function component가 React의 state, Context, ref와 동기화 기능을 사용하게 하는 API다. custom Hook은 내장 Hook을 조합해 목적별 로직을 재사용한다. 같은 Hook 호출을 여러 component에서 사용한다고 지역 state가 공유되지는 않는다.

| 필요한 책임 | API와 읽을 문서 |
|---|---|
| UI의 기억과 순수한 전이 | [[React-State-Hook-Contracts#useState 계약\|useState]], [[React-State-Hook-Contracts#useReducer 계약\|useReducer]] |
| 먼 상위 provider 값 읽기/구독 | [[React-State-Hook-Contracts#useContext 계약\|useContext]] |
| render에 쓰지 않는 값 보관 | [[React-Ref-and-Identity-Hooks#useRef 계약\|useRef]] |
| 부모에 제한된 imperative API 노출 | [[React-Ref-and-Identity-Hooks#useImperativeHandle 계약\|useImperativeHandle]] |
| 외부 시스템과 동기화 | [[React-Effect-Hook-Contracts#useEffect 계약\|useEffect]] |
| 외부 사건에서 최신 committed 값 읽기 | [[React-Effect-Hook-Contracts#useEffectEvent 계약\|useEffectEvent]] |
| paint 전 layout 측정 | [[React-Layout-and-Insertion-Effects#useLayoutEffect 계약\|useLayoutEffect]] |
| CSS-in-JS library의 runtime style 삽입 | [[React-Layout-and-Insertion-Effects#useInsertionEffect 계약\|useInsertionEffect]] |
| 계산 결과/function identity의 재사용 | [[React-Memoization-Hooks#useMemo 계약\|useMemo]], [[React-Memoization-Hooks#useCallback 계약\|useCallback]] |
| setter가 있는 비긴급 update | [[React-Transitions-and-Deferred-Values#useTransition 계약\|useTransition]] |
| 받은 값의 비긴급 UI 반영 | [[React-Transitions-and-Deferred-Values#useDeferredValue 계약\|useDeferredValue]] |
| Action의 순차 실행과 결과 state | [[React-Action-State#useActionState 계약\|useActionState]] |
| Action 중의 임시 UI | [[React-Action-State#useOptimistic 계약\|useOptimistic]] |
| 접근성 속성을 연결하는 id | [[React-Ref-and-Identity-Hooks#useId 계약\|useId]] |
| 외부 mutable store의 snapshot 구독 | [[React-External-Store-and-Debug-Hooks#useSyncExternalStore 계약\|useSyncExternalStore]] |
| custom Hook의 DevTools label | [[React-External-Store-and-Debug-Hooks#useDebugValue 계약\|useDebugValue]] |

## Hook을 고르는 순서

계산 가능한 값이면 render 계산부터 쓴다. 기억이 필요하면 state, 화면에 쓰지 않는 mutable 값이면 ref, 외부 시스템이면 Effect 또는 전용 구독 API를 검토한다. memoization은 실제 계산/render 비용을 측정한 뒤 추가한다. Effect는 application 내부 데이터 흐름을 조율하는 기본 수단이 아니다.

```jsx
const [query, setQuery] = useState('');
const visible = items.filter(item => item.title.includes(query));
// visible은 query와 items에서 계산되므로 별도 state/Effect가 필요하지 않다.
```

여기의 일반 Hook들은 component/custom Hook 최상위에서 호출한다. 조건부 early return 뒤, loop나 click handler에서 호출하지 않는다. 목록 item별 Hook이 필요하면 item component를 추출한다. callback 함수나 dependencies를 반환하는 API도 각각 계약이 다르므로 stable identity를 일괄 가정하지 않는다.

state/Context/ref의 기초 적용은 [[React-State|React state]], 외부 동기화는 [[React-Effects-and-Custom-Hooks|Effect]], 재사용은 [[React-Custom-Hooks|custom Hook]]에서 이어 읽는다. 이 표는 React package의 Hook을 분류한다. React DOM의 form 전용 Hook과 React의 `use` API는 각각 별도 계약이다.

## 이해 확인

1. 검색 결과를 state로 복제하기 전에 render에서 계산할 수 있는지 설명한다.
2. input 값을 즉시 바꾸는 state와 느린 결과 UI를 나누고, setter 제어 여부에 따라 Transition/deferred를 고른다.
3. 같은 custom Hook을 두 번 호출했을 때 공유되는 로직과 독립적인 state를 구분한다.

## 출처

- [React, Built-in React Hooks](https://react.dev/reference/react/hooks)

## 관련 문서

- [[React-State|state 학습 지도]]
- [[React-Custom-Hooks|custom Hook]]
- [[React-Core-Mental-Model|render와 commit]]
