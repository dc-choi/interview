---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo React Compiler 활성화와 적용 범위"]
---

# Expo React Compiler 활성화와 적용 범위

## 자동 memoization

React Compiler는 function component/hook을 분석해 자동 memoization을 수행한다. Rules of React 준수가 전제이며 class component는 최적화하지 않는다. 기존 useMemo/useCallback/React.memo를 삭제할 때는 그 용도와 실제 동작을 확인한다. compiler activation만으로 모든 앱 performance가 개선된다고 단정하지 않는다.

```sh
npx react-compiler-healthcheck@latest
```

```json
{ "expo": { "experiments": { "reactCompiler": true } } }
```

SDK54 이후 Babel 구성이 자동이며 과거 SDK53 beta plugin, SDK52 runtime 설치 절차를 현재 필수로 복사하지 않는다. SDK55 이후 eslint-config-expo에 compiler lint rule이 포함돼 이전 별도 eslint-plugin-react-compiler 설정은 제거할 수 있다.

## 점진 적용과 설정

Babel `babel-preset-expo`의 `'react-compiler'` object에서 `sources: filename => ...`로 특정 경로를 선택한다. component/function의 `'use no memo'` directive는 opt-out이다. Babel 파일을 바꾸면 `expo start --clear`로 재시작한다.

plugin option인 compilationMode/panicThreshold와 web 전용 `web['react-compiler']` 설정을 전달할 수 있다. 실패를 무조건 무시하지 않고 lint와 healthcheck 결과를 먼저 확인한다.

## 적용하지 않는 code

Expo compiler는 application code의 client bundle을 대상으로 한다. node_modules와 server rendering에는 적용하지 않는다. 서버쪽 render 횟수와 third-party package 성능이 앱 compiler로 자동 해결되지 않는다. React Playground나 transformed source로 실제 compiler 결과를 확인할 수 있다.

## 출처

- [Expo Documentation, React Compiler](https://docs.expo.dev/guides/react-compiler)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
