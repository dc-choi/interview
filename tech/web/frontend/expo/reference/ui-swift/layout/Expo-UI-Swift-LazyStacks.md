---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI LazyHStack과 LazyVStack"]
---

# Expo SwiftUI LazyHStack과 LazyVStack

## LazyHStack

가로 lazy stack은 `ScrollView axes="horizontal"` 안에서 쓴다. children ReactNode, 숫자 spacing, vertical alignment top/center/bottom/firstTextBaseline/lastTextBaseline을 받는다.

## LazyVStack

세로 lazy stack은 세로 ScrollView 안에서 쓴다. alignment는 horizontal leading/center/trailing, spacing은 숫자다. 두 컴포넌트 모두 iOS/tvOS와 Expo Go, CommonViewModifierProps를 지원한다.

## 현재 lazy의 범위

native는 화면에 필요한 항목만 생성하지만 **React는 모든 child를 처음부터 생성한다**. 따라서 완전한 JS virtualization이 아니며 많은 child의 초기 mount는 느릴 수 있다. 공식 문서는 큰 목록에 FlashList 또는 Legend List를 권한다. 목록 길이와 실제 성능을 보고 선택하고 native lazy만으로 대규모 목록 비용이 해결됐다고 가정하지 않는다.

```tsx
import { Host, ScrollView, LazyVStack, Text } from '@expo/ui/swift-ui';
export function Items() {
  return <Host style={{ width: '100%', height: 300 }}><ScrollView>
    <LazyVStack spacing={12} alignment="leading">
      {Array.from({ length: 50 }, (_, i) => <Text key={i}>항목 {i}</Text>)}
    </LazyVStack>
  </ScrollView></Host>;
}
```

scroll axis에 Host matchContents를 지정하지 않는다. 원문 일부 alignment 예제는 이를 사용하지만 Host 문서의 fixedSize/scrolling 제한과 충돌한다. 위 예제는 유한한 viewport를 사용한다.

## 출처

- [Expo Documentation, LazyHStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/lazyhstack)
- [Expo Documentation, LazyVStack](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/lazyvstack)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
