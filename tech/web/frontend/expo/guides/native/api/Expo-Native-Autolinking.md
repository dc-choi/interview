---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Autolinking 해석과 중복 패키지"]
---

# Expo Autolinking 해석과 중복 패키지

## 검색과 build 통합

Expo Autolinking은 CLI resolution, Gradle integration, CocoaPods integration으로 나뉘며 Expo와 React Native 모듈을 모두 연결한다. create-expo-app 프로젝트는 기본 설정되어 있다. 다른 React Native 앱은 Expo Modules 설치 절차로 native build integration을 추가한다.

검색 순서는 RN module에 한해 react-native.config.js의 explicit root, searchPaths, nativeModulesDir(default ./modules), 앱 dependency/peer dependency의 recursive Node-style resolution이다. native package 설치 뒤 iOS Pods와 native build를 갱신해야 한다.

## 설정 우선순위와 옵션

낮은 순서부터 package.json `expo.autolinking`, android/ios/apple platform override, CLI/Podfile use_expo_modules!/Gradle useExpoModules 옵션이다. apple이 없으면 ios 설정에 fallback한다.

| 옵션 | 계약 |
|---|---|
| searchPaths | app root 상대 경로, node_modules 같은 package directory structure |
| nativeModulesDir | local modules 경로, 기본 ./modules |
| exclude | native build 연결에서 package 제외, SDK54부터 RN modules도 적용 |
| include | SDK55+, 비native singleton/state package도 중복 검사 및 Metro 일치 대상 |
| flags | iOS autolink pod에 CocoaPods flags 전달, inhibit_warnings 등 |
| buildFromSource | Android prebuilt Expo module 대신 source build 선택 |
| legacy_shallowReactNativeLinking | RN module만 recursive search 대신 direct dependencies 검색 |

include는 native build에 library를 추가하지 않는다. root/platform include 목록은 override가 아니라 병합된다. RN module의 platform을 react-native.config.js에서 null로 설정해서 제외할 수도 있다.

SDK54 이전에는 monorepo 상위 node_modules가 searchPaths 기본 검색에 포함됐다. 해당 행동이 필요하면 `["../../node_modules", "./node_modules"]`처럼 명시한다. 현재 기본을 옛 검색 범위로 가정하지 않는다.

## 진단 CLI

```sh
npx expo-modules-autolinking search
npx expo-modules-autolinking resolve --platform apple
npx expo-modules-autolinking verify --verbose
npx expo-modules-autolinking react-native-config --platform ios
```

search는 package path/version/config와 lower-priority duplicates를 출력한다. resolve는 pod/build.gradle, module classes와 subscriber 등 platform detail을 반환한다. verify는 duplicated native package를 경고하며 verbose는 모든 연결 목록도 보여준다. react-native-config는 RN community config 형식의 dependency native path를 출력한다. expo-doctor는 동일 duplicate 문제 외 프로젝트 검사를 함께 실행한다.

## Metro/native 불일치

native binary에는 한 version만 연결되는데 JS bundle에 두 version이 들어가면 runtime incompatibility/crash가 발생할 수 있다. 가장 확실한 해결은 dependencies를 deduplicate하는 것이다. SDK54+ `experiments.autolinkingModuleResolution: true`는 Metro/CLI resolution을 native autolinking에 맞추는 우회 방법이다. SDK55+ monorepo 앱에서는 기본 활성화된다. 중복 physical installation을 제거하는 기능은 아니다.

context 또는 module-level state를 가진 순수 JS package도 include로 검사할 수 있다. 이 목록과 built-in singleton package 목록도 resolution 일치 대상이 된다.

## RN community autolinking 선택

SDK52부터 Expo Autolinking이 RN modules를 기본 처리한다. `EXPO_USE_COMMUNITY_AUTOLINKING=1`과 @react-native-community/cli dev dependency를 사용하면 RN modules만 community CLI로 바꿀 수 있으며 Expo modules autolinking은 계속 남는다. 환경변수만으로 native dependencies가 제거되는 것은 아니다.

## 출처

- [Expo Documentation, Autolinking](https://docs.expo.dev/modules/autolinking)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
