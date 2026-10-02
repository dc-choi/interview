---
tags: [expo, expo-router, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 네이티브 시스템 색상"]
---

# Expo Router 네이티브 시스템 색상

`import { Color } from 'expo-router'`는 React Native PlatformColor를 편하게 쓰는 namespace다. Android와 iOS의 native resource 색을 반환하며 웹에는 해당 resource가 없다. 색상 literal을 platform fallback으로 제공한다. Color API의 반환은 문자열 hex가 아니라 RN `ColorValue`로 취급한다.

```tsx
import { Color } from 'expo-router';
import { Platform, View, useColorScheme } from 'react-native';
export default function Card() {
  useColorScheme();
  return <View style={{ backgroundColor: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#f5f5f5',
  }) }} />;
}
```

`useColorScheme`는 테마가 바뀔 때 component를 다시 render하게 한다. 특히 React Compiler가 정적인 값으로 최적화한 코드에서 theme 변화 구독을 빠뜨리지 않는다. native semantic 색은 light/dark와 접근성 설정을 반영할 수 있지만 custom 숫자 색과 동일하게 serialize할 수 있다고 가정하지 않는다.

## Android namespace와 OS API level

| namespace | resource와 용도 |
| --- | --- |
| `Color.android` | `@android:color/...` resource |
| `Color.android.attr` | `?attr/...` theme attribute |
| `Color.android.material` | Material Design 3의 정적 semantic palette |
| `Color.android.dynamic` | Android 12(API31) 이상에서 wallpaper/system theme를 반영하는 Material You palette |

SDK라는 interface 이름의 숫자는 Expo SDK가 아니라 Android API level이다. 아래 interface를 합친 `AndroidBaseColor`와 `AndroidBaseColorAttr`는 이름을 type으로 제공하지만 실제 OS에 없는 resource 지원까지 보장하지 않는다.

| interface | 색상 계열과 지원 조건 |
| --- | --- |
| AndroidBaseColorSDK1 | black/white/transparent, background_dark/light, darker_gray 등 기본 색 |
| AndroidBaseColorSDK14 | holo_blue/green/orange/red/purple의 light/dark/bright 색 |
| AndroidBaseColorSDK31 | system_accent1/2/3, system_neutral1/2의 0,10,50,100부터1000까지 tonal 단계 |
| AndroidBaseColorSDK34 | system_*_light/dark semantic role, fixed/fixed_dim와 container, inverse/control 관련 색 |
| AndroidBaseColorSDK35 | system error tonal palette, disabled, surface, outline/on_surface 관련 추가 role |
| AndroidColorAttrSDK1/5/14 | colorBackground/colorForeground, inverse와 cacheHint, focused-highlight 계열 |
| AndroidColorAttrSDK21 | colorAccent, colorControlNormal/Activated/Highlight, colorButtonNormal, colorEdgeEffect, colorPrimary/PrimaryDark 등 |
| AndroidColorAttrSDK23/25/26 | colorBackgroundFloating, colorSecondary, colorError 등 이후 theme attribute |
| AndroidDeprecatedColor | primary_text/secondary_text/tertiary_text_dark/light 등. Android API28에서 deprecated |

`material`과 `dynamic`은 같은 semantic role 묶음을 제공한다. primary/secondary/tertiary와 on* foreground, *Container/on*Container, *Fixed/*FixedDim/on*Fixed/on*FixedVariant를 조합한다. error/errorContainer/onError/onErrorContainer도 같은 foreground 관계다.

surface 계열에는 surface, surfaceDim, surfaceBright, surfaceContainerLowest/Low/기본/High/Highest, surfaceVariant/onSurfaceVariant, inverseSurface/onInverseSurface/inversePrimary가 있다. background/onBackground, outline/outlineVariant도 지원한다. 이 role은 강조색을 고르는 palette보다 배경과 대비되는 글자색 계약을 나타낸다. API31 미만에서는 dynamic을 무조건 호출하지 말고 static 또는 literal fallback을 선택한다.

## iOS semantic 색

Color.ios는 IOSBaseColor를 제공한다. label/secondaryLabel/tertiaryLabel/quaternaryLabel, placeholderText/link와 separator/opaqueSeparator는 텍스트와 구분선 역할을 표현한다. systemBackground/secondarySystemBackground/tertiarySystemBackground와 systemGroupedBackground의 secondary/tertiary 변형은 일반 배경과 그룹 목록의 층위를 구분한다.

systemFill/secondarySystemFill/tertiarySystemFill/quaternarySystemFill은 채움 역할이다. systemGray부터 systemGray6까지 중성 tonal 단계와 systemBlue/Green/Indigo/Orange/Pink/Purple/Red/Teal/Yellow/Mint/Cyan/Brown 등의 semantic hue도 있다. 모든 hue가 모든 iOS 버전에 있다고 전제하지 않는다. native interface의 지원 OS와 앱 deployment target을 함께 확인한다.

## 타입과 사용 경계

ColorType은 android/ios namespace, AndroidDynamicMaterialColorType/AndroidStaticMaterialColorType는 role별 ColorValue interface다. AndroidBaseColor, AndroidBaseColorAttr, AndroidDynamicMaterialColor, AndroidMaterialColor에는 resource를 확장하는 index signature가 있다. 오타나 미지원 resource를 OS에서 해결해 주는 계약이 아니므로 임의 이름을 추가할 때 해당 native resource를 확인한다. SSR과 웹에서 native PlatformColor 값을 평가하거나 CSS color literal로 변환하지 않는다.

## 출처

- [Expo Documentation, Color](https://docs.expo.dev/router/reference/color)
- [Expo Documentation, Router Color](https://docs.expo.dev/versions/latest/sdk/router/color)

## 관련 문서

- [[Expo-Router-Native-Tabs-Options]]
- [[Expo-Router-Stack-Toolbar]]
