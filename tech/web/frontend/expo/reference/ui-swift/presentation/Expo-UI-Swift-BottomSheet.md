---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI BottomSheet, detent와 content 수명"]
---

# Expo SwiftUI BottomSheet, detent와 content 수명

iOS/tvOS와 Expo Go에서 SwiftUI sheet를 표시한다. isPresented(boolean)와 onIsPresentedChange(boolean)는 필수다. anchor는 optional ReactNode로 제자리에서 계속 mount되어 sheet를 열어도 주변 layout이 이동하지 않는다. children은 **표시 중 mount, 완전히 dismiss한 뒤 unmount**된다. onDismiss는 완전히 사라진 뒤 호출한다. 입력 state를 보존하려면 sheet 바깥에서 관리한다.

## Content 크기와 배경

fitToContents 기본 false, true이면 child 높이에 맞는 detent를 설정한다. 명시적 여러 높이는 child Group의 presentationDetents를 사용한다. medium(대략 절반)/large(전체), fraction0..1, height points가 가능하다. selection/onSelectionChange options로 현재 detent를 제어하고 사용자의 drag를 추적한다.

sheet 기본은 system translucent material이며 iOS 26에서는 Liquid Glass다. **presentationBackground(color)**는 sheet surface 자체를 단색으로 만들어 detent 이동에도 일관된다. content background만 지정하면 Form/List가 덮고 높이 변화 때 다르게 보일 수 있다. Form/List에는 scrollContentBackground('hidden')도 적용한다.

```tsx
import { useState } from 'react';
import { Host, BottomSheet, Button, Group, Text } from '@expo/ui/swift-ui';
import { presentationDetents, presentationBackground,
  presentationDragIndicator } from '@expo/ui/swift-ui/modifiers';
export function DetailsSheet() {
  const [open, setOpen] = useState(false);
  return <Host matchContents><BottomSheet isPresented={open}
    onIsPresentedChange={setOpen} anchor={<Button label="상세" onPress={() => setOpen(true)} />}>
    <Group modifiers={[presentationDetents(['medium', 'large']),
      presentationBackground('#FFFFFF'), presentationDragIndicator('visible')]}>
      <Text>상세 내용</Text><Button label="닫기" onPress={() => setOpen(false)} />
    </Group>
  </BottomSheet></Host>;
}
```

## Interaction과 React Native content

presentationBackgroundInteraction은 sheet 뒤의 interaction을 disabled/enabled 또는 enabledUpThrough 특정 detent까지 허용한다. interactiveDismissDisabled()는 swipe dismiss를 막지만 앱의 false state write까지 막는 것은 아니다. 명시적인 닫기 control을 제공한다.

RN anchor/content는 RNHostView로 감싼다. intrinsic content는 RNHostView matchContents와 sheet fitToContents, flex:1 content는 matchContents를 생략하고 detent 공간을 쓴다. FlatList/FlashList 등 scrollable RN content도 finite detent 안에서 사용할 수 있다. 이 때 첫 RN child만 측정하므로 여러 view를 하나의 View로 감싼다. CommonViewModifierProps를 상속하며 presentation modifier의 OS 조건은 [[Expo-UI-Swift-Modifiers-Presentation]]을 확인한다.

## 출처

- [Expo Documentation, BottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/bottomsheet)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
