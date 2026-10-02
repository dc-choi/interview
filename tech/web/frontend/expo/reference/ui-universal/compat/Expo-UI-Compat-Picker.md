---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community Picker options, item style와 focus"]
---

# Community Picker options, item style와 focus

## Platform implementation

named Picker는 `@expo/ui/community/picker`다. iOS wheel SwiftUI Picker, Android Material3 ExposedDropdownMenuBox, web native select다. universal Picker와 다른 API로 RN-Picker migration을 위한 shim이다.

optional selectedValue T는 item value와 일치해야 하고 onValueChange(value,index)는 optional callback이다. children Picker.Item, enabled, style ViewStyle, testID, ref(PickerRef)를 제공한다. PickerItemValue는 string/number/null이다.

```tsx
<Picker selectedValue={language} onValueChange={(value,index)=>setLanguage(value)}>
  <Picker.Item label="TypeScript" value="ts" style={{color:'blue',fontSize:16}} />
  <Picker.Item label="Java" value="java" enabled={false} />
</Picker>
```

item label/value/color/fontFamily/style/testID는 optional이고 enabled는 Android only다. item style은 color/backgroundColor/fontFamily/fontSize만 적용한다. style values가 top-level color/fontFamily aliases보다 우선한다. iOS fontFamily는 native font name, Android는 generic monospace/serif/sansSerif/cursive 또는 expo-font loaded family를 사용할 수 있다.

ref.focus()/blur()는 Android dropdown open/close만 제공한다. iOS wheel은 항상 visible이어서 no-op다. web에 ref type이 있어도 Android imperative effect와 동일하다고 가정하지 않는다.

mode,prompt,dropdownIconColor/RippleColor,numberOfLines,selectionColor,itemStyle,accessibilityLabel은 unsupported다. disabled individual option에 의존하는 app은 iOS/web에서 동일 차단을 기대하지 말고 business validation도 유지한다.

## 출처

- [Expo Documentation, Picker](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/picker)

## 관련 문서

- [[Expo-UI-Picker]]
- [[Expo-Home-Fonts]]
