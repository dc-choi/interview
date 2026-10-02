---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS APK와 iOS Simulator build"]
---

# EAS APK와 iOS Simulator build

## Android APK

EAS의 Android 기본 배포 format은 AAB이며 직접 설치에는 APK가 필요하다. developmentClient:true, distribution:internal, android.buildType:apk 또는 APK를 생성하는 gradleCommand 중 의도에 맞는 방법을 선택한다. profile 이름에 preview를 붙였다는 사실만으로 APK가 되지는 않는다.

```json
{
  "build": {
    "device-preview": { "android": { "buildType": "apk" } },
    "simulator-preview": { "ios": { "simulator": true } }
  }
}
```

`eas build -p android --profile device-preview` 후 APK를 다운로드하거나 `eas build:run -p android`로 Emulator에 설치한다. 실기기는 적절한 설치 허용 또는 adb debugging 상태에서 `adb install <file.apk>`를 사용할 수 있다. `--latest`는 최신 artifact를 선택하므로 검증하려는 build ID와 같은지 확인한다.

## iOS Simulator

`ios.simulator: true`로 실기기와 다른 Simulator용 build를 생성한다. Apple Developer membership이나 TestFlight 업로드 없이 시험할 수 있지만 로컬 Simulator 실행에는 해당 Apple 개발 환경이 필요하다.

`eas build -p ios --profile simulator-preview`로 생성하고 `eas build:run -p ios`로 선택/설치한다. development build라면 설치 뒤 `npx expo start`로 개발 서버도 실행한다. standalone preview라면 내장 bundle 사용 여부를 확인한다.

Simulator 성공만으로 실기기 권한, camera/push, 서명 또는 성능이 검증되지는 않는다. 반대로 실기기용 IPA는 Simulator에 설치할 수 없다.

## 출처

- [Expo Documentation, Build APKs for Android Emulators and devices](https://docs.expo.dev/build-reference/apk)
- [Expo Documentation, Build for iOS Simulators](https://docs.expo.dev/build-reference/simulators)

## 관련 문서

- [[Expo-EAS-Build-Distribution]]

- [[Expo]]
