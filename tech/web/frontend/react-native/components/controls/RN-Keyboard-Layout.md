---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 키보드 회피와 입력 도구막대

React Native 0.87 기준이다. 예제는 계약을 설명하는 코드이며 앱 빌드나 기기 실행을 검증한 결과는 아니다.

## KeyboardAvoidingView

키보드 높이에 따라 container의 height, position 또는 bottom padding을 조정한다. behavior를 지정하며 Android와 iOS의 결과가 다를 수 있다. 모든 앱에서 한 behavior가 맞는 것은 아니다.

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={headerHeight}
  style={{flex: 1}}>
  <TextInput />
</KeyboardAvoidingView>
```

keyboardVerticalOffset은 screen 상단부터 RN view까지의 차이다. header가 존재하면 0으로 고정하지 않는다. `contentContainerStyle`은 position behavior의 내부 container에 적용하며 enabled로 동작을 끌 수 있다. scroll container의 키보드 dismiss와 tap 정책도 함께 맞춘다.

## iOS InputAccessoryView

키보드 위의 toolbar를 구성한다. toolbar의 nativeID와 TextInput의 inputAccessoryViewID를 같은 값으로 연결한다.

```tsx
<TextInput inputAccessoryViewID="editor-tools" />
<InputAccessoryView nativeID="editor-tools">
  <Button title="완료" onPress={Keyboard.dismiss} />
</InputAccessoryView>
```

nativeID 없이 InputAccessoryView 안에 TextInput을 넣으면 키보드 위에 붙는 입력을 만드는 패턴도 있다. backgroundColor와 style은 toolbar 표현을 조정한다. 현재 문서에는 multiline TextInput과 bottom tab bar의 알려진 문제가 남아 있으므로 조합을 기기에서 확인한다. Android의 동일 기능으로 가정하지 않는다.

## Keyboard API와 수명

Keyboard.addListener는 will/did show/hide/changeFrame event를 구독한다. Android는 didShow/didHide만 지원하고 Android 10 이하 adjustResize/adjustNothing 조건에서는 이 event도 발생하지 않을 수 있다. mount마다 등록했다면 subscription.remove로 정리한다.

Keyboard.dismiss는 키보드를 닫고 focus를 제거한다. isVisible은 마지막으로 알려진 상태, metrics는 보이는 soft keyboard의 metric 또는 undefined다. scheduleLayoutAnimation(event)는 keyboard 이동과 view 위치/크기 변경을 맞출 때 쓴다. event가 없다는 사실과 키보드가 물리적으로 보이지 않는다는 판단을 혼동하지 않는다.

## 출처

- [React Native, KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview)
- [React Native, InputAccessoryView](https://reactnative.dev/docs/inputaccessoryview)

- [React Native, keyboard](https://reactnative.dev/docs/keyboard)

## 관련 문서

- [[RN-Text-Input]]
- [[RN-ScrollView]]
- [[RN-Basic-Controls]]
