---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Slider, 범위와 drag 제한"]
---

# Expo SwiftUI Slider, 범위와 drag 제한

iOS와 Expo Go를 지원하며 tvOS 지원으로 확장하지 않는다. value와 onValueChange(number)는 thumb를 움직일 때 값을 연결한다. min/max는 표시 범위, step은 증분이며 0은 연속 값이다. onEditingChanged(boolean)은 시작/종료를 알려 최종 저장 시점을 구분한다.

## 표시 범위와 사용자 이동 범위

lowerLimit/upperLimit는 thumb의 drag 범위를 좁히지만 보이는 track은 min..max를 유지한다. min/max를 변경해 현재 value가 범위 밖에 있게 되어도 callback이 자동으로 발생하지 않는다. 앱이 새 범위에 맞춰 값을 직접 조정해야 한다. label, minimumValueLabel, maximumValueLabel은 ReactNode로 목적과 양 끝을 설명한다.

```tsx
import { useState } from 'react';
import { Host, Slider, Text } from '@expo/ui/swift-ui';
export function Level() {
  const [value, setValue] = useState(50);
  return <Host style={{ width: 300, height: 70 }}><Slider
    min={0} max={100} lowerLimit={10} upperLimit={90} step={5}
    value={value} onValueChange={setValue}
    onEditingChanged={editing => { if (!editing) saveLevel(value); }}
    label={<Text>수준</Text>} minimumValueLabel={<Text>0</Text>}
    maximumValueLabel={<Text>100</Text>} />
  </Host>;
}
```

Slider에는 고유 폭이 없으므로 Host matchContents만 쓰면 폭이 거의 없어질 수 있다. Host width/flex, Form의 제약 또는 Slider frame width를 제공한다. CommonViewModifierProps를 상속하며 양쪽 icon을 넣으려면 HStack을 사용한다. universal Slider도 별도 제공된다.

## 출처

- [Expo Documentation, Slider](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/slider)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
