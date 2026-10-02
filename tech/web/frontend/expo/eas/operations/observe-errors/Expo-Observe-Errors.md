---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe JS 오류와 native crash"]
---

# Observe JS 오류와 native crash

## 자동 포착과 수동 보고

Error reporting은 SDK 57의 preview 기능이다. expo-observe import 때 global JS handler를 연결하지만 React Native redbox나 fatal 종료를 막지 않는다. errorHandlingEnabled=false는 자동 JS handler만 끈다.

ObserveErrorBoundary는 렌더링 오류에 fallback(element/null/function)을 표시한다. 함수 fallback은 error와 resetError를 받고 resetError는 subtree를 다시 mount한다. ObserveRoot 컴포넌트의 errorBoundaryFallback과 HOC wrap 사용법은 구분한다.

Observe.reportError는 Error의 name/message/stack을 보내며 그 외 값은 문자열화하여 stack이 없을 수 있다. 수동 보고를 성공 응답 처리처럼 사용하지 않고 사용자 복구와 telemetry를 분리한다. 오류 메시지에 token이나 개인정보를 넣지 않는다.

## Native crash 범위

expo-observe 57.0.21 이상이 필요하며 다음 앱 실행에서 이전 crash를 전송한다. Android는 Java/Kotlin exception과 Caused by chain, Android 11 이상은 OS native crash 기록을 활용한다. iOS는 MetricKit의 Mach/signal과 iOS 17 이상 Objective-C/Swift exception을 사용한다.

tvOS, iOS Simulator, ANR와 OOM 종료는 이 native crash 지원 범위에 포함하지 않는다. 앱을 다시 열지 않으면 fatal event 수신이 늦거나 없을 수 있다. crash-free 비율은 nonfatal event 수가 아니라 fatal 기준이다.

## Stack과 source map 제한

EAS CLI 22 이상 cloud build에서 eas.json uploadSourceMaps=true를 사용할 수 있다. 업로드 전에 sourcesContent를 제거하며 upload 실패가 warning으로 끝나 build 자체는 성공할 수 있다. 따라서 build 성공만으로 symbolication 준비를 확정하지 않는다.

현재 OTA update source map은 지원하지 않는다. dSYM/ProGuard/native debug symbol 업로드와 dashboard native symbolication도 지원하지 않는다. iOS는 기기에서 얻은 함수명이 보여도 file/line은 없고 unresolved binary offset이 남을 수 있다.

## 출처

- [Expo Documentation, Error reporting](https://docs.expo.dev/eas/observe/errors)

## 관련 문서

- [[Expo-Observe-Error-Operations]]

- [[Expo]]
