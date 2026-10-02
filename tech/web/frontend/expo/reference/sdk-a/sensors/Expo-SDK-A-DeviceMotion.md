---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["DeviceMotion orientation과 복합 sensor"]
---

# DeviceMotion orientation과 복합 sensor

## 설치, 축과 native config

`npx expo install expo-sensors`, `import { DeviceMotion } from 'expo-sensors'`. Android/iOS/web/Expo Go를 지원한다. portrait 기준 X는 좌우, Y는 아래에서 위, Z는 화면 뒤에서 앞이다. Gravity constant는9.80665m/s²다.

iOS는 NSMotionUsageDescription이 필요하다. CNG app의 expo-sensors plugin `motionPermission`으로 usage message를 설정한다. native 프로젝트를 직접 관리하면 Info.plist에 같은 key를 선언한다. 설정 변경은 native build가 필요하다.

## Measurement의 단위

| Field | 의미 |
|---|---|
| acceleration | gravity 제외 x/y/z와 timestamp, nullable, m/s² |
| accelerationIncludingGravity | 중력 포함 x/y/z와 timestamp, m/s² |
| interval | 실제 native sampling 간격 ms |
| rotation | alpha(Z), beta(X), gamma(Y), timestamp |
| rotationRate | alpha/beta/gamma 각속도 deg/s, nullable |
| orientation | portrait0, right landscape90, upside-down180, left landscape-90 |

독립 Accelerometer의 g, Gyroscope의 rad/s와 단위를 맞춘다. screen orientation과 공간 회전은 다른 field 다. nullable acceleration/rotationRate를 항상 존재한다고 가정하지 않는다.

## Subscription과 permission

```ts
DeviceMotion.setUpdateInterval(100);
const subscription = DeviceMotion.addListener(measurement => {
  const acceleration = measurement.acceleration;
  if (acceleration) console.log(acceleration.x);
});
subscription.remove();
```

isAvailableAsync, getPermissionsAsync/requestPermissionsAsync, hasListeners/getListenerCount와 addListener를 사용한다. mobile web permission은 user gesture에서 요청하고 HTTPS/Safari motion setting을 확인한다. web availability는 event timer 추정이므로 기기 지원을 완전히 판별하지 못한다.

Android12+200Hz 초과 sampling은 HIGH_SAMPLING_RATE_SENSORS 선언이 필요하다. interval은 목표이지 real-time guarantee가 아니다. deprecated removeAllListeners 대신 자신이 만든 subscription만 제거하고 background 나 화면 종료 시 측정을 중단한다.

## 출처

- [Expo Documentation, DeviceMotion](https://docs.expo.dev/versions/latest/sdk/devicemotion)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
