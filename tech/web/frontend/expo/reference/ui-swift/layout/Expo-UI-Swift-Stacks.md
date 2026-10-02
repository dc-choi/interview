---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI HStack, VStack과 ZStack"]
---

# Expo SwiftUI HStack, VStack과 ZStack

모두 iOS/tvOS, Expo Go를 지원하며 Host 안에서 사용하고 CommonViewModifierProps를 상속한다. children은 ReactNode, spacing은 선택적 숫자다. 가용 공간이 있어야 정렬과 Spacer 확장이 의미가 있으므로 Host 크기를 함께 설계한다.

## HStack

가로로 배치하고 alignment는 세로 정렬이다. top/center/bottom/firstTextBaseline/lastTextBaseline으로 서로 다른 높이나 글자 기준선을 맞춘다. universal 대응은 Row다.

## VStack

세로로 배치하고 alignment는 가로 정렬 leading/center/trailing이다. title/subtitle 행은 leading으로 맞춘다. universal 대응은 Column다.

## ZStack

children을 z축으로 겹친다. alignment는 center/leading/trailing/top/bottom/topLeading/topTrailing/bottomLeading/bottomTrailing이다. 배경 Rectangle 위 Text, icon 위 badge를 만들 수 있다. 별도 spacing prop은 없다.

```tsx
import { Host, HStack, VStack, ZStack, Text, Spacer, Image } from '@expo/ui/swift-ui';
export function SummaryRow() {
  return <Host style={{ width: '100%', height: 80 }}>
    <HStack alignment="center" spacing={12}>
      <ZStack alignment="topTrailing"><Image systemName="bell.fill" size={28} />
        <Text>3</Text></ZStack>
      <VStack alignment="leading" spacing={4}><Text>알림</Text><Text>새 항목</Text></VStack>
      <Spacer minLength={8} /><Text>보기</Text>
    </HStack>
  </Host>;
}
```

SF Symbol/shape의 frame을 명시하면 크기가 다른 child의 정렬 효과를 쉽게 확인한다. RN flexDirection을 SwiftUI stack prop으로 그대로 전달하지 않는다.

## 출처

- [Expo Documentation, HStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/hstack)
- [Expo Documentation, VStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/vstack)
- [Expo Documentation, ZStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/zstack)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
