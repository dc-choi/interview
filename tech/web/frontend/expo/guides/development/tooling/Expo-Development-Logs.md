---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo console과 native 로그 경로"]
---

# Expo console과 native 로그 경로

## 개발 console

`console.log/warn/error`는 연결한 runtime에서 Expo CLI terminal로 WebSocket 전달된다. 빠른 확인에 유용하지만 engine에 직접 연결한 inspector보다 fidelity가 낮다. `console.table`과 객체/고급 로그는 Hermes development build와 React Native DevTools/inspector에서 확인한다.

## production mode

`expo start --no-dev`에서는 runtime의 terminal log forwarding이 포함되지 않는다. CLI option으로 production forwarding을 되살릴 수 없다. console 호출 자체는 native device log에 남을 수 있으므로 Android는 adb logcat, iOS는 Console 앱에서 확인한다. minifier로 호출을 제거했다면 device log에도 남지 않는다.

```sh
adb logcat
npx react-native log-android
npx react-native log-ios
```

React Native CLI의 log command는 설치된 CLI의 지원도 확인한다. raw system log에는 앱 외 OS/다른 process 정보도 들어갈 수 있어 package/process로 범위를 좁힌다.

## native 문제

Android Studio/Xcode에서 로컬 compile한 프로젝트의 native runtime log와 stack을 확인한다. JS error, native crash와 OS permission/launch failure는 다른 층의 문제다. terminal console이 비었다고 실행이 없었다고 결론내리지 않는다. release-only 문제는 release binary 또는 production JS 조건을 재현하고 그 환경의 log를 수집한다.

## 출처

- [Expo Documentation, View logs](https://docs.expo.dev/workflow/logging)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
