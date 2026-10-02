---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update runtime version과 호환성"]
---

# EAS Update runtime version과 호환성

runtimeVersion은 JS-native interface가 호환하는 build/update를 구분한다. 값이 같으면 server가 배포를 허용하지만 개발자가 잘못 같은 값을 유지하면 실제 호환성을 보장하지 못한다. 예를 들어 camera native library가 없는 binary에 camera JS를 같은 runtime으로 배포하면 실행이 실패할 수 있다.

## Policy와 수동 version

appVersion은 app version 변경에 따라 runtime을 바꾼다. native 변경 시 version bump를 잊으면 안전하지 않다. fingerprint는 native runtime에 영향을 줄 수 있는 SDK/native/config 등의 변경을 hash에 반영해 위험을 줄이지만 build를 더 자주 요구할 수 있다. nativeVersion과 각 policy의 실제 계산은 [[Expo-SDK-Updates]]에 있다. 수동 string runtime도 사용할 수 있으며 개발자가 변경 기준과 증분 책임을 가진다.

```json
{"expo":{"runtimeVersion":"1.0.0","android":{"runtimeVersion":"android-2"}}}
```

platform별 runtime 설정이 top-level보다 우선한다. Android/iOS가 다른 runtime을 사용하면 각 platform에 맞는 update를 배포한다. native buildNumber만 증가했다고 appVersion policy의 runtime도 증가한 것으로 판단하지 않는다.

## 호환성 검증과 rollout

native library/SDK/config 변경에는 새 runtime과 build를 만든다. production과 같은 runtime, 다른 channel의 preview build에서 실제 release 동작을 검증한다. rollout은 초기 영향 범위를 줄일 뿐 runtime 불일치를 고치는 수단은 아니다. channel surfing으로 앞뒤 update를 전환하면 schema/data compatibility도 확인한다. error recovery가 모든 잘못된 update를 복구할 수 있다고 가정하지 않는다.

## 출처

- [Expo Documentation, Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions)

## 관련 문서

- [[Expo-EAS-Update-Rollouts]]
- [[Expo-EAS-Update-Channel-Surfing]]
- [[Expo-EAS-Update-Recovery]]
- [[Expo-SDK-Updates]]
