---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Device hardware와 OS 정보"]
---

# Device hardware와 OS 정보

## 설치와 hardware metadata

`npx expo install expo-device`, `import * as Device from 'expo-device'`. Android/iOS/tvOS/web/Expo Go를 지원하며 metadata는 nullable과 플랫폼 차이가 많다.

| Field | 의미/제한 |
|---|---|
| brand/manufacturer/modelName | consumer brand, 제조사, 모델 이름 |
| modelId | iOS 내부 모델 ID, Android/web null |
| designName/productName | Android 제조 design/product이 름 |
| deviceName | 사용자가 정한 이름일 수 있음, iOS16+ entitlement 없으면 generic iPhone |
| deviceType/deviceYearClass | form factor/성능 year 추정, nullable |
| isDevice | native emulator/simulator false, web는 항상 true |
| supportedCpuArchitectures | binary ABI 목록, unavailable null |
| totalMemory | kernel-visible RAM bytes, 앱 최대 메모리 아님 |
| osName/osVersion | OS이 름/version, string 형식은 일정하지 않음 |
| osBuildId/osInternalBuildId | Android DISPLAY/ID, iOS 동일 상세 build |
| osBuildFingerprint | Android OS build fingerprint |
| platformApiLevel | Android SDK level |

Android osName은 BASE_OS에 따라 build fingerprint 일 수도 있다. 플랫폼 구분은 React Native Platform.OS를 사용한다. web isDevice true는 실제 physical device attestation이 아니다.

## Query methods

getDeviceTypeAsync는 DeviceType UNKNOWN0/PHONE1/TABLET2/DESKTOP3/TV4를 반환한다. Android phone/tablet는 화면 대각선 추정(3~6.9 인치/7~18 인치)이므로 완벽하지 않다. layout은 실제 available size와 함께 판단한다.

getMaxMemoryAsync는 Android Java VM 최대 bytes이며 무제한이면 MAX_SAFE_INTEGER 다. getUptimeAsync는 reboot이 후 ms, Android deep sleep은 제외한다. getPlatformFeaturesAsync와 hasPlatformFeatureAsync는 Android feature names를 읽으며 iOS/web는 빈배열/false 다. 원문의 getSystemFeatureAsync 언급 대신 실제 getPlatformFeaturesAsync이 름을 사용한다.

```ts
if (await Device.hasPlatformFeatureAsync('android.hardware.sensor.accelerometer')) {
  // sensor API의 availability와 permission도 확인
}
```

## 신뢰성/security 한계

isRootedExperimentalAsync는 우회/false positive가 가능한 experimental heuristic이다. web에서는 false, system file 접근 실패는 ERR_DEVICE_ROOT_DETECTION이 될 수 있다. 인증/결제 접근 정책의 유일 근거로 사용하지 않는다.

Android isSideLoadingEnabledAsync는 호출 package가 ACTION_INSTALL_PACKAGE를 요청할 수 있는지 확인하며 REQUEST_INSTALL_PACKAGES permission이 필요하다. 장치에 설치된 모든 앱의 출처를 검사하는 기능이 아니다. deviceName처럼 개인이 설정한 값을 telemetry에 저장할 때 개인정보 범위도 고려한다.

## 출처

- [Expo Documentation, Device](https://docs.expo.dev/versions/latest/sdk/device)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
