---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Android와 iOS development artifact 설치"]
---

# Android와 iOS development artifact 설치

## Artifact와 설치 대상

| 대상 | Artifact | 주요 조건 |
| --- | --- | --- |
| Android device/emulator | APK | 직접 설치 가능, development/internal profile |
| iOS Simulator | APP | ios.simulator true, macOS simulator |
| physical iOS | IPA | Apple credentials, registered UDID, ad hoc profile |

AAB는 Play distribution용 bundle이며 APK처럼 직접 install할 수 없다. iOS simulator artifact를 device에 설치하거나 store IPA를 ad hoc처럼 sideload할 수 없다.

```sh
eas build --platform android --profile development
```

첫 Android build는 android.package와 keystore 준비를 요청한다. application ID는 reverse DNS 형식의 고유 native app identity다. Android artifact는 Orbit USB/device selection, build page install QR/browser APK download, emulator CLI install prompt로 설치한다. sideload security prompt는 source/artifact를 확인한 뒤 처리한다.

## iOS Simulator

```json
{"build":{"ios-simulator":{"extends":"development","ios":{"simulator":true}}}}
```

```sh
eas build --platform ios --profile ios-simulator
```

bundleIdentifier가 없으면 설정한다. encryption compliance prompt는 실제 app이 standard/exempt encryption인지 판단한 뒤 답한다. tutorial app의 YES를 모든 app에 복사하지 않는다. 생성 APP은 CLI install prompt/Orbit으로 simulator에 설치하고 `npx expo start` 후 I로 연다.

## iOS device와 provisioning

physical iOS development에는 Apple Developer credentials와 iOS16+ Developer Mode가 필요하다. `eas device:create`의 website flow는 phone browser에서 registration profile을 받아 Settings에서 설치해 device identifier를 수집한다. 이 registration profile과 app을 서명하는 ad hoc provisioning profile을 같은 파일로 생각하지 않는다.

```sh
eas device:create
eas build --platform ios --profile development
```

build 중 Apple account/distribution certificate를 준비하고 ad hoc profile에 포함할 registered devices를 선택한다. Expo에 device 등록만 했다고 Apple 등록과 profile 포함이 이미 완료된 것은 아니다. 새로 가입/갱신한 Apple membership에서 최초 포함 device 처리에 원문 기준 24~72시간이 걸릴 수 있어 즉시 build가 실패할 수 있다.

IPA는 Orbit 또는 install page/QR로 해당 profile에 포함된 device에 설치한다. app launcher에서 Expo account 로그인, Fetch development servers로 Metro를 선택할 수 있다. Android는 server A, simulator는 I, device는 launcher/QR 등 target에 맞는 경로를 사용한다. 같은 app account와 network 연결을 확인하되 signing 실패와 Metro 연결 실패를 분리한다.

## 출처

- [Expo Documentation, Create and run a cloud build for Android](https://docs.expo.dev/tutorial/eas/android-development-build)
- [Expo Documentation, Create and run a cloud build for iOS Simulator](https://docs.expo.dev/tutorial/eas/ios-development-build-for-simulators)
- [Expo Documentation, Create and run a cloud build for iOS device](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices)

## 관련 문서

- [[Expo-Learn-EAS-Setup]]
- [[Expo-Learn-EAS-Variants]]
