---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community Slider range와 unsupported commit events"]
---

# Community Slider range와 unsupported commit events

## Surface와 internal state

`@expo/ui/community/slider` default import는 Android Material3 Slider/iOS SwiftUI Slider/web range input이다. value0은 initial/current thumb value이고 new prop은 thumb를 갱신한다. drag는 external state update 없이도 내부 반영하며 onValueChange를 지속 emit한다. required controlled pair인 universal Slider와 다르다.

minimumValue0/maximumValue1, step0(default continuous), lowerLimit/upperLimit, inverted false, disabled false, style ViewStyle, optional onValueChange(number)를 제공한다. step은0~range차이 사이로 정한다. lower/upper limit은 user drag bounds이고 range min/max와 역할이 다르다.

```tsx
<Slider value={0.5} minimumValue={0} maximumValue={1} step={0.1}
  onValueChange={setValue} minimumTrackTintColor="blue" />
```

minimumTrackTintColor는 active track, maximumTrackTintColor는 inactive track, thumbTintColor는 thumb다. iOS는 SwiftUI exposed active tint만 지원해 maximum/thumb 색은 no effect다. 해당 props API 표는 Android support다.

onSlidingStart/onSlidingComplete,tapToSeek,StepMarker,renderStepNumber,thumb/minimumTrack/maximumTrack/track images,accessibilityUnits/Increments,testID,ref.updateValue는 아직 unsupported다. release-on-drag-end에만 save하는 기존 handler는 onSlidingComplete가 없으므로 별도 UX/commit policy가 필요하다. import 변경만으로 기존 gesture/telemetry hooks가 유지되지 않는다.

## 출처

- [Expo Documentation, Slider](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/slider)

## 관련 문서

- [[Expo-UI-Toggles]]
