---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal TextInput observable state와 입력 API"]
---

# Universal TextInput observable state와 입력 API

## RN 호환 API의 중요한 차이

Android Compose TextField/BasicTextField, iOS SwiftUI TextField/SecureField, web RN TextInput을 사용한다. RN처럼 보이는 surface지만 value와 selection은 useNativeState의 ObservableState 객체다. 일반 string React state를 value로 전달하는 API가 아니다. value omitted면 uncontrolled internal text, defaultValue는 최초 mount 값이다.

```tsx
const text = useNativeState('Hello');
const change = useCallback((next:string)=>{
  'worklet';
  text.value = next;
},[text]);
<TextInput value={text} onChangeText={change} placeholder="Type here" />
```

onChangeText worklet은 UI thread에서 synchronous update하여 JS round-trip cursor flicker를 줄인다. react-native-worklets 설치가 필요하다. mask helper도 worklet이 되어야 한다. sample phone mask는 cursor를 end로 이동시키므로 실제 mid-string editing/selection 보존에는 더 정확한 cursor mapping이 필요하다.

## Supported props

| 그룹 | API/기본값 | 의미/우선순위 |
| --- | --- | --- |
| 값 | value ObservableState<string>, defaultValue string | controlled 또는 initial uncontrolled |
| edits | onChangeText(string), maxLength number | 변경 관찰/길이 제한 |
| 편집 허용 | editable true, readOnly false | editable 우선, false여도 selection/copy 가능 |
| focus | autoFocus false, onFocus()/onBlur() | mount focus와 events |
| capital/correct | autoCapitalize sentences(none/words/characters), autoCorrect true | 자동 대문자/교정 |
| keyboard | keyboardType default, inputMode | 둘 다 설정하면 keyboardType 우선 |
| return | returnKeyType, enterKeyHint | returnKeyType 우선 |
| multiline | multiline false, numberOfLines, rows | numberOfLines 우선, fixed visible lines |
| submit | onSubmitEditing(text) | RN event object 대신 current string |
| selection | ObservableState<{start,end}>, onSelectionChange(range) | observation state, 설정은 ref.setSelection |
| focus select | selectTextOnFocus false | focus마다 selection을 전체 range로 overwrite |
| secure | secureTextEntry false | password mode |
| cursor | caretHidden, cursorColor, selectionColor, selectionHandleColor | platform differences 아래 참고 |
| placeholder | placeholder, placeholderTextColor | empty text 안내 |
| sizing | onContentSizeChange({width,height}) | padding/border 포함 outer view geometry |
| alignment | textAlign auto(left/right/center/justify) | iOS justify default fallback |
| styling | style box subset, textStyle typography subset, modifiers | native modifiers wrong platform ignored |
| testing/ref | testID, Ref<TextInputRef> | E2E/action interface |

API table에는 keyboard hint types가 linked되지만 허용 literals 전체가 여기 source에 나오지는 않는다. 설치 package type/reference에서 확인한다. 지원 목록에 없는 RN props는 Compose/SwiftUI 대응이 없어 unsupported일 수 있다.

## OS 조건과 no-op

selection source label은 iOS18+를 명시하며 pre18 ignored다. setSelection reference도 iOS18+다. selectTextOnFocus는 iOS18+/Android/web이라고 별도 명시하므로 다른 OS에서의 cursor contract를 임의로 일반화하지 않는다. secure iOS SecureField는 selection/selectTextOnFocus/onSelectionChange/multiline/numberOfLines가 no-op다.

numberOfLines는 multiline visible height를 고정하며 iOS16 미만에서는 natural grow다. iOS visible-password keyboard는 default, Android ascii-capable/numbers-and-punctuation/name-phone-pad/twitter/web-search는 text fallback이다. iOS emergency-call return은 default, Android join/route/emergency-call은 default action이다.

iOS selectionColor는 cursor도 tint한다. caretHidden은 transparent tint로 selection highlight도 숨기고 selectionColor보다 우선한다. Android selectionHandleColor는 drag handles만, cursorColor는 separate cursor color다. underlineColorAndroid는 deprecated/no-effect(unstyled BasicTextField)이며 custom border는 style/modifiers로 그린다.

## Imperative ref

focus(), blur(), clear(), isFocused():boolean, setSelection(start,end):Promise<void>를 제공한다. controlled clear와 observable update가 일관되는지 확인한다. onContentSizeChange는 RN text content geometry와 다르므로 autogrow 계산에 padding/border를 다시 더하지 않는다. secure input/IME/mask/mid-string editing은 actual OS별로 검증한다.

## 출처

- [Expo Documentation, TextInput](https://docs.expo.dev/versions/latest/sdk/ui/universal/textinput)

## 관련 문서

- [[Expo-UI-Host]]
- [[Expo-UI-Text-Icons]]
