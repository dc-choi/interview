---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Brownfield 메시지와 shared state API"]
---

# Brownfield 메시지와 shared state API

## host와 React Native 계약

`expo-brownfield`는 기존 native Android/iOS 앱에 RN view를 넣는 toolkit이다. communication/navigation API, CNG config plugin, Maven/XCFramework CLI가 함께 들어 있다. source 설치 명령은 `npx expo install expo-brownfield`이며 기존 RN 앱에는 Expo Modules 통합이 선행되어야 한다.

`sendMessage(Record<string, any>)`는 native로 보내고 `addMessageListener(callback)`은 host에서 보낸 dictionary를 받는다. subscription.remove() 또는 동일 callback의 removeMessageListener로 정리한다. removeAllMessageListeners는 다른 소비자도 제거하므로 소유 범위를 고려한다. getMessageListenerCount는 활성 listener 수다. payload는 앱의 versioned schema를 정의하고 runtime에서 검증해야 한다.

```ts
const subscription = Brownfield.addMessageListener(event => {
  if (event.type === 'locale' && typeof event.locale === 'string') applyLocale(event.locale);
});
Brownfield.sendMessage({ type: 'ready', protocolVersion: 1 });
// screen cleanup
subscription.remove();
```

Android host는 `expo.modules.brownfield.BrownfieldMessaging.sendMessage(mapOf(...))`, addListener의 listener ID와 removeListener(id)를 사용한다. iOS는 ExpoBrownfield를 import 하고 BrownfieldMessaging.addListener 및 removeListener(id:)로 연결한다. source timestamp 예제는 Android milliseconds, iOS seconds로 서로 다르므로 wire schema의 단위를 맞춘다.

## shared state와 navigation

`getSharedStateValue<T>(key):T|undefined`, `setSharedStateValue(key,value)`, `deleteSharedState(key)`는 native와 공유할 값을 다룬다. `addSharedStateListener(key, callback)`은 key 별 변화 subscription이다. `useSharedState(key,initialValue?)`는 `[value|undefined,setter]`이며 setter는 값이나 이전 값 기반 function을 받는 synchronous useState 형 API 다. persistence 나 서버 동기화로 해석하지 않는다.

`popToNative(animated=false)`는 RN view를 dismiss 한다. animated는 iOS에만 적용된다. `setNativeBackEnabled(true)`는 native back이 React Navigation의 기본 back 대신 native 영역으로 돌아가게 한다. 화면 전환과 listener cleanup을 연결한다.

## plugin과 artifact build

iOS targetName 기본은 scheme/slug+brownfield, bundleIdentifier는 별도 target의 고유 ID 다. buildReactNativeFromSource 기본 false이며 true는 build 시간을 늘린다. Android group은 Maven group, libraryName 기본 brownfield, package는 기존 package+brownfield, version 기본1.0.0이다. publishing 기본 localMaven이며 localDirectory/remotePublic/remotePrivate를 지원한다.

`npx expo-brownfield build:android`는 build **및 publish**를 수행한다. debug/release/all(기본 all), library, repository, task, verbose option을 받는다. tasks:android로 publish task/repository를 확인한다. build:ios는 brownfield와 Hermes XCFramework를 artifacts(기본./artifacts)에 만들며 release 기본, debug,scheme,xcworkspace,package(Swift Package),verbose를 받는다. config plugin은 prebuild 결과에 적용되므로 package 설정만 바꾼 JS update로 host binary/artifact가 갱신되지 않는다.

## 출처

- [Expo Documentation, Brownfield](https://docs.expo.dev/versions/latest/sdk/brownfield)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
