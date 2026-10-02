---
tags: [react-native, native, cpp, swift, events]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 네이티브 모듈 고급 계약"]
---

# React Native 네이티브 모듈 고급 계약

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 고급 기능의 전제

Codegen, TurboModule과 C++ 모듈의 기본 구현을 먼저 이해한다. 추가할 경계는 커스텀 C++ 타입, Swift 구현 연결, 네이티브 이벤트와 모듈 생명주기다.

0.87의 Advanced Topics 인덱스 일부 링크는 `/docs/next/`로 향한다. 아래 내용은 동일 주제의 `/docs/the-new-architecture/` 0.87 페이지와 대조하여 정리했다.

## 커스텀 C++ 타입

기본 `std::` 타입은 RN bridging 지원 범위를 먼저 확인한다. 새 타입에는 `Bridging<T>` specialization과 JS에서 C++로 가는 `fromJs`, C++에서 JS로 가는 `toJs` 변환이 필요하다.

JS `number`로 큰 64비트 정수의 정밀도를 보존할 수 없으므로 Spec에서는 문자열로 받고 C++에서 `int64_t`로 변환할 수 있다.

- `fromJs`: `jsi::String`을 UTF-8 문자열로 읽어 `std::stoll`로 파싱한다.
- 파싱 위치가 문자열 끝과 일치하는지 검사하여 뒤에 다른 문자가 붙은 값을 거부한다.
- 범위 초과와 잘못된 입력을 JS 오류로 연결한다.
- `toJs`: `std::to_string`과 bridging 변환으로 문자열을 반환한다.
- iOS 프로젝트에도 커스텀 bridging 헤더를 추가한다.

구조체는 Spec에 필드를 선언하고 Codegen이 만든 `<Module><Type>`와 `<Module><Type>Bridging`을 사용한다. template 인자 순서는 필드 순서와 연결된다. `jsi::Object`를 직접 읽는 구현에서는 `getProperty`, `asString`, `utf8`, `asNumber` 변환과 입력 검사를 네이티브 구현이 책임진다. 생성 타입이 업무 유효성을 대신 검증하지 않는다.

## Swift와 Objective-C++ adapter

Swift 구현을 RN C++ 코어에 직접 연결하는 대신 ObjC++ adapter가 Swift 객체를 보유하고 호출을 전달한다. 업무 로직은 Swift에 두고 생성 Spec과 `getTurboModule:`은 ObjC++에 유지한다.

1. Swift 클래스를 `NSObject`에서 상속하고 ObjC에서 접근할 API를 `public`, `@objc` 또는 `@objcMembers`로 노출한다.
2. `.mm`에서 Xcode 생성 `<앱이름>-Swift.h`를 import한다.
3. adapter가 Swift 객체를 생성하고 생성 Spec의 각 메서드를 해당 Swift 메서드로 전달한다.
4. module 이름과 Codegen 등록 매핑을 유지한다. New Architecture 예제에는 기존 `RCT_EXPORT_MODULE`이 필요하지 않다.
5. 앱의 bridging header가 없다면 만들고 Build Settings의 경로를 연결한다. 예제에는 `RCTDefaultReactNativeFactoryDelegate.h`를 import한다.

라이브러리 배포 작성자는 앱 전용 bridging header 절차를 그대로 적용하지 않는다. ObjC에 노출된 메서드 selector와 nullable 변환을 함께 맞춘다.

## typed 네이티브 이벤트

반복되는 플랫폼 알림이나 장기 작업의 진행을 JS에 알릴 때 Spec에 `CodegenTypes.EventEmitter<Payload>`를 선언한다.

```ts
export type KeyValuePair = {key: string; value: string};
// Spec extends TurboModule 내부
readonly onKeyAdded: CodegenTypes.EventEmitter<KeyValuePair>;
```

Spec 변경 후 Codegen을 다시 실행한다. JS는 `onKeyAdded(callback)`이 반환한 `EventSubscription`을 보관하고 cleanup에서 `remove()`한다. Android는 생성된 `emitOnKeyAdded`에 map, iOS는 생성 Spec base class의 `emitOnKeyAdded:`에 dictionary를 전달한다. payload 키와 타입은 선언과 맞춘다.

**예제 조건 불일치**: 주제는 새 키 추가 시 발행인데 Android 예제는 기존 키가 존재하는 조건으로 `shouldEmit`을 설정한다. `getItem(...).toString()`도 nullable 계약을 흐린다. 새 키 이벤트라면 저장 전 부재 여부를 확인하고 양쪽 플랫폼의 같은 조건을 검증한다. 예제를 그대로 복제하지 않는다.

## 초기화와 무효화

네이티브 모듈은 필요할 때 생성하여 재사용한다. RN instance를 종료했다가 다시 만드는 brownfield 앱에서는 stateful 모듈의 자원을 정리해야 한다.

| 플랫폼 | 초기화 | 정리 |
| --- | --- | --- |
| Android | `initialize()` | `invalidate()` |
| iOS | `RCTInitializing` protocol과 `initialize` | `RCTInvalidating` protocol과 `invalidate` |

Context가 필요한 리스너 연결은 초기화 단계에, 메모리/파일/구독 해제와 내부 state 초기화는 무효화 단계에 둔다. 순수 RN 앱의 단순한 생성 흐름만 보고 모듈이 프로세스 전체에서 영원히 살아 있다고 가정하지 않는다.

## 출처

- [React Native, Advanced Topics on Native Modules Development](https://reactnative.dev/docs/the-new-architecture/advanced-topics-modules)
- [React Native, Advanced: Custom C++ Types](https://reactnative.dev/docs/the-new-architecture/custom-cxx-types)
- [React Native, iOS - Using Swift in Your Native Modules](https://reactnative.dev/docs/the-new-architecture/turbo-modules-with-swift)
- [React Native, Emitting Events in Native Modules](https://reactnative.dev/docs/the-new-architecture/native-modules-custom-events)
- [React Native, Native Modules Lifecycle](https://reactnative.dev/docs/the-new-architecture/native-modules-lifecycle)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Cxx-Native-Modules]]
- [[RN-Turbo-Native-Modules]]
