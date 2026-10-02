---
tags: [react-native, android, native, legacy]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 Android Native Module"]
---

# React Native 레거시 Android Native Module

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 대상과 구현 클래스

기존 legacy module은 Java/Kotlin 클래스를 JS `NativeModules` 객체로 노출한다. 새 구현은 typed Spec과 [[RN-Turbo-Native-Modules]]를 우선한다. 아래 등록과 completion 규칙은 legacy bridge 계약이다.

`CalendarModule` 예제는 `ReactContextBaseJavaModule`을 상속하고 `ReactApplicationContext`를 생성자로 받는다. 기술적으로 `BaseJavaModule` 또는 `NativeModule`도 기반이 될 수 있지만 context와 lifecycle 접근을 위해 위 base class를 사용한다.

- `getName()`의 반환값이 JS 조회 이름이다.
- JS로 노출할 native method에는 `@ReactMethod`를 붙인다.
- 입문의 `createCalendarEvent(name, location)` 구현은 logging 예제이며 실제 Calendar 생성 구현은 아니다.

## 패키지 등록과 빌드

1. `ReactPackage` 구현을 만든다.
2. `createNativeModules(context)`가 module instance 목록을 반환하게 한다.
3. View가 없으면 `createViewManagers`는 빈 목록을 반환한다.
4. `MainApplication`의 `getPackages()`에서 package를 추가한다.
5. native 앱을 다시 빌드한다.

`createNativeModules`로 등록하면 앱 시작 시 eager initialization이 발생한다. 레거시 문서는 `TurboReactPackage.getModule`과 metadata provider로 lazy 초기화를 설명한다. 이것을 현재 TurboModule tutorial의 `BaseReactPackage` 코드와 동일한 구조로 혼합하지 않는다.

```ts
import {NativeModules} from 'react-native';

interface CalendarAPI {
  createCalendarEvent(name: string, location: string): void;
}
export default NativeModules.CalendarModule as CalendarAPI;
```

wrapper는 JS 호출 인터페이스와 입력 변환을 모을 수 있지만 위 타입 assertion이 native 구현을 검증하지는 않는다.

## 인자 타입과 변환

| native | JS |
| --- | --- |
| Boolean/boolean | boolean |
| Double/double | number |
| String | string |
| Callback | function |
| Promise | Promise |
| ReadableMap | object |
| ReadableArray | array |

legacy에서 Integer/Float/int/float를 사용할 수 있어도 TurboModule로 그대로 옮길 타입으로 권장되지 않는다. 새 Spec의 숫자 타입을 별도 대조한다. Android Date는 자동 변환이 아니므로 문자열 형식/단위를 선언하고 native에서 파싱한다.

## 동기 호출

`@ReactMethod(isBlockingSynchronousMethod = true)`는 동기 method를 표시한다. 비용과 threading 버그 위험 때문에 먼저 비동기 경로를 검토한다.

레거시 문서의 Chrome debugger 제한은 JS VM을 Chrome으로 옮겨 WebSocket으로 통신하던 원격 실행 방식의 설명이다. 이를 0.87 React Native DevTools의 현재 지원 제한으로 확대하지 않는다.

## 상수

`getConstants()`가 Map을 반환하면 초기화 시 JS에 상수를 제공한다. JS wrapper는 `Module.getConstants()`로 읽는 형태를 사용한다. 초기화 이후 native에서 값이 바뀌어도 legacy JS 값이 자동 갱신되지는 않는다.

상수를 module 객체 property로 직접 읽던 경로와 TurboModule의 일반 method 호출 계약을 혼동하지 않는다.

## callback completion 계약

legacy는 최대 두 callback을 허용한다. 함수 인자 중 마지막은 success, 그 앞은 failure callback으로 취급한다.

- native에서 serializable 값만 전달한다. map/array는 WritableMap/WritableArray를 사용한다.
- callback은 native method 반환과 동시에 JS에 실행되는 것은 아니다.
- 한 호출에서 success 또는 failure 중 하나만, 최대 한 번 완료한다.
- callback을 보관했다가 나중에 호출할 수 있다.
- error-first callback은 첫 결과를 오류 또는 `null`로, 다음 결과를 값으로 전달한다.

여러 결과가 지속적으로 발생하는 흐름은 callback을 반복 호출하지 않고 event로 설계한다.

## Promise completion 계약

native method의 마지막 인자가 `Promise`이면 JS counterpart가 Promise를 반환한다. `resolve` 또는 `reject` 중 하나를 최대 한 번 호출한다.

`reject`는 code, message, userInfo와 throwable 조합을 받을 수 있다. message는 JS 오류에 표시할 내용이고 code는 호출부의 실패 분류에 사용한다. 모든 에러를 성공값으로 resolve하지 않는다.

## native event와 구독 관리

`ReactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(name, params)`로 이벤트를 보낼 수 있다. JS는 `NativeEventEmitter(module).addListener`로 받고 cleanup에서 subscription을 제거한다.

native의 `addListener`와 `removeListeners`는 listener count를 관리한다. 첫 listener에서 upstream 작업을 시작하고 마지막 listener가 없으면 구독/불필요한 background 작업을 정리한다. 이름과 payload 계약을 구분하고 여러 module 간 충돌을 피한다.

## Activity 결과

native에서 시작한 Activity 결과를 받으려면 `BaseActivityEventListener` 또는 `ActivityEventListener`를 구현하고 context에 등록한다. `onActivityResult`에서 request code와 result를 구분한다.

image picker 예제의 실패 상태는 Activity 없음, 취소, picker 표시 실패, image data 없음이다. 기다리는 Promise를 보관하고 결과 후 resolve/reject한 다음 reference를 비운다. 동시에 여러 요청이 같은 대기 Promise를 덮어쓰지 않도록 실제 module 계약을 정한다.

예제의 `startActivityForResult`는 기존 연동 설명이다. 대상 Android API의 현재 Activity Result 방식과 library 구조는 별도 확인한다.

## Lifecycle와 threading

`LifecycleEventListener`를 구현하고 `addLifecycleEventListener(this)`로 등록하면 `onHostResume`, `onHostPause`, `onHostDestroy`를 받을 수 있다.

legacy 문서는 native async method들이 한 thread에서 실행되는 구현을 설명하면서 thread 배정에 의존하지 말라고 명시한다. blocking 작업은 내부 worker로 넘기고 UI 접근은 플랫폼 UI thread 계약에 맞춘다. native lifecycle과 module cleanup 책임을 따로 확인한다.

## 출처

- [React Native, Android Native Modules](https://reactnative.dev/docs/legacy/native-modules-android)

## 관련 문서

- [[RN-Legacy-Native-Modules]]
- [[RN-Turbo-Native-Modules]]
- [[RN-Legacy-Android-Components]]
- [[RN-Native-Module-Advanced]]
