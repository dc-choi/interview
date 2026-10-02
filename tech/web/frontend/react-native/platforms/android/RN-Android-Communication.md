---
tags: [react-native, android, native, integration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Android와 native 통신"]
---

# React Native Android와 native 통신

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 통신 수단 선택

React 내부에서는 props를 부모에서 자식으로 내려보내고 callback으로 상위 state를 갱신한다. native와 RN 경계에서는 JSON/Bundle로 전달 가능한 props, 이벤트와 native module을 구분한다.

| 방향/목적 | 수단 |
| --- | --- |
| native root에서 RN 초기 입력 | launch options Bundle |
| native root에서 RN 입력 갱신 | root의 app properties |
| JS에서 native View 상태 설정 | exposed props |
| native에서 JS 알림 | native events |
| JS에서 UI 없는 native 기능 호출 | native module |

0.87의 Communication 가이드는 `ReactRootView`, bridge와 legacy `@ReactProp` 예제를 포함한다. 기존 통합을 읽는 참고로 사용하고 새 확장 개발은 TurboModule/Fabric 계약과 현재 앱의 host/surface API에 맞춘다.

## native에서 RN으로 초기 props

`ReactActivity.createReactActivityDelegate()`를 재정의한 delegate에서 `getLaunchOptions()`가 Bundle을 반환하게 한다. Bundle에 `images` 배열 같은 값을 넣으면 RN의 top-level component가 해당 prop을 받는다.

native class나 callback 객체를 그대로 prop으로 전달하는 방식은 아니다. Bundle/JS 변환에 맞는 데이터를 전달한다.

## RN root props 갱신

`ReactRootView.getAppProperties()`로 현재 Bundle을 읽고 `setAppProperties()`로 새 속성 집합을 전달한다. 이전 값과 다른 props면 RN 앱이 다시 render된다.

- 갱신은 main thread에서 수행한다.
- getter는 다른 thread에서 사용할 수 있다.
- 일부 prop만 patch하는 인터페이스가 아니므로 wrapper에서 전체 props 병합을 관리한다.
- JavaScript render는 새 props를 사용하는 일반 React 흐름으로 구성한다.

가이드에 등장하는 오래된 component lifecycle 설명을 함수 컴포넌트의 현재 hook 동작으로 해석하지 않는다.

## JS에서 native View props

legacy ViewManager에서는 `@ReactProp` setter를 노출하여 prop이 바뀔 때 native view를 갱신한다. Fabric에서는 생성된 prop/interface와 delegate를 사용한다. 삭제/null 값과 초기값을 native setter가 처리해야 한다.

cross-language root props는 bottom-up callback 전달을 지원하지 않는다. child JS action으로 native 부모를 닫는 경우에는 event 또는 native module 같은 별도 경로를 사용한다.

## events와 native modules

native event는 JS handler 실행을 예약하므로 정확한 실행 시각을 보장하지 않는다. 전역 이벤트 이름은 충돌할 수 있고, 발행처/구독처가 흩어지면 의존성 파악이 어려워진다.

- 이벤트 이름에 도메인 의미를 포함한다.
- 여러 같은 컴포넌트를 구분할 때 payload에 instance 식별자를 넣는다.
- view event에서는 reactTag 등의 target 식별 계약을 확인한다.
- JS 구독은 unmount 시 제거한다.

legacy native module은 Java/Kotlin 클래스를 JS 객체로 노출하고 bridge별 instance를 제공하는 형태다. module 이름도 같은 namespace를 공유하므로 충돌을 피한다. 새 module은 typed TurboModule contract를 사용한다.

## 통합 확인 항목

초기 props만 전달되는지, main thread 갱신이 적용되는지, 여러 root/view instance가 올바른 이벤트를 받는지 확인한다. props, events와 module 호출을 같은 데이터의 중복 갱신 경로로 만들지 않고 state 소유권을 정한다.

## 출처

- [React Native, Communication between native and React Native](https://reactnative.dev/docs/communication-android)

## 관련 문서

- [[RN-Turbo-Native-Modules]]
- [[RN-Fabric-Native-Components]]
- [[RN-Legacy-Android-Components]]
- [[RN-iOS-Communication]]
