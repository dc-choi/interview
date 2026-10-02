---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Fast Refresh의 갱신과 state"]
---

# React Native Fast Refresh의 갱신과 state

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 갱신 범위는 module 경계로 결정된다

Fast Refresh는 컴포넌트 수정 후 빠르게 결과를 표시하는 개발 기능이다. 기본 활성화되며 Dev Menu의 Enable Fast Refresh에서 전환한다. 많은 수정은 1~2초 내 반영되지만 이 시간은 모든 프로젝트의 성능 보장이 아니다.

| 수정한 module | 동작 |
|---|---|
| React component만 export | 해당 module 갱신과 컴포넌트 재렌더 |
| component가 아닌 값도 export | module과 이를 import하는 module을 다시 실행 |
| React tree 밖 module에서도 import | 전체 reload로 fallback할 수 있음 |

예를 들어 Button과 Modal이 Theme를 가져오면 Theme 변경은 두 소비자에 반영된다. 컴포넌트 파일에서 export한 상수를 비React utility도 import한다면 상수를 별도 파일로 옮겨 Fast Refresh 경계를 유지할 수 있다. 모든 파일을 미리 쪼개는 규칙이 아니라 실제 전체 reload의 원인을 분리하는 방법이다.

## 오류 수정 후 복구

- 문법 오류가 있는 module은 실행하지 않는다. 수정 후 저장하면 redbox가 사라지고 reload 없이 이어갈 수 있다.
- module 초기화 중 runtime 오류도 수정 후 module이 갱신되며 이어간다.
- 컴포넌트 내부 runtime 오류는 수정 후 새 코드로 remount해 복구한다.
- error boundary가 있으면 다음 edit 때 렌더링을 재시도할 수 있다. boundary는 production의 실패 경계를 고려해 설계하며 개발 편의만을 위해 지나치게 잘게 두지 않는다.

## state 유지의 한계

Fast Refresh는 안전한 경우에만 함수 컴포넌트와 Hooks의 local state를 유지한다. 클래스 컴포넌트 state는 보존하지 않는다. 컴포넌트 외 export가 섞인 module이나 클래스 컴포넌트를 반환하는 higher-order component도 state reset의 원인이 될 수 있다.

`useState`와 `useRef`는 인자와 Hook 호출 순서를 변경하지 않는 범위에서 이전 값을 유지하려고 한다. 따라서 state가 유지됐다는 사실은 앱의 cold start 동작이 검증됐다는 뜻이 아니다.

## 강제 remount

```js
// @refresh reset
```

파일 안에 이 지시문을 넣으면 해당 파일의 컴포넌트를 edit마다 remount한다. mount 시 한 번 수행하는 애니메이션을 조정하거나 초기화 경로를 반복 확인할 때 사용한다. 지시문은 해당 파일 범위에만 적용한다.

## dependency 배열은 refresh 중 무시될 수 있다

Fast Refresh에서는 `useEffect`, `useMemo`, `useCallback`이 dependency 값이 같아도 갱신된다. 예를 들어 `useMemo(() => x * 2, [x])`를 `x * 10`으로 바꾸면 x가 그대로여도 새 계산을 수행해야 수정이 반영된다.

빈 dependency 배열의 effect도 refresh 시 한 번 다시 실행될 수 있다. 구독, timer와 외부 자원을 생성하는 effect는 cleanup과 재실행을 견디도록 작성한다. 개발 중 effect 재실행을 production의 정규 dependency 동작과 혼동하지 않는다.

## 확인할 개발 조건

state가 reset되면 component 종류, module export와 import graph부터 확인한다. refresh가 잘 동작해도 새 앱 시작, 화면 재진입과 release build는 별도로 확인한다. 의존성이나 네이티브 코드 변경은 JavaScript refresh만으로 반영되지 않을 수 있으므로 필요한 binary rebuild를 구분한다.

## 출처

- [React Native, Fast Refresh](https://reactnative.dev/docs/fast-refresh)

## 관련 문서

- [[RN-Metro]]
- [[RN-Libraries]]
- [[React-Effects]]
- [[React-Error-Boundaries]]
