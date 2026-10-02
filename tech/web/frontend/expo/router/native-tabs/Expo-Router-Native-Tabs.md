---
tags: [expo, expo-router, native-tabs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 네이티브 탭"]
---

# Expo Router 네이티브 탭

SDK 57에서는 `expo-router/unstable-native-tabs`를 사용한다. 현재 guide의 `expo-router/native-tabs`는 SDK 58 이후 안정 entry이며 SDK 57 import를 바꾸는 지시가 아니다. NativeTabs는 platform native tab bar를 쓰고 JS/custom tabs보다 시스템 표현에 제약이 있다. SDK 57 reference에는 Android/iOS/tvOS/web, Expo Go가 표시되지만 OS 고유 기능은 해당 platform에서만 동작한다.

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
export default function Layout() {
  return <NativeTabs>
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="settings">
      <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
  </NativeTabs>;
}
```

Stack과 달리 Trigger를 명시해야 tab으로 추가된다. layout Trigger의 name은 필수이며 tab screen 안의 Trigger는 자기 옵션을 갱신하고 name을 무시한다. JS Tabs의 mock header는 없으므로 header와 detail history에는 tab 내부 Stack이 필요하다.

## navigation과 lifecycle

NativeTabs.hidden은 bar만 숨긴다. Trigger.hidden은 tab 자체를 탐색할 수 없게 제외한다. Trigger.disabled는 native tap만 막으며 router.push와 Link는 그대로 해당 tab에 갈 수 있어 authorization이 아니다. 런타임 tab 추가/삭제/숨김 변경은 navigator remount와 state reset을 일으킨다. 안정적인 tab 구성을 먼저 정한다.

활성 tab 재선택은 Stack을 root까지 pop하고 root에서는 scroll-to-top한다. 각각 disablePopToTop/disableScrollToTop으로 끈다. 모든 tab이 navigator mount 때 eager render되어 lazy prop으로 바꾸지 못한다. focus일 때만 content를 렌더링하면 매번 unmount되어 state를 잃고 첫 focus flag를 유지하면 처음만 지연할 수 있다.

Android는 최대 다섯 tab, native tabs 내부 native tabs 중첩은 지원하지 않는다. tab bar 위치는 iPad/다른 device에 따라 바뀌어 높이를 측정하는 API를 기대하지 않는다. FlatList는 scroll-to-top/minimize와 edge 감지에 제한이 있어 transparent 방지 설정을 검토한다.

## safe area와 keyboard

Android는 bottom inset만 자동 SafeAreaView로 적용하며 top/left/right는 직접 처리한다. iOS는 첫 ScrollView의 content inset을 자동 조정한다. Trigger.disableAutomaticContentInsets면 모두 직접 처리한다. ScrollView가 첫 자식이어야 native edge/scroll-to-top 감지가 정확해지며 wrapper가 필요하면 collapsable=false를 사용한다.

Android `tabBarRespectsIMEInsets`는 기본 false다. Android 11 이상, softwareKeyboardLayoutMode=resize에서 keyboard 위로 bar를 올린다. keyboard가 열린 상태에서 바꾸면 닫힌 뒤 적용된다.

## 웹과 migration

웹에는 단순 fallback이 있지만 native system bar와 같은 기능을 보장하지 않는다. `_layout.web.tsx` 또는 AppTabs.web.tsx로 headless tabs를 제공하면 provider와 route URL을 공유하며 웹 UI를 별도로 구성할 수 있다.

SDK 54의 별도 Icon/Label/Badge imports는 SDK 55부터 NativeTabs.Trigger compound component로 바뀐다. JS Screen을 Trigger로 바꾸고 props options 중심 표현을 component 표현으로 옮긴다. native tab을 JS tab의 drop-in 대체로 보지 않는다.

## 출처

- [Expo Documentation, Native tabs](https://docs.expo.dev/router/advanced/native-tabs)
- [Expo Documentation, Router Native tabs](https://docs.expo.dev/versions/latest/sdk/router/native-tabs)

## 관련 문서

- [[Expo-Router-Native-Tabs-Options]]
- [[Expo-Router-Custom-Tabs]]
