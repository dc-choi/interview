---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["BlurView Android target와 blur 비용"]
---

# BlurView Android target와 blur 비용

## 플랫폼과 composition

`expo-blur`의 BlurView는 Android, iOS, tvOS, Web에서 배경을 blur 한다. SDK55부터 Android 지원은 stable이 지만 기존 iOS 방식 그대로 쓰면 Android는 반투명 view가 된다. dynamic FlatList보다 BlurView를 먼저 render 하면 background 변경이 반영되지 않을 수 있으므로 content 뒤에 render 한다.

```tsx
const target = useRef<View | null>(null);
return <View>
  <BlurTargetView ref={target}><FlatList {...listProps} /></BlurTargetView>
  <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus"
    intensity={60} tint="dark" style={{ overflow: 'hidden', borderRadius: 16 }} />
</View>;
```

Android는 blurred content를 BlurTargetView로 감싸고 ref를 blurTarget에 전달한다. 여러 BlurView가 하나의 target bounds에 들어가면 target 하나를 공유하는 것이 효율적이다. target은 ViewProps/ref를 받는다.

## props와 fallback

`intensity`는1~100, 기본50이며 Reanimated로 animation 할 수 있다. `tint` 기본 default, light/dark/extraLight/regular/prominent와 systemUltraThin/Thin/Material/Thick/ChromeMaterial의 Light/Dark 변형을 지원한다. 모든 tint가 반투명 color layer를 추가하므로 blur만 남기는 tint는 없다. native borderRadius만 지정하면 효과가 잘리지 않으므로 overflow:hidden을 같이 쓴다.

Android blurMethod 기본 none은 반투명 fallback이다. dimezisBlurView는 native blur 지만 API30이 하에서 느린 RenderScript를 쓴다. API31이 상은 RenderNode를 사용한다. dimezisBlurViewSdk31Plus는 API31이 상에서만 blur 하고 이전 기기는 none 으로 fallback 한다. blurReductionFactor 기본4는 Android intensity를 나누는 값으로 플랫폼 간 perceived blur를 조절한다. Android stable 상태와 원문 일부의 experimental이 라는 prop 설명은 서로 혼재하므로 이전 실험 API 설정을 현행 기본값으로 복제하지 않는다.

## 출처

- [Expo Documentation, BlurView](https://docs.expo.dev/versions/latest/sdk/blur-view)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
