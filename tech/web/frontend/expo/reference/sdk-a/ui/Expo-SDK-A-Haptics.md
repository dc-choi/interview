---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Haptics feedback와 플랫폼 제약"]
---

# Haptics feedback와 플랫폼 제약

## 설치와 API

`npx expo install expo-haptics`, `import * as Haptics from 'expo-haptics'`. Android/iOS/web를 지원한다. Android VIBRATE는 자동 선언되며 performAndroidHapticsAsync 경로는 해당 permission 없이 system haptic engine을 사용한다.

| Method | 목적/기본 |
|---|---|
| selectionAsync | 선택 값 변경 피드백 |
| impactAsync(style) | Light/Medium(default)/Heavy/Rigid/Soft collision |
| notificationAsync(type) | Success(default)/Warning/Error 완료 결과 |
| performAndroidHapticsAsync(type) | Android semantic system effect |

Promise<void>는 native trigger 완료이며 사용자가 실제 진동을 느꼈다는 증거가 아니다. Android impact/notification Vibrator simulation보다 native haptic feedback API가 권장된다.

```ts
if (Platform.OS === 'android') {
  await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
} else {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
```

## Android semantic presets

Confirm/Reject는 결과, Toggle_On/Off는 switch, Segment_Tick/Frequent_Tick은 selection, Drag_Start는 drag 시작이다. Gesture_Start/End, Keyboard_Press/Release/Tap, Virtual_Key/Release, Long_Press, Context_Click, Clock_Tick, Text_Handle_Move도 제공한다. No_Haptics는 feedback 없음이다. frequent tick은 아주 부드러운 effect를 못 만드는 장치에서 아무 진동도 없을 수 있다.

## 제한

iOS Low Power Mode, 사용자의 Taptic 설정 off, camera 또는 dictation active에서는 engine이 반응하지 않을 수 있다. web는 browser Vibration API, hardware/permission/user interaction 정책이 필요하며 background tab에서 무시될 수 있다. critical 성공/실패 안내를 진동 하나로만 전달하지 말고 visual/text feedback도 둔다. 무작정 매 render 마다 호출하지 않고 의미 있는 interaction 시점에 실행한다.

## 출처

- [Expo Documentation, Haptics](https://docs.expo.dev/versions/latest/sdk/haptics)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
