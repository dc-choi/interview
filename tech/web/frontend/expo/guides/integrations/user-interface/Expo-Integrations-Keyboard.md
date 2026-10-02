---
tags: [expo, expo-integrations, user-interface]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo keyboard 레이아웃과 animation"]
---

# Expo keyboard 레이아웃과 animation

단순 input은 RN KeyboardAvoidingView/Keyboard로 처리하고 긴 form/chat animation에는 react-native-keyboard-controller를 고려한다. OS inset, tab와 native window resize가 함께 움직여 같은 keyboard 높이를 이중 padding하지 않도록 확인한다.

## 기본 API

KeyboardAvoidingView는 keyboard 높이에 따라 height/position/padding을 바꾼다. iOS behavior=padding, Android undefined 예제는 시작점이며 screen/window 구성마다 적합한 mode가 다르다. JS bottom tab은 tabBarHideOnKeyboard=true로 숨길 수 있다. Android softwareKeyboardLayoutMode=pan은 tab이 keyboard 위로 밀리는 문제의 선택지지만 native window config라 custom binary의 rebuild를 확인한다. source의 restart/reload만으로 모든 native config가 적용된다고 보장하지 않는다. NativeTabs는 자체 IME 정책을 별도로 갖는다.

Keyboard.addListener('keyboardDidShow'/'keyboardDidHide',callback)는 subscription을 반환하고 effect cleanup에서 remove한다. Keyboard.dismiss는 keyboard를 닫는다. iOS/Android event timing/support 차이 때문에 event만으로 animation의 매 frame 위치를 얻는다고 가정하지 않는다.

## Keyboard Controller

native library는 Expo Go에 없고 development build/Reanimated가 필요하다. root KeyboardProvider로 context를 만든 뒤 KeyboardAwareScrollView가 focus input까지 scroll한다. KeyboardToolbar는 previous/next/dismiss를 제공한다. bottomOffset은 toolbar 등을 위한 여유 높이이며62 예제값을 실제 toolbar/edge inset에 맞춘다.

```tsx
<KeyboardProvider><Stack /></KeyboardProvider>
// Form route
<KeyboardAwareScrollView bottomOffset={62}><TextInput /><TextInput /></KeyboardAwareScrollView>
<KeyboardToolbar />
```

useKeyboardHandler.onMove는 worklet에서 event.height를 SharedValue에 넣어 UI-thread animation을 만들 수 있다. useAnimatedStyle의 spacer height로 chat list/input을 밀어 올리고 숨길 때0으로 돌린다. Math.max(height,0) 등 platform height sign을 명확히 정하고 screen safe area와 StatusBar padding을 중복하지 않는다. 한국어 IME/하드웨어 keyboard, multiline input, interactive dismiss와 orientation은 실제 기기에서 확인한다.

## 출처

- [Expo Documentation, Keyboard handling](https://docs.expo.dev/guides/keyboard-handling)

## 관련 문서

- [[Expo-Integrations-Controlled-Input]]
- [[Expo-Router-Native-Tabs]]
- [[Expo-Integrations-Rich-Text]]
