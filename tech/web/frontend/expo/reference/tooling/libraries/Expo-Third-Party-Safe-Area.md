---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo safe area API"]
---

# Expo safe area API

## SafeAreaContext

`react-native-safe-area-context`는 Android, iOS, tvOS, 웹의 노치, 상태 표시줄과 홈 인디케이터 주변 inset을 제공한다. Expo Go에 포함되며 `npx expo install react-native-safe-area-context`로 설치한다.

## Provider와 View

앱 루트에 `SafeAreaProvider`를 설치한다. native screen이나 modal 경계에 따라 추가 provider가 필요할 수 있으며 웹에서도 provider 구성이 필요하다.

```tsx
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native';

const Screen = () => (
  <SafeAreaProvider>
    <SafeAreaView edges={['top', 'bottom']} style={{ padding: 12 }}>
      <Text>안전 영역 안의 콘텐츠</Text>
    </SafeAreaView>
  </SafeAreaProvider>
);
```

`SafeAreaView`는 inset을 padding으로 적용한다. 직접 지정한 padding은 inset에 더해진다. `edges` 기본값은 네 방향 모두이며 적용 방향을 선택할 수 있다. `emulateUnlessSupported` 기본값은 true다.

## Hook과 초기 렌더링

`useSafeAreaInsets()`는 숫자 `top`, `right`, `bottom`, `left`가 있는 `EdgeInsets`를 반환한다. `SafeAreaInsetsContext.Consumer`도 제공한다. hook은 회전 시 비동기 갱신에 따른 비용이 있을 수 있으므로 단순 padding은 `SafeAreaView`부터 검토한다.

`initialWindowMetrics`를 provider의 `initialMetrics`에 전달하면 초기 측정 지연을 줄일 수 있다. provider가 다시 mount되거나 `react-native-navigation`을 사용하는 경우에는 이 최적화를 적용하지 않는다.

웹 SSR에서는 비동기 측정 이전에 사용할 inset을 제공해 초기 렌더링이 깨지지 않게 한다. 기기를 알 수 없다면 0을 초기값으로 둘 수 있다. CSS의 `env(safe-area-inset-*)`로 구현한 화면을 여러 플랫폼으로 옮길 때도 hook으로 inset을 읽는 방식으로 대응할 수 있다.

## 출처

- [Expo Documentation, react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
