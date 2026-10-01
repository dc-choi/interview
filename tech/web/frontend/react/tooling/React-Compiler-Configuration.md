---
tags: [web, frontend, react, compiler]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# React Compiler 설정과 배포

Compiler 설정은 어떤 함수를 분석할지, 문제가 생기면 무엇을 제외할지, 어느 runtime을 대상으로 결과를 만들지를 결정한다. 처음에는 기본값을 사용하고 필요가 확인된 옵션만 바꾼다. 설치와 도입 순서는 [[React-Compiler]]에서 이어진다.

## Configuration과 compilationMode

Babel plugin은 다른 변환보다 먼저 실행한다. framework가 Compiler 통합을 제공하면 그 경로에서 옵션을 전달한다.

```js
module.exports = {
  plugins: [['babel-plugin-react-compiler', {
    compilationMode: 'infer',
    target: '19',
    panicThreshold: 'none',
  }]],
};
```

| compilationMode | 대상과 주의점 |
|---|---|
| `infer` (기본값) | component/Hook 이름, JSX 또는 Hook 사용으로 대상을 추론한다. 명시적 `"use memo"`도 대상이다 |
| `annotation` | `"use memo"`로 표시한 함수만 opt-in한다 |
| `syntax` | Flow의 `component`/`hook` 선언 문법을 사용한다. TypeScript 설정이라는 뜻이 아니다 |
| `all` | 최상위 함수를 넓게 분석한다. 일반 유틸리티까지 component/Hook 전제로 처리할 수 있어 기본 선택으로 삼지 않는다 |

`infer`에서 PascalCase 또는 `use` 접두사만 붙이고 JSX/Hook 단서가 없으면 기대한 대상이 아닐 수 있다. 이름, 함수 구조와 실제 변환 결과를 함께 확인한다. `"use no memo"`로 제외한 함수는 모드와 관계없이 컴파일하지 않는다.

## gating은 모듈 평가 시 선택한다

`gating`의 기본값은 `null`이다. 설정하면 import할 모듈 경로 `source`와 boolean을 반환하는 named export `importSpecifierName`을 지정한다.

```js
const compilerOptions = {
  gating: { source: './compiler-flags', importSpecifierName: 'isCompilerEnabled' },
};
```

빌드 결과에는 컴파일된 함수와 원래 함수가 함께 남는다. 각 변환 파일에서 flag 함수를 가져와 **모듈 평가 시** 경로를 고르고, 그 선택을 이후 사용한다. 매 render마다 flag를 읽어 실시간 전환하는 장치가 아니다. flag 값을 나중에 바꿔도 이미 선택한 함수가 교체된다고 기대하지 않는다.

배포 전 확인할 것은 import 경로가 각 변환 파일에서 해석되는지, named export가 있는지, flag가 boolean을 반환하는지다. 두 코드 경로로 번들이 커지므로 점진 배포를 마치면 유지 비용과 제거 시점을 검토한다. 비활성/활성 사용자의 결과와 성능을 같은 조건으로 비교한다.

## logger로 적용과 제외를 구분하기

`logger`의 기본값은 `null`이며 `logEvent(filename, event)`를 제공하면 파일별 분석 결과를 수집할 수 있다. `filename`은 `null`일 수도 있다.

```js
const logger = {
  logEvent(filename, event) {
    if (event.kind === 'CompileError' || event.kind === 'PipelineError') {
      console.error(filename ?? '<unknown>', event);
    }
  },
};
```

이벤트에는 `CompileSuccess`, `CompileError`, `CompileDiagnostic`, `CompileSkip`, `PipelineError`, `Timing` 등이 있다. 모든 이벤트가 같은 상세 필드를 갖는다고 가정하지 않는다. payload 구조는 설치한 Compiler 버전에 맞춘다. 큰 저장소에서 모든 로그를 그대로 출력하면 빌드 로그가 과도해지므로 대상과 종류를 좁힌다.

성공 건수는 컴파일 적용 근거이며 사용자 체감 성능의 증거는 아니다. 제외 이유와 DevTools 측정을 함께 확인한다.

## panicThreshold와 target

| 옵션 | 계약 |
|---|---|
| `panicThreshold: 'none'` | 기본값이자 일반 배포 권장값. Compiler가 처리하지 못하는 함수는 제외하고 나머지를 진행한다 |
| `'critical_errors'` | Compiler의 심각한 오류를 빌드 실패로 드러내는 진단용 선택 |
| `'all_errors'` | 모든 Compiler 진단을 빌드 실패로 처리한다. 점진 도입 중 적용 범위를 불필요하게 막지 않는지 확인한다 |
| `target: '19'` | 기본값. React에 내장된 `react/compiler-runtime` 사용 |
| `target: '17'` / `'18'` | `react-compiler-runtime` 실행 의존성 필요 |

`'none'`은 JavaScript 문법 오류, 모듈 해석 실패나 다른 빌드 도구 오류까지 없앤다는 뜻이 아니다. target은 문자열이며 실제 지원할 최소 React 버전에 맞춘다. React 패키지 버전만 바꾸고 target/runtime을 그대로 두면 배포 산출물이 소비자 환경에서 깨질 수 있다.

## Directives로 함수와 모듈 범위 지정하기

`"use memo"`와 `"use no memo"`는 Compiler에 주는 지시문이다. 함수 본문의 시작이나 모듈 시작(다른 코드와 import보다 앞)에 둔다. 앞선 주석은 허용하며 백틱 template literal은 지시문이 아니다. 함수 수준 지시문으로 모듈 기본 방침을 재정의할 수 있다.

```jsx
// annotation 모드에서 이 함수만 선택한다.
const Total = ({ items }) => {
  'use memo';
  return <span>{items.reduce((sum, item) => sum + item.price, 0)}</span>;
};
```

`"use memo"`는 최적화 시도를 요청하며 React 규칙 위반을 합법화하지 않는다. `"use no memo"`는 알려진 문제를 좁혀 재현하거나 호환되지 않는 라이브러리의 경계를 잠시 제외할 때 사용한다. 여러 상충 지시문을 연속으로 쌓지 말고 범위당 의도를 하나로 명시한다.

```jsx
const LegacyWidget = ({ model }) => {
  'use no memo'; // 내부 가변 model 호환성 확인 후 제거한다.
  return <span>{model.read()}</span>;
};
```

`"use no forget"`도 opt-out 별칭으로 지원되지만 새 코드에는 `"use no memo"`를 쓴다. 제외 이유와 제거 조건을 남기고, 원인을 고친 후 지시문 없이 회귀를 확인한다. Compiler 제외는 render 중 부수효과를 허용하는 설정이 아니다.

## 라이브러리 사전 컴파일과 배포

라이브러리 작성자는 npm에 올릴 JavaScript를 빌드할 때 미리 컴파일할 수 있다. 소비자는 Compiler를 설치하지 않아도 변환된 코드를 사용한다.

1. Compiler plugin은 라이브러리의 개발 의존성에 둔다.
2. 지원할 가장 낮은 React 버전으로 `target`을 정한다.
3. React 17/18 대상 산출물이 runtime을 import한다면 `react-compiler-runtime`을 일반 의존성에 둔다. 개발 의존성만 두면 소비자 설치에서 빠진다.
4. `peerDependencies`는 실제 검증한 React 지원 범위와 일치시킨다. 더 오래된 버전 지원을 선언해 놓고 React 19 전용 runtime을 내보내지 않는다.
5. 배포할 `dist`에 변환이 들어갔는지, import가 소비자 환경에서 해석되는지 확인한다. 소스 파일 빌드 성공만으로 검증을 끝내지 않는다.
6. 라이브러리 자체의 기존 테스트를 컴파일된 코드에 실행하고, Compiler를 우회하는 별도 설정에서도 실행해 변환 전후 동작을 비교한다.
7. 별도의 소비자 호환성 검사에서는 소비자가 Compiler를 쓰는 경우와 쓰지 않는 경우, 지원하는 React 버전별 동작을 확인한다. 이미 변환한 라이브러리는 소비자 Compiler를 꺼도 변환 전 코드로 돌아가지 않는다.

이 과정은 애플리케이션 전체의 최적화를 보장하지 않는다. 배포된 라이브러리 코드의 처리 범위와 소비자 자체 코드의 처리 범위를 구분한다.

## 이해 확인

- gating flag를 화면에서 바꾸면 이미 import한 component의 구현도 바뀌는가?
- React 18 지원 라이브러리가 runtime을 devDependency에만 두면 왜 소비자에서 실패할 수 있는가?
- `all`과 `annotation`에서 새 함수를 추가했을 때 적용 범위가 어떻게 달라지는가?
- 컴파일 제외와 빌드 실패, runtime 회귀를 어떤 근거로 나눌 것인가?

## 출처

- [React, Configuration](https://react.dev/reference/react-compiler/configuration)
- [React, compilationMode](https://react.dev/reference/react-compiler/compilationMode)
- [React, gating](https://react.dev/reference/react-compiler/gating)
- [React, logger](https://react.dev/reference/react-compiler/logger)
- [React, panicThreshold](https://react.dev/reference/react-compiler/panicThreshold)
- [React, target](https://react.dev/reference/react-compiler/target)
- [React, Directives](https://react.dev/reference/react-compiler/directives)
- [React, use memo](https://react.dev/reference/react-compiler/directives/use-memo)
- [React, use no memo](https://react.dev/reference/react-compiler/directives/use-no-memo)
- [React, Compiling Libraries](https://react.dev/reference/react-compiler/compiling-libraries)

## 관련 문서

- [[React-Compiler]]
- [[React-Hooks-Lint]]
