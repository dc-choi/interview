---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router JavaScript 탭과 Drawer"]
---

# Expo Router JavaScript 탭과 Drawer

## JavaScript Tabs

JavaScript Tabs는 React Navigation bottom tabs 기반이며 SDK 56 이후 Router에 번들된다. layout에서 `import { Tabs } from 'expo-router'` 또는 해당 submodule을 사용한다. `(tabs)` 디렉터리 이름만으로 탭이 되는 것은 아니며 `_layout.tsx`가 Tabs를 반환해야 한다.

```tsx
<Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
  <Tabs.Screen name="index" options={{ title: 'Home' }} />
  <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarBadge: 2 }} />
</Tabs>
```

공통 `screenOptions`, 화면별 `options`를 구분한다. `index`가 기본 tab이며 name은 route와 일치한다.

| 옵션 묶음 | 세부 계약 |
| --- | --- |
| 색상 | `tabBarActiveTintColor`, `tabBarInactiveTintColor`, 각 BackgroundColor |
| icon | `tabBarIcon({ focused, color, size })`, `tabBarIconStyle` |
| label | `tabBarLabel` 문자열/함수, `tabBarShowLabel`, `tabBarLabelStyle`, `tabBarLabelPosition` below-icon/beside-icon |
| badge | `tabBarBadge` string/number, `tabBarBadgeStyle` |
| button | `tabBarButton(props)`, `tabBarButtonTestID`, `tabBarAccessibilityLabel` |
| bar | `tabBarStyle`, `tabBarItemStyle`, `tabBarBackground`, `tabBarHideOnKeyboard` 기본 false |
| 위치 | `tabBarPosition`: bottom/top/left/right, 좌우는 sidebar |
| variant | `tabBarVariant`: uikit/material, material은 좌우 sidebar에서 지원 |

absolute tab bar나 BlurView background를 사용하면 화면 content의 bottom padding을 `useBottomTabBarHeight` 등에 맞춰 직접 조정한다. 숨기는 `href: null`은 버튼을 제거하되 route는 유지하므로 접근 제어가 아니다. dynamic tab에는 고정 string 또는 `{ pathname, params }` href를 지정하고 같은 dynamic route를 두 Screen으로 중복 선언하지 않는다.

## Drawer

SDK 56 이후 Drawer는 Router에 번들되며 내부에 react-native-drawer-layout을 사용한다. native animation은 Reanimated와 Worklets, gesture 처리는 Gesture Handler를 필요로 하고 웹은 CSS animation을 사용한다.

```sh
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler
```

```tsx
import { Drawer } from 'expo-router/drawer';
export default function Layout() {
  return <Drawer>
    <Drawer.Screen name="index" options={{ drawerLabel: 'Home', title: 'Overview' }} />
    <Drawer.Screen name="users/[id]" options={{ drawerLabel: 'User', title: 'Profile' }} />
  </Drawer>;
}
```

이전 SDK 54/55에는 `@react-navigation/drawer`도 설치하며 SDK 53 이전 예제에는 Worklets dependency가 없다. 현재 SDK 의존성을 이전 설치 목록과 섞지 않는다. Protected children으로 tab/drawer screen 접근을 제어할 수 있다.

## 출처

- [Expo Documentation, JavaScript tabs](https://docs.expo.dev/router/advanced/tabs)
- [Expo Documentation, Drawer](https://docs.expo.dev/router/advanced/drawer)

## 관련 문서

- [[Expo-Router]]
