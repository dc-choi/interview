---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Picker, tag와 selection"]
---

# Expo SwiftUI Picker, tag와 selection

iOS/tvOS와 Expo Go의 native 선택 control이다. selection<T>는 선택 child의 tag 값이고 onSelectionChange(T)는 index나 label이 아닌 **tag의 값**을 받는다. children에 Text와 tag modifier를 적용한다. label은 문자열 또는 ReactNode, systemImage는 SF Symbol이다.

```tsx
import { useState } from 'react';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
export function SortChoice() {
  const [selected, setSelected] = useState('recent');
  return <Host style={{ width: 300, height: 80 }}><Picker label="정렬"
    selection={selected} onSelectionChange={setSelected}
    modifiers={[pickerStyle('segmented')]}>
    <Text modifiers={[tag('recent')]}>최신</Text>
    <Text modifiers={[tag('name')]}>이름</Text>
  </Picker></Host>;
}
```

## 스타일과 크기

pickerStyle로 menu/segmented/wheel 등 native appearance를 선택한다. **wheel은 Apple TV에서 지원하지 않는다**. segmented/wheel은 가용 폭을 채우므로 matchContents만 사용하면 collapse할 수 있다. Host의 폭을 명시한다. tag의 타입은 선택값과 일관되게 정하고 label 표시용 텍스트를 ID처럼 사용하면 번역/수정으로 선택 계약이 변할 수 있다. CommonViewModifierProps를 상속한다.

## 출처

- [Expo Documentation, Picker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/picker)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
