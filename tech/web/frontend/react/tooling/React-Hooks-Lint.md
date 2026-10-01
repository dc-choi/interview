---
tags: [web, frontend, react, eslint]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# React Hooks lint와 진단 해석

`eslint-plugin-react-hooks`는 Hook 호출 순서뿐 아니라 React의 순수성, 불변성, Compiler 호환성도 검사한다. Compiler를 빌드에 연결하지 않아도 플러그인에서 Compiler 진단을 볼 수 있다. `recommended` 규칙을 출발점으로 삼되 설치한 플러그인 버전의 설정 형식과 제공 규칙을 확인한다.

## 진단의 범위

공식 Reference의 17개 규칙은 아래 세 흐름으로 읽는다. 진단이 없는 것이 모든 runtime 동작의 정확성을 증명하지는 않는다.

| 흐름 | 규칙과 연결 |
|---|---|
| 호출과 의존성 | 이 문서의 `rules-of-hooks`, `exhaustive-deps` |
| render와 state | [[React-Hooks-Lint-Rendering]]의 순수성, refs, 불변성, setter와 component 정의 |
| 컴파일과 경계 | [[React-Hooks-Lint-Compiler]]의 설정, 호환성, memoization, 오류 경계 |

Compiler가 지원하지 못하는 코드를 만나면 해당 component/Hook을 제외하고 안전한 나머지를 최적화할 수 있다. 기존 앱에서는 결함 수정과 최적화 적용 범위 확대를 구분해 점진적으로 처리한다. lint를 끄고 사라진 경고를 동작 개선으로 세지 않는다.

## rules-of-hooks

일반 Hook은 component 또는 custom Hook 최상위에서 같은 순서로 호출한다. 조건문, 반복문, 이벤트 handler, async 함수, class, 모듈 최상위나 조기 반환 뒤에서 호출하지 않는다. 조건에 따라 동작을 달리하려면 Hook 호출 자체를 고정하고 내부 로직에서 분기한다.

```jsx
const useRoomConnection = (roomId, enabled) => {
  useEffect(() => {
    if (!enabled) return;
    const connection = createConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, enabled]);
};
```

`use(resource)`는 조건문과 반복문에서 호출할 수 있는 예외다. 그래도 component/Hook 내부여야 하며 `try/catch`로 감싸지 않는다. Promise 오류는 Error Boundary 또는 Promise 자체의 복구 경로에서 다룬다.

조건에 따른 초기값을 `useState(condition ? a : b)`에 넣어도 초기화는 첫 render에만 쓰인다. 조건 변경과 state 재설정이 필요한지는 별도 설계 문제다. lint 통과를 props와 state의 동기화 보장으로 오해하지 않는다.

## exhaustive-deps

Effect, `useMemo`, `useCallback`에서 참조한 반응형 값을 dependency array에서 빠뜨리면 오래된 render의 값을 계속 사용하는 stale closure가 생긴다. array는 실행 시점을 마음대로 조절하는 목록이 아니라 코드가 참조하는 값의 명세다.

```jsx
// query가 바뀌면 filter 로직도 달라진다.
const visible = useMemo(
  () => items.filter(item => item.name.includes(query)),
  [items, query],
);
```

새로 만든 함수를 Effect dependency에 넣으면 render마다 Effect가 다시 실행될 수 있다. 이것만으로 무한 render가 발생하지는 않는다. Effect가 state를 갱신하고, 그 갱신이 다시 dependency 변경을 만드는 순환까지 있어야 루프가 된다.

의존성을 지우기 전에 다음 순서로 책임을 확인한다.

1. 사용자 행동의 결과라면 event handler에서 수행한다.
2. 기존 props/state로 계산할 UI 값이면 render에서 계산한다.
3. 외부 시스템 동기화라면 필요한 함수를 Effect 내부로 옮기거나 의존성을 올바르게 안정화한다.
4. 최신 값을 읽지만 동기화 재시작 조건이 아닌 로직은 [[React-Effect-Dependencies-and-Events]]의 Effect Event 조건을 확인한다.

한 번만 보내야 하는 분석 이벤트 등 명확한 의미가 있을 때는 ref guard와 완전한 dependency 목록을 함께 사용할 수 있다. 구독 setup을 ref로 막아 Strict Mode 재실행을 회피하는 것은 cleanup 문제를 고치지 않는다.

## Custom Effect Hook 설정

6.1.1 이상은 두 규칙에 공통인 `settings.react-hooks.additionalEffectHooks` regex를 제공한다.

```json
{
  "settings": {
    "react-hooks": {
      "additionalEffectHooks": "(useRoomEffect|useSubscriptionEffect)"
    }
  }
}
```

이 설정은 custom Effect의 dependency 검사와 Effect Event 호출 문맥 인식에 함께 쓰인다. `exhaustive-deps`의 rule-local `additionalHooks` 옵션도 있지만, 둘 다 지정하면 rule-local 옵션이 그 규칙에서 shared 설정을 대신한다. 팀 전체 custom Hook 목록을 한곳에서 관리하려면 shared 설정을 우선한다.

## 이해 확인

- dependency 경고를 지웠지만 최신 검색어가 반영되지 않는다면 어떤 closure를 확인할 것인가?
- Effect가 render마다 실행되는 것과 스스로 render 무한 루프를 만드는 것의 차이는 무엇인가?
- custom Effect가 기본 `useEffect`와 같은 검사 대상이 되려면 무엇을 설정해야 하는가?

## 출처

- [React, eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)
- [React, rules-of-hooks](https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks)
- [React, exhaustive-deps](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps)

## 관련 문서

- [[React-Hooks-Lint-Rendering]]
- [[React-Hooks-Lint-Compiler]]
- [[React-Effects-and-Custom-Hooks]]
- [[React-Compiler-Configuration]]
