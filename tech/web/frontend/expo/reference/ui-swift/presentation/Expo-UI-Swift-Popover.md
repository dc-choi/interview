---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Popover, anchor와 floating content"]
---

# Expo SwiftUI Popover, anchor와 floating content

iOS/Expo Go에서 trigger에 연결된 floating overlay를 표시한다. children에 Popover.Trigger(항상 보이는 control)와 Popover.Content(표시 내용)를 둔다. isPresented와 onIsPresentedChange(boolean)로 native 변화와 앱 state를 동기화한다. CommonViewModifierProps를 상속한다.

attachmentAnchor는 center/top/bottom/leading/trailing으로 trigger의 부착 위치를 정한다. arrowEdge 기본 none은 **화살표를 없애는 뜻이 아니라 시스템이 어떤 edge든 선택하도록 허용**하는 값이다. top/bottom/leading/trailing을 지정하면 edge를 요청한다.

```tsx
import { useState } from 'react';
import { Host, Popover, Button, Text, VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';
export function HelpPopover() {
  const [open, setOpen] = useState(false);
  return <Host matchContents><Popover isPresented={open}
    onIsPresentedChange={setOpen} attachmentAnchor="bottom" arrowEdge="top">
    <Popover.Trigger><Button label="도움말" onPress={() => setOpen(true)} /></Popover.Trigger>
    <Popover.Content><VStack modifiers={[padding({ all: 16 })]}>
      <Text>사용 안내</Text><Button label="닫기" onPress={() => setOpen(false)} />
    </VStack></Popover.Content>
  </Popover></Host>;
}
```

React Native Pressable/Text/View를 표시하려면 Content 안에 RNHostView matchContents를 두고 하나의 RN parent View로 묶는다. 작은 overlay와 full sheet가 필요한 화면을 구분한다. 현재 페이지가 모든 기기에서 동일한 floating 형태를 보장하지는 않는다. SDK 57 modifier API에 기재되지 않은 compact adaptation helper를 임의로 추가하지 않는다.

## 출처

- [Expo Documentation, Popover](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/popover)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
