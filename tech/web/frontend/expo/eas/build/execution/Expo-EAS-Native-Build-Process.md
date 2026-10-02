---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Android와 iOS build 단계"]
---

# EAS Android와 iOS build 단계

## 공통 준비

CLI는 필요한 commit 상태와 credentials를 확인하고 소스 archive를 만들어 비공개 storage에 업로드한 뒤 build를 요청한다. 기존 native 프로젝트는 실제 native ID/팀 설정도 검사한다. archive에 없는 로컬 파일은 worker에 자동으로 나타나지 않는다.

Worker는 격리된 환경에서 archive를 풀고 npm 인증 설정, pre-install, 의존성 설치와 Expo Doctor를 수행한다. CNG 프로젝트는 설치 SDK의 Expo CLI로 native 프로젝트를 생성한다. 실제 hook의 시점은 플랫폼마다 다르다.

## Android 과정

필요한 Prebuild 뒤 파일 cache를 복원하고 post-install을 실행한다. keystore를 준비하고 Gradle signing 설정을 연결한 뒤 profile의 gradleCommand로 compile/package한다. 기본 store 작업은 AAB를 만드는 bundleRelease다.

EAS는 credentials.json을 읽는 eas-build.gradle 서명 연결을 주입할 수 있다. release/debug build type에 적용되는 서명이 프로젝트 기대와 맞는지 확인한다. `withoutCredentials` 등 예외와 실제 profile을 함께 본다.

기본 application archive 탐색은 Android output의 apk/aab다. compile 성공 후 artifact path가 맞지 않아 업로드가 실패할 수도 있다. 성공 cache 저장, app archive 업로드, success/error/complete hook과 추가 buildArtifactPaths 업로드가 이어진다.

## iOS 과정

macOS VM에서 임시 Keychain에 distribution certificate를 넣고 profile과 일치를 검증한다. 필요한 Prebuild와 cache 복원 후 pod install을 실행하고 post-install을 호출한다. Xcode project에 profile ID를 적용한 뒤 Fastlane gym으로 archive/export한다.

ios/Gymfile이 있으면 사용하며 없으면 기본 파일을 생성한다. scheme, export method, provisioning profile mapping, Keychain과 output 경로가 일치해야 한다. 기본 IPA 위치는 ios/build/App.ipa이며 profile에서 archive 경로를 바꿀 수 있다.

기존 build process 문서의 `builds.ios.PROFILE_NAME` 같은 표기는 현행 eas.json 구조와 다르다. 실제 설정은 `build.<profile>.ios` 및 `build.<profile>.android` 아래에 둔다. Deprecated pre-upload-artifacts hook을 새 자동화에 추가하지 않는다.

## 결과 해석

최초 실패 단계의 오류를 원인 후보로 보고 후속 단계 실패와 구분한다. JS bundle 실패, native compile 실패, signing 실패와 artifact upload 실패는 다른 문제다. 앱 실행 시 crash는 성공한 build 이후 별도로 조사해야 한다.

## 출처

- [Expo Documentation, Android build process](https://docs.expo.dev/build-reference/android-builds)
- [Expo Documentation, iOS build process](https://docs.expo.dev/build-reference/ios-builds)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
