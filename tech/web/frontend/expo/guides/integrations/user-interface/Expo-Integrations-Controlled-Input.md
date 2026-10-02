---
tags: [expo, expo-integrations, user-interface]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native controlled input과 cursor"]
---

# React Native controlled input과 cursor

RN TextInput은 value를 주지 않으면 native 내부 text를 유지하고 defaultValue는 initial value다. value/onChangeText를 주면 React state로 강제한다. 기존 React 지식과 연결하되 RN native round trip과 UI-thread worklet이라는 Expo 고유 조건을 구분한다.

## Native update 순서

keystroke→native raw text→onChangeText(string)→JS state/render→native value 동기화 순서다. 웹 DOM reconciliation과 달리 JS round trip 동안 raw text가 잠시 보일 수 있다. RN에는 input preventDefault가 없어 sanitizer가 입력을 미리 차단하지 못한다. live validation/dependent UI/format은 controlled, 최종 submit만 읽으면 defaultValue와 onSubmitEditing.nativeEvent.text 같은 uncontrolled가 적합하다.

keyboardType number-pad/phone-pad는 keyboard 선택이며 paste/hardware 입력을 제한하지 않는다. maxLength/editable=false는 native에서 처리해 JS 문자열 재작성보다 flicker가 적다. onChangeText의 uppercase/filter/mask는 문자열 길이를 바꿔 cursor mapping에 영향을 준다. New Architecture도 unchanged text의 cursor 유지와 transformed text의 정확한 cursor 계산을 동일하게 보장하지 않는다.

## UI-thread state와 worklet

SDK56+ @expo/ui universal TextInput은 useNativeState observable을 value/selection에 사용하고 react-native-worklets로 synchronous onChangeText worklet을 실행할 수 있다.

```tsx
const text = useNativeState('');
const selection = useNativeState({start:0,end:0});
const onChangeText = useCallback(value => {
  'worklet';
  const filtered = value.replace(/[^0-9]/g, '');
  if (filtered !== value) {
    text.value = filtered;
    selection.value = {start:filtered.length,end:filtered.length};
  }
}, [text, selection]);
<Host matchContents={{vertical:true}}>
  <TextInput value={text} selection={selection} onChangeText={onChangeText} />
</Host>
```

value와 selection을 같은 worklet에서 함께 쓰지 않으면 빠른 입력이 잘못된 위치에 들어갈 수 있다. 예제의 end snap은 끝에서 입력할 때의 간단한 정책이며 중간 수정/IME composing을 지원하는 완전한 mask가 아니다. production international phone/currency/date mask에는 cursor math/locale를 처리하는 react-native-mask-input/mask-text 등을 검토한다.

form 여러 field는 React Hook Form의 Controller(단순 register는 native binding이 아님) 또는 Formik을 연결할 수 있다. Switch는 항상 value/onValueChange controlled라 callback에서 value를 안 바꾸면 원래 값으로 돌아간다. RefreshControl은 onRefresh에서 refreshing=true, 종료 false가 필요하고 Checkbox value/onValueChange, Picker selectedValue/onValueChange도 discrete value 계약이다. 원문 주장은 구성 패턴 설명이며 특정 입력 지연 benchmark나 모든 IME 호환 결과가 아니다.

## 출처

- [Expo Documentation, Controlled components](https://docs.expo.dev/guides/controlled-components)

## 관련 문서

- [[Expo-Integrations-Keyboard]]
- [[Expo-Integrations-Rich-Text]]
- [[Expo-Integrations-Localization]]
