---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Picker single-selection 계약"]
---

# Universal Picker single-selection 계약

## Item 선언과 controlled selection

universal Picker는 required selectedValue T와 onValueChange(T)를 받으며 T는 string/number다. children Picker.Item(label string,value T)가 options를 선언한다. selectedValue는 반드시 item value 하나와 일치해야 한다. optional enabled true/testID/appearance가 있다.

```tsx
<Picker selectedValue={size} onValueChange={setSize} appearance="menu">
  <Picker.Item label="Small" value="small" />
  <Picker.Item label="Large" value="large" />
</Picker>
```

default appearance menu는 compact popup/dropdown이다. wheel은 iOS에서 inline scroll rotor이고 Android/web은 default dropdown으로 fallback한다. Material3에는 동일 wheel primitive가 없다. 화면 공간/keyboard interaction은 actual platform control로 확인한다.

ExtractedPickerItem은 parent가 item children에서 얻는 내부 label/value data shape다. 이를 외부 storage API로 사용하지 않는다. `@expo/ui/community/picker` shim과 독립적이며 새 code는 universal을 우선 검토한다. community onValueChange(value,index), mode/itemStyle/color/ref 같은 API를 universal에 그대로 붙이지 않는다.

## 출처

- [Expo Documentation, Picker](https://docs.expo.dev/versions/latest/sdk/ui/universal/picker)

## 관련 문서

- [[Expo-UI-Toggles]]
- [[Expo-UI-Compat-Picker]]
