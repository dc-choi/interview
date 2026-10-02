---
tags: [react-native, ios, native, legacy, swift]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 iOS Native Module"]
---

# React Native 레거시 iOS Native Module

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Module 등록과 이름

기존 legacy iOS module은 `NSObject`가 `RCTBridgeModule` protocol을 구현한다. 헤더에서 `<React/RCTBridgeModule.h>`를 import하고 `.m` 구현에 `RCT_EXPORT_MODULE()`을 붙인다. 새 module은 [[RN-Turbo-Native-Modules]]를 사용한다.

`RCT_EXPORT_MODULE(CalendarModuleFoo)`의 인자는 string literal이 아닌 이름 token이다. 인자를 생략하면 ObjC 클래스명에서 `RCT`/`RK` 접두사를 제거한 이름으로 JS에 expose한다. module namespace와 ObjC 클래스 이름 충돌을 별도로 피한다.

## Method export와 rebuild

`RCT_EXPORT_METHOD`로 노출한 method는 비동기이며 반환형은 `void`다. 결과는 callback, Promise 또는 event로 전달한다.

```objc
RCT_EXPORT_METHOD(createCalendarEvent:(NSString *)name
                  location:(NSString *)location) {
  // native API를 연결한다.
}
```

JS는 `NativeModules.CalendarModule`을 가져와 호출한다. wrapper를 두면 입력 처리와 TypeScript 인터페이스를 모을 수 있지만 JS 타입 선언이 bridge의 native 시그니처를 검증하지 않는다.

native 변경은 iOS 재빌드가 필요하다. 입문 logging 예제의 method 호출이 실제 Calendar 생성과 권한 승인을 증명하는 것은 아니다. 레거시 페이지의 Chrome/Flipper 디버깅 안내는 현재 RN DevTools와 별도로 읽는다.

## 동기 method

`RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`의 결과는 JSON으로 직렬화 가능한 `id`여야 한다. `nil`, NSNumber, NSString, NSArray와 NSDictionary 같은 값을 반환한다.

동기 호출은 성능/threading 부담이 있으므로 필요성을 먼저 확인한다. 레거시 Chrome 원격 JS VM 방식과 메모리 공유가 맞지 않는 설명을 현재 DevTools의 일반 제한으로 확대하지 않는다.

## 인자 타입

| ObjC | JavaScript |
| --- | --- |
| NSString | string/nullable string |
| BOOL | boolean |
| double | number |
| NSNumber | nullable number |
| NSArray | array/nullable array |
| NSDictionary | object/nullable object |
| RCTResponseSenderBlock | callback |
| RCTPromiseResolveBlock + RCTPromiseRejectBlock | Promise |

legacy `RCTConvert`가 지원하는 타입 변환을 사용할 수 있지만 새 TurboModule로 옮길 때는 Spec 타입과 직접 변환 계약을 맞춘다. 레거시에서 쓰던 RCTResponseErrorBlock, NSInteger, CGFloat와 float를 새 Spec에 그대로 옮기지 않는다.

## 상수와 초기화 thread

`constantsToExport()`의 NSDictionary는 초기화 시 JS 상수를 제공한다. JS에서 `getConstants()`로 읽을 수 있다. 나중에 native 값을 바꾸어도 기존 상수가 자동 갱신되지는 않는다.

상수를 export하면 `+requiresMainQueueSetup`으로 초기화가 main thread를 요구하는지 밝힌다. UIKit 접근이 필요하지 않으면 `NO`를 반환하는 경로를 검토한다.

## callback

`RCTResponseSenderBlock`은 JS callback에 전달할 argument array를 한 인자로 받는다. 예를 들어 `callback(@[[NSNull null], eventId])`는 JS에서 `(error, eventId)`로 받는다.

callback은 한 번 완료하고 보관할 경우 lifecycle을 관리한다. callback을 전혀 완료하지 않으면 보관 자원이 누수될 수 있다. 성공/실패 callback을 따로 쓰더라도 한 요청에서 둘 다 실행하지 않는다.

JS에 오류 모양 dictionary를 줄 때 `RCTMakeError`를 사용할 수 있다. dictionary와 실제 JS Error가 같은 계약이라고 가정하지 않는다. `RCTResponseErrorBlock`을 TurboModule의 권장 타입으로 간주하지 않는다.

## Promise

export method 끝의 resolve/reject block이 JS Promise와 연결된다. 결과를 resolve하거나 오류 code/message/NSError로 reject한다. completion은 최대 한 번이며 JS에서는 `await`와 `try/catch`로 사용한다.

## events와 관찰 자원

반복 native event는 `RCTEventEmitter`를 상속하여 `supportedEvents`와 `sendEventWithName:body:`를 구현한다. JS는 해당 module의 `NativeEventEmitter`에 구독한다.

`startObserving`은 첫 listener가 생길 때, `stopObserving`은 마지막 listener가 없어지거나 dealloc될 때 upstream 작업을 연결/해제하는 장소다. listener 없는 이벤트 발행과 불필요한 background 작업을 피한다.

## methodQueue와 blocking 작업

별도 queue를 제공하지 않은 module은 호출 thread를 가정하지 않는다. legacy의 module별 GCD queue 배정은 구현 상세다.

- main-thread-only API는 `methodQueue`에서 main queue를 명시하거나 필요한 부분만 main으로 보낸다.
- 오래 걸리는 작업은 별도 queue 또는 method 내부 `dispatch_async`로 분리한다.
- module의 모든 method가 같은 지정 queue를 사용한다.
- 여러 module이 같은 queue를 공유할 때는 같은 queue instance를 반환하고 보관한다. 이름만 같은 새 queue를 만들지 않는다.

## Dependency Injection

legacy에서는 `RCTBridgeDelegate` 구현이 module instance를 준비하고 `RCTBridge`를 delegate로 초기화할 수 있다. 해당 bridge로 `RCTRootView`를 생성한다. 이 경로를 새 architecture의 provider registration과 혼합하지 않는다.

## Swift 노출

Swift 클래스와 method에 `@objc`를 붙여 ObjC runtime에 보이게 한다. `.m`에서 `RCT_EXTERN_MODULE`과 `RCT_EXTERN_METHOD`로 module과 selector를 등록한다. 필요한 ObjC header를 Swift bridging header에서 import한다.

module/method JS 이름 변경은 `RCT_EXTERN_REMAP_MODULE` 등의 remap macro 계약을 사용한다. 레거시 문서의 static Swift library와 Xcode 9, 빈 Swift 파일 workaround는 이전 build 구성의 설명이며 현재 모든 프로젝트 요구사항으로 일반화하지 않는다.

New Architecture의 Swift 재사용은 [[RN-Native-Module-Advanced]]의 ObjC++ adapter 방식과 구분한다.

## 정리

`RCTInvalidating` protocol과 `invalidate()`로 bridge reload/무효화 때 필요한 resource cleanup을 구현할 수 있다. observer, 저장한 callback와 내부 state를 해당 lifecycle에 맞춰 정리한다.

## 출처

- [React Native, iOS Native Modules](https://reactnative.dev/docs/legacy/native-modules-ios)

## 관련 문서

- [[RN-Legacy-Native-Modules]]
- [[RN-Turbo-Native-Modules]]
- [[RN-Native-Module-Advanced]]
- [[RN-Legacy-iOS-Components]]
