---
tags: [expo, react-native, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Safe Area와 시스템 바"]
---

# Expo Safe Area와 시스템 바

## inset과 edge-to-edge

notch, rounded corner, status/navigation bar와 home indicator가 content를 가리지 않도록 inset을 적용한다. Android edge-to-edge에서는 배경을 system bar 뒤로 그리더라도 버튼/텍스트 등 상호작용 content는 safe area를 처리해야 한다.

`react-native-safe-area-context`는 기본 Expo Router template의 peer dependency로 포함된다. 다른 템플릿에서는 `npx expo install react-native-safe-area-context`로 설치하고 root에 provider를 둔다.

```tsx
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const Screen = () => {
  const { top, bottom } = useSafeAreaInsets();
  return <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom }}>
    <Text>안전 영역 안의 콘텐츠</Text>
  </View>;
};

export default function App() {
  return <SafeAreaProvider><Screen /></SafeAreaProvider>;
}
```

`SafeAreaView`는 inset을 padding 또는 margin으로 적용한 View다. hook은 `{top, right, bottom, left}` 수치를 제공해 edge별로 배치할 수 있다. navigator가 이미 적용한 inset을 content에서 중복 적용하지 않도록 layout 책임을 확인한다.

웹도 provider가 필요하며 SSR은 라이브러리의 server initial metrics 설정을 확인한다. React Navigation은 safe-area-context를 활용해 navigation UI에 safe area를 적용한다. content 내부의 추가 처리는 앱 책임이다.

## Status bar

`expo-status-bar`의 `<StatusBar style="light" />`는 dark 배경에 밝은 문자/icons를 선택한다. 기본 template의 `auto`는 app color scheme에 맞춘다. `setStatusBarStyle`로 imperative 변경, `hidden`/`setStatusBarHidden`으로 visibility를 제어한다.

```tsx
import { StatusBar } from 'expo-status-bar';

export const Bars = () => <StatusBar style="light" hidden={false} />;
```

system bar style은 문자/아이콘 대비이며 content 배경색과 safe area를 자동으로 해결하는 설정이 아니다. bar를 숨기면 사용자의 시스템 접근과 화면 전환 경험도 함께 확인한다.

## Android navigation bar

Android 하단 navigation bar는 `expo-navigation-bar`가 담당한다. SDK57 Home 안내는 `NavigationBar` component의 `style`, `hidden`, `setStyle`과 `setHidden`을 소개한다. 실제 사용은 설치한 SDK의 Reference export와 platform 조건을 대조한다. iOS home indicator를 Android navigation bar API로 제어하지 않는다.

edge-to-edge, gesture navigation과 OS 정책에 따라 효과가 달라질 수 있다. app navigation header/tab bar와 OS navigation controls를 구분하고 실기기의 다양한 navigation mode에서 content가 가리지 않는지 검증한다.

## 출처

- [Expo Documentation, Safe areas](https://docs.expo.dev/develop/user-interface/safe-areas)
- [Expo Documentation, System bars](https://docs.expo.dev/develop/user-interface/system-bars)

## 관련 문서

- [[Expo-Home-Themes-Animation]]
- [[Expo-Home-Tools-Navigation]]
