---
tags: [expo, react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 도입과 호환성 판단"]
---

# Expo 도입과 호환성 판단

## Expo와 React Native 관계

Expo는 React Native의 대체 rendering engine이 아니라 React Native 앱의 SDK/tooling/framework다. 기존 Community CLI 프로젝트에도 `expo`, Modules, dev-client와 EAS를 선택적으로 도입할 수 있다. EAS 사용에 expo package 자체가 필수는 아니다.

SDK는 tested/versioned modules를 묶어 upgrade와 platform API 사용을 돕는다. SDK package 밖의 custom native library도 development build와 native module/config plugin으로 통합할 수 있다. React Native Directory와 공식 examples는 후보/통합 패턴 탐색 수단이다.

## Web과 native 차이

React Native native 화면은 HTML DOM/CSS가 아니라 View/Text 등의 platform components와 style props를 사용한다. browser-only package는 DOM/window 요구를 확인해야 하며 native 기능은 `expo-location` 같은 native API로 접근한다. 일부 web-oriented libraries가 Expo example에서 동작해도 모든 web package가 그대로 native에서 작동하는 것은 아니다.

한 codebase의 Android/iOS/web 지원은 platform API, permission과 UI 차이를 제거하지 않는다. native components가 DOM보다 모든 상황에서 더 빠르다는 일반 주장은 실제 workload 측정 없이 사용하지 않는다.

## 플랫폼과 크기

Expo FAQ가 안내하는 지원 OS는 Android7+, iOS16.4+이며 실제 앱의 minimum은 SDK57 version reference, native dependencies와 build properties의 직접 요구를 우선 확인한다. SDK별 OS 지원과 개발 host 도구 지원도 별개다.

minimal app size와 expo package 기여도는 build configuration, architecture, runtime, language, store thinning과 modules에 따라 다르다. FAQ의 hello-world/패키지 용량 수치는 모든 production app의 상한이 아니다. 같은 target의 signed release artifact와 실제 store download size로 비교한다.

## 비용과 host

Expo SDK/CLI와 Go source는 오픈소스다. EAS는 optional cloud services이며 free plan quotas와 유료 기능을 구분하고 현재 pricing을 확인한다. iOS 실기기 Go 경로는 현재 환경 guide의 자체 build/TestFlight와 계정 조건을 따른다. 오래된 FAQ의 app-store 무료 다운로드 표현만으로 최신 설치 경로를 단정하지 않는다.

Windows/Linux에서도 EAS cloud iOS build와 Submit을 요청하고 실기기에서 테스트할 수 있다. local iOS compilation/Simulator는 macOS/Xcode가 필요하다. Expo CLI와 Community CLI는 같은 프로젝트에서 사용할 수 있지만 실제 native/config 관리 책임을 일관되게 유지한다.

## Eject와 CNG

`expo eject`는 SDK46에서 제거된 과거 개념이다. 현재는 prebuild가 configuration과 dependencies에서 native projects를 지속 생성한다. native dir를 수동 관리할 수도 있지만 regenerate-safe 변경은 plugin이나 module hook으로 표현한다.

EAS Build는 checked-in native directories가 있으면 manual modifications를 덮어쓰지 않기 위해 prebuild하지 않는다. 따라서 app config와 native config를 사용자가 sync해야 한다. custom code 지원을 위해 프로젝트를 되돌릴 수 없는 단계로 eject해야 한다는 전제는 사용하지 않는다.

## 업데이트와 정책

React Native는 Hermes 같은 interpreter에서 JavaScript를 실행한다. OTA는 native executable 다운로드와 다른 기술 경로지만 스토어가 허용한 목적, 기능, signing/sandbox/security 범위 안에 있어야 한다. FAQ의 정책 인용은 2024-04-25 기준 historical excerpt다. 현재 출시/업데이트 판단은 최신 Google Play Policy Center와 Apple Developer Agreement를 직접 확인한다.

앱 공유는 internal APK/ad hoc/enterprise binary 또는 compatible development build에 update를 전달하는 방식이다. production store release는 별도 AAB/IPA build와 review 절차를 거친다. Go 공유 가능성을 native parity나 release acceptance로 해석하지 않는다.

## 출처

- [Expo Documentation, FAQ](https://docs.expo.dev/faq)

## 관련 문서

- [[Expo-Home-Concepts]]
- [[Expo-Home-Development-Builds]]
- [[Expo-Home-Release-Build]]
