---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Toggle, boolean binding"]
---

# Expo SwiftUI Toggle, boolean binding

iOS/tvOS, Expo Go를 지원하는 on/off control이다. isOn boolean과 onIsOnChange(boolean) callback을 연결하고 Host 안에서 사용한다. label 문자열과 systemImage SF Symbol을 지정하거나 children의 첫 Text를 제목, 두 번째 Text를 subtitle로 사용할 수 있다.

```tsx
import { useState } from 'react';
import { Host, Toggle, Text } from '@expo/ui/swift-ui';
import { toggleStyle, tint } from '@expo/ui/swift-ui/modifiers';
export function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  return <Host style={{ width: '100%', height: 60 }}>
    <Toggle isOn={enabled} onIsOnChange={setEnabled}
      modifiers={[toggleStyle('switch'), tint('blue')]}>
      <Text>알림</Text><Text>새로운 내용을 알려 줍니다</Text>
    </Toggle>
  </Host>;
}
```

## Modifier와 layout

toggleStyle은 automatic/switch/button이며 **button 스타일은 tvOS에서 지원하지 않는다**. tint로 색을 조정하고 labelsHidden()은 시각적 label만 숨겨 접근성 설명을 유지한다. Toggle 행은 주어진 폭까지 확장하므로 label 행을 사용할 때 Host에 유한한 폭을 제공한다. 단독 intrinsic control의 matchContents 사용과 전체 폭 행의 사용을 구분한다. CommonViewModifierProps를 상속하며 universal 대응은 Switch다.

## 출처

- [Expo Documentation, Toggle](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/toggle)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
