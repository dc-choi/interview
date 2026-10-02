---
tags: [expo, react-native, inputs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose TextField의 입력과 선택 영역"]
---

# Compose TextField의 입력과 선택 영역

`TextField`는 filled Material 입력, `OutlinedTextField`는 윤곽선 입력, `BasicTextField`는 컨테이너와 패딩이 없는 입력 primitive다. Android 전용이며 플랫폼 공통 입력은 Universal TextInput에서 제공한다.

## 상태와 callback

세 변형의 `value`는 선택적 `ObservableState<string>`이다. `useNativeState('')`로 만들고 생략하면 필드가 내부 상태를 관리한다. 일반 문자열을 value로 넣는 React Native TextInput 계약과 다르다. 상태를 전달한 기본 입력은 사용자의 텍스트 변경을 자체 추적한다. `onValueChange` worklet으로 입력을 변환하면 UI 스레드에서 다음 프레임 전 상태에 반영할 수 있다. worklet에는 `react-native-worklets` 의존성이 필요하다.

```tsx
const text = useNativeState('');
const normalize = useCallback((value: string) => {
  'worklet';
  text.set(value.toUpperCase());
}, [text]);
<TextField value={text} onValueChange={normalize} maxLength={20}>
  <TextField.Label><Text>사용자 이름</Text></TextField.Label>
</TextField>
```

`onValueChange(string)`은 일반 함수면 JS 비동기 이벤트다. 선택 영역만 바뀌면 텍스트 callback으로 감지하지 않는다. `selection`은 `ObservableState<{start,end}>`이며 사용자 선택을 상태에 기록하고 JS/worklet 쓰기를 커서에 반영한다. `onSelectionChange({start,end})`도 제공한다. 한 번만 바꾸려면 ref의 setSelection을 쓴다.

| 공통 속성 | 동작 |
| --- | --- |
| `enabled`, `readOnly` | 기본 true, false |
| `autoFocus`, `singleLine` | 기본 false, false |
| `maxLength` | 네이티브에서 입력을 잘라 제한 |
| `minLines`, `maxLines` | 표시 줄 수 제약 |
| `onFocusChanged(boolean)` | 초점 얻기/잃기 |
| `visualTransformation` | `password` 마스킹 또는 기본 `none`. 표시 변환이며 원본 버퍼 자체는 유지 |
| `textSelectionColors` | 필수 쌍 `handleColor`, `backgroundColor`. 커서 선의 색과 독립 |
| `textStyle` | color/fontFamily/fontSize/fontWeight/letterSpacing/lineHeight/textAlign |
| `children`, `modifiers`, `ref` | 장식 슬롯, modifier, 명령형 제어 |

fontWeight는 100~900 문자열 또는 normal/bold, textAlign은 left/right/center/justify다. 키보드 password 종류 선택과 표시 password 마스킹은 각각 설정한다.

## 장식 슬롯과 색

Material 두 변형은 `.Label`, `.Placeholder`, `.LeadingIcon`, `.TrailingIcon`, `.Prefix`, `.Suffix`, `.SupportingText` 슬롯을 공유한다. `isError` 기본 false, `shape`는 `<Shape.Pill />` 같은 Shape JSX를 받으며 기본은 Material 변형별 shape다.

`colors`는 모든 필드가 선택적 ColorValue다. SDK57 공식 API 표에 공개된 필드는 다음과 같다.

| 그룹 | 필드 구성 |
| --- | --- |
| 커서 | `cursorColor`, `errorCursorColor` |
| disabled | `disabledContainerColor`, `disabledIndicatorColor`, `disabledLabelColor`, `disabledLeadingIconColor`, `disabledTrailingIconColor`, `disabledPlaceholderColor`, `disabledPrefixColor`, `disabledSuffixColor`, `disabledSupportingTextColor`, `disabledTextColor` |
| error | `errorContainerColor`, `errorIndicatorColor`, `errorLabelColor`, `errorLeadingIconColor`, `errorTrailingIconColor`, `errorPlaceholderColor`, `errorPrefixColor`, `errorSuffixColor`, `errorSupportingTextColor`, `errorTextColor` |

Basic에는 Material colors/isError/shape 대신 직접 `cursorColor`가 있고 기본은 테마 primary다. `.DecorationBox` 안에 `.InnerTextField`를 배치해야 실제 편집 영역이 나온다. `.Placeholder`는 비어 있을 때 네이티브에서만 보이게 전환한다.

```tsx
<BasicTextField value={text} modifiers={[fillMaxWidth(), paddingAll(12)]}>
  <BasicTextField.DecorationBox>
    <Box>
      <BasicTextField.Placeholder><Text>검색어</Text></BasicTextField.Placeholder>
      <BasicTextField.InnerTextField />
    </Box>
  </BasicTextField.DecorationBox>
</BasicTextField>
```

## 키보드와 명령형 제어

`keyboardOptions` 기본은 autoCorrectEnabled true, capitalization none, imeAction default, keyboardType text다. capitalization은 none/characters/words/sentences, imeAction은 default/none/go/search/send/previous/next/done, keyboardType은 text/number/email/phone/decimal/password/ascii/uri/numberPassword를 받는다.

`keyboardActions`의 `onGo`, `onSearch`, `onSend`, `onPrevious`, `onNext`, `onDone`은 대응 IME 행동에서 현재 텍스트를 전달한다. 입력 종류만 바꿔 제출 callback이 자동으로 정해지는 것은 아니다.

세 변형의 ref는 `focus()`, `blur()`, `clear()`, `setText(string)`, `setSelection(start,end)`를 제공하고 모두 Promise<void>를 반환한다. BasicTextFieldRef는 동일한 계약이다. 마스크 입력은 text와 selection을 같은 worklet에서 변경하면 깜빡임을 줄인다. 원문 전화번호 데모처럼 커서를 항상 끝에 두는 방식은 중간 편집에 적합하지 않으므로 실제 제품은 선택 영역 매핑을 계산해야 한다.

## 출처

- [Expo Documentation, TextField](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/textfield)

## 관련 문서

- [[Expo-Compose-Native-State]]
- [[Expo-UI-TextInput]]
- [[Expo-Compose-Surfaces]]
