---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React context 생성과 provider 계약

## createContext 계약

`createContext(defaultValue)`는 component 밖에서 호출하고 context identity object를 반환한다. 이 object가 현재 data를 저장하는 것은 아니다. 실제 값은 render tree의 provider가 전달한다. 서로 다른 module의 읽기/제공은 동일한 export object를 import해 연결한다.

`defaultValue`는 호출 component 위에 일치하는 provider가 없을 때의 static fallback이다. 의미 있는 기본값이 없으면 null을 쓰고 consumer에서 누락을 처리한다. createContext를 다시 호출하거나 default를 바꾸려는 방식으로 context 값을 갱신하지 않는다.

```jsx
// ThemeContext.js
import { createContext } from 'react';
export const ThemeContext = createContext('light');

// App.js (React 19 이상)
function App() {
  const [theme, setTheme] = useState('dark');
  return <ThemeContext value={theme}><Page /></ThemeContext>;
}
```

## Provider와 Consumer

React 19부터 `<SomeContext value={...}>`가 provider다. 이전 React에는 `<SomeContext.Provider value={...}>`를 사용한다. value는 임의 타입이고 가장 가까운 상위 provider가 아래 consumer 값을 결정한다. 값이 바뀌면 그 context를 읽는 component가 갱신된다.

`<SomeContext.Consumer>`의 children은 현재 context 값 하나를 받아 React node를 반환하는 함수다. 여전히 기존 코드를 읽을 때 볼 수 있지만 새 function component는 `useContext(SomeContext)`나 조건부 resource 읽기가 필요한 경우 `use(SomeContext)`를 사용한다.

```jsx
<ThemeContext.Consumer>
  {theme => <button className={theme}>확인</button>}
</ThemeContext.Consumer>
```

consumer가 반환할 JSX에 둔 provider는 consumer 자신의 읽기에 영향을 주지 않는다. 기본값은 provider에 넘긴 undefined를 대체하는 동적 초기값도 아니다. 값 변경에는 provider owner의 state를 바꾸고 새 value를 내려준다.

## 선택과 이해 확인

props나 children으로 명시적으로 연결하는 편이 충분하면 context를 추가하지 않는다. 여러 깊은 consumer가 theme나 공통 scope data를 읽는 경우 context가 유용하지만, provider 수명과 변경 범위도 함께 설계한다. 읽기와 subscription 성능의 상세 계약은 context Hook 문서에서 다룬다.

1. provider 없음, 서로 다른 nested provider, value 변경을 각각 만들어 실제 값을 예측한다.
2. 동일 이름으로 `createContext`를 두 번 호출하면 서로 통하지 않는 이유를 설명한다.
3. static defaultValue와 owner state의 역할 차이를 설명한다.

## 출처

- [React, createContext](https://react.dev/reference/react/createContext)

## 관련 문서

- [[React-State-Management]]
- [[React-Resources-and-Use]]
- [[React-Components-and-JSX]]
