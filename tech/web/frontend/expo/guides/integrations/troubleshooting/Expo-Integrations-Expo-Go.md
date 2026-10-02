---
tags: [expo, expo-integrations, troubleshooting]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Go SDK와 iOS 계정 오류"]
---

# Expo Go SDK와 iOS 계정 오류

Expo Go binary는 특정 Expo SDK를 포함한다. package expo의 SDK와 Go binary가 맞지 않으면 incompatible/newer Expo Go 오류가 난다. store에 표시된 app version을 SDK 호환성과 혼동하지 않는다.

## 플랫폼별 compatible binary

current dedicated guide는 Apple App Store Expo Go가 SDK54까지이며55+는 store에 없다고 설명한다. physical iPhone/iPad SDK54+는 eas go로 Expo Go를 build해 TestFlight internal team에 배포할 수 있고 Apple Developer membership이 필요하다. SDK53 이하 physical iOS에는 old Go를 설치하지 못해 upgrade/development build 또는 Android/simulator를 선택한다.

Android device/emulator/iOS simulator는 expo.dev/go 또는 expo-go CLI로 해당 SDK binary를 고른다. Google Play도 새 SDK release보다 늦을 수 있다. 설치 뒤 dev server를 다시 열고 여전히 안 되면 expo dependency/sdkVersion/doctor/install --fix를 확인한다. Go sandbox의 지원 제한을 앱 native module의 오류로 잘못 진단하지 않는다.

## Physical iOS의 Expo 계정 검사

physical iOS에서 dev server의 project를 열 때 Expo CLI와 Go는 같은 Expo account에 로그인해야 한다. 둘 모두 signed-out, 한쪽만 로그인, 다른 계정이면 기기에 error가 나타나고 CLI terminal은 경고 없이 server를 계속 실행할 수 있다. Android/emulator/iOS simulator/published update에는 이 check가 적용되지 않는다.

CLI login/whoami와 Go account 화면으로 account를 맞춘 뒤 Try Again한다. CLI는 request마다 credential을 읽어 동일 계정 로그인 자체는 server 재시작 없이 반영되지만 다른 계정으로 바꾸면 process가 resolved account를 cache하므로 restart한다. 이 guide를 production user에게 Expo 로그인 요구사항으로 일반화하지 않는다.

## 출처

- [Expo Documentation, "Project is incompatible with this version of Expo Go" error](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch)
- [Expo Documentation, "You need to be signed in to Expo Go and Expo CLI" error](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required)

## 관련 문서

- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-iOS-Developer-Mode]]
- [[Expo-Integrations-Troubleshooting]]
