---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 React Native 앱의 Expo CLI 전환"]
---

# 기존 React Native 앱의 Expo CLI 전환

## 설치 이후 bundling도 바꾸기

Expo CLI는 expo package에 포함된다. `install-expo-modules`로 native Modules 통합을 하고 Metro/Babel/native bundle configuration까지 Expo 기준으로 맞춘다. package만 설치하고 React Native CLI embed path를 그대로 두면 Router/dev-client/EAS Update에서 예상하지 못한 차이가 날 수 있다.

```sh
npx expo run:android --device
npx expo run:ios --no-bundler
npx expo start
```

run은 compile/install과 server 시작을 수행한다. `--no-bundler`면 bundler를 별도로 실행하며 `--device`로 실기기/Simulator를 선택한다. 앱 entry는 package main과 Expo entry resolution을 따른다.

## 개발 기능

J는 Hermes DevTools, Shift+A/I는 기기 선택이다. CLI는 port 충돌 탐지, tunnel, native log formatting, iOS pod install과 compatibility-aware install을 제공한다. TypeScript paths/baseUrl, environment variables, Metro web/CSS/static rendering과 monorepo 지원도 Expo bundling configuration에 연결된다.

Prebuild는 선택적 CNG 도구다. CLI 전환이 native 프로젝트를 자동 삭제/재생성하는 약속은 아니다.

## Modules 없이 CLI만 사용

expo package를 JS dependency로 설치하고 `react-native.config.js`에서 expo의 android/ios/macos autolinking을 null로 제외해 CLI만 시험할 수 있다. 이 구성에서는 Modules API가 없으므로 dev-client/Router 등의 native 기능은 사용할 수 없다. 기능 요구에 맞게 설치 범위를 정한다.

Windows/macOS 같은 out-of-tree platform은 CLI의 built-in 지원 대상이 아니므로 해당 platform CLI와 병행한다. custom Prebuild 예제의 가능성과 Expo SDK의 공식 지원 platform을 구분한다.

## 출처

- [Expo Documentation, Migrate from React Native CLI to Expo CLI](https://docs.expo.dev/bare/using-expo-cli)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
