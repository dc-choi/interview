---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Group, Spacer와 Overlay"]
---

# Expo SwiftUI Group, Spacer와 Overlay

모두 iOS/tvOS와 Expo Go를 지원하고 CommonViewModifierProps를 상속한다. 설치/import/Host 경계는 [[Expo-UI-Swift-Overview]]를 따른다.

## Group

children ReactNode를 묶지만 새로운 layout 구조를 추가하지 않는다. 여러 view에 공통 foregroundStyle이나 presentationDetents를 적용하거나 조건부 content를 조직한다. 방향과 간격이 필요하면 HStack/VStack을 쓴다.

## Spacer

stack의 남은 공간을 채워 양 끝의 content를 밀어낸다. `minLength?: number`는 최소 간격이며 고정 크기가 아니다. HStack에서는 가로, VStack에서는 세로로 확장한다. Host가 내용 크기만 가진 경우 밀어낼 가용 공간도 작아진다.

## Overlay

기본 content 위 secondary content를 겹친다. 기본 view는 직접 child로, 겹칠 view는 `Overlay.Content` 안에 둔다. alignment 기본 center이고 ZStack과 같은 위치 alignment를 사용한다. badge에 frame/background/clipShape/offset을 적용할 수 있다.

```tsx
import { Host, Overlay, Image, Text } from '@expo/ui/swift-ui';
import { frame, background, clipShape, offset } from '@expo/ui/swift-ui/modifiers';
export function Badge() {
  return <Host matchContents><Overlay alignment="topTrailing">
    <Image systemName="bell.fill" size={28} />
    <Overlay.Content><Text modifiers={[
      frame({ width: 18, height: 18 }), background('red'),
      clipShape('circle'), offset({ x: 8, y: -8 }),
    ]}>3</Text></Overlay.Content>
  </Overlay></Host>;
}
```

Group의 공통 styling, Spacer의 가용 공간 확장, Overlay의 base/secondary 관계는 서로 다른 역할이다.

## 출처

- [Expo Documentation, Group](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/group)
- [Expo Documentation, Spacer](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/spacer)
- [Expo Documentation, Overlay](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/overlay)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
