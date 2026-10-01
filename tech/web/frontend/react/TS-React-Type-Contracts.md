---
tags: [cs, typescript, react, type-contract]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React TypeScript", "React 타입 계약"]
---

# React와 TypeScript 타입 계약

React의 TypeScript 타입은 component의 props, state, event와 context 경계를 표현한다. 타입은 React의 렌더링 동작을 바꾸지 않고 emit에서 사라지므로 사용자 입력과 서버 응답은 별도의 런타임 검증이 필요하다.

## 설정과 타입 검사

JSX가 들어 있는 TypeScript 파일은 `.tsx`를 사용한다. 웹 프로젝트에는 `@types/react`, `@types/react-dom`과 DOM 타입이 필요하다. `tsconfig`의 `lib`를 직접 지정했다면 `dom` 포함 여부를 확인하고, `jsx`는 framework와 build tool의 변환 방식에 맞춘다. `preserve`는 JSX 변환을 후속 도구에 넘기는 선택이고 다른 pipeline은 `react-jsx`를 사용할 수 있으므로 기존 설정을 우선 확인한다.

문서의 TypeScript sandbox는 코드를 실행해도 타입 검사를 하지 않을 수 있다. 화면에 표시됐다는 사실과 타입 계약이 맞는지는 별개이며 TypeScript 검사기나 `tsc --noEmit`으로 확인한다.

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

HTML element props를 감싸는 component는 `ComponentPropsWithoutRef<"button">`처럼 React가 제공하는 타입에서 파생하면 표준 속성과 event 계약을 수동 복제하지 않아도 된다. 도메인 타입은 `types.ts` 같은 공용 module에 두고, item component props는 `interface TodoItemProps extends Todo { onDelete: (id: number) => void }`처럼 확장하면 field 목록을 복제하지 않는다.

## `useState` 추론

초깃값이 타입을 충분히 표현하면 generic 인수를 생략한다. 초기 상태가 `null`이거나 유한 상태 전이를 표현해야 하면 union을 명시한다.

```tsx
type Status = "idle" | "loading" | "done";

const [count, setCount] = useState(0); // number
const [status, setStatus] = useState<Status>("idle");
const [user, setUser] = useState<User | null>(null);
```

인수 없이 `useState()`를 부르면 타입 매개변수 기본값 `undefined`로 추론되어 state와 setter가 `undefined`만 다룬다. 이어서 `setText("a")`를 호출하면 TS2345 오류다. `useState<string>()`처럼 타입만 주면 state는 `string | undefined`가 되므로 초깃값을 넘기거나 `useState<string | null>(null)`처럼 비어 있음을 명시한다.

state setter는 다음 상태 값 또는 이전 상태를 받는 updater를 받는다. 이전 값에 의존할 때는 stale closure를 피하도록 updater 형태를 사용한다.

setter를 context value나 props로 넘길 때 타입은 `Dispatch<SetStateAction<T>>`다. `@types/react`에서 `SetStateAction<T>`는 `T | ((prevState: T) => T)`, `Dispatch<A>`는 `(value: A) => void`다. `(value: T) => void`로 좁혀 선언하면 updater를 넘길 수 없어 소비자가 읽어 둔 snapshot으로 다음 값을 만들게 되고, 한 event 안의 연속 갱신이나 비동기 callback에서 앞선 갱신을 덮는다. 추가만 필요하면 setter 대신 `addContent(item)` 같은 의도 함수를 노출하고 내부에서 `setContents(prev => [...prev, item])`를 쓰면 계약도 좁아진다.

## `useReducer` action union

```tsx
type TodoAction =
  | { type: "created"; todo: Todo }
  | { type: "deleted"; id: number };

const todosReducer = (state: readonly Todo[], action: TodoAction): readonly Todo[] => {
  switch (action.type) {
    case "created":
      return [...state, action.todo];
    case "deleted":
      return state.filter(todo => todo.id !== action.id);
  }
};

const [todos, dispatch] = useReducer(todosReducer, []);
dispatch({ type: "deleted", id: 1 });
// dispatch({ type: "deleted", todo })는 컴파일 오류
```

action을 `type`으로 구분하는 discriminated union으로 두면 `switch` 안에서 payload가 좁혀지고 잘못된 dispatch가 컴파일 단계에서 막힌다. reducer 매개변수에 타입을 달고 `useReducer`에는 타입 인수를 넘기지 않는다. `@types/react` 19는 타입 인수를 모두 생략하거나 `useReducer<State, [Action]>`처럼 둘 다 받는다. react.dev Using TypeScript의 `useReducer<State>(...)` 예시는 `@types/react` 19.3.0에서 TS2558(Expected 2 type arguments)로 실패하므로 React 19 upgrade guide의 형태를 따른다.

## useRef 타입

`@types/react` 19부터 `useRef`는 인수가 필수이고 항상 `current`를 바꿀 수 있는 `RefObject<T>`를 반환한다. `MutableRefObject`는 deprecated다. DOM ref는 `useRef<HTMLInputElement>(null)`로 `RefObject<HTMLInputElement | null>`을 만들고, render와 무관한 id counter는 `const nextId = useRef(0)`에 두고 `nextId.current += 1`로 갱신한다. 18 이하 타입에서는 인수 없는 호출이 허용되고, `useRef<number>(null)`처럼 타입 인수에 없는 `null`로 초기화하면 `current`가 readonly로 추론되므로 예제가 기준으로 삼은 React major를 확인한다. ref를 언제 읽는지는 [[React-State-Effects-and-Events#useRef와 DOM 참조|useRef와 DOM 참조]]를 따른다.

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

`createContext<T>(defaultValue: T)`는 기본값이 필수이고(생략하면 TS2554) 타입 인수 `T`를 기본값에서 추론한다. 그래서 타입 인수 없이 `createContext(null)`을 쓰면 strictNullChecks에서 `Context<null>`이 되어 Provider에 `Todo[]`를 넣는 순간 TS2322가 나고, strictNullChecks가 꺼져 있으면 `Context<any>`가 되어 오류 없이 타입 검사가 사라진다. 의미 있는 기본값이 없으면 위처럼 `ContextShape | null`을 타입 인수로 명시한다. 함수를 공급하는 dispatch context도 같은 형태다.

```tsx
interface TodoDispatch {
  onCreate: (content: string) => void;
  onDelete: (id: number) => void;
}

const TodoDispatchContext = createContext<TodoDispatch | null>(null);
```

| null 처리 | Provider가 빠졌을 때 |
|---|---|
| 호출부마다 `?.` | 검사가 퍼지고 `dispatch?.onCreate(text)`는 아무 일도 하지 않고 끝난다 |
| `useContext(...)!` | 타입에서 null만 지운다. 호출 시점에 null property 접근 TypeError가 나고 원인이 드러나지 않는다 |
| custom hook에서 throw | 검사가 한곳에 모이고 반환 타입이 좁혀진다. render 시점에 Provider 이름을 담은 오류로 드러난다 |

기본값을 그럴듯한 빈 값으로 채워 `undefined` 오류를 없애면 Provider 누락이 조용한 오작동으로 숨는다. theme의 `"light"`처럼 의미 있는 기본값이 있을 때만 기본값을 쓴다. state와 dispatch context를 나눴을 때 value identity가 re-render에 주는 영향은 [[React-State-Management|공유 state 관리]]에 있다.

React 19에서는 `<ThemeContext value={value}>`로 provider를 렌더링할 수 있다. React 18 이하에서는 `<ThemeContext.Provider>`를 사용하므로 지원할 React major에 맞춰 예제를 선택한다.

## Children, style과 memoization 타입

- `ReactNode`는 문자열, 숫자 등 JSX의 자식으로 표시할 수 있는 값도 포함한다. `ReactElement`는 React element로 범위를 좁힌다. 이 타입만으로 자식을 `<li>` 같은 특정 tag로 제한할 수는 없다.
- `CSSProperties`는 inline `style` 객체의 속성과 값에 자동 완성과 타입 검사를 제공한다.
- `useMemo`의 결과 타입은 계산 함수의 반환 타입에서 추론한다. `useCallback`은 전달한 함수의 매개변수와 반환 타입을 보존한다. 추론할 문맥이 없는 callback 매개변수는 직접 타입을 붙이거나 `ChangeEventHandler<HTMLInputElement>` 같은 함수 타입을 제공한다.
- 타입 매개변수를 붙이는 것과 runtime memoization은 다른 일이다. Compiler를 사용해도 props와 event의 타입 계약은 필요하다([[React-Compiler|자동 memoization]]).

## 이해 확인

`children: ReactElement`로 바꾸면 문자열 자식을 받을 수 있는가? `useCallback`의 callback 매개변수 타입과 `useMemo`의 계산 결과 타입은 각각 어디에서 결정되는가?

## 관련 문서

- [[React|React 학습 지도]]
- [[TS-Type-vs-Interface|type과 interface]]
- [[TS-Type-Narrowing|TypeScript 타입 좁히기]]
- [[Runtime-Validation-Libraries|런타임 검증]]

## 출처

- [React, Using TypeScript](https://react.dev/learn/typescript)
- [React, createContext](https://react.dev/reference/react/createContext)
- [React, React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [DefinitelyTyped, types/react/index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts)
- [TypeScript Handbook, JSX](https://www.typescriptlang.org/docs/handbook/jsx.html)
- yongsoocho, [React TypeScript 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137154)
- yongsoocho, [useState와 Event에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140273)
- yongsoocho, [Context API에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140575)
- yongsoocho, [Component에 타입 적용](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140576)
- 이정환 Winterlood, [상태관리와 Props 1](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=160073)
- 이정환 Winterlood, [상태관리와 Props 2](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=160074)
- 이정환 Winterlood, [Context API](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=160076)
