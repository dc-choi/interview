---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Button, label과 semantic role"]
---

# Expo SwiftUI Button, label과 semantic role

iOS/tvOS와 Expo Go의 native Button이다. `@expo/ui/swift-ui`에서 import하고 Host 안에서 사용한다. CommonViewModifierProps를 상속하며 다른 플랫폼에는 universal Button 경로가 있다.

## Content와 이벤트

단순 텍스트는 `label: string`, icon은 label과 함께 `systemImage: SF Symbol`로 지정한다. systemImage는 label이 있을 때만 사용한다. children은 custom label용 ReactElement 또는 배열이며 **plain string child를 지원하지 않는다**. Text/HStack/VStack 등 nested view를 넣는다. `onPress?: () => void`는 누를 때 호출한다. `role`은 default/cancel/destructive로 작업의 의미를 전달한다. target은 widget/live activity에서 누른 버튼을 구분하는 문자열이다.

```tsx
import { Host, Button } from '@expo/ui/swift-ui';
import { labelStyle, buttonStyle, controlSize, tint } from '@expo/ui/swift-ui/modifiers';
export function DeleteButton() {
  return <Host matchContents><Button label="삭제" systemImage="trash"
    role="destructive" onPress={confirmDelete} modifiers={[
      labelStyle('iconOnly'), buttonStyle('bordered'),
      controlSize('regular'), tint('red'),
    ]} /></Host>;
}
```

## 스타일과 조건

buttonStyle은 bordered/borderedProminent/borderless/plain/glass/glassProminent다. glass 계열은 **iOS 26+ 및 Xcode 26 build**가 필요하다. buttonBorderShape는 automatic/capsule/roundedRectangle/circle, circle은 iOS 17+다. controlSize는 mini/small/regular/large/extraLarge이고 extraLarge는 iOS 17+다.

`tint(color)`는 색, `disabled(true)` 또는 인자 없는 disabled()는 상호작용을 막는다. `labelStyle('iconOnly')`는 label을 접근성 정보로 유지하면서 icon만 표시한다. custom child를 사용하면 label 문자열 대신 해당 view의 구조와 accessibility를 설계한다. onPress에 비동기 저장을 연결할 때 진행/실패 상태는 앱에서 관리한다.

## 출처

- [Expo Documentation, Button](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/button)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
