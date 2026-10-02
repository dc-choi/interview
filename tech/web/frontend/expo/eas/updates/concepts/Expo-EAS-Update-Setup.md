---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update 도입과 native 설정"]
---

# EAS Update 도입과 native 설정

EAS Update는 expo-updates 앱에 JS, 스타일과 이미지 등 non-native 변경을 배포한다. native code/dependency, Expo SDK, 권한과 binary 변경에는 새 build가 필요하다. store 정책을 우회하는 기능이 아니며 update 내용과 사용 방식도 해당 platform 정책을 따른다.

## Project와 library 준비

Expo account와 Expo CLI/Metro config가 필요하다. CNG는 native directories를 생성해 쓰고 bare는 native 파일을 직접 관리한다. Expo modules가 없는 React Native 앱은 install-expo-modules와 expo-updates 설치, pods 구성을 준비한다. Router가 등록하지 않는 앱은 AppRegistry.registerComponent 대신 Expo registerRootComponent를 사용하고 MainActivity/AppDelegate module 이름을 main으로 바꿔 update asset 로딩을 맞춘다.

```sh
npx expo install expo-updates
eas update:configure
```

configure는 runtimeVersion/updates.url와 extra.eas.projectId를 설정한다. bare Android는 AndroidManifest의 expo.modules.updates.EXPO_UPDATE_URL/EXPO_RUNTIME_VERSION과 strings.xml의 expo_runtime_version, iOS Supporting/Expo.plist의 EXUpdatesURL/EXUpdatesRuntimeVersion을 확인한다. Xcode project에 Expo.plist가 포함되어야 한다. 실제 project ID의 https://u.expo.dev/<projectId>를 사용한다.

## Channel과 첫 build

EAS Build는 eas.json의 preview/production 등 사용하는 profile에 channel을 지정한다. EAS Build 없이 CNG를 쓰면 updates.requestHeaders에 expo-channel-name을 선언하고 prebuild한다. bare Android는 UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY의 JSON 값을 XML에서 escape하여 저장하고 iOS는 EXUpdatesRequestHeaders dict를 사용한다. 원문 Android inline JSON의 따옴표를 escape 없이 XML attribute에 복제하지 않는다.

library와 channel 설정을 포함한 새 preview build를 device/simulator에 설치해야 한다. 이미 설치된 binary에 native library를 OTA로 추가할 수 없다.

## Publish, environment와 테스트

```sh
eas update --channel preview --message "UI correction" --environment preview
```

SDK55 이후, 여기서 기준인 SDK57도 --environment가 필수다. intro/CLI/preview의 생략된 오래된 예제보다 getting-started 계약을 따른다. channel은 연결된 branch를 찾아 publish하며 내부에서 expo export로 dist를 생성하고 bundle/assets를 업로드한다. 환경변수는 build와 update에 같은 의미를 갖도록 맞추고 channel 이름과 environment 이름이 자동으로 같아지는 것으로 가정하지 않는다.

development build는 Extensions/Orbit로 preview하고 release build는 완전히 종료/재실행을 최대 두 번 거쳐 download와 적용을 확인한다. custom Updates API 전략은 [[Expo-SDK-Updates-API]]에 있다. 명령은 설정/배포 절차 설명이며 실제 account/build/publish 검증은 이 문서화 범위에 포함하지 않는다.

## 출처

- [Expo Documentation, EAS Update](https://docs.expo.dev/eas-update/introduction)
- [Expo Documentation, Get started with EAS Update](https://docs.expo.dev/eas-update/getting-started)

## 관련 문서

- [[Expo-EAS-Update-Selection]]
- [[Expo-EAS-Update-Runtime]]
- [[Expo-EAS-Update-Preview]]
- [[Expo-SDK-Updates]]
