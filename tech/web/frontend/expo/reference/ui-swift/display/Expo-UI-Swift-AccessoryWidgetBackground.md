---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI AccessoryWidgetBackground"]
---

# Expo SwiftUI AccessoryWidgetBackground

iOS WidgetKit 환경에 맞춘 표준 adaptive background view다. `@expo/ui/swift-ui`에서 import하며 Expo Go의 built-in component에 포함된다. 일반 앱 view에서 쓰는 것과 실제 widget extension을 생성/등록하는 일은 다르다. 이 컴포넌트 자체는 widget lifecycle이나 설치를 제공하지 않는다.

## 배치와 props

별도 고유 prop은 없고 CommonViewModifierProps를 상속한다. widget 환경에 따라 표준 appearance를 선택하므로 고정 색 배경이 필요할 때의 일반 Rectangle과 용도가 다르다. 배경과 content는 ZStack으로 겹친다. RN 앱 안이라면 Host로 경계를 만든다.

```tsx
import { Host, ZStack, AccessoryWidgetBackground, Text } from '@expo/ui/swift-ui';
export function AccessoryPreview() {
  return <Host matchContents><ZStack>
    <AccessoryWidgetBackground /><Text>MON</Text>
  </ZStack></Host>;
}
```

원문은 iOS만 지원한다. 다른 component의 tvOS 지원을 이 view에도 적용하지 않는다.

## 출처

- [Expo Documentation, AccessoryWidgetBackground](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/accessorywidgetbackground)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
