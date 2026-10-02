---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Barometer 기압과 상대 고도"]
---

# Barometer 기압과 상대 고도

## 측정 계약

`npx expo install expo-sensors`, `import { Barometer } from 'expo-sensors'`. Android와 실제 iOS 기기/Expo Go에서 지원한다. web data access는 지원되지 않아 UnavailabilityError가 발생할 수 있다.

BarometerMeasurement의 pressure는 hPa, timestamp는 초다. iOS-only relativeAltitude는 meter 단위이며 기준 시점 대비 변화다. GPS 나 해발 절대 고도와 동일하지 않다. iOS CMAltimeter, Android TYPE_PRESSURE에 기반한다.

```ts
if (await Barometer.isAvailableAsync()) {
  Barometer.setUpdateInterval(1000);
  const subscription = Barometer.addListener(({ pressure, relativeAltitude }) => {
    console.log(pressure, relativeAltitude);
  });
  // 사용 종료
  subscription.remove();
}
```

## 공통 sensor API

isAvailableAsync는 hardware/API availability를 Promise<boolean>으로 확인한다. getPermissionsAsync/requestPermissionsAsync는 PermissionResponse 다. addListener는 subscription, hasListeners/getListenerCount는 등록 상태, setUpdateInterval은 desired ms를 받는다. removeAllListeners는 deprecated이고 개별 subscription.remove로 cleanup 한다.

reference의 Android200Hz 제한 설명은 DeviceSensor 공통 설명이다. 실제 barometer hardware의 제공 frequency가 그 값까지 보장되는 것은 아니다. SDK57 최소 OS 지원을 원문의 오래된 sensor API9/iOS8 문장으로 대체하지 않는다.

기압은 환경/날씨의 영향을 받으므로 높이 변화 추정과 절대 고도 계산을 분리한다. relativeAltitude가 없는 Android에서는 optional 값을 필수 number로 가정하지 않는다. unavailable device에서는 기능을 숨기거나 명시적 대안을 제공한다.

## 출처

- [Expo Documentation, Barometer](https://docs.expo.dev/versions/latest/sdk/barometer)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
