---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image rendering, source와 recycled view"]
---

# Image rendering, source와 recycled view

## component와 지원 format

`import { Image, ImageBackground } from 'expo-image'`는 SDWebImage/Glide 기반 cross-platformcomponent 다. WebP,PNG/APNG,AVIF,JPEG,GIF,SVG,ICO를 지원하고 HEIC는 native,ICNS/PSDcomposite는 iOS 전용이다. iOS SVG decoder는 packedarcflags가 왜곡될수있으므로 flags를 공백으로분리하거나 react-native-svg를 사용한다. plugin disableLibdav1d:true는 중복 Podlink를 피하지만다른 decoder가 없으면 iOSAVIF 지원도없어진다. 수동 Pod 설정은 EXPO_IMAGE_DISABLE_LIBDAV1D=1을 사용하며 source의`||='0'`만추가하는예시가 disable을 뜻하지는않는다.

## source, fit와 placeholder

source는 remote/localURI,require 결과,ImageSource,sourcearray,SharedRefimage,iOSsf:symbol이다. nativeassetcatalog/drawable은 extension 없는이름과직접 dimension을 정한다. arrays에 는 width,height,scale을 제공해 container/screen에 맞는 source를 고르게한다. ImageSource는 headers,cacheKey(기본 uri),isAnimated,width,height와 uri 또는 blurhash/thumbhash를 받는다. uri가 있으면 hash가 무시된다. Webcustomheaders는 serverCORS도 필요하다.

contentFit 기본 cover는 ratio 보존+crop,contain은 전체표시,fill은 stretch,none은 원본,scale-down은 none/contain 중작은크기다. contentPosition 기본 center는 edgekeyword 나 points/percentobject 다. percentage는 container와 image 크기차이를기준으로계산한다. placeholder 기본 fit은**scale-down**으로 contentFit과 다르다. flicker를 줄이려면둘을맞춘다.

```tsx
<Image source={{ uri: photoUrl, cacheKey: photoVersion }}
  placeholder={{ thumbhash }} contentFit="cover" placeholderContentFit="cover"
  recyclingKey={item.id} transition={200}
  style={{ width: 240, height: 160 }} alt="선택한 사진"
  onError={({ error }) => showFailure(error)} />
```

recyclingKey가 바뀌면 previoussource를 blank/placeholder로 초기화하므로 recycledlist의 잘못된사진노출을줄인다. transition 숫자는 cross-dissolve **milliseconds**다. object는 duration/effect/timing을 받으며 Android는 cross-dissolve만,Web은 curl 미지원이다. onLoadStart/onProgress{loaded,total}/onLoad{source,cacheType}/onLoadEnd/onError{error}/onDisplay를 구분한다. load 완료와실제 display는 다르다.

## memory, animation과 accessibility

cachePolicy 기본 disk,none/memory/memory-disk를 선택한다. memory는 빠르게 purge 될수있다. prioritylow/normal/high는 best-effort이 며순서를보장하지 않는다. allowDownscaling 기본 true 지만 none/fill에서는 downscale 하지 않는다. AndroiddecodeFormatargb(32-bit+alpha)/rgb(16-bitnoalpha)는 hint이 며보장되지않는다. iOSenforceEarlyResizing은 memory를 줄이나 dynamicresize/contentPosition에 영향을줄수있다. blurRadius 기본0과 tintColor는 placeholder에 적용되지않는다. useImage로 load 할 때 tint는 hookoption에 준다.

autoplay 기본 true,refstartAnimating/stopAnimating 으로 animatedimage를 제어한다. useAppleWebpCodec 기본 true는 빠르고 memory가 적으나 animationblending/framerate 오류가있을수있어 false로 libwebp를 선택한다. lockResourceAsync/unlockResourceAsync는 reload를 잠그고 reloadAsync는 lock을 무시한다. getAnimatableRef는 View/Image/null이다. accessible와 alt/accessibilityLabel을 사용하고 iOS16LiveText,iOS/tvOS17preferHighDynamicRange는 opt-in이다.

## Web와 SF Symbol

responsivePolicy 기본 static은 srcset/sizes와 staticrendering을 지원한다. sizes:auto는 lazyloading에 서효과가있으므로 loading 기본 lazy,eager 면 auto가 무시된다. fallback은 sourcewebMaxViewportWidthbreakpoint와100vw 다. initial은 mountcontainer,live는 resize 마다 source를 선택하며 staticrendering에 는맞지않는다. draggable/focusable 등 platformprops를 확인한다.

iOS17sfEffect는 bounce/pulse/variable-color/scale/appear/disappear,iOS18wiggle/rotate/breathe,iOS26draw/on/off를 지원한다. repeat-1은 infinite,0은 once,scopeby-layer/whole-symbol이다. transition의 sf:replace/down-up/up-up/off-up은 symbolsource 전환에사용한다. RNcompatdefaultSource/loadingIndicatorSource/fadeDuration/resizeMode는 deprecated이며 placeholder/transition/contentFit/contentPosition을 쓴다. repeatresizeMode는 지원하지 않는다. ImageBackground는 containerstyle와 imageStyle을 분리한다.

- 상세 cache와 nativeImageRef는 [[Expo-SDK-A-Image-Cache]]

## 출처

- [Expo Documentation, Image](https://docs.expo.dev/versions/latest/sdk/image)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
