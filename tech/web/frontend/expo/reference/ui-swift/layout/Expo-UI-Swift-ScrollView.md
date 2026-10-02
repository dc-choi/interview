---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI ScrollView, position과 geometry"]
---

# Expo SwiftUI ScrollView, position과 geometry

ScrollView는 iOS/tvOS와 Expo Go의 SwiftUI scrolling container다. `axes` 기본 vertical, horizontal/both로 변경할 수 있다. `showsIndicators` 기본 true이고 축별/never 같은 세부 설정은 scrollIndicators modifier를 쓴다. CommonViewModifierProps를 상속한다.

## Target 기반 위치

iOS 17+에서 child에 `id`, content container에 `scrollTargetLayout()`, ScrollView에 `scrollPosition(nativeState, { onChange })`를 적용한다. 구버전은 no-op이다. leading target 변경 callback은 JS thread에서 실행된다. ObservableState<string|null>의 ID를 쓰면 즉시 이동하고 withAnimation으로 감싸면 animated 이동이다.

```tsx
import { Host, ScrollView, VStack, Text, Button, useNativeState } from '@expo/ui/swift-ui';
import { id, scrollPosition, scrollTargetLayout } from '@expo/ui/swift-ui/modifiers';
import { scheduleOnUI } from 'react-native-worklets';
export function JumpList() {
  const selected = useNativeState<string | null>(null);
  return <Host style={{ width: '100%', height: 300 }}><VStack>
    <ScrollView modifiers={[scrollPosition(selected)]}>
      <VStack modifiers={[scrollTargetLayout()]}>
        {Array.from({ length: 30 }, (_, i) => <Text key={i}
          modifiers={[id(`item-${i}`)]}>항목 {i}</Text>)}
      </VStack>
    </ScrollView>
    <Button label="10번으로" onPress={() => scheduleOnUI(() => {
      'worklet'; selected.value = 'item-10';
    })} />
  </VStack></Host>;
}
```

scroll binding의 state write는 UI runtime에서 수행한다. 원문은 JS runtime write가 UIKit background-thread 호출로 Main Thread Checker를 발생시킬 수 있다고 경고한다. 일반 ObservableState의 JS 비동기 write 지원을 scroll binding의 안전성으로 확장하지 않는다. scroll axis에 matchContents를 지정하지 않고 유한한 viewport를 준다.

## Geometry와 phase

iOS 18+ `useScrollGeometryChange`/`onScrollPhaseChange` modifier가 ScrollGeometry를 제공한다. containerWidth/Height, contentWidth/Height, contentOffsetX/Y는 points다. ScrollPhase는 idle/tracking/interacting/animating/decelerating이며 단순 drag 중 여부와 감속/프로그램 이동을 구분할 수 있다. 세부 modifier 계약은 [[Expo-UI-Swift-Modifiers-Scrolling]]에서 다룬다.

## 출처

- [Expo Documentation, ScrollView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/scrollview)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
