---
tags: [expo, expo-sdk, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Beta Symbols"]
---

# Expo SDK Beta Symbols

expo-symbols는 beta이며 breaking change 가능성이 있다. iOS/tvOS는 SF Symbols, Android/web은 Material Symbols를 사용한다. npx expo install expo-symbols 후 SymbolView를 import하며 Expo Go에 포함된다.

```tsx
<SymbolView name={{ios:'info.circle', android:'info', web:'info'}}
  tintColor="#007AFF" size={24} fallback={<Text>?</Text>} />
```

name 문자열 단독은 SF Symbol로 취급되어 Android/web에서 표시되지 않는다. platform object와 fallback으로 대응한다. size 기본 24, resizeMode scaleAspectFit(default)/scaleToFill/scaleAspectFill/center/edges/corners, scale unspecified(default)/default/small/medium/large, tintColor를 설정한다. type은 monochrome(default)/hierarchical/palette/multicolor이며 palette colors를 받는다.

weight는 iOS unspecified/ultraLight/thin/light/regular/medium/semibold/bold/heavy/black 문자열, Android/web은 expo-symbols/androidWeights/{bold, semiBold, medium, regular, light, extraLight, thin} import object다. platform weight object를 사용하고 iOS semibold와 import semiBold 철자 차이를 보존한다. ViewProps를 상속한다.

animationSpec은 effect{type:bounce|pulse|scale, direction:up|down, wholeSymbol:false}, repeatCount/repeating/speed(seconds), variableAnimationSpec를 받는다. variable animation은 cumulative/iterative, dimInactiveLayers/hideInactiveLayers, reversing/nonReversing을 결합하며 cumulative는 iterative를 상쇄한다. 플랫폼 symbol/animation 지원은 동일하다고 가정하지 않는다.

Symbol.unstable_getMaterialSymbolSourceAsync(symbol, size, color):Promise<ImageSourcePropType|null>은 tab bar처럼 component 대신 image source를 요구하는 API용이다. unstable method와 beta 전체 상태를 안정 cross-platform icon 계약으로 단정하지 않는다.

## 출처

- [Expo Documentation, Symbols](https://docs.expo.dev/versions/latest/sdk/symbols)

## 관련 문서

- [[Expo-Integrations-Icons-Store-Assets]]
