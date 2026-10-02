---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Jest 설정과 컴포넌트 테스트"]
---

# Expo Jest 설정과 컴포넌트 테스트

## 테스트 환경

`jest-expo`는 Expo SDK native 부분을 mock하는 Jest preset이다. JavaScript/component 계약의 빠른 검증에 쓰며 실제 기기/native 실행은 별도 검증한다.

```sh
npx expo install jest-expo jest @types/jest --dev
npx expo install @testing-library/react-native --dev
# Windows 가이드의 인자 구분 방식
npx expo install jest-expo jest @types/jest "--" --dev
```

TypeScript를 사용하지 않으면 `@types/jest`는 생략한다. TypeScript 프로젝트는 기존 `compilerOptions.types`를 보존하며 `jest`를 추가한다. React19 이상에서는 deprecated `react-test-renderer`를 사용하지 않고 React Native Testing Library를 사용한다.

```json
{
  "scripts": { "test": "jest --watchAll", "testFinal": "jest" },
  "jest": { "preset": "jest-expo" }
}
```

## 사용자에게 보이는 결과 확인

```tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

test('환영 문구를 표시한다', async () => {
  const { getByText } = await render(<Text>Welcome!</Text>);
  expect(getByText('Welcome!')).toBeTruthy();
});
```

`getBy*`는 기대 요소가 없으면 실패한다. 비동기 렌더링/업데이트는 사용 중인 Testing Library 버전의 async 계약에 맞춰 await한다. root `__tests__` 또는 components/utils 옆의 `__tests__`를 사용할 수 있다. Router의 화면 경로 디렉터리에 테스트를 놓아 route로 발견되게 하지 않는다. preset은 `-test.ts|tsx` 파일도 발견한다.

## dependency transform

Jest가 native/Expo dependency의 transpilation을 요구하면 `transformIgnorePatterns`의 negative lookahead에 실제 필요한 패키지를 포함한다. 기본 `node_modules` 전체를 transform하는 대신 react-native, Expo, navigation, SVG 등의 허용 대상을 명시한다. pnpm의 `.pnpm`, Bun의 `.bun` storage 경로도 패턴에 반영한다.

```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))"
    ]
  }
}
```

이 예시는 pnpm 기준이다. npm/Yarn은 `.pnpm` 예외가 필요 없고 Bun은 `.bun` 구조를 확인한다. 정규식이 모든 dependency 버전에 맞는지 실제 실패 import와 테스트 실행으로 판단한다.

## Snapshot, coverage와 실행 방식

`render(...).toJSON()` 결과에 `toMatchSnapshot()`을 사용하면 `__snapshots__`에 기준 tree가 저장된다. 변경을 무조건 `-u`로 승인하지 않고 의도된 차이를 검토한다. UI/flow 검증에는 static snapshot보다 E2E 테스트를 우선 검토한다.

```json
{
  "jest": {
    "preset": "jest-expo",
    "collectCoverage": true,
    "collectCoverageFrom": [
      "**/*.{ts,tsx,js,jsx}", "!**/coverage/**", "!**/node_modules/**",
      "!**/babel.config.js", "!**/expo-env.d.ts", "!**/.expo/**"
    ]
  }
}
```

HTML report는 `coverage/lcov-report/index.html`에서 확인하고 `coverage/**/*`를 gitignore에 둔다. coverage 수치가 테스트 의미나 native 정확성을 보장하지 않는다.

개발에서는 `jest -o --watch --coverage=false`, branch 변경 중심 실행에는 `--changedSince=origin/main`, 최종 실행에는 `jest`, 의도된 snapshot 갱신에는 `jest -u --coverage=false`를 사용할 수 있다. Router integration tests와 Maestro/EAS E2E는 별도 층이다.

## 출처

- [Expo Documentation, Unit testing with Jest](https://docs.expo.dev/develop/unit-testing)

## 관련 문서

- [[Expo-Home-Debugging-Runtime]]
- [[Expo-Home-Tools-Navigation]]
