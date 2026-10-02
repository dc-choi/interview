---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal ScrollView의 non-lazy scrolling"]
---

# Universal ScrollView의 non-lazy scrolling

## Platform 구현

Android는 Row/Column에 horizontalScroll/verticalScroll modifier를 적용하고 모든 children을 render한다. iOS는 SwiftUI ScrollView, web은 RN ScrollView다. large lists에 lazy mount를 제공하는 API로 간주하지 않는다.

children ReactNode, direction vertical(default)/horizontal, showsIndicators boolean true(iOS/web)가 scrolling-specific props다. direction에 맞는 Row/Column을 child로 두어 layout한다. viewport가 제한되어야 content overflow를 scroll할 수 있으므로 Host와 parent size를 함께 정한다. Android showsIndicators는 지원 표에 없으므로 동일 indicator toggle을 기대하지 않는다.

```tsx
<Host matchContents={{vertical:true}} style={{width:'100%'}}>
  <ScrollView direction="horizontal">
    <Row spacing={12}>{items.map(item => <Text key={item.id}>{item.label}</Text>)}</Row>
  </ScrollView>
</Host>
```

children 수가 많으면 mount 비용, nested scrolling, fixed bounds를 확인하고 List/다른 virtualized RN container와 비교한다. ScrollView의 supported props가 RN ScrollView 전체 API와 같다고 가정하지 않는다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, ScrollView](https://docs.expo.dev/versions/latest/sdk/ui/universal/scrollview)

## 관련 문서

- [[Expo-UI-Lists]]
- [[Expo-UI-Layout]]
