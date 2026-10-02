---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Alert와 ConfirmationDialog"]
---

# Expo SwiftUI Alert와 ConfirmationDialog

iOS/tvOS와 Expo Go의 native dialog다. 둘 다 title 필수 문자열, isPresented와 onIsPresentedChange(boolean), children ReactNode와 CommonViewModifierProps를 지원한다. Trigger/Actions/Message slot 모델이 같아 같은 작업 선택 UI의 형태를 바꿀 수 있다.

## Alert

중앙 modal alert를 표시한다. Alert.Trigger는 항상 보이는 control, Alert.Actions는 Button 목록, Alert.Message는 선택적 설명이다. trigger의 onPress에서 presentation state를 true로 바꾼다. cancel/destructive semantic role은 Button에 지정한다.

## ConfirmationDialog

action-sheet 형태의 확인/다중 선택 dialog다. ConfirmationDialog.Trigger/Actions/Message를 사용한다. titleVisibility 기본 automatic, visible/hidden을 지정할 수 있다. hidden이어도 접근성 용도를 위해 title은 제공한다.

```tsx
import { useState } from 'react';
import { Host, Alert, Button, Text } from '@expo/ui/swift-ui';
export function RemoveDialog() {
  const [open, setOpen] = useState(false);
  return <Host matchContents><Alert title="항목 삭제" isPresented={open}
    onIsPresentedChange={setOpen}>
    <Alert.Trigger><Button label="삭제" onPress={() => setOpen(true)} /></Alert.Trigger>
    <Alert.Actions><Button label="삭제" role="destructive" onPress={() => {
      removeItem(); setOpen(false);
    }} /><Button label="취소" role="cancel" /></Alert.Actions>
    <Alert.Message><Text>삭제할 항목을 확인해 주세요.</Text></Alert.Message>
  </Alert></Host>;
}
```

native dismissal과 앱 state를 동기화하려고 onIsPresentedChange를 연결한다. UI 확인 버튼을 눌렀다는 사실과 비동기 저장/삭제 성공은 별개이므로 실제 작업 결과는 앱에서 관리한다. Alert는 RN Alert static API와 import가 다르다.

## 출처

- [Expo Documentation, Alert](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/alert)
- [Expo Documentation, ConfirmationDialog](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/confirmationdialog)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
