---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI, 설치와 UI 구성 원리"]
---

# Expo SwiftUI, 설치와 UI 구성 원리

`@expo/ui/swift-ui`는 React Native에서 SwiftUI native interface를 구성하는 SDK 57 패키지다. iOS/tvOS를 지원하며 built-in 컴포넌트는 Expo Go에 포함된다. Android는 SwiftUI 경로를 쓰지 않고 universal API 또는 별도 Compose API를 선택한다. `npx expo install @expo/ui`로 SDK 호환 버전을 설치한다. 기존 React Native 프로젝트에는 Expo Modules 설치가 선행한다.

## React Native와 SwiftUI 경계

컴포넌트는 `@expo/ui/swift-ui`, modifier는 `@expo/ui/swift-ui/modifiers`에서 import한다. React Native UIKit view 안에 SwiftUI를 표시하려면 [[Expo-UI-Swift-Host]]가 필요하다. 내부는 UIHostingController로 렌더링하며 Host 자체의 크기는 React Native style 또는 matchContents로 정한다. 반대로 SwiftUI 내부에서 React Native view를 배치하려면 [[Expo-UI-Swift-RNHostView]]로 Yoga와 크기를 연결한다.

```tsx
import { Host, Text, VStack, Button } from '@expo/ui/swift-ui';
import { font, padding, buttonStyle } from '@expo/ui/swift-ui/modifiers';

export function SavePanel() {
  return <Host matchContents>
    <VStack spacing={8} modifiers={[padding({ all: 16 })]}>
      <Text modifiers={[font({ size: 20, weight: 'bold' })]}>저장 확인</Text>
      <Button label="저장" onPress={save} modifiers={[buttonStyle('bordered')]} />
    </VStack>
  </Host>;
}
```

## 화면 구성 패턴

Settings 화면은 Form/Section으로 항목을 묶고 HStack으로 icon, title, Spacer, Toggle/chevron을 배치한다. SwiftUI 버튼의 기본 파란 스타일이 필요 없으면 `buttonStyle('plain')`을 쓴다. Expo Router Link의 asChild로 Button을 연결할 때 내부 Text에 명시적 색상을 지정한다. primary/secondary hierarchical foreground style은 light/dark 환경에 맞춰 변한다.

제목과 설명을 함께 보여 주는 행은 `VStack alignment="leading" spacing={4}`로 만들고 설명에 secondary 색과 작은 font를 적용한다. slider 양쪽에 sun.min.fill/sun.max.fill 같은 SF Symbols를 놓을 수 있다. 상태는 [[Expo-UI-Swift-NativeState]] 또는 React state로 관리하고 컴포넌트별 binding 계약을 따른다.

## Modifier와 버전 조건

`modifiers` 배열은 SwiftUI view의 layout, styling, interaction, accessibility를 구성한다. 효과 순서가 결과에 영향을 주므로 frame/padding/background/clip 순서를 의도적으로 정한다. 전체 API는 [[Expo-UI-Swift-Modifiers]]에서 기능별로 연결한다. Liquid Glass `glassEffect`는 **Xcode 26+와 iOS 26+**가 필요하며 일반 SwiftUI package 지원과 구분한다. React Native background 위에 Host를 absolute fill로 놓고 Text에 padding과 glassEffect를 적용하는 방식으로 두 UI 체계를 조합할 수 있다.

별도 native view/modifier를 추가하는 경로는 [[Expo-UI-Swift-Extending]]이며 Expo Go가 아닌 development build와 native 재빌드가 필요하다.

## 출처

- [Expo Documentation, SwiftUI](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
