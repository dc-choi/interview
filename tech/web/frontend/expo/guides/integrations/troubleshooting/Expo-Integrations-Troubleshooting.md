---
tags: [expo, expo-integrations, troubleshooting]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 등록 오류와 native 버전 불일치"]
---

# Expo 등록 오류와 native 버전 불일치

오류는 bundle 평가, root registration, native binary와 JS package 호환, network, build/OTA 단계로 나누어 원인을 찾는다. 마지막 Redbox가 처음 실패의 원인이라고 단정하지 않는다. Router, push, EAS Build/Update/Observe/Workflows 오류는 각 영역의 상세 문서와 원본 로그로 좁힌다.

## Application has not been registered

native는 AppKey로 등록된 JS root를 실행한다. 먼저 bundle load가 성공해야 AppRegistry registration에 도달한다. 앞서 exception이 throw하면 registration이 중단돼 main-not-registered는 후속 오류가 된다. 따라서 그 이전 log를 읽고 duplicated native view module(예: safe-area-context 여러 version)을 확인한다.

registerRootComponent(App)는 AppRegistry.registerComponent('main',...)을 사용한다. handwritten iOS moduleName과 Android getMainComponentName이 같은 key여야 한다. package main은 entry file 설정이지 AppKey 자체가 아니다. custom entry는 default export만으로 등록된다고 가정하지 않는다. source의 AppDelegate.m/MainActivity.java 예제는 오래된 형태이며 현재 native Swift/Kotlin equivalent에서 값을 확인한다.

다른 project Metro에 연결했는지 server process/port를 확인한다. production-only 실패는 no-dev/minify reproduction이 도움 되지만 actual release native error도 별도로 추적한다.

## React Native version mismatch

메시지의 JS version은 Metro가 읽은 react-native, Native version은 설치 binary의 RN이다. SDK upgrade 후 old binary, 다른 project server나 misaligned dependency가 원인일 수 있다. expo package/app config sdkVersion을 맞추거나 obsolete sdkVersion을 제거하고 doctor/install --fix로 SDK57의 RN0.86 대응을 확인한다.

다른 dev server를 먼저 정리하고 native dependency를 바꿨다면 rebuild한다. existing RN project는 native upgrade/pod install도 확인한다. cache clear로 오래된 native binary가 새 RN으로 바뀌지는 않는다. runtime production 문제는 crash reporting과 OTA runtimeVersion으로 이어진다.

## 출처

- [Expo Documentation, Troubleshooting overview](https://docs.expo.dev/troubleshooting/overview)
- [Expo Documentation, "Application has not been registered" error](https://docs.expo.dev/troubleshooting/application-has-not-been-registered)
- [Expo Documentation, "React Native version mismatch" errors](https://docs.expo.dev/troubleshooting/react-native-version-mismatch)

## 관련 문서

- [[Expo-Router-Installation]]
- [[Expo-Integrations-Caches-Proxies]]
- [[Expo-Integrations-Expo-Go]]
- [[Expo-Integrations-Error-Replay]]
