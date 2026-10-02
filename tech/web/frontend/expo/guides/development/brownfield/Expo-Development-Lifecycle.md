---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo brownfield lifecycle forwarding"]
---

# Expo brownfield lifecycle forwarding

## 이벤트 전달 책임

native module은 deep link, push와 configuration change를 AppDelegate/Application/Activity callback에서 받는다. host가 callback을 소비하고 Expo에 전달하지 않으면 module 설치와 linking이 성공해도 기능이 실행되지 않을 수 있다.

Android는 `ApplicationLifecycleDispatcher`와 ReactActivityHandler가 event를 전달한다. module의 Package는 ReactActivityLifecycleListener/ApplicationLifecycleListener를 등록한다. host Application의 onCreate/onConfigurationChanged를 dispatcher로 forwarding하고 RN Activity delegate wrapper/handler를 통합한다.

iOS는 ExpoAppDelegateSubscriber가 callback을 등록한다. host AppDelegate에 `ExpoAppDelegateSubscriberManager` forwarding을 추가하거나 다른 superclass 충돌이 없으면 ExpoAppDelegate를 상속한다. 모든 UIApplicationDelegate method가 forwarding되는 것은 아니므로 필요한 callback을 현재 ExpoAppDelegate.swift에서 확인한다.

## deep link로 경로 확인

```tsx
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Incoming URL', url);
  });
  return () => subscription.remove();
}, []);
```

expo-linking을 native에 설치하고 scheme를 등록한 뒤 `uri-scheme open <scheme>://details --android/--ios`로 검사한다. 위 event는 이미 열린 앱의 새 URL 경로를 확인한다. 종료 상태 launch는 getInitialURL까지 검사해 cold start 누락을 잡는다.

## 통합 검증 조건

host의 기존 callback 처리와 Expo subscriber를 함께 유지한다. event 중복 forwarding과 누락을 구분하고 back/navigation, rotation/configuration change와 앱 재시작을 확인한다. listener cleanup은 subscription.remove()로 수행한다. JS log 한 번을 관찰한 것만으로 push/모든 delegate method를 검증했다고 보고하지 않는다.

## 출처

- [Expo Documentation, Configuring lifecycle listeners](https://docs.expo.dev/brownfield/lifecycle-listeners)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
