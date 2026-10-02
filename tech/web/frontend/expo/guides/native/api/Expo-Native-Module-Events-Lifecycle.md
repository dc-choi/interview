---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Modules API 이벤트와 lifecycle"]
---

# Modules API 이벤트와 lifecycle

## Module events

Events(name...)에 선언한 event를 Module.sendEvent(name,payload)로 보낸다. Android는 Map<String,Any?> 또는 Bundle, iOS는 [String:Any?]를 사용한다. module object는 NativeModule/EventEmitter 기반이므로 addListener를 지원하며 useEvent/useEventListener hook도 사용할 수 있다.

```ts
import { NativeModule, requireNativeModule } from 'expo';
type Events = { onChange(event: { value: string }): void };
declare class MyModule extends NativeModule<Events> {}
const module = requireNativeModule<MyModule>('MyModule');
const subscription = module.addListener('onChange', event => console.log(event.value));
subscription.remove();
```

최신 reference의 OnStartObserving(eventName)는 해당 이벤트의 첫 listener가 추가될 때, OnStopObserving(eventName)는 마지막 listener가 제거될 때 실행된다. 센서나 NotificationCenter observer를 이 경계에서 설치/제거한다. 원문 아래 오래된 clipboard 예제의 eventName 없는 overload를 최신 mandatory event scoping 설명과 혼동하지 않는다.

## Module lifecycle

| Callback | 시점/플랫폼 |
|---|---|
| OnCreate | module 초기화 직후, class initializer 대신 setup |
| OnDestroy | module deallocation 직전, 자원 cleanup |
| OnAppContextDestroys | 소유 appContext deallocation 직전 |
| OnAppEntersForeground | iOS foreground 진입 직전 |
| OnAppEntersBackground | iOS background 진입 |
| OnAppBecomesActive | iOS foreground 이후 active 복귀 |
| OnActivityEntersForeground | Android Activity resume 직후 |
| OnActivityEntersBackground | Android Activity pause 직후 |
| OnActivityDestroys | JS context 소유 Activity destruction 직전 |

iOS app 상태와 Android Activity 상태는 동일한 lifecycle가 아니다. 사용자에게 다른 앱이 잠시 덮인 상황과 app process 종료를 동일하게 처리하지 않는다. listeners를 제거하고 pending native 작업의 취소/완료 정책을 둔다.

## Android result와 intent

OnActivityResult(activity,payload)는 startActivityForResult의 requestCode/resultCode/data(nullable Intent)를 받는다. 신규 구현은 RegisterActivityContracts 안에서 registerForActivityResult로 typed contract를 등록하고 async 함수에서 launcher.launch를 사용하는 현대적 방법을 검토한다.

OnNewIntent(intent)는 실행 중 Activity가 새 intent를 받았을 때 호출되며 deep link 등을 처리한다. OnUserLeavesActivity는 Home 버튼처럼 사용자 선택으로 background로 가는 경우 호출되지만 전화 수신처럼 다른 Activity가 강제로 올라온 상황에서는 같은 의미가 아니다.

이 DSL module callback과 별도 Package 기반 Activity/Application listener는 registration과 lifetime이 다르다. 앱 진입점 수준 hooks는 [[Expo-Native-Android-Lifecycle|Android lifecycle listeners]], [[Expo-Native-AppDelegate|AppDelegate subscribers]]에서 다룬다.

## 출처

- [Expo Documentation, Module API Reference](https://docs.expo.dev/modules/module-api/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
