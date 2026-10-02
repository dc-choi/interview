---
tags: [expo, expo-sdk, sensors]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 센서, 조도와 자기장"]
---

# Expo 센서, 조도와 자기장

SDK57 expo-sensors는 Accelerometer/Barometer/DeviceMotion/Gyroscope/LightSensor/Magnetometer/Pedometer를 연결한다. `npx expo install expo-sensors` 후 named import를 사용한다. 기기 sensor hardware, availability와 permission을 각각 검사한다. package의 web 지원이 모든 sensor의 web 지원을 뜻하지 않는다.

## 공통 lifecycle와 native config

LightSensor는 Android-only, Magnetometer/MagnetometerUncalibrated는 Android/iOS와 Expo Go를 지원한다. isAvailableAsync→boolean, getPermissionsAsync/requestPermissionsAsync→PermissionResponse를 확인하고 addListener callback을 등록한다. permission은 status(granted/denied/undetermined), granted, canAskAgain, expires다. canAskAgain=false면 system Settings 경로를 안내한다.

addListener는 EventSubscription을 반환하고 subscription.remove로 owner lifetime에 맞춰 정리한다. getListenerCount/hasListeners는 emitter 상태다. removeAllListeners는 deprecated이고 다른 component의 listener까지 지울 수 있으므로 individual remove를 사용한다. removeSubscription도 제공된다. source의 state subscription을 empty-deps cleanup에서 읽는 예제는 stale closure를 만들 수 있어 아래처럼 local subscription을 잡는다.

```tsx
useEffect(() => {
  LightSensor.setUpdateInterval(250);
  const subscription = LightSensor.addListener(setMeasurement);
  return () => subscription.remove();
}, []);
```

setUpdateInterval(intervalMs)은 desired update 간격이며 실제 delivery rate는 OS/hardware 영향을 받는다. Android12/API31는 200Hz 제한이며 더 높은 sampling rate(더 짧은 interval)에 HIGH_SAMPLING_RATE_SENSORS native permission이 필요하다. source의 greater update interval 표현은 주파수와 ms를 혼동한 것이므로 200Hz=5ms 기준으로 구분한다. iOS plugin motionPermission은 NSMotionUsageDescription 문구이고 false는 해당 permission 설정을 끈다. config는 binary rebuild에 반영된다.

## Measurement

LightSensorMeasurement는 illuminance(lux)와 timestamp(seconds)다. 낮은 lux 자체가 sensor unavailable은 아니므로 availability와 측정 0을 구분한다. MagnetometerMeasurement는 x/y/z microtesla와 timestamp(seconds)다. Magnetometer는 calibrated field, Uncalibrated는 raw field를 제공한다. 물리적 magnetic interference와 기기 orientation을 함께 해석하고 이것만으로 geographical heading을 단정하지 않는다. deprecated remove-all과 global interval은 여러 소비자가 공유하는 sensor 계약이므로 component마다 conflict하지 않게 관리한다.

## 출처

- [Expo Documentation, Sensors](https://docs.expo.dev/versions/latest/sdk/sensors)
- [Expo Documentation, LightSensor](https://docs.expo.dev/versions/latest/sdk/light-sensor)
- [Expo Documentation, Magnetometer](https://docs.expo.dev/versions/latest/sdk/magnetometer)

## 관련 문서

- [[Expo-SDK-Pedometer]]
- [[Expo-Integrations-TV]]
