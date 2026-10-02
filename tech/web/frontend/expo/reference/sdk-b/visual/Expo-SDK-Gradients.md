---
tags: [expo, expo-sdk, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo linear gradient와 mesh gradient"]
---

# Expo linear gradient와 mesh gradient

expo-linear-gradient는 Android/iOS/tvOS/web와 Expo Go, expo-mesh-gradient는 Android/iOS/tvOS와 Expo Go를 지원한다. 각각 expo install로 SDK-compatible package를 설치한다. native RN experimental_backgroundImage와 웹 backgroundImage CSS gradient가 대안이지만 experimental native style의 제한을 확인한다.

## LinearGradient

colors는 최소 2 ColorValue의 readonly tuple이고 inline 또는 as const로 TypeScript에 길이를 알려준다. locations는 colors와 같은 길이,0..1, 오름차순이며 생략하면 evenly spaced다. start/end는 normalized `{x, y}` 또는 `[x, y]`다. 웹은 endpoint 위치를 정확히 재현하지 않고 CSS angle만 바뀐다. source end.y의 bottom 표현은 normalized coordinate 예제와 혼재하므로 native visual 결과를 확인한다.

```tsx
<LinearGradient colors={['#123456','#abcdef']} locations={[0.2,0.9]}
  start={{x:0,y:0}} end={{x:1,y:1}} style={{height:120}} />
```

dither 기본 true는 banding을 줄이고 false는 performance tradeoff다. ViewProps를 상속하며 gradient가 touch action을 제공하는 것은 아니다.

## MeshGradientView

columns/rows는 grid vertex 수(기본 0), colors와 points는 각각 columns*rows 길이여야 한다. points는 2D normalized 좌표다. smoothsColors 기본 true는 cubic color interpolation, resolution{x, y}는 segment 사이 sampling 수다. ignoresSafeArea 기본 true, mask 기본 false이며 mask=true는 child alpha로 gradient를 가리고 child gesture를 무시한다.

3x3 mesh라면 9colors/9points를 좌→우, 위→아래 일관된 grid 순서로 준다. width/height 없는 0 default나 길이가 다른 배열이 의미 있는 mesh를 만들어준다고 가정하지 않는다. mask는 시각적 역할이므로 클릭 가능한 content를 mask child와 별도로 구성한다.

## 출처

- [Expo Documentation, LinearGradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient)
- [Expo Documentation, MeshGradient](https://docs.expo.dev/versions/latest/sdk/mesh-gradient)

## 관련 문서

- [[Expo-SDK-System-Appearance]]
- [[Expo-Router-Color]]
