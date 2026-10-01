---
tags: [web, frontend, react, eslint]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# Render 규칙 lint와 state 수정

render는 다시 실행되거나 중단될 수 있다. 따라서 같은 입력으로 UI를 계산하는 동안 외부 상태를 바꾸거나, 출력과 무관한 가변 ref에 의존하지 않아야 한다. 이 규칙을 코드의 위치와 데이터 소유권으로 판단한다.

## purity와 globals

`purity`는 render에서 `Math.random()`, `Date.now()`, `new Date()`, `crypto.randomUUID()`, `performance.now()`처럼 입력이 같아도 결과가 달라지는 호출을 찾는다. 표시할 시간은 이벤트나 타이머에서 state로 갱신하고, 서버와 클라이언트의 첫 화면이 같아야 한다면 같은 초기값을 전달한다.

```jsx
const Clock = ({ initialTime }) => {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time>{new Date(time).toISOString()}</time>;
};
```

입력이 정해진 `new Date(time)`을 매번 현재 시각을 읽는 `new Date()`와 동일하게 취급하지 않는다. lazy initializer가 허용되는 경우라도 SSR과 hydration에서 각각 무작위 값을 만들면 일치가 보장되지 않는다. 접근성 ID는 `useId`, 데이터 ID는 데이터 생성 시점의 안정된 값을 검토한다.

`globals`는 render 중 전역 변수나 `window` 등 외부 값을 변경하는 것을 검사한다. 사용자 행동은 handler에서, 외부 시스템 동기화는 Effect에서 처리한다. 로컬 변수로 계산하는 작업과 전역 mutation을 구분한다.

## immutability

props, state와 Hook에 전달된 값은 현재 render의 snapshot으로 취급한다. 배열의 `push`, 원본 `sort`, 객체 필드 직접 대입은 같은 참조를 남기거나 다른 사용자의 입력을 바꾼다. 새 배열과 바뀐 경로의 객체를 만들어 setter에 전달한다.

```jsx
const renameItem = (id, name) => {
  setItems(current => current.map(item => item.id === id ? { ...item, name } : item));
};
```

새로 만든 로컬 배열에 값을 누적하는 것까지 모든 mutation이 금지되는 것은 아니다. 중요한 것은 이전 render나 다른 component가 소유한 값에 영향을 남기는지다. 얕은 복사 후 내부 객체를 직접 수정하면 원본 내부 참조는 여전히 공유된다.

## refs

`ref.current`는 바뀌어도 render를 예약하지 않는다. 화면에 표시할 값이면 state를 사용하고, DOM 접근이나 timer ID 등은 handler/Effect에서 읽고 쓴다. render 중 ref를 읽어 JSX를 결정하거나 props를 ref에 매번 덮어쓰지 않는다.

초기 `null`일 때 결과가 예측 가능한 객체를 한 번 생성하는 lazy initialization은 제한적 예외다. 네트워크 호출이나 외부 등록 같은 부수효과까지 그 분기에서 실행할 수 있다는 뜻이 아니다.

검사는 `useRef`/`createRef` 반환값, `ref` prop으로 전달된 값과 `ref`, `*Ref`라는 이름에서 `.current`를 사용하는 패턴 등을 추론한다. 추론은 대입, 구조 분해와 helper 전달을 따라간다. 일반 container 객체가 이름 때문에 오탐되면 `box`처럼 실제 역할에 맞게 이름을 바꾸되, 실제 ref를 개명해 위반을 숨기지 않는다.

## set-state-in-render

render마다 조건 없이 setter를 호출하면 다시 render가 예약되어 루프가 된다. 다른 component의 state를 현재 render에서 갱신하는 것도 피한다. 값 제한은 가능하면 setter를 호출하는 사건에서 수행한다.

```jsx
const increment = () => setCount(current => Math.min(current + 1, max));
```

현재 component에서 이전 props와 비교하고 변경됐을 때만 state를 조정하는 guarded 패턴은 허용되는 경우가 있다. 모든 render setter가 무조건 무한 루프를 만든다는 뜻은 아니다. 그래도 render에서 계산할 수 있는 값은 계산하고, 전체 상태를 초기화할 경계라면 `key` 재설정을 먼저 검토한다.

## set-state-in-effect

props를 복사하거나 필터 결과를 Effect에서 곧바로 state에 넣으면 첫 render 후 또 한 번 render해야 한다. 원본 데이터와 파생 데이터의 동기화 오류도 생긴다.

```jsx
// 별도 Effect와 filtered state가 필요하지 않다.
const filtered = items.filter(item => item.category === category);
```

이 규칙은 Effect의 모든 setter를 금지하지 않는다. ref로 DOM 크기를 측정한 후 `useLayoutEffect`에서 위치를 갱신하거나, 외부 비동기 응답을 받아 state를 바꾸는 경우는 별도 맥락이다. 외부 결과가 들어오는 과정은 cleanup과 race를 함께 검토한다. 이미 가진 값의 동기식 복제를 제거하는 것이 핵심이다.

## static-components와 component-hook-factories

`static-components`는 render 중 새 component 함수를 정의해 매번 다른 component type을 만드는 문제를 찾는다. React가 매번 새 type으로 보면 기존 subtree의 state와 DOM을 잃을 수 있다. component 정의를 모듈 수준으로 옮기고 달라지는 값은 props로 전달한다.

`component-hook-factories`는 다른 함수에서 component나 Hook을 만들어 반환하는 구조를 검사한다. 인자로 Hook 구현을 바꾸거나 렌더링할 때 factory로 새 type을 생성하는 대신, top-level component/Hook을 정의하고 데이터와 UI 조합을 전달한다.

```jsx
const Item = ({ label }) => <li>{label}</li>;
const List = ({ labels }) => <ul>{labels.map(label => <Item key={label} label={label} />)}</ul>;
```

이 예시는 label이 유일한 목록이라는 전제다. 실제 중복 가능한 목록은 데이터 ID를 key로 쓴다. 이미 모듈 수준에 정의된 두 component 중 조건에 따라 하나를 선택하는 것과 매 render마다 새 component 함수를 생성하는 것은 다르다.

## 이해 확인

- `[...items]` 뒤에 `copy[0].name = ...`을 하면 원본 객체도 바뀌는 이유는 무엇인가?
- Effect setter 경고를 모두 없애겠다고 DOM 측정 결과까지 render에서 읽으면 어떤 문제가 생기는가?
- 함수 내부 component 정의가 단순한 성능 문제를 넘어 입력 state 손실을 만드는 이유는 무엇인가?

## 출처

- [React, purity](https://react.dev/reference/eslint-plugin-react-hooks/lints/purity)
- [React, globals](https://react.dev/reference/eslint-plugin-react-hooks/lints/globals)
- [React, immutability](https://react.dev/reference/eslint-plugin-react-hooks/lints/immutability)
- [React, refs](https://react.dev/reference/eslint-plugin-react-hooks/lints/refs)
- [React, set-state-in-render](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-render)
- [React, set-state-in-effect](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect)
- [React, static-components](https://react.dev/reference/eslint-plugin-react-hooks/lints/static-components)
- [React, component-hook-factories](https://react.dev/reference/eslint-plugin-react-hooks/lints/component-hook-factories)

## 관련 문서

- [[React-Hooks-Lint]]
- [[React-Render-Purity-and-Trees]]
- [[React-State-Structure]]
- [[React-Refs-and-DOM]]
