---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI ColorPicker, hex 색과 opacity"]
---

# Expo SwiftUI ColorPicker, hex 색과 opacity

iOS/Expo Go에서 native 색 선택 화면을 표시한다. selection은 **필수 `string | null`**, 형식은 #RRGGBB 또는 #RRGGBBAA다. onSelectionChange(string)는 선택 색을 반환한다. label은 선택적 문자열, supportsOpacity는 alpha 선택 허용 여부다. null을 별도 미선택 상태로 처리하며 임의 색 형식이 지원된다고 추정하지 않는다.

```tsx
import { useState } from 'react';
import { Host, ColorPicker } from '@expo/ui/swift-ui';
export function ThemeColor() {
  const [color, setColor] = useState('#3366FF80');
  return <Host style={{ width: 300, height: 60 }}><ColorPicker
    label="강조 색" selection={color} onSelectionChange={setColor}
    supportsOpacity />
  </Host>;
}
```

ColorPicker 행은 폭을 채우므로 matchContents만 사용하면 collapse할 수 있다. Host width/flex 또는 Form의 폭을 제공한다. CommonViewModifierProps로 appearance를 조정한다. 원문은 supportsOpacity의 기본값을 명시하지 않으므로 필요한 경우 명시한다.

## 출처

- [Expo Documentation, ColorPicker](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/colorpicker)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
