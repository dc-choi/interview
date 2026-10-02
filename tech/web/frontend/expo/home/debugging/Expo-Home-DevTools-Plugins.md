---
tags: [expo, react-native, debugging]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo DevTools plugin 사용과 양방향 메시지"]
---

# Expo DevTools plugin 사용과 양방향 메시지

## 구성과 호환성

Expo dev-tools plugin은 앱의 작은 JS hook과 browser web UI가 양방향으로 통신하는 진단 도구다. plugin 자체는 native module/config plugin이 필요하지 않으며 Go/development build에서 사용할 수 있다. 단, 조사하는 대상 library가 Go에 없는 native code를 요구하면 해당 library가 포함된 development build가 필요하다.

root component에 package hook을 연결하고 `npx expo start` 뒤 Shift+M의 plugin 목록을 선택하면 Chrome window가 열린다. `?`와 more tools menu에서도 선택한다. hooks/returned functions는 production에서 no-op이 되도록 구성한다.

## 제공 plugin

| Package/hook | 조사 대상과 연결 인자 |
| --- | --- |
| `@dev-plugins/react-navigation` / `useReactNavigationDevTools` | navigation ref, action/state history, rewind, deep link |
| `@dev-plugins/apollo-client` / `useApolloClientDevTools` | ApolloClient, cache/query/mutation |
| `@dev-plugins/react-query` / `useReactQueryDevTools` | QueryClient, query/cache, refetch/remove |
| `redux-devtools-expo-dev-plugin` | Redux actions/state, rewind/replay/dispatch |
| `@dev-plugins/tinybase` / `useTinyBaseDevTools` | TinyBase store 내용 조회/변경 |

Router는 `useNavigationContainerRef`와 root layout hook으로 연결한다. React Navigation은 NavigationContainer의 동일 ref를 전달한다. Apollo/Query/TinyBase는 실제 provider에 전달하는 client/store instance를 plugin에도 넘긴다.

Redux Toolkit은 기본 `devTools: false`를 설정하고 enhancer에 plugin을 추가한다.

```ts
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

const store = configureStore({
  reducer: rootReducer,
  devTools: false,
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(devToolsEnhancer()),
});
```

plugin에서 refetch/state 변경/dispatch를 하면 실제 앱 상태가 변하므로 production 데이터를 대상으로 진단 명령을 사용하지 않도록 환경을 구분한다.

## Custom plugin 생성

```sh
npx create-dev-plugin@latest
npm run web:dev
npm run build:all
```

generator는 plugin 이름, 설명과 exported hook 이름을 받고 `src`(consumer hook), `webui`(Expo web UI), `expo-module.config.json`(CLI discovery)를 만든다. web:dev는 browser UI 개발, build:all은 hook을 `build`, UI를 `dist`로 만든다. npm 배포 또는 monorepo에 사용할 수 있다.

## Client messaging과 cleanup

app과 web UI는 동일 plugin name으로 `useDevToolsPluginClient`를 호출해야 한다. `sendMessage(type, data)`는 전송, `addMessageListener(type, callback)`은 해당 type 수신이다.

```tsx
import { useEffect } from 'react';
import { useDevToolsPluginClient } from 'expo/devtools';

export const usePingTool = () => {
  const client = useDevToolsPluginClient('my-devtools-plugin');
  useEffect(() => {
    const subscription = client?.addMessageListener('ping', (data) => {
      console.log('ping', data);
    });
    return () => subscription?.remove();
  }, [client]);
  return { sendPing: () => client?.sendMessage('ping', { from: 'app' }) };
};
```

client availability 변화에 effect가 재연결되게 하고 unmount/reconnect에 listener를 제거한다. production export도 동일 returned object shape의 no-op functions를 제공해야 caller가 crash하지 않는다. 외부 메시지 payload를 받아 실행하는 custom action은 type/허용 동작을 제한한다.

실제 consumer root에서 hook을 연결해 UI-message-app 상태 왕복을 검증한다. web UI 단독 실행과 build output 존재만으로 앱 연결을 확인한 것은 아니다.

## 출처

- [Expo Documentation, Dev tools plugins](https://docs.expo.dev/debugging/devtools-plugins)
- [Expo Documentation, Create a dev tools plugin](https://docs.expo.dev/debugging/create-devtools-plugins)

## 관련 문서

- [[Expo-Home-Debugging-Tools]]
- [[Expo-Home-Unit-Testing]]
