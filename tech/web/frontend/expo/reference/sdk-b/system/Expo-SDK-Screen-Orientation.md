---
tags: [expo, expo-sdk, system]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 화면 방향 lock과 이벤트"]
---

# Expo 화면 방향 lock과 이벤트

expo-screen-orientation은 Android/iOS/web/Expo Go의 화면에 그려지는 방향을 관리한다. 기기의 물리 motion orientation과 다른 값이다. web은 제한되고 iOS lock은 user preference를 override할 수 있다. Router stack의 per-screen orientation은 Stack.Screen option을 우선 사용한다.

## Lock API와 native config

getOrientationAsync→Orientation, getOrientationLockAsync→OrientationLock, getPlatformOrientationLockAsync→PlatformOrientationInfo다. lockAsync(lock)/unlockAsync는 Promise<void>이고 unlock은 DEFAULT 정책으로 돌린다. supportsOrientationLockAsync로 가능 여부를 확인한다. lockPlatformAsync는 iOS allowed Orientation array, Android native constant(-1 unspecified 등), web lock string을 받아 invalid option이면 reject한다.

Orientation은 UNKNOWN/PORTRAIT_UP/DOWN/LANDSCAPE_LEFT/RIGHT다. Lock은 DEFAULT/ALL/PORTRAIT/UP/DOWN/LANDSCAPE/LEFT/RIGHT이며 OTHER/UNKNOWN은 조회용이라 lockAsync에 넣지 않는다. ALL/PORTRAIT는 PORTRAIT_DOWN 미지원 device에서 invalid다. DEFAULT는 iOS portrait-down 제외, Android system 결정이다.

```ts
if (await ScreenOrientation.supportsOrientationLockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)) {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}
```

iOS plugin initialOrientation은 launch 값이고 iPad lock에는 requireFullScreen과 multitasking 포기가 필요할 수 있다. source의 iPad always-landscape 설명은 역사적 multitasking context이며 현재 모든 iPad 화면의 절대 상태로 읽지 않는다. web lock은 browser/fullscreen policy를 확인한다.

## Event lifecycle

addOrientationChangeListener는 portrait↔landscape 변화 때 OrientationChangeEvent를 준다. up↔down 같은 category 내부 rotation은 callback을 발생시키지 않는다. event orientationInfo는 orientation/iOS horizontalSizeClass/verticalSizeClass(compact/regular/unknown), orientationLock을 포함한다. subscription.remove로 정리하고 deprecated removeOrientationChangeListener(s)/global remove-all을 피한다. 화면별 lock 변경이 다른 mounted screen과 충돌하지 않도록 focus owner를 정한다.

## 출처

- [Expo Documentation, ScreenOrientation](https://docs.expo.dev/versions/latest/sdk/screen-orientation)

## 관련 문서

- [[Expo-Router-Stack]]
- [[Expo-SDK-Sensor-Light-Magnetic]]
- [[Expo-Integrations-TV]]
