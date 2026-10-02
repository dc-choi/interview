---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["GlassEffect availability와 native style animation"]
---

# GlassEffect availability와 native style animation

## availability와 fallback

`expo-glass-effect`의 GlassView와 GlassContainer는 iOS/tvOS native UIVisualEffectView를 사용한다. GlassView는 iOS26이 상이고 unsupported platform에서는 regular View로 fallback 한다. OS version만 검사하는 대신 `isGlassEffectAPIAvailable()`로 runtime API 존재를 확인한다. 일부 iOS26 beta는 API 부재로 crash 할 수 있다. `isLiquidGlassAvailable()`은 compiler/system/Info.plist compatibility setting을 포함한 app의 Liquid Glass component availability를 검사한다. true 여도 accessibility의 reduce transparency가 켜져 있을 수 있으므로 `AccessibilityInfo.isReduceTransparencyEnabled()`는 별도로 검사한다.

## props와 animation

GlassView는 ViewProps/ref, tintColor, isInteractive(기본 false), colorScheme(auto/light/dark, 기본 auto)를 받는다. glassEffectStyle 기본 regular이며 clear/regular/none string 또는 `{style, animate, animationDuration}`이다. animate 기본 false, duration은 **초 단위**, 생략하면 system default 다. Container의 spacing은 서로 영향을 주고 합쳐지는 거리이며 여러 GlassView를 하나의 효과로 묶는다.

```tsx
const available = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
return available ? <GlassContainer spacing={10}>
  <GlassView isInteractive style={{ width: 100, height: 44 }}
    glassEffectStyle={{ style: visible ? 'regular' : 'none',
      animate: true, animationDuration: 0.5 }} />
</GlassContainer> : <View style={{ width: 100, height: 44 }} />;
```

GlassView 나 parent의 opacity를0 으로 만들면 glass가 더 이상 render 되지 않는 알려진 제한이 있다. fade에 는 native style animation을 우선 사용한다. opacity를 사용해야 하면 wrapper opacity animation과 glassEffectStyle none/regular 전환을 함께 하며 원문의 workaround는 iOS26.1이 상 예시다. API 존재 여부와 실제 visual appearance는 서로 다른 검사다.

## 출처

- [Expo Documentation, GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
