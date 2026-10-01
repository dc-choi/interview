---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React 호출 소유와 규칙

## Rules of React

React 규칙은 UI calculation을 독립적으로 이해하고 중단/재시도해도 안전하게 만드는 실행 계약이다. render purity, React가 component/Hook 호출을 소유하는 것, Hook 호출 위치 세 축으로 읽는다. StrictMode와 ESLint는 위반 일부를 찾는 도구이며 passing check만으로 모든 부작용이 없다는 증거가 되지는 않는다.

props/state 입력 snapshot과 render 밖 event/Effect의 기본 순수성은 [[React-Render-Purity-and-Trees]]에 둔다. 아래는 component와 Hook을 조합할 때 필요한 추가 계약이다.

## React가 component와 Hook 호출을 소유한다

```jsx
function Page() {
  return <Layout><Article /></Layout>;
}
```

`<Article />`를 `Article()`로 직접 호출하지 않는다. React는 component type과 tree 위치로 local state identity, reconciliation, scheduling과 debugging 경계를 관리한다. 직접 호출하면 내부 Hook이 parent의 호출 흐름에 섞여 조건/반복에 따라 Hook 순서를 깨뜨릴 수 있다. component는 JSX로, 일반 계산 helper는 함수 호출로 사용한다.

Hook을 props로 전달하거나 render 중 higher-order Hook을 만들지 않는다. `withLogging(useData)`나 `<Button useData={...} />` 대신 module에 선언한 static `useDataWithLogging()`을 Button 내부에서 직접 호출한다. behavior 차이는 Hook 내부의 명시적인 data/options로 표현하고 Hook implementation을 동적으로 교체하지 않는다.

이 규칙은 DI를 모두 금지하는 것이 아니라 **Hook 호출 graph를 읽기 어렵게 만드는 Hook value injection**을 피하라는 뜻이다. test에서 Hook을 바꾸기보다 data boundary의 응답이나 실제 사용자 동작을 검증한다.

## Rules of Hooks

Hook은 function component 또는 custom Hook의 **최상위, 조건부 early return 이전**에서 호출한다. 조건/loop/nested 함수/try-catch-finally, event handler, class method, useMemo/useReducer/useEffect callback 내부에서 호출하지 않는다.

```jsx
function Panel({ hidden }) {
  const theme = useContext(ThemeContext);
  if (hidden) return null;
  return <section className={theme} />;
}
```

조건에 따라 동기화를 바꿀 때 Hook 호출을 조건부로 하지 않고 Effect body 내부에서 조건을 판단한다. 반복 항목마다 Hook이 필요하면 항목 component를 추출한다. 일반 JavaScript 함수에 use 이름만 붙여 render 밖에서 호출해도 허용되는 것은 아니다.

`use(resource)`는 예외적으로 조건/loop 안에서 읽을 수 있는 API이며 try/catch 금지와 component/Hook 내부 호출은 그대로다. 이를 useState/useContext 등의 일반 Hook에 적용하지 않는다.

## Hook 입력/반환과 JSX 이후 불변성

Hook에 넘긴 object와 Hook 반환값은 읽기 전용으로 다룬다. custom Hook이 입력 reference를 memo dependency로 쓸 수 있어, caller가 입력을 나중에 mutate하면 같은 reference로 오래된 결과를 읽게 된다.

```jsx
const first = useIconStyle(icon);
const disabledIcon = { ...icon, enabled: false };
const second = useIconStyle(disabledIcon);
```

JSX에 값을 전달한 뒤에도 그 object를 바꾸지 않는다. React가 JSX를 component 완료 전에 평가할 수 있고 data 흐름의 local reasoning도 깨진다.

```jsx
const header = <Header style={{ fontSize: 24 }} />;
const footer = <Footer style={{ fontSize: 12 }} />;
return <>{header}{footer}</>;
```

한 style object를 Header에 넘긴 다음 property를 변경해 Footer에 공유하는 방식 대신 두 값을 만든다. 현재 render에 새로 만든 배열의 push 같은 local mutation은 외부 data나 이미 JSX/Hook에 넘긴 값을 바꾸지 않는 범위에서 가능하다. 다른 component 동작에 영향을 주지 않는 lazy initialization은 순수 함수의 수학적 정의보다 재시도 안전성과 idempotency 관점에서 판단한다.

## 이해 확인

1. Article()를 `<Article />`로 바꾸면 React가 확보하는 state/type 경계를 설명한다.
2. Hook을 props로 교체하는 구현을 static custom Hook과 explicit input으로 바꾼다.
3. early return 뒤 Hook 호출, Effect 안의 Hook 호출, 조건부 use(promise)를 각각 구분한다.
4. Hook에 넘긴 입력과 JSX에 넘긴 style object를 나중에 바꾸면 잘못되는 이유를 설명한다.

## 출처

- [React, Rules of React](https://react.dev/reference/rules)
- [React, Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [React, React calls Components and Hooks](https://react.dev/reference/rules/react-calls-components-and-hooks)
- [React, Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)

## 관련 문서

- [[React-Render-Purity-and-Trees]]
- [[React-Development-Checks]]
- [[React-Resources-and-Use]]
- [[React-Custom-Hooks]]
