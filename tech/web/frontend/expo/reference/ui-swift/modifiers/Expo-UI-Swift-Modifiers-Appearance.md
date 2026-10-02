---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, 색상과 image 효과"]
---

# Expo SwiftUI modifier, 색상과 image 효과

Color는 string, RN ColorValue와 named color를 받는다. `PlatformColor('label')` 등 adaptive system color도 사용할 수 있다. 원문 foregroundStyle 설명의 8자리 hex 표기와 ColorPicker의 #RRGGBBAA 계약이 다르므로 색 문자열의 alpha 해석을 모든 control에 일반화하지 않는다. 필요한 API의 Color 계약을 따른다.

## Foreground와 배경

foregroundColor(color)는 deprecated이며 foregroundStyle(style)이 대체한다. style은 단순 Color 또는 `{type:'color',color}`, hierarchical(primary/secondary/tertiary/quaternary/quinary), gradient다. hierarchical은 light/dark와 접근성 환경에 대응하며 quinary는 iOS16+이고 구버전은 quaternary fallback이다.

| Gradient | options |
| --- | --- |
| linearGradient | colors[], startPoint/endPoint{x,y} |
| radialGradient | colors[], center{x,y}, startRadius/endRadius |
| angularGradient | colors[], center{x,y} |

background(color,shape?)는 뒤를 채우고 shape 생략이면 전체 view다. backgroundOverlay({color,alignment})는 뒤의 색/alignment, overlay({color,alignment})는 앞의 색/alignment이며 alignment는 center/top/bottom/leading/trailing이다. 복합 React content overlay는 Overlay component를 쓴다. tint(color)는 control tint, containerBackground(color,placement)는 enclosing widget/navigation/navigationSplitView 배경을 지정한다.

```tsx
import { Host, Text } from '@expo/ui/swift-ui';
import { foregroundStyle, font } from '@expo/ui/swift-ui/modifiers';
export function GradientTitle() {
  return <Host matchContents><Text modifiers={[font({ size: 24 }),
    foregroundStyle({ type: 'linearGradient', colors: ['blue', 'purple'],
      startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 0 } })]}>제목</Text></Host>;
}
```

## 시각적 조정

opacity는0..1, blur는 radius, brightness는-1..1, grayscale은0..1, hueRotation은 degrees다. contrast/saturation은0..Infinity multiplier이며1이 원래 값이다. colorInvert(boolean=true)는 반전, luminanceToAlpha()는 밝기를 alpha로 변환한다. hidden(boolean=true)는 숨김, cornerRadius(radius)는 모서리, shadow({radius,x,y,color})는 그림자다. 색 변환과 accessibility hidden은 서로 다른 기능이다.

## Border와 image

border({color,width})는 view border다. strokeBorder({color?,style?,antialiased?,shape?,cornerRadius?})는 shape 안쪽 경계를 그리며 color 생략 시 foregroundStyle을 사용한다. StrokeStyle 기본 lineWidth1, lineCap butt(round/square 가능), lineJoin miter(round/bevel 가능), miterLimit10, dash[], dashPhase0다. dash는 칠한/비운 길이 배열이며 빈 배열이면 실선이다.

resizable(capInsets?,resizingMode?)는 image의 일부 top/bottom/leading/trailing inset을 보존하며 stretch/tile 방식으로 크기를 맞춘다. imageScale(small/medium/large)는 주변 text에 비례하는 SF Symbol 크기다. Image size는 고정 points지만 font textStyle은 Dynamic Type에 맞춘다.

## Glass 효과

glassEffect({glass:{variant,interactive,tint},shape,cornerRadius}?)의 variant는 regular/clear/identity다. glassEffectId(id,namespaceId)는 GlassEffectContainer 안의 glass view identity를 연결한다. **Liquid Glass는 iOS/tvOS26 계열 및 Xcode26 build 조건**을 별도로 확인한다. Menu label에 glassEffect를 직접 붙이면 dismiss artifact가 생겨 Menu에는 buttonStyle('glass')를 사용한다. glassEffect를 단순 blur/alpha 값과 동일하게 취급하지 않는다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
