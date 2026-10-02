---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 57 호환성 기준"]
---

# Expo SDK 57 호환성 기준

## SDK 기준

Expo SDK는 카메라, 센서와 시스템 기능을 제공하는 패키지 묶음이다. `expo`가 설치되고 구성된 React Native 앱에서 필요한 패키지만 선택할 수 있다. Expo Go 사용이나 EAS 클라우드 사용이 모든 SDK 패키지의 필수 조건은 아니다.

2026-10-01에 확인한 Reference의 `latest`는 SDK 57이다. 버전 없는 Guides에 이후 SDK의 설명이 먼저 나타날 수 있으므로 기능을 적용할 때 SDK reference와 release status를 대조한다.

| 항목 | SDK 57 기준 |
| --- | --- |
| React Native | 0.86 |
| React | 19.2.3 |
| React Native Web | 0.21.0 |
| React Native TV | 0.86-stable |
| 최소 Node.js | 22.13.x |
| Android 지원 | Android 7 이상 |
| Android compile/target SDK | 36 / 36 |
| iOS 지원 | iOS 16.4 이상 |
| Xcode | 26.4 이상 |

React Native 공식 사이트의 최신 버전과 Expo SDK에 대응하는 버전은 다를 수 있다. SDK는 특정 React Native 버전을 대상으로 하므로 최신 React Native를 독립적으로 올린 조합까지 호환된다고 가정하지 않는다.

## 설치와 변경 단위

```sh
npx expo install expo-camera expo-contacts expo-sensors
```

`expo install`은 SDK와 맞는 패키지 선택에 사용한다. 기존 React Native 앱은 `npx install-expo-modules`로 Expo Modules 지원을 구성할 수 있다. 개별 API의 플랫폼, 권한과 네이티브 재빌드 요구는 각 패키지 reference를 따른다.

## Prerelease

Canary는 main의 시점별 snapshot이며 버전에 날짜와 commit 식별자가 포함된다. Beta는 정식 SDK 직전의 시험 버전이다. 둘 다 정식 안정 버전과 구분한다. Canary 도입 시 `expo@canary` 설치와 `expo install --fix`로 관련 의존성을 맞추며, 경고를 끄는 행위는 호환성 검증을 대체하지 않는다.

현재 SDK에 없는 React Native 수정이 필요하면 유지 중인 버전으로 backport되는지 먼저 확인한다. 별도 patch 또는 prerelease는 변경 위험과 회귀 검증을 감수하는 선택이다. SDK 문서에 혼재한 연간 release 횟수만으로 미래 일정을 확정하지 않는다.

## 빌드 가능성과 제출 가능성

최소 OS는 앱 실행 범위이며 target SDK와 Xcode는 빌드와 제출 요건에 관련된다. 표의 OS/도구 지원과 App Store/Google Play의 현재 제출 정책은 별도로 확인한다. SDK 업그레이드만으로 스토어 심사 조건을 모두 충족한다고 판단하지 않는다.

## 출처

- [Expo Documentation, Expo SDK reference](https://docs.expo.dev/versions/latest/)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
