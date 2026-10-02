---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Orbit으로 빌드 설치와 실행"]
---

# Expo Orbit으로 빌드 설치와 실행

## Orbit

Orbit은 EAS, 로컬 파일과 Snack의 앱을 가상/실기기에 설치하고 여는 데스크톱 도구다. macOS, Windows와 Linux에서 제공된다. build 서버가 아니라 이미 만들어진 artifact나 update의 설치/실행을 돕는다.

시뮬레이터 목록/실행, EAS build 설치, Android Emulator/iOS Simulator update 열기, Snack 실행과 pinned project 접근을 제공한다. 로컬 APK, iOS Simulator용 .app 또는 ad hoc 서명 앱도 지원한다.

## 환경과 설치 대상

Android 관리는 Android SDK가 필요하며 macOS의 Apple 기기 관리는 Xcode의 xcrun이 필요하다. Orbit 설치만으로 native toolchain이 구성되지는 않는다. macOS는 `brew install expo-orbit` 또는 공식 release, Windows/Linux는 공식 release를 사용한다. Linux에는 deb/rpm 패키지가 있다.

설치 실패 시 artifact가 대상 OS/architecture/서명 종류와 맞는지 먼저 확인한다. iOS Simulator 파일을 실기기에 설치하거나 등록되지 않은 기기에 ad hoc 앱을 설치하는 문제를 Orbit 자체 문제로 보지 않는다. CLI 대안은 `eas build:run`과 해당 플랫폼 설치 도구다.

## 출처

- [Expo Documentation, Expo Orbit](https://docs.expo.dev/build/orbit)

## 관련 문서

- [[Expo-EAS-Build-Distribution]]

- [[Expo]]
