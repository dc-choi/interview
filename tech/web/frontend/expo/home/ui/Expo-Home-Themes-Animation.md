---
tags: [expo, react-native, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 색상 테마와 애니메이션"]
---

# Expo 색상 테마와 애니메이션

## Appearance 설정

```json
{ "expo": { "userInterfaceStyle": "automatic" } }
```

`automatic`은 system appearance를 따르고 변화 알림을 받으며 `light`/`dark`는 한 appearance로 제한한다. 기본 template은 automatic이고 속성이 없으면 light가 기본이다. `android.userInterfaceStyle`, `ios.userInterfaceStyle`로 platform별 설정을 할 수 있다.

Android development build는 `expo-system-ui`가 필요하며 없으면 이 설정을 무시한다. `npx expo install expo-system-ui` 후 native build에 반영한다. `npx expo config --type introspect`로 적용할 native 설정을 점검할 수 있다. 웹은 이 native 설정 없이 color scheme을 탐지한다.

수동 native Android 프로젝트는 Activity `configChanges`의 `uiMode`와 configuration 변경 처리를, iOS는 Info.plist `UIUserInterfaceStyle`을 관리한다. 예전 Java Activity 예제를 현재 Kotlin entry에 그대로 붙이지 않고 현재 native template의 계약을 확인한다.

## Runtime 테마

```tsx
import { Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export const ThemeScreen = () => {
  const dark = useColorScheme() === 'dark';
  return <View style={{ flex: 1, backgroundColor: dark ? '#202020' : '#ffffff' }}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <Text style={{ color: dark ? '#ffffff' : '#202020' }}>테마 콘텐츠</Text>
  </View>;
};
```

imperative 조회는 `Appearance.getColorScheme()`, listener는 `Appearance.addChangeListener()`를 사용한다. theme tokens를 통해 background/text/bar 대비를 일관되게 선택한다. Android는 system 설정 또는 `adb shell "cmd uimode night yes"`/`no`, iOS Simulator는 Cmd+Shift+A로 양 모드를 테스트한다.

## 애니메이션 선택

React Native Animated는 기본 선택지다. 더 복잡한 interaction과 UI-thread 기반 animation에는 SDK 호환 Reanimated를 검토한다. 기본 template에 포함된 dependency는 다시 설치할 필요가 없으며 다른 template은 `npx expo install react-native-reanimated`로 맞춘다. 설치한 Reanimated major의 추가 runtime/Babel 조건은 Reference와 함께 확인한다.

```tsx
import { Button, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export const WidthDemo = () => {
  const width = useSharedValue(100);
  const style = useAnimatedStyle(() => ({ width: withTiming(width.value, { duration: 500 }) }));
  return <View>
    <Animated.View style={[{ height: 80, backgroundColor: 'black' }, style]} />
    <Button title="크기 변경" onPress={() => { width.value = width.value === 100 ? 200 : 100; }} />
  </View>;
};
```

shared value가 바뀌면 animated style이 목표 width를 timing으로 전환한다. `Easing.bezier` 등 easing을 선택할 수 있다. 성능은 thread, animation 속성, 실제 device와 작업량의 영향을 받으며 library 선택만으로 부드러움을 보장하지 않는다. Moti 같은 상위 library는 Android/iOS/web에 사용할 수 있으나 기존 도구로 해결되는 단순 animation에 추가할 필요는 없다.

## 출처

- [Expo Documentation, Color themes](https://docs.expo.dev/develop/user-interface/color-themes)
- [Expo Documentation, Animation](https://docs.expo.dev/develop/user-interface/animation)

## 관련 문서

- [[Expo-Home-Safe-Areas-Bars]]
- [[Expo-Home-Debugging-Tools]]
