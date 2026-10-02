---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Divider, separator layout"]
---

# Expo SwiftUI Divider, separator layout

iOS/tvOS와 Expo Go에서 native 시각 separator를 렌더링한다. 고유 prop 없이 CommonViewModifierProps를 상속한다. `@expo/ui/swift-ui`에서 import하고 Host 안의 VStack/메뉴에 놓는다.

```tsx
import { Host, VStack, Text, Divider } from '@expo/ui/swift-ui';
export function SeparatedContent() {
  return <Host style={{ width: 300, height: 120 }}><VStack spacing={8}>
    <Text>제목</Text><Divider /><Text>본문</Text>
  </VStack></Host>;
}
```

Divider는 제공된 폭을 채우므로 matchContents만 사용하면 collapse할 수 있다. list 같은 container의 기존 row separator와 별도 content Divider를 구분한다. ContextMenu.Items의 edit/duplicate와 destructive action 사이에도 Divider를 넣어 작업 묶음을 분리한다. separator 자체에는 action이나 selection 상태가 없다.

## 출처

- [Expo Documentation, Divider](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/divider)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
