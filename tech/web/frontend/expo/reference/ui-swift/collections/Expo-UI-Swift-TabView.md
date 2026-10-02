---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI TabView, pager와 선택"]
---

# Expo SwiftUI TabView, pager와 선택

각 페이지는 `TabView.Tab value="ID"`로 선언한다. 페이지 높이를 자체 지정하지 않으므로 frame 또는 부모 viewport가 필요하다. routing을 포함한 full-screen bottom-tab navigation에는 Expo Router `unstable-native-tabs`를 권한다. 이 control은 SwiftUI content 안의 탭/pager다.

## Selection과 label

selection(string)+onSelectionChange(string)는 controlled mode다. defaultSelection은 uncontrolled 초기 탭이며 selection을 지정하면 무시한다. Tab의 value는 필수 ID, label/systemImage는 tab bar/sidebar 항목을 꾸민다. children은 선택한 tab의 content다. TabView parent children은 Tab elements 또는 배열이며 CommonViewModifierProps를 상속한다.

```tsx
import { useState } from 'react';
import { Host, TabView, Text } from '@expo/ui/swift-ui';
import { frame, tabViewStyle } from '@expo/ui/swift-ui/modifiers';
export function Pages() {
  const [selected, setSelected] = useState('first');
  return <Host style={{ width: '100%', height: 320 }}><TabView
    selection={selected} onSelectionChange={setSelected}
    modifiers={[frame({ height: 320 }), tabViewStyle({ type: 'page' })]}>
    <TabView.Tab value="first"><Text>첫 페이지</Text></TabView.Tab>
    <TabView.Tab value="second"><Text>두 번째 페이지</Text></TabView.Tab>
  </TabView></Host>;
}
```

## Style와 indicator

tabViewStyle page는 horizontal swipe pager, automatic은 기본 bottom tab bar, sidebarAdaptable은 iPad sidebar/iPhone tab bar다. page의 indexDisplayMode always/never/automatic과 indexViewStyle backgroundDisplayMode로 dot와 pill 배경을 조정한다. Tab의 badge modifier는 tab bar 항목에 badge를 붙인다. React selection 변화에 animation(Animation.default, value)를 적용하면 전환을 animate할 수 있다.

상단 metadata는 tvOS를 포함하지만 generated component/props 표는 iOS만 명시한다. 이 reference는 현재 구체적 API 표를 기준으로 iOS 사용을 설명하고 tvOS 동작은 확인되지 않은 범위로 남긴다. style의 OS 조건은 [[Expo-UI-Swift-Modifiers-Scrolling]]을 따른다.

## 출처

- [Expo Documentation, TabView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/tabview)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
