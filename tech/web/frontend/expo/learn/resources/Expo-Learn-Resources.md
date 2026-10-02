---
tags: [expo, react-native, resources]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 자료 탐색과 버전 근거 선택"]
---

# Expo 자료 탐색과 버전 근거 선택

## 자료별 용도

공식 Documentation은 API/options/platform 계약, Expo blog는 SDK release와 기능 배경, Changelog는 EAS/web dashboard/service 변경 확인에 사용한다. 발표/podcast/video는 제품 방향과 사용 사례의 보조 자료이며 최신 SDK 계약의 직접 증거로 사용하지 않는다.

| 저장소 | 확인할 내용 |
| --- | --- |
| `expo/expo` | SDK, Expo Go, CLI, Docs source |
| `expo/eas-cli` | Build/Submit/Update CLI 구현과 releases |
| `expo/examples` | feature/service integration 예제 |
| `expo/config-plugins` | third-party library의 config plugins |
| `expo/snack` | browser playground |
| `expo/vscode-expo` | editor tools/debugger/config support |
| `expo/vscode-expo-theme` | editor theme, 앱 runtime과 별개 |
| `expo/fyi` | tool/service troubleshooting |
| `expo/orbit` | build install/launch와 device management |

source main branch는 배포된 SDK와 다를 수 있다. package version/tag/commit과 사용 SDK를 연결해 읽는다. React/React Native docs, Metro/Hermes와 Apple HIG는 각각 rendering/core API/bundler/runtime/UI 규칙의 1차 자료다.

## 외부 학습 자료의 역할

React Native Directory는 library 후보 검색, React Navigation은 component navigator 설계, Reanimated/Gesture Handler는 animation/input의 직접 API 자료다. Frontend Masters의 Intermediate React Native는 별도 유료 학습 경로이며 사용자 이해도나 필요에 따라 선택한다.

Expo resource 목록의 2024~2026 발표는 framework/iteration speed, Router deployment, native capability, performance Observe, brownfield scale와 native build 변화 등의 맥락을 제공한다. Chain React/App.js keynote를 읽을 때 발표 당시 SDK와 현재 구현을 구분한다.

## Podcasts와 녹화 주제

resource 목록에는 SDK54/Router v6/Expo UI beta, RN Web와 Strict DOM, Atlas, RSC/DOM components, debugger, App Center 대안, Workflows와 EAS 사례를 다루는 podcast가 있다. 목록에 있다는 사실만으로 현재 기능이 stable이거나 일반 앱에서 사용 가능하다고 단정하지 않는다.

Live stream/video는 Observe, website-to-native AI 전환, SDK54/55/56, widgets, Router native tabs/link preview/protected routes, Unistyles, Legend List, Bolt/Replit와 AI app 개발, one-person app 출시 등을 다룬다. AI model 비교와 budget 사례는 당시 실험이며 기술 선택의 현재 우열을 보장하지 않는다.

## 탐색 절차

1. 현재 기능/오류와 package SDK를 먼저 확인한다.
2. 해당 Documentation/Reference를 읽고 platform/support contract를 기록한다.
3. release notes/changelog에서 최근 변화와 migration을 확인한다.
4. examples/source에서 실제 wiring을 대조한다.
5. 발표/영상은 배경이 필요한 경우에만 보완하고 미시청 자료의 내용을 확인한 것처럼 쓰지 않는다.

외부 영상/강의를 실제 정리할 때는 title/list만으로 요약하지 않고 transcript와 화면 자료를 확인한다. 지금 문서는 official resource catalog의 용도와 범위를 정리한 것이며 열거된 모든 영상/강의를 시청한 기록은 아니다.

## 출처

- [Expo Documentation, Additional resources](https://docs.expo.dev/additional-resources)

## 관련 문서

- [[Expo-Learn-App-Setup]]
- [[Expo-Learn-App-Finishing]]
- [[Expo-Home-AI-Skills]]
