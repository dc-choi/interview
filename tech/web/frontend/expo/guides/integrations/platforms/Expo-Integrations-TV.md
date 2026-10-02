---
tags: [expo, expo-integrations, platforms]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Android TV와 Apple TV 구성"]
---

# Expo Android TV와 Apple TV 구성

React Native TV fork는 mobile/TV target을 함께 지원한다. Expo project의 react-native dependency를 npm:react-native-tvos로 alias하고 SDK의 RN major/minor와 맞춘다. SDK57 baseline은 RN0.86이므로 source의 SDK56/0.85-stable example을 SDK57에 그대로 붙이지 않는다.

## Native target 변경

@react-native-tvos/config-tv plugin은 EXPO_TV=1 또는 isTV=true일 때 Android portrait 고정 제거/TV intent와 unsupported Flipper 제거, iOS Podfile/Xcode/splash를 tvOS target으로 바꾼다. 기존 generated ios/android가 있으면 clean prebuild로 target을 재생성한다. phone으로 돌아갈 때 EXPO_TV를 unset하고 regenerate한다. 이는 native directory를 덮어쓰는 작업이라 handwritten native 변경은 먼저 보존한다.

SDK56+ expo install은 TV repo version도 upgrade한다. SDK55 이하에서는 react-native version validation exclude와 manual TV version upgrade가 필요했다. monorepo mobile/TV app은 compatible TV fork dependency를 공통 사용해 RN 중복을 피한다. with-tv/with-router-tv example은 시작용 template다.

## Development와 지원 범위

Android는 Node LTS/Android Studio Iguana+, API31+ TV image와 CPU architecture 맞는 emulator가 필요하다. Apple은 macOS/Node/Xcode16+/tvOSSDK17+를 준비한다. 원문의 tool minimum은 SDK57 build image의 현재 요구를 대신하지 않는다.

지원 목록은 Audio/Video, Asset/Image/Font/ImageManipulator/VideoThumbnails, Blur/Glass/LinearGradient/SystemUI/Splash, FileSystem/SQLite/MediaLibrary, Application/Device/Constants/Network/NetInfo, SecureStore/Crypto/AppleAuthentication/TrackingTransparency, Localization/Updates/Manifests, BackgroundTask/TaskManager/KeepAwake와 DevClient/BuildProperties/Expo UI/FlashList/Skia/Reanimated/AsyncStorage/SafeAreaContext/Svg를 포함한다. 과거 AV가 list에 있어도 deprecated AV API를 신규 권장하지 않는다. feature별 tvOS support와 remote focus UI는 개별 reference를 확인한다.

DevClient SDK54+는 Android TV 기능을 phone과 비슷하게 제공하고 Apple TV는 local/tunnel packager 기본 기능만 지원한다. EAS auth/build/update listing은 Apple TV DevClient에서 아직 지원하지 않는다고 source가 명시한다.

## EAS profile과 credential

phone development/preview profile을 extends한 *_tv profile에 env.EXPO_TV=1을 넣어 같은 source로 target을 나눈다. source 예제의 shared channel은 native runtime 호환성을 별도 관리해야 한다. tvOS는 iOS와 bundle ID/distribution certificate를 공유할 수 있지만 provisioning profile은 다르다.

EAS는 iOS profile을 생성하므로 TV-only는 Apple portal에서 tvOS provisioning profile을 수동 생성/업로드한다. phone과 TV를 모두 build하면 EAS-stored iOS credential을 유지하고 TV는 local credential을 사용한다. simulator build 성공은 App Store tvOS provisioning이나 remote device focus/gesture 품질을 증명하지 않는다.

## 출처

- [Expo Documentation, Build Expo apps for TV](https://docs.expo.dev/guides/building-for-tv)

## 관련 문서

- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-Bun-Hermes]]
- [[Expo-Router]]
