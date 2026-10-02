---
tags: [expo, react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 개발 환경 선택과 기기 설치"]
---

# Expo 개발 환경 선택과 기기 설치

## 환경 선택

실기기는 실제 사용자 환경을 확인하는 데 유리하다. Emulator/Simulator는 반복 가능한 개발과 도구 연동에 편리하다. Expo Go는 학습용 공통 런타임이며 운영 앱 개발에는 앱별 네이티브 코드를 포함할 수 있는 development build가 적합하다.

| 대상 | Expo Go | EAS development build | 로컬 development build |
| --- | --- | --- | --- |
| Android 실기기 | Google Play 앱 설치 | Android 빌드 링크/QR에서 설치 | JDK, SDK, USB 디버깅과 ADB 필요 |
| Android Emulator | CLI `A`로 자동 설치 | 빌드 뒤 자동 설치 또는 APK 드래그 | Android Studio/AVD와 로컬 컴파일 |
| iOS 실기기 | SDK57 안내는 자체 빌드와 TestFlight | Apple 개발자 구독, 등록된 기기와 ad hoc 서명 | macOS, Xcode, 기기 신뢰/서명 |
| iOS Simulator | CLI `I`로 설치 | `ios.simulator: true`로 빌드 | macOS와 Xcode |

## EAS 공통 준비

```sh
npm install --global eas-cli
eas login
eas build:configure
npx expo install expo-dev-client
eas build --platform android --profile development
```

EAS에는 Expo 계정이 필요하다. development profile에는 `developmentClient: true`와 내부 배포 설정을 둔다. 빌드 완료 후 기기는 링크/QR에서, Emulator는 CLI의 설치 확인 또는 다운로드한 APK를 드래그해 설치한다.

## Android 로컬 도구

SDK57 환경 안내의 Android 컴파일 기준은 JDK 17, Android 16 Baklava의 SDK Platform 36이다. Android Studio에서 해당 플랫폼, Sources, Build-Tools, Emulator를 설치한다. 실제 SDK 위치를 확인해 `ANDROID_HOME`과 platform-tools/emulator 경로를 설정한다.

```sh
# macOS의 기본 위치 예시
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
adb --version
adb devices
npx expo run:android
```

macOS는 Azul Zulu 17, Windows는 Microsoft OpenJDK 17 등의 배포판을 사용할 수 있다. Windows SDK 기본 위치는 `%LOCALAPPDATA%\Android\Sdk`이며 `platform-tools`를 사용자 Path에 추가한다. Linux는 시스템 패키지나 OpenJDK 배포판을 사용한다.

Watchman 설치는 이 환경 안내에서 SDK55 이하에만 필요하다고 한정한다. SDK57의 필수 단계로 반복하지 않는다. Android Studio가 JDK를 찾지 못하면 먼저 IDE/Gradle의 실제 Java 경로를 확인한다. 안내에 있는 `java.home` 예시는 Gradle 배포 설정과 대조가 필요한 진단 자료로 취급하며 캐시 삭제를 첫 해결책으로 두지 않는다.

실기기는 개발자 옵션(빌드 번호 7회 탭)과 USB debugging을 켜고 USB로 연결한다. `adb devices`의 상태가 `device`인지 확인하고 기기의 디버깅 허용 요청을 승인한다. Emulator는 Virtual Device Manager에서 장치와 system image를 생성하고 부팅한다.

## iOS Simulator

macOS에서 Xcode, Command Line Tools, 필요한 iOS Simulator 런타임을 설치한다. Xcode Settings의 Locations와 Components에서 도구/런타임을 선택한다. 로컬 빌드는 `npx expo run:ios`를 사용한다.

EAS Simulator 빌드는 실기기 바이너리와 다르다.

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    }
  }
}
```

`eas build --platform ios --profile development` 완료 뒤 CLI 설치 요청에 응답하거나 Simulator에 다운로드한 앱을 드래그한다. Simulator용 build를 실기기 설치 파일로 사용하지 않는다.

## iOS 실기기

EAS 내부 배포는 활성 Apple Developer Program 구독과 등록된 기기를 요구한다. `eas device:create`로 UDID를 등록하고 ad hoc provisioning profile에 포함한 뒤 development profile을 빌드한다. 새 기기 등록만으로 기존 서명 파일에 기기가 추가되지는 않는다.

기기 Settings > Privacy & Security > Developer Mode를 켜고 재시작 후 확인한다. 로컬 실행은 Mac에 USB 연결, 기기 신뢰, Xcode Device Hub 확인, 고유한 `ios.bundleIdentifier` 설정을 거쳐 `npx expo run:ios --device`로 대상을 선택한다.

2026-10-01 SDK57 환경 안내의 실기기 Expo Go 경로는 `npx eas-cli@latest go`로 앱을 빌드한 뒤 TestFlight에서 내부 테스터로 배포하는 방식이다. Apple 개발자 구독과 App Store Connect 설정이 필요하며 오래된 App Store 다운로드 안내와 섞지 않는다. Expo CLI와 기기 Expo Go는 같은 Expo 계정을 사용한다.

## 빌드와 서버의 관계

`expo run:android`/`expo run:ios`는 네이티브 앱을 컴파일하고 개발 서버도 시작한다. 이미 서버가 실행되었다면 중복으로 `expo start`를 켜지 않는다. 클라우드에서 받은 앱은 설치 후 로컬 Metro에 별도로 연결한다. 로컬 iOS 컴파일과 Simulator는 macOS 도구가 필요하지만 EAS의 클라우드 iOS 빌드 자체는 다른 호스트에서도 요청할 수 있다.

## 출처

- [Expo Documentation, Set up your environment](https://docs.expo.dev/get-started/set-up-your-environment)

## 관련 문서

- [[Expo-Home-Project]]
- [[Expo-Home-Development-Builds]]
