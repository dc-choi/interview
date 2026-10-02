---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Android emulator와 SDK 도구 구성"]
---

# Expo Android emulator와 SDK 도구 구성

## compile 도구

공식 Expo setup 기준 JDK17과 Android16(API36/Baklava) SDK Platform/Sources를 설치하고 SDK Build-Tools, Android Emulator와 platform-tools를 준비한다. 실제 프로젝트 Gradle/SDK 요구는 생성 template와 함께 확인한다. SDK56 이후에 Watchman을 기존 지침처럼 필수 설치로 취급하지 않는다.

macOS 예제 JDK는 Zulu17이며 JAVA_HOME은 실제 설치 경로다. Windows는 Microsoft OpenJDK17 등의 distribution을 사용할 수 있다. Linux는 시스템 package manager/배포 JDK를 사용한다.

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
adb version
```

macOS 예제 경로를 다른 OS에 복사하지 않는다. Windows 기본 SDK는 `%LOCALAPPDATA%\Android\Sdk`이며 ANDROID_HOME과 platform-tools를 user environment/Path에 추가한 뒤 새 shell에서 확인한다. Android Studio의 SDK Location이 현재 설치 경로의 직접 근거다.

## virtual device

Device Manager에서 hardware profile을 선택하고 system image를 내려받아 virtual device를 생성한다. Play로 boot한 뒤 Expo CLI A 또는 device 선택을 통해 실행한다. 서로 다른 화면 크기와 OS image는 기능/레이아웃을 검증할 때 추가한다.

## adb/JDK mismatch

`adb server version ... doesn't match this client`이면 shell의 adb와 SDK platform-tools adb 버전을 비교한다. PATH 우선순위와 중복 설치를 정리한다. 보호된 `/usr/bin`에 sudo로 binary를 복사하는 과거 workaround를 기본 해결책으로 사용하지 않는다.

JDK 미인식은 JAVA_HOME, IDE의 Gradle JDK와 실제 Gradle 실행 Java를 비교한다. 원문 예제의 `java.home` 문자열만 추가했다고 Gradle JDK가 바뀐다고 보장하지 않는다. 사용 중인 Gradle의 지원 설정을 확인한다.

## Expo Go 버전

`create-expo-app --template blank@57` 프로젝트를 Android에서 열면 대응 Expo Go 설치를 진행할 수 있다. `expo-go download android <sdk-or-latest>`는 현재 directory에 앱을 다운로드하고 `~/.expo`에 cache한다. Expo Go 버전 맞춤과 arbitrary native module 지원은 별개다.

## 출처

- [Expo Documentation, Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
