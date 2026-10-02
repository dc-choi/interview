---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo module 프로젝트와 개발 순환"]
---

# Expo module 프로젝트와 개발 순환

## Local module 만들기

기존 Expo 앱에서 `npx create-expo-module@latest --local`을 사용한다. 생성 경로는 보통 `modules/<name>`이며 `android/`, `ios/`, `src/`, `index.ts`, `expo-module.config.json`을 포함한다. 이 경로는 app의 nativeModulesDir 기본값과 연결된다.

1. JS entry를 통해 local module을 import한다.
2. native 프로젝트가 없으면 `npx expo prebuild --clean`으로 생성한다. 이 명령은 native 디렉터리를 재생성하므로 직접 native 수정이 있는 프로젝트에서는 보존 전략을 먼저 정한다.
3. 기존 iOS native 프로젝트에 새 module/class를 추가하면 `npx pod-install` 또는 `pod install`로 provider를 갱신한다.
4. `npx expo start`로 Metro를 실행하고 Xcode/Android Studio 또는 `npx expo run:ios`/`run:android`로 앱을 컴파일한다.

TypeScript 변경은 Metro와 JS compiler 순환으로 반영된다. Kotlin/Swift 파일, module registration, native dependencies 변경은 앱 재빌드가 필요하며 Fast Refresh나 OTA로 native 코드가 추가되지 않는다. 새 native 파일을 생성했거나 module config를 변경한 경우 iOS Pods 갱신도 확인한다.

## Standalone module 구조

`npx create-expo-module@latest my-module`은 배포 가능한 패키지와 example 앱을 만든다. 모듈 루트에서 `npm run build`를 실행해 TypeScript output을 감시하고, example 앱에서는 Metro를 실행한다. 제공되는 `open:android`/`open:ios` script로 native 프로젝트를 열어 플랫폼 코드를 수정할 수 있다.

| 경로 | 역할 |
|---|---|
| `src/` | JS public API, native module type과 view wrapper |
| `android/` | Kotlin, Gradle/native dependency |
| `ios/` | Swift, podspec |
| `expo-module.config.json` | autolinking이 사용할 module/platform 등록 |
| `example/` | 실제 앱에서 native 동작 검증 |

Windows에서는 Android 개발을 할 수 있지만 iOS local compilation은 macOS/Xcode가 필요하다. 모듈 scaffold가 생성됐다는 사실은 두 플랫폼의 runtime 동작이나 web 구현이 검증됐다는 뜻이 아니다. native implementation과 TS public contract를 함께 변경한다.

## 출처

- [Expo Documentation, Expo Modules API: Get started](https://docs.expo.dev/modules/get-started)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
