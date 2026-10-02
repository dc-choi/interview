---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Battery 전력 상태와 제한"]
---

# Battery 전력 상태와 제한

## 설치와 반환값

`npx expo install expo-battery`, `import * as Battery from 'expo-battery'`. Android, 실제 iOS, web와 Expo Go를 지원한다. iOS simulator는 unavailable이다.

| Method | 반환/조건 |
|---|---|
| getBatteryLevelAsync |0~1, unknown은-1, web는 항상1 |
| getBatteryStateAsync | BatteryState, web UNKNOWN |
| getPowerStateAsync | batteryLevel/batteryState/lowPowerMode, 하위 조회 오류 rethrow |
| isAvailableAsync | Android/실제 iOS true, web browser API 지원에 의존 |
| isLowPowerModeEnabledAsync | Android saver/iOS low power, unsupported/web false |
| isBatteryOptimizationEnabledAsync | Android6+ 앱 Doze optimization 상태 |

BatteryState는 UNKNOWN0, UNPLUGGED1, CHARGING2, FULL3, Android-only NOT_CHARGING4 다. NOT_CHARGING은 전원 연결 상태에서 보호/최적화 때문에 충전이 멈춘 경우이며 unplugged와 다르다.

## Hooks와 event

useBatteryLevel/useBatteryState/useLowPowerMode/usePowerState는 React state와 subscription을 관리한다. 직접 listeners를 쓰면 addBatteryLevelListener/addBatteryStateListener/addLowPowerModeListener가 EventSubscription을 반환하고 cleanup에서 remove 한다.

Android battery level event는 low/okay 같은 significant transition에만 발생할 수 있다. iOS는1%이상 변화, 최대1 분에 한 번이다. web에서는 이 events가 발생하지 않는다. 따라서 연속 실시간 battery graph를 보장하지 않는다.

```tsx
const { batteryLevel, batteryState, lowPowerMode } = Battery.usePowerState();
const canRunHeavyWork = !lowPowerMode && batteryLevel >= 0.2;
```

unknown -1을 낮은 battery와 별도 상태로 처리한다. web의 고정1과 false를 실제 장치 정보로 표시하지 않는다. 전력 상태는 작업량을 조절할 신호이며 background scheduler 실행 가능성 전체를 증명하지 않는다.

## 출처

- [Expo Documentation, Battery](https://docs.expo.dev/versions/latest/sdk/battery)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
