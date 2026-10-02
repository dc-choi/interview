---
tags: [react-native, basics]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 텍스트 입력"]
---

# React Native 텍스트 입력

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 입력 이벤트 계약

`TextInput`은 사용자가 문자열을 입력하는 Core Component다. `onChangeText`는 텍스트가 바뀔 때 새 문자열을 콜백에 전달하고, `onSubmitEditing`은 입력 제출 시 호출한다. 입력 변경과 제출은 다른 시점이므로 실시간 표시와 제출 후 처리에 서로 다른 이벤트를 사용한다.

변하는 텍스트를 다른 화면 요소에 표시하거나 검증하려면 state에 보관한다. `placeholder`는 입력 전 안내 문구이고 `defaultValue`는 초기 표시값이다. 입력을 state 값으로 계속 제어하려면 `value`와 `onChangeText`를 함께 사용한다. 입문 예제의 `defaultValue={text}`를 제어 입력과 같은 계약으로 읽지 않는다.

```tsx
import {useState} from 'react';
import {Text, TextInput, View} from 'react-native';

const WordCounter = () => {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="문장을 입력하세요"
        style={{height: 40, padding: 5, borderWidth: 1}}
      />
      <Text>단어 수: {wordCount}</Text>
    </View>
  );
};
```

예제는 입력 이벤트, state 업데이트, 파생 표시값의 흐름을 보여준다. 단어 수는 text에서 계산할 수 있으므로 별도의 state로 중복 보관하지 않는다. 원래 입문 예제는 공백으로 나눈 각 단어를 동일한 표시 문자로 치환하며, 중요한 부분은 변하는 원문을 state에 저장한다는 점이다.

## 입력 중 검증과 제출

- 입력 중 검증은 `onChangeText`와 현재 state를 기준으로 안내를 갱신한다.
- 제출 후 저장이나 요청은 `onSubmitEditing` 등 제출 이벤트와 연결한다.
- 형식 검증, 키보드 설정과 플랫폼별 동작은 사용하려는 `TextInput` API의 개별 props를 확인한다.
- 입력 state와 원격 요청의 완료 상태를 구분한다. 텍스트가 바뀌었다고 서버 저장까지 끝났다는 뜻은 아니다.

입력은 터치, 스크롤과 함께 사용하는 한 상호작용 경로다. 실제 폼에서는 키보드가 화면을 가리는 조건, 접근성과 제출 동작을 대상 기기에서 확인한다.

## keyboard, autofill과 submit 우선순위

| 계약 | 우선순위와 조건 |
|---|---|
| inputMode / keyboardType | inputMode가 우선, 숫자 keyboard는 검증을 대체하지 않음 |
| enterKeyHint / returnKeyType | enterKeyHint가 우선, 버튼 표시와 실제 submit 동작은 별개 |
| autoComplete / textContentType | iOS에서 둘 다 주면 textContentType 우선, 의미가 충돌하지 않게 한 방식 선택 |
| submitBehavior / blurOnSubmit | submitBehavior가 deprecated blurOnSubmit을 대체 |

submitBehavior의 submit은 제출만 하고 blur하지 않는다. blurAndSubmit은 둘 다 수행한다. multiline의 기본은 newline, single-line의 기본은 blurAndSubmit이다. onSubmitEditing은 iOS phone-pad에서 호출되지 않는 조건을 고려한다.

password/username/new-password/one-time-code 등의 autofill 의미와 secureTextEntry를 목적에 맞게 정한다. secureTextEntry는 multiline과 함께 동작하지 않으며 일부 Android keyboardType과의 문제가 문서에 남아 있다. masking이 저장/전송 보안을 대신하지 않는다.

## 편집, selection과 event

maxLength는 native 길이 제한이며 JS에서 매번 이전 value를 강제로 돌리는 것보다 flicker를 줄인다. 편집을 금지하려면 editable=false/readOnly를 사용한다. selection의 start/end가 같으면 cursor 위치를 지정한다. cursorColor, selectionColor와 selectionHandleColor는 목적과 지원 플랫폼이 다르다.

onChangeText는 문자열, onChange는 text/eventCount/target을 가진 event다. onBlur에서 text가 없을 수 있으므로 마지막 입력은 state나 onEndEditing으로 얻는다. onContentSizeChange는 multiline에서만 호출한다. Android onKeyPress는 soft keyboard 중심이므로 hardware input 전체 감지로 사용하지 않는다.

multiline 정렬은 iOS 상단, Android 중앙이므로 같은 배치를 원하면 textAlignVertical=top을 준다. numberOfLines/rows와 font scaling, iOS line break 정책을 함께 확인한다. onSelectionChange와 onScroll은 다른 event 구조다.

## native input 조작과 플랫폼 제약

ref의 focus/blur/clear/isFocused를 사용할 수 있다. 키보드 뒤로 닫기 이후 Android focus 재호출 등 알려진 문제가 있으므로 programmatic focus와 keyboard 표시를 같은 상태로 가정하지 않는다.

Android underlineColorAndroid와 windowSoftInputMode는 border/keyboard layout에 영향을 준다. selection이 adjustResize로 바뀌면 absolute 요소가 움직일 수 있다. iOS inputAccessoryViewID는 toolbar 연결이고 dataDetectorTypes는 multiline=true, editable=false 조건이다. context menu, autocorrection, spellCheck와 fullscreen editing 설정은 사용자의 실제 입력 흐름을 보고 고른다.

## 출처

- [React Native, Handling Text Input](https://reactnative.dev/docs/handling-text-input)

- [React Native, textinput](https://reactnative.dev/docs/textinput)

## 관련 문서

- [[RN-React-Fundamentals]]
- [[React-DOM-Form-Controls]]
- [[RN-Core-Components]]
- [[RN-Keyboard-Layout]]
- [[RN-Native-Nodes]]
- [[RN-Security-Storage]]
