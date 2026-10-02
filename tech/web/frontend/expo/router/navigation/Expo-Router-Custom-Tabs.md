---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router headless 탭 API"]
---

# Expo Router headless 탭 API

`expo-router/ui`는 실험적 headless tab component와 hook을 제공한다. Android, iOS, tvOS와 웹에서 사용하며 Expo Go에 포함된다. 기본 navigator styling을 직접 구성해야 한다.

## 구성 요소

```tsx
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
<Tabs>
  <TabSlot />
  <TabList>
    <TabTrigger name="home" href="/">Home</TabTrigger>
    <TabTrigger name="profile" href="/users/123">Profile</TabTrigger>
  </TabList>
</Tabs>;
```

Tabs는 root View, TabList는 정의 목록 View, TabSlot은 현재 tab의 content, TabTrigger는 Pressable이다. TabList는 Tabs의 직접 자식이어야 한다. 목록 안 trigger는 필수 name/href로 route를 등록하며 name은 사용자 정의 문자열이다. 목록 밖 trigger는 같은 name으로 기존 tab을 바꾸고 href를 다시 정의하지 않는다. 모든 trigger는 Tabs 아래에 있어야 한다.

동적 route에 실제 parameter를 주면 임의 개수의 profile tab을 만들 수 있다. shared route URL이 모호하면 `/(one)/route`처럼 group을 포함해야 한다. nested route href는 내부 Stack을 선택하고 그 Stack이 history를 제어한다. TabTrigger 자체를 렌더링하지 않으면 tab과 history가 제거된다. 버튼만 숨겨 유지하려면 TabList를 display:none으로 두고 다른 위치의 trigger를 사용한다.

## props와 styling

Tabs, TabList와 TabTrigger의 `asChild`는 wrapper를 제거하고 바로 아래 component에 props를 전달한다. custom button은 ref와 press props를 받고 `isFocused`에 따라 styling해야 한다. React 19에서는 ref prop을 받을 수 있고 이전 React 18에는 forwardRef가 필요하다.

SDK 57 reference의 TabTrigger는 `resetOnFocus?: boolean`을 제공한다. 현재 guide의 `reset="always" | "onLongPress" | "never"` 예제와 이름이 다르므로 SDK 57에서는 reference의 계약을 기준으로 하고 새 버전 guide 예제를 그대로 복제하지 않는다.

TabSlot의 `detachInactiveScreens`는 inactive native screen 분리를 제어한다. `renderFn`은 screen을 그리는 방법을 교체하고 `index`, `isFocused`, `loaded`, `detachInactiveScreens` 정보를 받아 animation 또는 mount 정책을 정한다. `Tabs.options`의 `lazy`, `freezeOnBlur`, `unmountOnBlur`, `detachInactiveScreens`는 로딩과 inactive 처리의 다른 단계다.

## hook 계약

| hook | 입력과 반환 |
| --- | --- |
| `useTabSlot(props?)` | TabSlotProps, 현재 tab ReactElement |
| `useTabsWithChildren(options)` | children과 UseTabsOptions, state/descriptors/navigation/NavigationContent/describe |
| `useTabsWithTriggers(options)` | explicit `triggers: ScreenTrigger[]`, 같은 navigator 결과 |
| `useTabTrigger(options)` | TabTriggerProps, trigger/triggerProps/getTrigger/switchTab |

`NavigationContent`를 반드시 렌더링한다. children hook은 라이브러리의 TabList/TabTrigger를 요구하므로 완전 custom 정의라면 triggers hook을 선택한다. reference의 triggers 예제는 함수 이름이 children hook으로 잘못 적혀 있어 설명에 대응하는 `useTabsWithTriggers`를 기준으로 읽는다.

`getTrigger(name)`는 없으면 undefined, trigger는 isFocused/resolvedHref/route를 제공한다. `switchTab(name, { resetOnFocus })`는 전환과 reset을 제어한다. `UseTabsOptions.backBehavior`는 tab back 정책을 전달한다. tabPress는 preventDefault가 가능하고 tabLongPress는 별도 event다. TabTrigger 상대 href는 현재 화면이 아니라 Tabs를 렌더링한 local layout 경로 기준이므로 absolute href를 권장한다.

## 출처

- [Expo Documentation, Custom tab layouts](https://docs.expo.dev/router/advanced/custom-tabs)
- [Expo Documentation, Router UI](https://docs.expo.dev/versions/latest/sdk/router/ui)

## 관련 문서

- [[Expo-Router]]
