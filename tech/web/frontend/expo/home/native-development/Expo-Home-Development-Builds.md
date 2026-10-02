---
tags: [expo, react-native, native-development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo development build와 네이티브 재빌드"]
---

# Expo development build와 네이티브 재빌드

## Native runtime과 JavaScript

development build는 앱별 native binary에 Expo 개발 도구를 포함한 빌드다. 일반적으로 `expo-dev-client`를 설치해 launcher, dev menu와 network inspection을 사용한다. binary가 설치된 뒤 JavaScript/TypeScript 변경은 Metro에서 반복하며 native 코드가 바뀔 때만 새 binary가 필요하다.

Expo Go는 고정된 native library 집합을 가진 host다. Go에 포함된 WebView는 JS dependency 설치 후 호출할 수 있지만 Go에 없는 React Native Firebase는 JS만 받아도 native 구현이 없어 실패한다. JavaScript bundle에서 native binary에 없는 API를 만들 수 없다.

## 빌드 방법

```sh
npx expo install expo-dev-client
# local native toolchain
npx expo run:android
npx expo run:ios
# cloud EAS
npm install -g eas-cli
eas login
eas build --platform android --profile development
# local compilation with EAS profile/credentials
eas build --platform android --profile development --local
```

| 방법 | 컴파일 위치 | 요구 조건 |
| --- | --- | --- |
| Expo CLI local | 현재 컴퓨터 | Android toolchain 또는 macOS/Xcode, Expo 계정 불필요 |
| EAS cloud | EAS build worker | Expo 계정, profile과 signing; 요청 host에 native toolchain 불필요 |
| EAS local | 현재 컴퓨터 | Expo/EAS 설정과 native toolchain, iOS는 macOS |

cloud에서 iOS를 빌드하는 것과 iOS Simulator를 Windows/Linux에서 실행하는 것은 다르다. EAS local의 Windows는 first-class 지원이 아니며 WSL 경로를 따로 확인한다. iOS cloud/device 서명은 paid Apple Developer 계정이 필요하지만 local Xcode device 실행은 개인 development signing 범위를 사용할 수 있다.

Simulator용 iOS profile에는 `ios.simulator: true`를 둔다. 실기기용 `.ipa`와 Simulator용 `.app`은 서로 설치할 수 없다. Android Emulator/실기기의 적절한 APK, iOS build 대상과 provisioning을 확인한다.

## CNG와 재빌드 시점

native 디렉터리가 없으면 `expo run:*`과 EAS Build가 Prebuild를 실행한다. 첫 실행에 별도 prebuild가 필수인 것은 아니다. 이후 CLI local build는 기존 디렉터리를 재사용한다.

native package 추가/업데이트, app config 변경, SDK upgrade 때 CNG native files를 재생성하고 build한다.

```sh
npx expo prebuild --clean
npx expo run:android
```

`--clean`은 native 디렉터리를 지우고 생성하므로 직접 수정한 파일을 보존하는 수단이 아니다. 수동 native 프로젝트나 아직 plugin으로 옮기지 않은 수정이 있다면 재생성 전에 관리 방식과 보존을 확인한다. JS/asset-only 변경은 `npx expo start`로 반복한다.

`expo-dev-client` 없이도 custom development binary를 사용할 수 있지만 `npx expo start --dev-client`로 대상을 지정해야 한다. 기존 React Native 프로젝트는 expo module/dev-client native 설치 단계를 별도로 수행한다.

## 실행과 launcher

`expo start`는 dev-client 의존성이 있으면 development build를 대상으로 연다. `A`/`I` 또는 기기 QR로 연결한다. 앱 icon에서 실행한 launcher는 local network 서버, 같은 계정으로 인증된 서버 또는 수동 URL을 선택할 수 있다. 개발 메뉴는 CLI Cmd/Ctrl+D 또는 기기를 흔들어 열어 debugger/다른 배포로 이동한다.

## Go에서 검증할 수 없는 범위

app icon/name/splash, native library와 custom native config, remote push certificates, Android App Links/iOS Universal Links는 own binary로 검증한다. Go splash는 icon 기반 emulation이며 splash animation/실제 launch 결과와 같지 않다. remote push는 own credentials를 가진 development build로 테스트한다.

Expo Go build는 하나의 SDK를 지원하므로 앱 SDK와 match해야 한다. Android device/Emulator와 iOS Simulator는 compatible Go를 설치할 수 있으나 iPhone의 오래된 version sideload는 같은 경로로 처리하지 않는다. EAS profile, env, build process와 monorepo 설정은 각각 해당 reference를 확인한다.

## 출처

- [Expo Documentation, Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction)
- [Expo Documentation, Use a development build](https://docs.expo.dev/develop/development-builds/use-development-builds)
- [Expo Documentation, Development builds FAQ](https://docs.expo.dev/develop/development-builds/faq)

## 관련 문서

- [[Expo-Home-Environment]]
- [[Expo-Home-Development-Sharing]]
- [[Expo-Home-Config-Plugins]]
