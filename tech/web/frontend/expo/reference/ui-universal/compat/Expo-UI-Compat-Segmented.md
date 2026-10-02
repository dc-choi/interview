---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community SegmentedControl index와 appearance"]
---

# Community SegmentedControl index와 appearance

## Values와 callback

`@expo/ui/community/segmented-control` default import는 Android SingleChoiceSegmentedButtonRow/iOS segmented SwiftUI Picker에 매핑한다. values string[] optional, selectedIndex number optional, enabled true, appearance light/dark, style/testID, tintColor를 제공한다.

onChange는 nativeEvent.selectedSegmentIndex와 value string을 포함한다. onValueChange는 selected label string만 전달한다. 같은 label이 여러 segment에 존재하면 index를 기준으로 구분한다. deprecated NativeSegmentedControlIOSChangeEvent alias보다 NativeSegmentedControlChangeEvent를 사용한다.

```tsx
<SegmentedControl values={['Day','Week','Month']} selectedIndex={index}
  onChange={event=>setIndex(event.nativeEvent.selectedSegmentIndex)} />
```

image values는 unsupported(strings only), momentary/backgroundColor/fontStyle/activeFontStyle도 unsupported다. tintColor는 iOS no effect이며 API 표는 Android/web 지원, prose는 Android-only처럼 설명하므로 web visual은 actual 구현에서 확인한다. Android에는 active container accent가 적용된다. appearance override와 color scheme의 actual contrast를 검증한다.

## 출처

- [Expo Documentation, SegmentedControl](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/segmentedcontrol)

## 관련 문서

- [[Expo-UI-Picker]]
