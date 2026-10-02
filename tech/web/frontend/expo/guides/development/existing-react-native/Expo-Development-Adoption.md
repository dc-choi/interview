---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 React Native 앱의 Expo 점진 채택"]
---

# 기존 React Native 앱의 Expo 점진 채택

## native 프로젝트를 유지하는 경로

기존 React Native 앱은 Expo 도구를 필요한 부분부터 채택할 수 있다. `android/ios`를 삭제하거나 Router/EAS로 navigation/build를 한 번에 교체하는 전환이 아니다. Expo Modules를 설치하고 Expo bundling을 구성한 뒤 SDK, dev-client, updates와 workflow를 선택한다.

| 단계 | 예 | 변경 책임 |
| --- | --- | --- |
| 기반 | expo package, CLI/Metro/Babel | native modules/bundling 통합 |
| 개발 개선 | SDK library, dev-client, Modules API | dependency와 debug runtime |
| 배포 workflow | EAS build/submit, expo-updates | signing와 update runtime |
| native 관리 방식 | Prebuild/CNG | custom native 설정의 config/plugin 이관 |
| navigation | Expo Router | 기존 화면/URL 모델의 별도 migration |

기반 이후 단계는 모든 앱에 필수 순서가 아니다. EAS 사용 없이 local/자기 CI로 build할 수 있고 기존 React Navigation도 유지할 수 있다.

## 비용과 확인 조건

expo package는 module/autolinking 기반을 포함하며 추가 SDK 사용에 따라 app size가 달라진다. framework 채택의 binary size는 실제 release artifact에서 측정한다. arbitrary native library는 development build에 포함하고 그 library의 추가 native setup을 수행한다.

manual native project에 `expo run:*`를 쓰는 것은 CNG 재생성 채택과 다르다. CNG를 나중에 선택하면 변경을 app config/plugin으로 옮긴 뒤 clean generation을 검사한다.

## 이전 업데이트 도구

CodePush 관련 오래된 은퇴 예정 시점/지원 문구를 현재 서비스 상태처럼 적용하지 않는다. SDK57은 New Architecture가 필수이므로 기존 updater의 architecture/runtime support를 검증하고 Expo Updates protocol/EAS Update로 옮길지는 별도 migration으로 결정한다. 앱 코드 전달, signing과 runtime compatibility는 도구 설치만으로 완료되지 않는다.

## 출처

- [Expo Documentation, Overview of using Expo with existing React Native apps](https://docs.expo.dev/bare/overview)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
