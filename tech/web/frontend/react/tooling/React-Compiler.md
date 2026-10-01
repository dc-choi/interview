---
tags: [web, frontend, react, compiler, memoization]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Compiler", "리액트 컴파일러"]
---

# React Compiler

React Compiler는 build 단계에서 React component와 Hook을 분석해 계산 결과, 함수와 JSX를 재사용하도록 변환하는 최적화 도구다. JSX를 JavaScript로 바꾸는 변환과 역할이 다르다. React의 순수성, 불변성, Hook 호출 규칙을 지키는 코드가 분석의 전제다.

2026-10-01 확인 기준 stable이며 선택적으로 도입할 수 있다. 설치 여부와 적용 범위는 프로젝트마다 다르므로 React를 쓴다는 이유만으로 자동 최적화가 켜져 있다고 판단하지 않는다.

## 어떤 비용을 줄이는가

부모가 갱신될 때 자식 JSX와 계산 결과를 매번 다시 만들 필요가 없는 부분을 찾는다. 사람이 `memo`, `useMemo`, `useCallback`으로 하던 memoization의 상당 부분을 build 도구가 처리한다. 주된 대상은 기존 화면의 갱신 비용이다.

```jsx
const ProductList = ({ products, query }) => {
  const visibleProducts = products.filter(product => product.name.includes(query));
  return <ul>{visibleProducts.map(product => <li key={product.id}>{product.name}</li>)}</ul>;
};
```

이 예시는 props로부터 UI를 계산한다. Compiler는 데이터 흐름을 분석해 재사용할 부분을 정할 수 있지만 실제 변환 여부와 개선량은 빌드 결과와 측정으로 확인한다. 잘못된 state 설계나 느린 네트워크를 이 도구가 해결하지는 않는다.

| 경계 | 의미 |
|---|---|
| Component와 Hook 단위 분석 | 프로젝트의 모든 일반 함수를 전역 cache로 바꾸지 않는다 |
| Render 안에서 호출하는 순수 계산 | 호출 결과를 재사용할 수 있지만 계산 알고리즘 자체를 개선하지 않는다 |
| 인스턴스별 memoization | 서로 다른 component/Hook 호출 사이에서 결과가 공용 cache로 공유되는 것은 아니다 |
| 수동 memoization | 정밀한 제어가 필요하면 함께 쓸 수 있으며 기존 호출을 일괄 삭제하지 않는다 |

여러 component가 같은 고비용 계산을 반복하면 Compiler만으로 공유 비용이 사라지지 않는다. 먼저 측정하고, 공통 소유자에서 한 번 계산하거나 별도의 cache가 필요한지 판단한다. memoization 없이 틀리는 로직을 cache로 가리면 최적화 전략이 달라질 때 버그가 드러난다.

## 설치와 버전 경계

Compiler Babel plugin은 개발 의존성으로 추가한다.

```bash
npm install -D babel-plugin-react-compiler@latest
```

Babel pipeline에서는 다른 변환 전에 실행해야 원래 component와 Hook의 구조를 분석할 수 있다. React 19는 필요한 compiler runtime을 포함한다. React 17/18은 `target: '17'` 또는 `target: '18'`을 지정하고 `react-compiler-runtime`을 실행 의존성으로 설치한다. `target`은 숫자가 아닌 문자열이며 기본값은 `'19'`다.

Vite는 `@vitejs/plugin-react` 버전에 따라 연결 방법이 다르다. 다음은 6.0.0 이상에서 `@rolldown/plugin-babel`을 추가한 구성이다.

```js
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```

6.0.0 이전의 `react({ babel: { plugins: [...] } })` 예제를 새 버전에 그대로 복사하지 않는다. Next.js, Expo, React Router, Metro, Rspack과 Rsbuild는 각 통합 경로를 확인한다. Metro는 Babel 구성을 이용하고 Webpack에는 community loader가 있다. 기존 framework가 제공하는 Compiler 설정을 먼저 사용하고 중복 변환을 추가하지 않는다.

`eslint-plugin-react-hooks`의 Compiler 진단은 최적화할 수 없는 코드와 React 규칙 위반을 찾는 데 사용한다. 지원 preset 이름은 설치 버전의 README와 맞춘다. 검사에 걸린 component나 Hook은 최적화에서 제외될 수 있고 다른 영역은 계속 컴파일할 수 있으므로, 모든 진단을 고쳐야만 점진 도입이 가능한 것은 아니다.

## 단계적으로 적용하기

| 방식 | 적용 범위 | 확인할 점 |
|---|---|---|
| Babel `overrides` | 선택한 디렉터리 | 파일 패턴과 다른 변환의 실행 순서 |
| `compilationMode: 'annotation'` | `"use memo"`가 있는 함수 | 새 component/Hook도 opt-in이 필요한 운영 부담 |
| `gating` | build 때 생성한 최적화/원본 코드 중 runtime에서 선택 | flag 함수의 값과 같은 입력에서의 동작 비교 |

Annotation 방식은 다음과 같이 구성한다.

```js
// babel.config.js
module.exports = {
  plugins: [['babel-plugin-react-compiler', { compilationMode: 'annotation' }]],
};
```

```jsx
const Price = ({ amount }) => {
  "use memo";
  return <span>{amount.toLocaleString()}원</span>;
};
```

`gating`은 브라우저에서 소스를 다시 컴파일하는 기능이 아니다. build 결과에 두 경로를 남기고 모듈 평가 시 설정한 flag 함수로 실행 경로를 선택한다. 매 render마다 선택을 바꾸지 않는다. 세부 옵션과 라이브러리 배포는 [[React-Compiler-Configuration]]에서 다룬다. 작은 영역에서 같은 사용자 동작, 렌더링 결과와 성능을 비교한 뒤 적용 범위를 넓힌다.

## 적용 확인과 디버깅

1. 개발 화면의 React DevTools에서 component의 `Memo` 배지를 확인한다.
2. build 결과에 compiler runtime import와 memoization 변환이 있는지 확인한다. 설정 파일만 보고 전체 component가 최적화됐다고 결론 내리지 않는다.
3. 기능 회귀와 render 비용을 확인한다. 배지는 적용 여부의 단서이며 성능 향상 수치의 증거는 아니다.

문제가 생기면 **build 실패**, **최적화 제외**, **runtime 동작 변화**를 구분한다. 분석할 수 없는 코드는 제외되는 경우가 많지만 드문 build 오류나 Compiler 자체의 결함 가능성도 남는다. Runtime 변화가 있으면 render 중 mutation, Hook 규칙 위반, Effect의 참조 identity 의존부터 확인한다.

문제 함수의 첫 줄에 `"use no memo";`를 넣어 해당 함수의 컴파일을 임시로 제외하고 같은 입력으로 재현한다. 문제가 사라져도 Compiler 결함이나 사용자 코드의 규칙 위반 중 어느 쪽인지 아직 확정된 것은 아니다. 수동 memoization도 한 단계씩 제거해 동작의 의존성을 좁히고, 원인을 고친 뒤 제외 지시문을 없애 다시 검증한다.

재현이 남으면 React/Compiler 버전, 최소 코드, 기대 결과와 실제 결과를 기록한다. lint 통과만으로 모든 규칙 위반이 없다고 판단하지 않는다. 기존 `useMemo`와 `useCallback`을 지우는 변경도 출력과 성능을 비교하면서 진행한다.

## 이해 확인

- 같은 계산 함수를 두 component에서 부르면 Compiler가 결과를 서로 공유하는가?
- React 18 프로젝트에서 plugin만 설치하면 어떤 runtime 설정이 빠지는가?
- `gating`과 `compilationMode: 'annotation'`은 각각 어느 시점에 무엇을 선택하는가?
- DevTools 배지를 확인했지만 체감 속도가 같다면 다음으로 무엇을 측정해야 하는가?

## 출처

- [React, React Compiler](https://react.dev/learn/react-compiler)
- [React, Introduction](https://react.dev/learn/react-compiler/introduction)
- [React, Installation](https://react.dev/learn/react-compiler/installation)
- [React, Incremental Adoption](https://react.dev/learn/react-compiler/incremental-adoption)
- [React, Debugging and Troubleshooting](https://react.dev/learn/react-compiler/debugging)
- [React, target](https://react.dev/reference/react-compiler/target)

## 관련 문서

- [[React-Compiler-Configuration|Compiler 설정과 라이브러리 배포]]
- [[React-Hooks-Lint|lint 진단]]
- [[React-Performance-Tracks|성능 trace 읽기]]
- [[React-Tooling-and-Project-Setup|React 도구 설정]]
- [[React-Core-Mental-Model|순수한 render와 state]]
- [[React-State-Effects-and-Events|Effect와 Hook 호출 규칙]]
- [[Browser-Main-Thread|브라우저 메인 스레드]]
