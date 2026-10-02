---
tags: [expo, expo-integrations, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 단계별 upgrade"]
---

# Expo SDK 단계별 upgrade

SDK upgrade는 Expo package만 바꾸는 작업이 아니다. RN/React/native module/config plugin/native project와 OTA runtime compatibility를 함께 바꾼다. SDK를 한 단계씩 올리면 어느 변경에서 깨졌는지 찾기 쉽다. 이 묶음은 SDK57/RN0.86/React19.2.3 기준이며 later guide의 기능을 자동으로 기준에 포함하지 않는다.

## Dependency와 native project

target Expo version을 설치한 뒤 expo install --fix로 SDK-compatible dependency를 맞추고 expo-doctor로 공통 문제를 확인한다. release note의 breaking/deprecated와 upgrading section을 끝까지 읽는다. agent용 expo-upgrade skill 안내는 선택 workflow이며 외부 command를 문서 작성 중 실행할 권한이 아니다.

CNG에서 이전 SDK로 생성한 ios/android는 regenerated artifact로 보고 재생성한다. handwritten native project는 pod install과 native upgrade helper diff를 직접 적용한다. source의 delete directory 지시를 custom native 변경까지 자동 삭제하는 일반 규칙으로 쓰지 않는다. native dependency/engine 변경 뒤 development binary를 rebuild하고 runtimeVersion/fingerprint로 OTA compatibility를 맞춘다.

## Expo Go support와 실제 배포

일반 upgrade guide는 Expo Go latest-only라고 설명하지만 현재 dedicated version mismatch guide는 iOS App Store SDK54 상한과 eas go/TestFlight 경로를 구체적으로 설명한다. store app이 항상 latest SDK라고 단정하지 않는다. Android/emulator/iOS simulator는 sdk별 Expo Go download를 사용할 수 있다. production에는 project native dependency를 소유하는 development build를 사용한다. EAS의 오래된 SDK 지원은 Go보다 길 수 있어도 영구 보장은 아니다.

## 출처

- [Expo Documentation, Upgrade Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough)

## 관련 문서

- [[Expo-Integrations-Troubleshooting]]
- [[Expo-Router-Migration-SDK58]]
- [[Expo-Integrations-Bun-Hermes]]
- [[Expo-Integrations-Migration-Media]]
