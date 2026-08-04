---
tags: [cs, typescript, react, type-contract]
status: done
verified_at: 2026-08-04
category: "CS - TypeScript"
aliases: ["React TypeScript", "React 타입 계약"]
---

# React와 TypeScript 타입 계약

React의 TypeScript 타입은 component의 props, state, event와 context 경계를 표현한다. 타입은 React의 렌더링 동작을 바꾸지 않고 emit에서 사라지므로 사용자 입력과 서버 응답은 별도의 런타임 검증이 필요하다.

## Component와 props

함수 parameter에 props 타입을 붙이는 방식이면 충분하다. `React.FC`는 선택 사항이며 이를 사용하지 않아도 정상적인 component다. `children`이 계약의 일부라면 `ReactNode`로 명시한다.

```tsx
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
}

function Panel({ title, children }: PanelProps) {
  return <section aria-label={title}>{children}</section>;
}
```

HTML element props를 감싸는 component는 `ComponentPropsWithoutRef<"button">`처럼 React가 제공하는 타입에서 파생하면 표준 속성과 event 계약을 수동 복제하지 않아도 된다.

## `useState` 추론

초깃값이 타입을 충분히 표현하면 generic 인수를 생략한다. 초기 상태가 `null`이거나 유한 상태 전이를 표현해야 하면 union을 명시한다.

```tsx
type Status = "idle" | "loading" | "done";

const [count, setCount] = useState(0); // number
const [status, setStatus] = useState<Status>("idle");
const [user, setUser] = useState<User | null>(null);
```

state setter는 다음 상태 값 또는 이전 상태를 받는 updater를 받는다. 이전 값에 의존할 때는 stale closure를 피하도록 updater 형태를 사용한다.

## Event 타입

React event는 DOM event와 관련되지만 React의 event 타입을 사용한다. handler를 별도 함수로 꺼낼 때 element 유형을 generic 인수로 명시한다.

```tsx
import type { ChangeEvent } from "react";

function handleChange(event: ChangeEvent<HTMLInputElement>) {
  console.log(event.currentTarget.value);
}
```

`currentTarget`은 handler가 등록된 element로 타입화된다. `target`은 실제 event 발생 지점일 수 있으므로 입력값 접근에는 `currentTarget`이 더 안정적인 계약이다.

## Context의 null 경계

기본값이 없는 context는 `null`을 타입에 포함하고 custom hook에서 provider 누락을 runtime error로 바꾼다.

```tsx
const ThemeContext = createContext<ThemeContextValue | null>(null);

function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error("ThemeProvider is missing");
  return value;
}
```

React 19에서는 `<ThemeContext value={value}>`로 provider를 렌더링할 수 있다. React 18 이하에서는 `<ThemeContext.Provider>`를 사용하므로 지원할 React major에 맞춰 예제를 선택한다.

## 관련 문서

- [[React|React 학습 지도]]
- [[TS-Type-vs-Interface|type과 interface]]
- [[TS-Type-Narrowing|TypeScript 타입 좁히기]]
- [[Runtime-Validation-Libraries|런타임 검증]]

## 출처

- [React, Using TypeScript](https://react.dev/learn/typescript)
- [React, createContext](https://react.dev/reference/react/createContext)
- [TypeScript Handbook, JSX](https://www.typescriptlang.org/docs/handbook/jsx.html)
- yongsoocho, [React TypeScript 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137154)
- yongsoocho, [useState와 Event에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140273)
- yongsoocho, [Context API에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140575)
- yongsoocho, [Component에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140576)
