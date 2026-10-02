---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["수동 native 앱의 expo-dev-client 설치"]
---

# 수동 native 앱의 expo-dev-client 설치

## debug 앱의 개발 launcher

expo-dev-client는 앱의 native debug runtime에 launcher/tooling을 추가한다. 기존 React Native 앱은 expo/Modules 통합이 먼저 필요하다. CNG 프로젝트는 development build 생성 workflow를 따른다.

```sh
npx expo install expo-dev-client
npx pod-install
```

iOS 디렉터리가 존재하면 pods를 설치해 native code를 연결한다. 없는 프로젝트에 pod-install이 native 폴더를 생성하는 대신 사용할 수는 없다. 새 앱은 with-dev-client 예제 template에서 시작할 수도 있다.

## URL scheme

Expo CLI는 deep link로 개발 앱과 preview update를 연다. scheme는 앱 native configuration에 등록돼야 한다.

```sh
npx uri-scheme list
npx uri-scheme add store-dev
```

수동 native scheme와 app config 값을 맞추고 Android/iOS binary를 다시 만든다. dependency 추가 뒤 JS reload만 하는 것은 dev-client 설치가 아니다.

## 확인 범위

local 또는 EAS에서 debug build를 만들고 기기에 설치한 뒤 development server 연결과 scheme launch를 검사한다. preview 업데이트 기능은 expo-updates/runtime config가 추가로 필요할 수 있다. brownfield처럼 native가 main entry인 앱은 이 일반 기존-RN 설치 안내의 적용 범위와 같지 않으며 현재 dev-client 지원 제한을 확인한다.

## 출처

- [Expo Documentation, Install expo-dev-client in an existing React Native project](https://docs.expo.dev/bare/install-dev-builds-in-bare)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
