---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Brightness 앱 밝기와 시스템 밝기"]
---

# Brightness 앱 밝기와 시스템 밝기

## 설치와 플랫폼 범위

`npx expo install expo-brightness`, `import * as Brightness from 'expo-brightness'`. Android/iOS/Expo Go를 지원한다. 밝기는0~1이다. Android의 activity override와 global system setting을 구분한다. iOS는 app에서 조정한 화면 밝기가 lock/power-off까지 유지될 수 있지만 global setting API는 없다.

| Method | 범위 |
|---|---|
| getBrightnessAsync/setBrightnessAsync | 현재 screen/activity brightness |
| getSystemBrightnessAsync/setSystemBrightnessAsync | Android global brightness, system permission |
| getSystemBrightnessModeAsync/setSystemBrightnessModeAsync | Android AUTOMATIC1/MANUAL2, UNKNOWN0은 set 불가 |
| isUsingSystemBrightnessAsync | Android activity가 global setting을 따르는지 |
| restoreSystemBrightnessAsync | Android activity override를 해제 |
| isAvailableAsync | 지원 여부, permission 검사는 아님 |

setSystemBrightnessAsync는 brightness mode를 MANUAL로 바꾼다. 사용 전 mode를 보관하고 복원할 정책을 정한다. setBrightnessAsync는 Android foreground activity에만 적용하며 원래 global setting을 수정하는 것은 아니다.

## 권한과 예제

Android global setting은 WRITE_SETTINGS 선언과 getPermissionsAsync/requestPermissionsAsync 또는 usePermissions로 사용자 허용이 필요하다. native project는 Manifest에 선언한다. iOS에 는 별도 permission이 없다.

```ts
const original = await Brightness.getBrightnessAsync();
await Brightness.setBrightnessAsync(0.8);
// 기능 종료 시 보관한 값 복원
await Brightness.setBrightnessAsync(original);
```

원문의 setSystemBrightnessAsync 예제는 Android 전용이므로 iOS에서 그대로 호출하지 않는다. iOS addBrightnessListener는 brightness field이 벤트를 주고 remove로 정리한다. Android/web는 event가 발생하지 않는다. 설명의 power mode 문구는 battery와 혼동하지 않고 brightness change 계약으로 사용한다.

## 오류

ERR_BRIGHTNESS는 app 밝기, ERR_BRIGHTNESS_SYSTEM은 global 밝기, ERR_BRIGHTNESS_MODE는 mode(nativeError 확인), ERR_BRIGHTNESS_PERMISSIONS_DENIED는 system permission, ERR_INVALID_ARGUMENT는 잘못된 mode 다. support와 permission을 따로 검사하고 UI에서 global setting 변경의 효과를 알린다.

## 출처

- [Expo Documentation, Brightness](https://docs.expo.dev/versions/latest/sdk/brightness)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
