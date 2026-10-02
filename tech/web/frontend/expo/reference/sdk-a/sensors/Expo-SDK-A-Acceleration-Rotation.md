---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Accelerometer와 Gyroscope 측정"]
---

# Accelerometer와 Gyroscope 측정

## 설치와 지원

`npx expo install expo-sensors`, `import { Accelerometer, Gyroscope } from 'expo-sensors'`. Android, 실제 iOS 기기, 지원 web browser와 Expo Go에서 사용한다. 두 sensor는 DeviceSensor 기반이지만 하드웨어 존재와 권한을 확인해야 한다.

| 측정 | 값 | 단위 |
|---|---|---|
| AccelerometerMeasurement | x/y/z, timestamp | acceleration g, 1g 약9.81m/s², timestamp 초 |
| GyroscopeMeasurement | x/y/z, timestamp | 각속도 rad/s, timestamp 초 |

가속도의 x/y/z와 회전 각속도의 x/y/z를 같은 물리량으로 계산하지 않는다. Gyroscope는 절대 orientation이 아닌 회전 속도다.

## Subscription과 interval

```ts
if (await Accelerometer.isAvailableAsync()) {
  Accelerometer.setUpdateInterval(100);
  const subscription = Accelerometer.addListener(({ x, y, z, timestamp }) => {
    console.log({ x, y, z, timestamp });
  });
  // 화면이 끝나거나 측정 중지 시
  subscription.remove();
}
```

addListener는 EventSubscription을 반환한다. subscription.remove가 해당 listener를 제거한다. hasListeners/getListenerCount는 module의 등록 상태를 확인한다. removeSubscription도 있으나 removeAllListeners는 deprecated이며 다른 component의 구독까지 제거하므로 개별 cleanup을 사용한다. React effect에서는 state에 저장된 이전 subscription closure보다 effect가 만든 local subscription을 cleanup에서 직접 제거하는 방식이 명확하다.

setUpdateInterval은 desired milliseconds이며 실제 frequency 보장이 아니다. Android12(API31)+는200Hz 제한이 있으므로 초과 sampling은 android.permission.HIGH_SAMPLING_RATE_SENSORS 선언이 필요하다. 16ms는 약62.5Hz, 200Hz는5ms 간격이다. 모든 sample을 React render로 옮기면 UI 비용이 커질 수 있다.

## Permissions와 web

getPermissionsAsync/requestPermissionsAsync는 PermissionResponse(granted,status,canAskAgain,expires)를 반환한다. status는 granted/denied/undetermined이며 다시 요청할 수 없으면 Settings 안내가 필요하다. mobile web에서는 user interaction 안에서 requestPermissionsAsync를 호출해야 한다.

web availability는 event가 발생하는지 timer로 추정하며 formal browser feature/permission status 조회가 아니므로 신뢰도에 한계가 있다. HTTPS, Safari Motion & Orientation Access와 실제 sensor events를 함께 확인한다. denied 나 unavailable을0 측정값으로 숨기지 않는다.

## 출처

- [Expo Documentation, Accelerometer](https://docs.expo.dev/versions/latest/sdk/accelerometer)
- [Expo Documentation, Gyroscope](https://docs.expo.dev/versions/latest/sdk/gyroscope)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
