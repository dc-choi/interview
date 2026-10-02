---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI RNHostView, Yoga layout 연결"]
---

# Expo SwiftUI RNHostView, Yoga layout 연결

iOS/tvOS에서 SwiftUI HStack/BottomSheet/Popover 안의 React Native view를 layout하는 경계다. SwiftUI에서 측정한 공간을 RN shadow node에 전달한다. `import { RNHostView } from '@expo/ui/swift-ui'`로 가져오고 SwiftUI Host tree 안에서 쓴다.

## 단일 child와 측정

children 타입은 ReactElement다. **첫 child만 측정하고 배치하므로 여러 RN view를 하나의 View로 감싼다**. `matchContents` 기본 false, mount 때 한 번만 설정한다. true이면 RN child 고유 크기가 SwiftUI 부모 크기를 결정한다. false이면 SwiftUI 부모 크기를 RN shadow node에 반영하여 `flex: 1` content가 공간을 채운다.

```tsx
import { Host, RNHostView, VStack, Text } from '@expo/ui/swift-ui';
import { View, Text as RNText } from 'react-native';
export function MixedContent() {
  return <Host matchContents><VStack spacing={12}>
    <Text>SwiftUI 제목</Text>
    <RNHostView matchContents>
      <View style={{ padding: 16 }}><RNText>React Native 내용</RNText></View>
    </RNHostView>
  </VStack></Host>;
}
```

BottomSheet의 intrinsic content에는 matchContents와 padding View를 조합한다. medium/large detent의 공간을 모두 쓰려면 Group에 presentationDetents를 설정하고 RNHostView의 matchContents를 생략한 뒤 child View를 flex:1로 만든다. Popover.Content 안에서도 RNHostView matchContents로 입력/버튼 content의 크기를 전달할 수 있다. 이 컴포넌트는 임의 view state를 SwiftUI binding으로 변환하지 않고 layout을 연결한다.

## 출처

- [Expo Documentation, RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
