---
tags: [web, frontend, react, eslint]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# Compiler 호환성과 경계 lint

Compiler 관련 경고에는 React의 동작 규칙 위반과 현재 분석기가 처리할 수 없는 패턴이 함께 포함된다. 경고 이름만으로 라이브러리 전체를 교체하거나 수동 memoization을 일괄 삭제하지 않는다. 해당 호출과 데이터 흐름을 좁혀 확인한다.

## config와 gating

`config`는 Compiler 옵션 이름과 값의 타입을 검증한다. 존재하지 않는 옵션이나 문자열이어야 하는 `target`에 숫자를 넣는 경우부터 확인한다. `compilationMode`, `panicThreshold` 등은 [[React-Compiler-Configuration]]의 허용값에 맞춘다.

`gating`은 두 구현 중 선택하는 설정이 유효한지 검사한다. `source`, `importSpecifierName`을 완성하고, 해당 파일의 named export가 실제 해석되는지 별도로 확인한다. lint 설정 통과가 배포 환경의 모듈 경로나 feature flag 운영까지 보장하지 않는다. 모듈 평가 후 flag 변경으로 기존 구현이 교체된다고 가정하지 않는다.

## incompatible-library

참조는 그대로인데 내부 상태가 달라지는 API는 React memoization과 충돌할 수 있다. 예를 들어 안정된 `watch` 함수 참조로 숨겨진 최신 값을 읽는 API를 `useMemo(() => watch('name'), [watch])`로 감싸면 값이 갱신되지 않을 수 있다.

공식 진단 예시는 React Hook Form의 `watch`, TanStack Table의 `useReactTable` 등이다. 라이브러리 전체가 모든 상황에서 잘못됐다는 뜻은 아니며, 설치 버전과 구체적 호출 API의 계약을 확인한다. React Hook Form 예시에서는 명시적 구독인 `useWatch`를 대안으로 제시한다.

알려진 패턴은 Compiler가 해당 component/Hook을 제외해 잘못된 memoization을 피한다. 모든 패턴을 탐지하지는 못한다. 공식 문서도 MobX `observer` 같은 미탐지 사례를 들며 필요하면 `"use no memo"`로 좁은 범위를 제외하도록 안내한다.

라이브러리 API를 설계할 때는 변경 시 새로운 snapshot을 반환하고 갱신 함수와 읽을 데이터를 분리한다. 동일한 참조만 dependency에 둔 `useMemo`로 읽기를 감쌌을 때 갱신을 놓친다면 숨겨진 가변 상태가 있는지 확인한다.

## preserve-manual-memoization

Compiler는 기존 `useMemo`, `useCallback`, `memo`의 memoization과 같거나 더 강한 재사용을 보존할 수 있을 때 컴파일한다. dependency가 누락되면 데이터 흐름과 기존 의도를 올바르게 추론하기 어렵다.

```jsx
const filtered = useMemo(() => data.filter(predicate), [data, predicate]);
```

`predicate`를 빼서 경고를 억제하지 않는다. 수동 memoization 제거도 하나씩 진행하고 출력, 참조에 의존하는 외부 연동과 성능을 확인한다. Compiler가 있다는 이유만으로 모든 수동 호출을 없애야 하는 것은 아니다.

## use-memo

`useMemo` callback은 계산 결과를 반환해야 한다. 반환 없이 side effect를 실행하면 캐시할 값이 없고 render 중 외부 작업만 남는다.

```jsx
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```

버튼 클릭 때문에 수행하는 결제, 로그나 저장은 handler에서 한다. 외부 시스템과의 동기화는 필요할 때 Effect로 옮긴다. 모든 side effect를 자동으로 Effect에 옮기기 전에 발생 원인이 render인지 사용자 사건인지 구분한다.

## unsupported-syntax

`eval`, `with` 등 정적 분석을 어렵게 하는 문법은 Compiler가 지원하지 않을 수 있다. 동적 키로 객체에 접근하는 것 자체를 금지하는 규칙이 아니다.

```js
const formatters = { upper: value => value.toUpperCase(), lower: value => value.toLowerCase() };
const format = (kind, value) => {
  const formatter = Object.hasOwn(formatters, kind) ? formatters[kind] : null;
  if (!formatter) throw new Error('Unsupported formatter');
  return formatter(value);
};
```

입력에 따라 코드 문자열을 실행하기보다 지원 동작을 명시한 dispatch table을 사용한다. `eval`을 다른 함수로 옮겨 lint를 피하는 것은 코드 실행 위험을 해결하지 않는다. 수식 실행이 실제 요구사항이라면 허용 문법과 자원 제한을 별도로 설계한다.

## error-boundaries

부모 함수에서 JSX를 만드는 순간과 자식 component가 render되는 순간은 다르다. `try { return <Child />; } catch { ... }`만으로 나중에 발생한 자식 render 오류를 처리할 수 없다.

```jsx
<ErrorBoundary fallback={<p>내용을 불러오지 못했습니다.</p>}>
  <Suspense fallback={<p>불러오는 중입니다.</p>}>
    <Content />
  </Suspense>
</ErrorBoundary>
```

`ErrorBoundary`는 별도 구현이나 사용 중인 라이브러리의 component이며 내장 JSX tag가 아니다. Suspense는 대기, Error Boundary는 render 오류를 처리한다. handler 안의 비동기 요청 실패 등은 그 실행 경로에서 `try/catch`로 다룬다. 모든 JavaScript 예외 처리를 Error Boundary로 대체하는 규칙이 아니다.

## 이해 확인

- 안정된 함수 참조에서 최신 값을 읽는 라이브러리가 memoization과 충돌하는 조건은 무엇인가?
- lint가 통과해도 gating의 실제 import와 선택 경로를 확인해야 하는 이유는 무엇인가?
- JSX를 반환하는 `try/catch`와 자식 render의 Error Boundary는 어느 시점의 오류를 처리하는가?

## 출처

- [React, config](https://react.dev/reference/eslint-plugin-react-hooks/lints/config)
- [React, gating](https://react.dev/reference/eslint-plugin-react-hooks/lints/gating)
- [React, incompatible-library](https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library)
- [React, preserve-manual-memoization](https://react.dev/reference/eslint-plugin-react-hooks/lints/preserve-manual-memoization)
- [React, use-memo](https://react.dev/reference/eslint-plugin-react-hooks/lints/use-memo)
- [React, unsupported-syntax](https://react.dev/reference/eslint-plugin-react-hooks/lints/unsupported-syntax)
- [React, error-boundaries](https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries)

## 관련 문서

- [[React-Hooks-Lint]]
- [[React-Compiler-Configuration]]
