---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Image, SF Symbols와 local UIImage"]
---

# Expo SwiftUI Image, SF Symbols와 local UIImage

iOS/tvOS와 Expo Go에서 SF Symbol을 표시한다. systemName은 SF Symbols 7.0 TypeScript 이름, assetName은 앱 asset catalog에 symbol set으로 넣은 custom symbol 이름이다. color는 ColorValue, onPress는 인자 없는 callback이다. CommonViewModifierProps를 상속한다.

## 크기와 source 비용

size는 points 단위 고정 크기이며 Dynamic Type에 비례하지 않는다. font modifier를 함께 지정하면 size를 무시하고 font를 사용하므로 접근성 크기 확장에는 `font({ textStyle: ... })`를 사용한다. uiImage는 **로컬 파일 URI**를 동기로 읽어 main thread를 막는다. 네트워크 URL용 비동기 image loader가 아니며 큰 파일/빈번한 변경의 비용을 고려한다.

variableValue 0..1은 해당 기능을 가진 SF Symbols 4.0+에서만 효과가 있고 iOS/tvOS 16+가 필요하다. 단순 opacity나 progress가 아니라 symbol 자체의 지원 범위를 따른다.

```tsx
import { Host, Image } from '@expo/ui/swift-ui';
import { font } from '@expo/ui/swift-ui/modifiers';
export function ScalableIcon() {
  return <Host matchContents><Image systemName="bell.fill" color="orange"
    modifiers={[font({ textStyle: 'title' })]} /></Host>;
}
```

## Symbol animation

symbolEffect는 기본적으로 계속 실행하거나 value ObservableState 변화마다 한 번 실행, isActive boolean ObservableState가 true일 때 연속 실행할 수 있다. 일반 effects는 iOS 17+, breathe 같은 새 효과는 해당 OS 조건을 modifier reference에서 확인한다. 상태 변화는 worklet/scheduleOnUI에서 수행하는 예제가 있다.

원문 Image 예제는 아직 별도 component 목록에 없는 SyncToggle을 사용한다. 이 문서는 이를 필수 공개 API로 전제하지 않고 기존 Toggle과 native state write를 직접 연결한다. 효과 옵션과 버전은 [[Expo-UI-Swift-Modifiers-Animation]]을 따른다.

## 출처

- [Expo Documentation, Image](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/image)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
