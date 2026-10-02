---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community MaskedView alpha와 capture thread"]
---

# Community MaskedView alpha와 capture thread

## Mask와 native 구현

named MaskedView를 `@expo/ui/community/masked-view`에서 import한다. maskElement ReactElement required, children optional ReactNode, inherited ViewProps다. alpha channel만 mask로 사용한다. opaque는 content reveal, transparent는 hide, gradient alpha는 fade다. mask의 RGB 색 자체는 어떤 content 색을 보일지 정하지 않는다.

Android는 Compose offscreen graphics layer BlendMode.DstIn, iOS는 SwiftUI mask다. original androidRenderingMode는 대응이 없어 public type에서 제외됐다. always offscreen이라는 구현 차이가 performance와 capture integration에 영향을 줄 수 있다.

```tsx
<MaskedView style={{width:300,height:80}}
  maskElement={<LinearGradient colors={['black','transparent']} style={StyleSheet.absoluteFill} />}>
  <View style={{flex:1,backgroundColor:'blue'}} />
</MaskedView>
```

text mask로 rainbow background를 보이거나 alpha fade로 content를 줄일 수 있다. mask/content bounds를 맞추고 font load 후 mask shape를 확인한다.

## Web와 Android screenshot

web은 masking이 없고 children이 그대로 render되며 one-time warning을 남긴다. gradient text는 CSS background-clip:text + transparent color, alpha fade는 mask-image/WebkitMaskImage, geometric shape는 clip-path 또는 borderRadius/overflow hidden 같은 web primitive를 사용한다.

Android screenshot/session replay는 Compose layout draw를 UI thread에서 수행해야 한다. background-thread draw는 SnapshotStateObserver multithread access IllegalArgumentException으로 crash할 수 있다. pixel processing/encoding은 background thread로 이동할 수 있지만 view capture 자체와 구분한다.

## 출처

- [Expo Documentation, MaskedView](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/maskedview)

## 관련 문서

- [[Expo-Learn-App-Capture]]
- [[Expo-UI-Interop]]
