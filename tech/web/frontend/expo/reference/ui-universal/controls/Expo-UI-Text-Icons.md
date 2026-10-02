---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Text typography와 native Icon asset"]
---

# Universal Text typography와 native Icon asset

## Text

Text children은 optional string이다. 기본 platform light/dark scheme에 적응하고 textStyle은 typography subset이다. numberOfLines는 maximum lines와 trailing ellipsis다. style은 box subset, textStyle은 color(string),fontFamily,fontSize,fontWeight(normal/bold/100..900),letterSpacing,lineHeight,textAlign(center/left/right)이다. font 등록과 available face는 별도 font library/runtime 계약을 따른다.

Text는 common presentation을 제공하지만 RN Text의 rich nested node API 전체를 그대로 노출한다고 가정하지 않는다. width proposal이 있어야 truncation의 실제 bounds가 정해진다.

## Icon의 platform asset

Icon은 Android XML vector drawable와 iOS SF Symbol이다. web에서는 render하지 않는다. native accessibilityLabel은 Android contentDescription만 연결되고 iOS accessibility는 아직 미연결이다. interactive icon에는 사용 가능한 control label/accessibility 대안을 고려한다.

```tsx
const STAR = Icon.select({ios:'star.fill',android:import('@expo/material-symbols/star.xml')});
<Icon name={STAR} size={24} color="orange" />
```

name은 required SF Symbol string/XML asset/ios-android object다. Icon.select(spec)는 platform asset을 선택한다. babel-preset-expo가 auto-load하는 @expo/ui/babel-plugin과 함께 unused platform side를 제거한다. dynamic import XML literal은 TypeScript exports-map path 검증을 받으며 plugin이 require로 rewrite한다. synchronous require도 가능하다.

plain {ios,android} object form은 허용하지만 두 side가 bundle에 남을 수 있다. 재사용 asset은 hoist하고 .android.tsx에서는 XML direct import/.ios.tsx에서는 SF Symbol string을 사용할 수 있다. @expo/material-symbols는 bundled Android assets의 optional package다.

color는 ColorValue, size는 Android dp/iOS points이며 omitted는 intrinsic size다. symbol availability는 OS에 따라 확인한다. Icon에는 common presentation props가 표에 나타나도 실제 render platform은 Android/iOS에 한정된다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, Text](https://docs.expo.dev/versions/latest/sdk/ui/universal/text)
- [Expo Documentation, Icon](https://docs.expo.dev/versions/latest/sdk/ui/universal/icon)

## 관련 문서

- [[Expo-UI-Buttons]]
- [[Expo-Home-Fonts]]
