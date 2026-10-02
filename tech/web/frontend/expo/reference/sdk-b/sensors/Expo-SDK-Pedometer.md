---
tags: [expo, expo-sdk, sensors]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Pedometer 걸음 수와 권한"]
---

# Expo Pedometer 걸음 수와 권한

expo-sensors Pedometer는 Android hardware sensor와 iOS Core Motion을 사용한다. Android/iOS/Expo Go가 대상이며 isAvailableAsync와 permission을 먼저 확인한다. app background에서 watch update가 오지 않는 제약이 있다.

watchStepCount(callback)은 `{ steps:number }` update와 remove 가능한 EventSubscription을 제공한다. owner cleanup에서 async availability 이후 생성된 subscription도 반드시 정리한다. getStepCountAsync(start:Date, end:Date)는 date 범위 PedometerResult Promise이며 iOS는 과거 7일만 보관해 더 오래된 start를 주어도 available data만 반환한다. Android background/history 요구에는 Health Connect 같은 별도 solution을 검토한다. watch 값과 날짜 범위 누적값의 기준을 섞지 않는다.

```tsx
useEffect(() => {
  let active = true;
  let subscription;
  (async () => {
    if (!await Pedometer.isAvailableAsync()) return;
    if (!(await Pedometer.requestPermissionsAsync()).granted || !active) return;
    subscription = Pedometer.watchStepCount(({steps}) => setSteps(steps));
  })().catch(setError);
  return () => { active=false; subscription?.remove(); };
}, []);
```

getPermissionsAsync/requestPermissionsAsync 반환 status/granted/canAskAgain/expires와 iOS NSMotionUsageDescription을 확인한다. UI 숫자는 sensor count이며 의료/보상 정확도나 background 기록 보장을 뜻하지 않는다. 실제 기기 permission과 counter reset 범위를 앱 요구에 맞춰 검증한다.

## 출처

- [Expo Documentation, Pedometer](https://docs.expo.dev/versions/latest/sdk/pedometer)

## 관련 문서

- [[Expo-SDK-Sensor-Light-Magnetic]]
- [[Expo-Integrations-Privacy]]
