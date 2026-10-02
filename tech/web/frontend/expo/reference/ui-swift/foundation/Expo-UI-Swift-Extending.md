---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI custom view와 modifier 확장"]
---

# Expo SwiftUI custom view와 modifier 확장

iOS/tvOS custom native module은 Expo Go에서 load할 수 없다. @expo/ui 설치, Expo Modules API/SwiftUI 지식, 자체 development build가 전제다. local module 생성 예시는 `npx create-expo-module@latest --local my-ui`이며 이번 reference 작성에서 명령을 실행한 것은 아니다. module podspec에 `s.dependency 'ExpoUI'`를 추가한다.

## View 등록 계약

Props class는 ExpoUI의 `UIBaseViewProps`를 상속하여 modifiers를 지원한다. struct는 `ExpoSwiftUI.View`를 준수하고 @ObservedObject props와 body를 제공한다. `Children()`은 React children을 렌더링한다. module definition의 `ExpoUIView(CustomView.self)`는 modifier 지원 wrapper를 등록한다.

```swift
import SwiftUI
import ExpoModulesCore
import ExpoUI
final class BadgeViewProps: UIBaseViewProps {
  @Field var title: String = ""
}
struct BadgeView: ExpoSwiftUI.View {
  @ObservedObject public var props: BadgeViewProps
  var body: some View { VStack { Text(props.title); Children() } }
}
```

TypeScript wrapper는 CommonViewModifierProps를 확장하고 requireNativeView('ModuleName','ViewName')로 연결한다. modifiers를 native에 넘기는 것 외에 **createViewModifierEventListener(modifiers)** 결과 props도 연결해야 onTapGesture/onAppear 같은 event modifier가 동작한다. entrypoint에서 component와 props type을 export한다.

```tsx
const NativeBadge = requireNativeView<BadgeProps>('MyUi', 'BadgeView');
export function Badge({ modifiers, ...rest }: BadgeProps) {
  return <NativeBadge modifiers={modifiers}
    {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
    {...rest} />;
}
```

## Custom modifier 등록과 수명

Swift struct는 ViewModifier와 Record를 준수하고 @Field로 JS options를 decode한다. 예를 들어 RoundedRectangle overlay.stroke로 border를 구현한다. module OnCreate에서 ViewModifierRegistry.register('customBorder')로 decode factory를 등록하고 **OnDestroy에서 unregister**하여 SwiftUI render thread와의 race를 피한다. JS는 `createModifier('customBorder', params)`를 반환하는 helper를 제공하고 export한다. 등록 이름과 JS 이름이 같아야 한다.

native source file을 local module에 추가하는 것만으로 iOS project에 포함되지 않는다. **파일 추가 후 npx expo prebuild를 실행하고 native rebuild**한다. 빠뜨리면 cannot find 'CustomView' in scope 같은 build error가 발생할 수 있다. custom modifier 파일을 추가할 때도 같은 과정이 필요하다. JS refresh만으로 native 코드 추가가 적용되지 않는다. 앱 전용 스타일, third-party SwiftUI wrapper 또는 배포 package로 확장할 수 있다.

## 출처

- [Expo Documentation, Custom SwiftUI components](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/extending)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
