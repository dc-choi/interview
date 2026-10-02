---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI TextField와 SecureField"]
---

# Expo SwiftUI TextField와 SecureField

두 컴포넌트는 iOS/tvOS와 Expo Go를 지원하며 Host 안에 폭을 제공한다. import는 `@expo/ui/swift-ui`, modifier는 `/modifiers` 경로다. **text prop은 문자열이나 React state가 아니라 ObservableState<string>**이다. 생략하면 자체 내부 상태를 사용하고 onTextChange로 변화만 받을 수 있다.

## TextField

text={useNativeState('')}로 binding한다. axis 기본 horizontal은 단일 줄, vertical은 내용에 따라 세로 확장하며 lineLimit으로 보이는 줄을 제한한다. placeholder 문자열 외에 TextField.Placeholder 안의 Text에 styling modifier를 적용할 수 있다. autoFocus 기본 false, maxLength는 native 입력 중 잘라낸다.

onFocusChange(boolean)은 focus 변경, onTextChange(string)는 입력 변경이다. callback에 'worklet'을 선언하면 UI thread에서 동기 실행하고, 일반 callback은 JS에 비동기 event로 전달한다. 동기 formatting에는 react-native-worklets가 필요하다. React Compiler에서는 state.get/set을 사용한다.

TextFieldRef의 focus/blur/clear/setText는 Promise<void>다. `setSelection(start, end)`와 selection ObservableState<{start,end}>, onSelectionChange는 **iOS/tvOS 18+**다. start/end는 text 내 character offset이다. 구버전에서도 text formatting은 가능하지만 cursor 제어는 제공되지 않는다.

```tsx
import { useRef } from 'react';
import { Host, TextField, useNativeState, type TextFieldRef } from '@expo/ui/swift-ui';
import { lineLimit, keyboardType, autocorrectionDisabled, submitLabel,
  onSubmit } from '@expo/ui/swift-ui/modifiers';
export function Search() {
  const ref = useRef<TextFieldRef>(null);
  const text = useNativeState('');
  return <Host style={{ width: '100%', height: 80 }}><TextField
    ref={ref} text={text} placeholder="검색" maxLength={100}
    modifiers={[keyboardType('default'), autocorrectionDisabled(),
      submitLabel('search'), onSubmit(() => search(text.get()))]} />
  </Host>;
}
```

onTextChange worklet에서 변환한 값을 state에 다시 쓰고 selection도 조정하면 입력과 형식 사이의 flicker를 줄일 수 있다. phone mask처럼 매번 cursor를 끝으로 이동하는 데모는 중간 편집 시 위치 보정을 별도로 설계해야 한다.

## SecureField

민감한 입력을 시각적으로 mask한다. placeholder 또는 SecureField.Placeholder/Text, autoFocus(false), maxLength, onFocusChange, onTextChange와 native text binding을 지원한다. **SecureField에는 TextField의 axis/selection APIs가 기재되어 있지 않다**. SecureFieldRef의 focus/blur/clear/setText는 Promise<void>다.

submitLabel('done')와 onSubmit(handler)로 키보드 제출을 연결한다. 값은 mask되어도 실제 문자열을 앱이 읽으므로 저장/로그/전송 정책은 별도 책임이다. 패스워드 변경 Form에는 여러 SecureField를 배치하고 native ref로 focus를 이동할 수 있다. 화면의 mask를 암호화나 안전한 영구 저장으로 해석하지 않는다.

## 출처

- [Expo Documentation, TextField](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/textfield)
- [Expo Documentation, SecureField](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/securefield)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
