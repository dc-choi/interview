---
tags: [react-native, mobile, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native JavaScript 로딩과 초기 실행"]
---

# React Native JavaScript 로딩과 초기 실행

React Native 0.87 문서 기준이다.

시작 시간에는 번들 읽기뿐 아니라 JavaScript parse, module 평가와 초기 render 비용이 포함된다. 화면이 실제로 필요할 때 실행하도록 미루면 시작 비용이 줄 수 있지만 첫 진입 지연과 초기화 순서가 달라진다.

## Hermes와 lazy component

Hermes release 빌드는 JavaScript를 미리 bytecode로 컴파일하고 필요한 부분을 읽는다. 텍스트 JS를 매번 parse하는 비용을 줄이지만 모든 module side effect나 React render 비용을 없애는 것은 아니다.

초기 화면에서 사용하지 않는 큰 화면 component는 React `lazy`와 `Suspense`로 지연할 수 있다. 단, 이것만으로 production native bundle이 웹처럼 독립 파일로 나뉘어 원격 다운로드된다고 단정하지 않는다. 실제 번들 분리는 bundler와 프레임워크 계약을 확인한다.

```tsx
import {lazy, Suspense} from 'react';
import {Text} from 'react-native';

const ReportScreen = lazy(() => import('./ReportScreen'));

const ReportEntry = () => (
  <Suspense fallback={<Text>보고서 준비 중</Text>}>
    <ReportScreen />
  </Suspense>
);
```

`ReportScreen`의 default export가 있다는 전제의 개념 예제다. chunk 실패와 error boundary, 화면 이동 중 fallback UX는 앱 요구에 맞춰 별도로 설계한다.

## Module side effect

module 최상위에서 global을 수정하거나 event를 구독하면 import 평가 시점 자체가 동작 계약이 된다. lazy 도입으로 평가가 늦어지거나 아예 실행되지 않으면 다른 코드가 초기화되지 않은 global을 읽을 수 있다.

초기화가 필요하면 명시적인 앱 bootstrap 단계로 표현하고, 화면 진입 시 필요한 구독은 lifecycle과 cleanup을 맞춘다. lazy 최적화 전에 side effect와 순서 의존성을 확인한다.

## Inline require

필요한 지점에서 `require('./ExpensiveModule')`를 호출하면 첫 사용까지 module 평가를 미룰 수 있다. 문서 기준 React Native CLI는 `require` 호출을 자동 inline하는 기본 최적화가 있고, Expo는 기본 설정이 다를 수 있다. static `import`까지 같은 규칙으로 자동 처리된다고 단정하지 않는다.

Metro의 `getTransformOptions`가 반환하는 `transform`에서 조정한다. 실제 설정에서는 사용하는 기본 Metro config와 합성한다.

| 옵션 | 의미 |
|---|---|
| `inlineRequires: false` | 자동 inline 전체 비활성화 |
| `inlineRequires: true` | 자동 inline 활성화 |
| `inlineRequires.blockList` | 지정한 소스 파일 내부의 require inline 제외 |
| `nonInlinedRequires` | 지정한 module 이름의 require를 모든 호출 위치에서 제외 |

`blockList`의 key는 `require.resolve('./src/bootstrap.js')`처럼 파일을 식별한다. `nonInlinedRequires: ['react']`는 호출되는 module을 식별한다. 둘을 같은 제외 기준으로 취급하지 않는다.

## RAM bundle의 경계

RAM bundle은 module을 별도 문자열 또는 파일로 저장해 필요한 module만 parse하는 non-Hermes 선택지다. Hermes bytecode와 호환되지 않으므로 Hermes 최적화 위에 중첩 적용하지 않는다.

Android는 분리 파일 또는 indexed format, iOS는 indexed format을 사용할 수 있다. legacy 문서의 `project.ext.react`와 `react.gradle` 예시는 과거 Gradle 통합 방식이다. 현행 프로젝트에서는 React Native Gradle Plugin의 bundle 설정과 해당 엔진 지원을 확인한다. iOS의 bundle build phase는 `BUNDLE_COMMAND=ram-bundle` 선택을 사용한다.

## 측정

cold start, 첫 화면 표시, 지연 화면의 첫 진입을 따로 측정한다. 앱 시작이 빨라졌어도 사용자의 첫 조작이 느려지면 비용을 옮긴 것일 수 있다. side effect 누락, 오류 보고 초기화와 event 중복 구독도 회귀 조건으로 확인한다.

## 출처

- [React Native, Optimizing JavaScript loading](https://reactnative.dev/docs/optimizing-javascript-loading)

## 관련 문서

- [[React-Native-Hermes]]
- [[React-Native-Performance]]
- [[React-Suspense-and-Lazy]]
