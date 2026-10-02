---
tags: [expo, expo-sdk, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo screen capture와 app switcher 보호"]
---

# Expo screen capture와 app switcher 보호

expo-screen-capture는 Android/iOS/Expo Go에서 screenshot/recording 방지와 foreground screenshot event를 제공한다. capture 방지 permission과 screenshot 감지 permission은 다르다. 외부 camera 촬영이나 server resource 유출까지 막는 기능은 아니다.

## Capture lock과 inactive overlay

usePreventScreenCapture(key=default)는 mount 동안 lock을 유지한다. preventScreenCaptureAsync(key)/allowScreenCaptureAsync(key)는 Promise<void>이며 같은 key를 해제한다. 여러 key면 모두 release해야 허용된다. iOS recordings는 11+, screenshot은 13+며 이전 OS는 no-op다. Android는 FLAG_SECURE로 recent-app preview도 blank가 된다.

```tsx
function PrivateScreen() { usePreventScreenCapture('private-route'); return <View />; }
```

enableAppSwitcherProtectionAsync(blurIntensity=0.5)는 0..1 blur로 app switcher/background/interruptions의 내용을 가리고 active 복귀 때 제거한다. disableAppSwitcherProtectionAsync로 해제한다. Android의 FLAG_SECURE 보호와 별 overlay의 플랫폼 동작을 구분한다.

## Screenshot listener와 permission

addScreenshotListener(()=>void)는 foreground screenshot event와 subscription을 반환한다. useScreenshotListener는 mount/unmount를 자동 관리한다. subscription.remove를 쓰고 old removeScreenshotListener는 deprecated다. isAvailableAsync→boolean, usePermissions는 [response|null, request, get]이며 get/requestPermissionsAsync는 PermissionResponse다.

Android14+ listener와 capture blocking은 추가 permission이 없다. Android13 감지는 READ_MEDIA_IMAGES, 그 이전은 READ_EXTERNAL_STORAGE다. overview의 Android13 이하 전체 READ_MEDIA_IMAGES 문구는 세부 API table과 불일치하므로 OS별 표를 따른다. broad photo permission은 Google Play 정책에서 필요한 앱에만 허용되어 screenshot 감지 하나만으로 무조건 요청하지 않는다. iOS get/request는 granted지만 actual screenshot 예방은 OS 지원 범위를 따른다. async setup 중 unmount하면 나중에 생긴 subscription까지 cleanup한다.

## 출처

- [Expo Documentation, ScreenCapture](https://docs.expo.dev/versions/latest/sdk/screen-capture)

## 관련 문서

- [[Expo-SDK-SecureStore]]
- [[Expo-Integrations-Privacy]]
- [[Expo-Router-Hooks]]
