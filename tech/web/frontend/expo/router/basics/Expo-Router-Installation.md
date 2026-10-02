---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 설치와 문제 진단"]
---

# Expo Router 설치와 문제 진단

기존 Expo CLI 프로젝트에 Router를 추가할 때 SDK와 맞는 dependency를 `expo install`로 선택한다. 아래 명령은 설정 예시이며 이 문서 작업에서 실행한 설치가 아니다.

```sh
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

`package.json`의 `main`은 `expo-router/entry`로 지정한다. 분석 도구 초기화, polyfill 등 route 이전 side effect가 필요하면 루트 `index.js`를 entry로 삼고 `import 'expo-router/entry';`를 마지막에 둔다. 앱 등록을 두 번 하지 않는다.

```json
{
  "expo": {
    "scheme": "my-app",
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true },
    "web": { "bundler": "metro" }
  }
}
```

웹에는 `npx expo install react-native-web react-dom`도 필요하다. custom Babel 설정이 있으면 `babel-preset-expo`를 사용한다. 설정이 필요하지 않으면 Babel 파일을 생략할 수 있다. tsconfig는 `expo/tsconfig.base`를 상속하고 `.expo/types/**/*.ts`, `expo-env.d.ts`를 include한다. 설정 변경 후 `npx expo start --clear`로 이전 캐시를 비운다. 이전 Router를 위해 추가한 `metro`, `metro-resolver`, `react-refresh` resolutions/overrides를 현재 SDK에 그대로 남기지 않는다.

## 진단 순서

| 증상 | 확인 대상 |
| --- | --- |
| DevTools에 파일/source map 누락 | DevTools 설정의 restore defaults 후 Ignore List의 node_modules 제외 여부 |
| `EXPO_ROUTER_APP_ROOT` 미정의 | entry, SDK에 맞는 Babel preset, 캐시와 Metro context 변환 |
| `require.context` 미활성 | custom Metro가 `expo/metro-config`를 확장하는지 |
| deep link 후 뒤로가기 없음 | 해당 layout의 `unstable_settings.anchor` |

Troubleshooting 페이지에는 `expo-router/babel`과 `expo-router/metro`를 언급하는 이전 구성 문장이 남아 있다. SDK 57 설치 기준은 `babel-preset-expo`와 `expo/metro-config`이며 오래된 plugin을 새로 추가하는 처방으로 읽지 않는다.

최소 custom entry 진단은 `registerRootComponent`, `ExpoRoot`와 `require.context('./app')`를 사용한다. 이 컴포넌트는 export해야 Fast Refresh가 context를 갱신한다. 이 우회는 route root를 자유롭게 바꾸는 지원 계약이 아니다.

```tsx
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
export function App() {
  const context = require.context('./app');
  return <ExpoRoot context={context} />;
}
registerRootComponent(App);
```

## 출처

- [Expo Documentation, Manual installation](https://docs.expo.dev/router/installation)
- [Expo Documentation, Troubleshooting](https://docs.expo.dev/router/reference/troubleshooting)

## 관련 문서

- [[Expo-Router]]
