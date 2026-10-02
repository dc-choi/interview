---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 로컬 네이티브 개발 환경"]
---

# React Native 로컬 네이티브 개발 환경

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 호스트 OS와 대상 플랫폼

로컬에서 Android emulator/iOS simulator를 실행하고 네이티브 앱을 빌드하려면 해당 플랫폼의 개발 도구가 필요하다. 프레임워크가 빌드를 대신 처리하는 경로를 사용한다면 로컬 Android Studio/Xcode 설치를 생략할 수 있다. 프레임워크 사용 자체가 모든 로컬 빌드 요구를 제거한다는 뜻은 아니다.

| 개발 OS | Android 로컬 빌드 | iOS 로컬 빌드 |
|---|---|---|
| macOS | Android Studio, JDK, SDK | Xcode, Command Line Tools, CocoaPods |
| Windows | Android Studio, JDK, SDK | 미지원, macOS 빌드 경로 필요 |
| Linux | Android Studio, JDK, SDK | 미지원, macOS 빌드 경로 필요 |

Windows/Linux에서도 Expo client 경로로 iOS 기기에서 일부 개발을 진행할 수 있다. 이는 iOS 네이티브 코드를 해당 OS에서 직접 빌드할 수 있다는 의미가 아니다.

## 0.87 설치 기준과 가이드의 오래된 수치

| 도구 | 0.87 적용 기준 |
|---|---|
| Node.js | 최소 22.13.0. 패키지 engines는 `^22.13.0 \|\| ^24.3.0 \|\| >=26.0.0` |
| Android JDK | JDK 17 권장, 상위 버전은 호환 문제 가능 |
| Android compile SDK | 공식 0.87 template의 Platform 37 |
| Android Build-Tools | 공식 0.87 template의 37.0.0 |
| 추가 Android 도구 | Command-line Tools latest, platform-tools, emulator |
| Xcode | 최신 버전 사용 권장, 프로젝트 의존성과 호환 확인 |
| Watchman | 파일 변경 감시 성능을 위해 권장 |

환경 가이드에는 Node 22.11.0, Platform 35와 Build-Tools 36.0.0이 남아 있지만 0.87 릴리스 및 실제 template 요구와 충돌한다. 새 0.87 앱은 위 template과 패키지 요구를 우선한다. template의 `targetSdkVersion`은 36, `minSdkVersion`은 24다. compile SDK, 대상 정책 SDK와 실행 가능한 최소 OS는 서로 다른 값이다. 프레임워크가 RN 버전을 관리하면 그 프레임워크의 호환 조합을 따른다.

## macOS의 Node와 JDK

```sh
brew install node
brew install watchman
brew install --cask zulu@17
brew info --cask zulu@17
```

Zulu JDK installer 위치를 확인하고 `.pkg`를 설치한다. Apple Silicon과 Intel에 맞는 JDK를 사용하며 설치 위치를 확인해 `JAVA_HOME`을 설정한다. 가이드의 예시는 다음 경로다.

```sh
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
```

Homebrew cask 경로는 Apple Silicon의 `/opt/homebrew/Caskroom`과 Intel의 `/usr/local/Caskroom` 등 장비에 따라 다를 수 있다. 출력으로 실제 설치 경로를 확인한다.

## Android Studio와 SDK

1. Android Studio 설치 과정에서 Android SDK, SDK Platform과 Android Virtual Device를 선택한다.
2. Settings > Languages & Frameworks > Android SDK에서 SDK Manager를 연다.
3. SDK Platforms의 Show Package Details를 켜고 compile 대상인 Platform 37을 설치한다. emulator system image는 테스트할 OS와 CPU에 맞춰 별도로 고른다.
4. SDK Tools에서 Build-Tools 37.0.0과 Command-line Tools를 설치한다.
5. `ANDROID_HOME`과 emulator/platform-tools PATH를 설정한 뒤 새 shell에서 확인한다.

macOS에서는 일반적으로 다음 경로를 사용한다.

```sh
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Linux의 기본 예시는 `$HOME/Android/Sdk`이며 shell에 맞게 `.bashrc`, `.bash_profile`, `.zshrc`나 `.zprofile`에 설정한다. SDK Manager에 표시되는 실제 SDK 위치를 기준으로 수정한다.

Windows에서는 사용자 환경 변수 `ANDROID_HOME`을 `%LOCALAPPDATA%\Android\Sdk`로 지정하고 Path에 `%LOCALAPPDATA%\Android\Sdk\platform-tools`를 추가한다. 새 Command Prompt/PowerShell을 열고 `Get-ChildItem -Path Env:\`로 로드 결과를 확인한다.

## Windows와 Linux의 차이

Windows는 Chocolatey 설치 예제로 `choco install -y nodejs-lts microsoft-openjdk17`을 제시한다. Node 버전 전환이 필요하면 nvm-windows 등 별도 관리 방식을 사용할 수 있다. 더 최신 JDK를 임의로 쓰면 Gradle 지원 버전까지 같이 변경해야 할 수 있으므로 JDK만 단독으로 올리지 않는다.

Linux는 배포판의 Node 설치 방식과 OpenJDK 패키지를 사용하고 Watchman 설치 가이드를 따른다. AVD에는 VM 가속을 구성하면 성능에 도움이 된다.

Windows 가이드에 남아 있는 HAXM 설치 문구는 역사적 가속기 안내다. 실제 가속 방식은 현재 Android emulator, CPU와 Hyper-V 구성에 맞춰 확인하며 HAXM을 일률적으로 설치하지 않는다.

## Android 실행 대상 준비

실제 Android 기기를 USB로 연결하거나 AVD를 만든다. Android Studio의 `android/` 프로젝트에서 Virtual Device Manager를 열고 Phone과 테스트할 OS의 system image를 선택한다. API 35 실행 이미지를 쓰는 것과 compile SDK 37을 설치하는 것은 별개다. Apple Silicon은 ARM 64 v8a image, Intel 계열은 해당 x86 image를 사용한다. 가상 기기를 시작한 뒤 실제 앱 실행은 기기 실행 절차로 이어간다.

## iOS 도구와 simulator

macOS에 Xcode를 설치하고 Xcode > Settings > Locations에서 최신 Command Line Tools를 선택한다. Settings의 Platforms/Components에서 테스트할 iOS simulator를 설치한다. Xcode 14 이상은 Platforms 탭의 추가 메뉴로 iOS runtime을 설치할 수 있다.

CocoaPods는 Ruby 기반 의존성 관리 도구다. 프로젝트의 Gemfile이 있으면 거기에 고정한 gem 조합과 Bundler 명령을 사용한다. Pods 설치 후에는 생성된 `.xcworkspace`로 프로젝트를 연다.

## Xcode에서 Node 경로 안정화

0.69부터 템플릿의 `.xcode.env`에서 `NODE_BINARY`로 Node 실행 파일 경로를 지정할 수 있다. 터미널과 Xcode가 서로 다른 shell 초기화 파일을 읽어 생기는 경로 차이를 빌드 설정에서 명시적으로 다룬다.

NVM과 zsh를 사용하는 경우 초기화 코드를 `.zshrc`에서 `.zshenv`로 옮겨 Xcode가 Node를 찾도록 하는 방법도 소개된다. 해당 변경은 모든 zsh 호출에 영향을 주므로 실제 빌드 shell과 환경 요구를 확인한다. 필요한 build phase의 shell을 `/bin/zsh`로 설정하는 방법도 있다.

도구 설치, SDK 경로 로드, simulator 시작과 실제 debug/release 빌드는 서로 다른 검증 단계다. 설치 명령이 끝난 사실만으로 앱이 빌드됐다고 판단하지 않는다.

## 출처

- [React Native 0.87 릴리스 — React Native](https://reactnative.dev/blog/2026/08/11/react-native-0.87)
- [0.87 template Android build.gradle — React Native Community](https://github.com/react-native-community/template/blob/0.87-stable/template/android/build.gradle)
- [0.87 package.json — React Native](https://github.com/facebook/react-native/blob/0.87-stable/packages/react-native/package.json)

- [React Native, Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)

## 관련 문서

- [[RN-Project-Setup]]
- [[RN-Device-Execution]]
- [[RN-Troubleshooting]]
- [[RN-Android-Integration]]
- [[RN-iOS-Integration]]
