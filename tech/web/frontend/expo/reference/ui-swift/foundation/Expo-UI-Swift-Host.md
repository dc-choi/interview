---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Host, 크기와 safe area"]
---

# Expo SwiftUI Host, 크기와 safe area

Host는 SwiftUI child를 UIKit 안에 표시하는 React Native View 경계다. iOS/tvOS와 Expo Go를 지원하고 `import { Host } from '@expo/ui/swift-ui'`로 사용한다. 일반 RN style은 Host에, SwiftUI modifier는 그 안의 view 또는 Host의 inherited CommonViewModifierProps에 적용한다.

## 크기 결정

`style={{ flex: 1 }}` 또는 width/height로 유한한 공간을 제공한다. `matchContents` 기본 false이며 true 또는 `{ horizontal, vertical }`로 child의 intrinsic size를 RN tree에 반영한다. **mount 때 한 번만 설정할 수 있다**. Text/Button/Toggle처럼 고유 크기가 있거나 frame이 지정된 view에 적절하다. Slider/linear ProgressView는 고유 폭이 없어 matchContents만 쓰면 거의 0 폭이 될 수 있다. 해당 view에 frame width를 주거나 Host width/flex를 정한다.

scroll axis에 matchContents를 켜면 SwiftUI fixedSize가 전체 content 크기를 제안하고 viewport 밖 내용이 사라져 scrolling이 동작하지 않는다. 가로 ScrollView에는 vertical만 맞추고 가로 폭은 유한하게 제공한다. Lazy stack 페이지의 일부 예제가 scroll axis의 matchContents를 사용하지만 Host의 명시적 주의사항을 우선한다.

```tsx
import { Host, HStack, ScrollView, Text } from '@expo/ui/swift-ui';
export function HorizontalItems() {
  return <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
    <ScrollView axes="horizontal"><HStack spacing={12}>
      {Array.from({ length: 20 }, (_, i) => <Text key={i}>항목 {i}</Text>)}
    </HStack></ScrollView>
  </Host>;
}
```

`useViewportSizeMeasurement` 기본 false이며 명시적 크기가 없을 때 viewport 크기를 SwiftUI layout의 proposed size로 쓴다. Form처럼 가용 공간을 채우는 view에 유용하다. `onLayoutContent`는 `{ nativeEvent: { width, height } }`를 전달하며 내용이 바뀌어 다시 layout될 수 있다.

## 환경 props

colorScheme은 light/dark, layoutDirection은 leftToRight/rightToLeft이고 생략하면 I18nManager의 locale 방향을 따른다. seedColor(ColorValue)는 SwiftUI 환경의 tint로 전파되어 버튼, switch, slider 등을 꾸민다. pointerEvents는 auto/box-none/none/box-only다.

ignoreSafeArea는 container(상태와 navigation bar, notch, home indicator만 무시하고 keyboard 유지), keyboard(keyboard만 무시), all(둘 다 무시)이다. RN keyboard avoidance가 이미 inset을 처리하면 keyboard로 이중 적용을 막는다. container를 무시하고 RN safe-area hook의 padding을 직접 반영할 수 있다. full-screen overlay/background에는 all을 사용할 수 있다.

Host 아래에 React Native View/ScrollView를 넣으면 RN rendering 경계로 돌아간다. 그 view 안의 SwiftUI child는 상위에 Host가 있더라도 **새 Host로 감싸야 한다**. 역방향 삽입은 [[Expo-UI-Swift-RNHostView]]를 사용한다.

## 출처

- [Expo Documentation, Host](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/host)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
