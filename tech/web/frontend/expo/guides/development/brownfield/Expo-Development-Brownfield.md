---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo brownfield 통합 방식과 지원 상태"]
---

# Expo brownfield 통합 방식과 지원 상태

## brownfield의 의미

UIKit/Swift 또는 Android native가 main entry인 앱에 React Native 화면 일부를 추가하는 통합이다. React Native가 main entry인 기존 RN 앱과 다르다. 한 화면부터 이관해도 되고 전체 rewrite가 필수는 아니다.

Expo brownfield integration은 alpha다. SDK, Modules API, Router/CLI와 EAS Build/Submit/Update는 지원 범주지만 모든 greenfield 기능이 동일하게 제공되는 것은 아니다. 특히 Expo Dev Client는 현재 brownfield 지원 대상이 아니다.

## integrated와 isolated

| 방식 | 개발/빌드 연결 | 적합 조건 | 비용 |
| --- | --- | --- | --- |
| integrated | JS와 native source를 같은 build graph에서 관리 | 같은 팀의 잦은 양쪽 수정 | host build에 Node/RN tooling 통합 |
| isolated | Expo를 AAR/XCFramework로 배포해 host가 소비 | 팀 분리, native 빌드 영향 최소화 | artifact version/ABI/배포 관리 |

integrated는 기본 android/ios 구조나 workspace의 custom root를 구성한다. isolated는 Expo library를 별도 repo/monorepo에서 만들어 native dependency처럼 연결한다. native 개발자는 release artifact 소비만 한다면 Node 환경이 없어도 된다.

## 공통 검증

host 앱의 lifecycle, deep links, navigation/back, update/runtime version과 signing을 통합 방식에 맞춰 확인한다. CNG는 existing host 전체를 재생성하는 도구가 아니라 isolated Expo 프로젝트 생성에 사용할 수 있다. 일반 greenfield install example의 main component name과 host의 registration을 일치시킨다.

## 출처

- [Expo Documentation, Integrating Expo tools into existing native apps](https://docs.expo.dev/brownfield/overview)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
