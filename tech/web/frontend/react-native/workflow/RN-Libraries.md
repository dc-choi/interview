---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 라이브러리 설치와 호환성"]
---

# React Native 라이브러리 설치와 호환성

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 필요한 기능을 찾는 순서

Core Components와 API가 요구를 충족하면 먼저 사용한다. 부족한 기능은 React Native Directory에서 플랫폼별 라이브러리를 찾고, 없으면 npm registry를 탐색한다. npm에 등록돼 있다는 사실은 React Native에서 실행 가능하다는 보장이 아니다.

React Native Community와 Expo의 라이브러리가 많이 등록돼 있다. Community의 플랫폼 지원은 프로젝트마다 다르고 Expo library도 가능한 범위에서 iOS, Android와 web을 지원한다. 조직 이름만 보고 모든 플랫폼 지원을 가정하지 않는다.

## 설치와 package manager

Node 설치에는 npm CLI가 포함된다. 공식 가이드는 npm과 Yarn Classic을 예시로 사용한다. 기존 프로젝트의 lockfile과 package manager를 유지하고 설치 도구만 바꿔 여러 lockfile을 만들지 않는다.

```sh
npm install react-native-webview
# 또는 yarn add react-native-webview
```

특정 버전은 `npm install <library>@<version>`으로 선택한다. 최신 라이브러리가 최신 React Native를 겨냥하는 경우가 많지만 호환성은 README와 버전 지원표, 실제 빌드로 확인한다.

## JavaScript 설치와 native binary를 구분한다

네이티브 코드를 포함한 패키지는 JavaScript 설치 뒤 native app 연결과 rebuild가 필요하다. Fast Refresh는 이미 설치된 binary에 없는 네이티브 기능을 추가하지 않는다.

```sh
# iOS CocoaPods 연결 후 바이너리 다시 만들기
npx pod-install
npm run ios

# Android Gradle 의존성을 반영해 다시 만들기
npm run android
```

iOS는 CocoaPods 기반 패키지의 일반 흐름이고 다른 연결 규약을 사용하는 패키지는 README를 따른다. Android는 Gradle의 native dependencies와 앱 binary를 재빌드한다. framework 프로젝트에서는 해당 framework의 설치와 development build 절차도 함께 확인한다.

## 호환성의 세 질문

| 질문 | 확인 자료 |
|---|---|
| React Native runtime에서 실행되는가 | DOM, Node.js 전용 API 의존성, RN 전용 구현 |
| 앱의 모든 플랫폼을 지원하는가 | Directory filter, README와 native 구현 |
| 현재 React Native 버전을 지원하는가 | 지원 버전표, release notes와 dependency 범위 |

웹의 `react-select`는 react-dom을 대상으로 하고 Node의 `rimraf`는 컴퓨터 파일 시스템에 의존하므로 이름만 보고 사용할 수 없다. JavaScript 언어 기능만 사용하는 lodash 같은 라이브러리는 환경 의존성이 작은 사례다. 개별 package가 사용하는 API를 기준으로 판단한다.

## 앱에 적용하는 흐름

1. 필요한 기능과 Core API로 충분한지를 확인한다.
2. Android/iOS 및 추가 플랫폼 지원을 확인한다.
3. 앱의 RN 버전과 아키텍처에 맞는 release를 선택한다.
4. README대로 설치하고 native 코드가 있으면 두 플랫폼을 rebuild한다.
5. 기능과 release 동작을 실제 기기에서 확인한다.
6. 맞지 않으면 `npm uninstall` 등 기존 package manager로 제거한다.

Directory 등록과 설치 성공은 실행 호환성의 최종 증거가 아니다. JavaScript API, 네이티브 링크와 release binary를 각각 확인한다.

## 출처

- [React Native, Libraries](https://reactnative.dev/docs/libraries)

## 관련 문서

- [[RN-Core-Components]]
- [[RN-Fast-Refresh]]
- [[RN-Upgrading]]
- [[Expo]]
