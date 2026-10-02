---
tags: [react-native, ios, native, legacy, components]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 iOS ViewManager와 View 계약"]
---

# React Native 레거시 iOS ViewManager와 View 계약

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## ViewManager와 View instance

legacy iOS는 `RCTViewManager` subclass가 UIView를 노출한다. manager는 bridge별로 재사용되고 각 `view` 호출이 View instance를 만든다. manager가 모든 instance의 delegate로 이벤트를 JS에 전달할 수 있다.

새 컴포넌트는 [[RN-Fabric-Native-Components]]의 generated props와 ComponentView 경로를 먼저 사용한다.

## MapView 노출

1. `RCTViewManager`를 상속한 manager를 만든다.
2. `RCT_EXPORT_MODULE(RNTMap)`으로 이름을 등록한다.
3. `- (UIView *)view`에서 `MKMapView`를 새로 만들어 반환한다.
4. JS에서 `requireNativeComponent('RNTMap')`으로 가져온다.
5. React component에 크기를 주어 표시한다.

ObjC 이름 충돌을 피하기 위해 프로젝트 prefix를 사용한다. RN의 `RCT`, Apple의 두 글자 prefix와 구분하는 자체 세 글자 prefix가 예제 권장이다.

`view`에서 바깥 UIView의 frame/backgroundColor를 직접 고정하면 RN style/layout이 덮어쓸 수 있다. 내부 native View를 별도 wrapper UIView로 감싸 바깥 layout과 내부 배치를 구분한다.

## prop export

단순 속성은 `RCT_EXPORT_VIEW_PROPERTY(zoomEnabled, BOOL)`로 노출한다. JS는 `zoomEnabled={false}`처럼 일반 prop으로 전달한다.

복합 region은 `RCT_CUSTOM_VIEW_PROPERTY(region, MKCoordinateRegion, MKMapView)`로 변환과 native 갱신을 구현한다.

- `json`은 JS에서 온 raw 값이다.
- `view`는 갱신할 native View instance다.
- `defaultView`는 prop을 null/reset할 때 기본값의 기준이다.
- region의 latitude/longitude와 delta를 native coordinate/span으로 변환한다.
- 변환 오류와 누락 필드는 RCTConvert의 처리 계약과 native 입력 검사를 확인한다.

JS wrapper는 허용 prop의 TypeScript 인터페이스와 의미를 제공한다. wrapper 타입이 잘못된 native 변환을 자동 검증하는 것은 아니다.

## 이벤트

기본 `MKMapView`에 event prop을 추가해야 하면 custom subclass에 `RCTBubblingEventBlock onRegionChange` 같은 property를 둔다. 이름은 `on` 접두사를 사용한다.

manager는 `MKMapViewDelegate`를 구현한다. 생성한 View의 delegate를 manager로 지정하고 region 변경 때 해당 View의 event block을 호출한다. handler가 없으면 호출하지 않는다.

payload는 region 객체를 `nativeEvent` 아래에서 읽는 계약으로 맞춘다. 원문 native payload가 `region`에 중첩되어 있으므로 JS wrapper의 타입도 실제 `{nativeEvent: {region: ...}}`와 맞춰야 한다. native와 JS의 서로 다른 payload 모양을 그대로 섞지 않는다.

## 여러 native View에서 명령 대상 찾기

특정 instance를 호출할 때 JS ref를 사용하여 해당 View의 reactTag를 전달한다. legacy `UIManager.dispatchViewManagerCommand`는 target ID, command ID와 argument array를 받는다.

native manager의 exported method는 `bridge.uiManager.addUIBlock`에서 viewRegistry로 tag에 해당하는 View를 찾는다. View가 없거나 예상 클래스가 아니면 오류를 처리하고 반환한다. manager 자체의 단일 View reference로 마지막 instance만 수정하지 않는다.

새 Fabric에서 같은 기능은 typed command와 native component ref를 사용한다.

## 고정 크기 native widget

UIDatePicker처럼 native 고정 크기가 필요한 예제는 바깥 wrapper View에 flexible style을 적용하고 내부 native widget에 고정 style을 적용한다. native에서 실제 크기를 측정해 constants로 expose할 수 있다.

RN 페이지의 DatePickerIOS/RCTDatePicker 코드는 기존 구현 설명이다. 현재 RN core에서 해당 component를 사용할 수 있다는 보장이나 최신 package 선택으로 읽지 않는다. 현재 사용하는 library의 지원 범위와 sizing API를 확인한다.

## 확인 항목

module/view 이름, props 삭제와 default reset, 여러 View의 event target, native command tag와 style 소유권을 확인한다. 지도 권한, SDK 정책과 실제 MapKit 기능 지원은 이 bridge 예제의 검증 범위가 아니다.

## 출처

- [React Native, iOS Native UI Components](https://reactnative.dev/docs/legacy/native-components-ios)

## 관련 문서

- [[RN-Fabric-Native-Components]]
- [[RN-Legacy-iOS-Modules]]
- [[RN-Native-Component-Advanced]]
- [[RN-iOS-Communication]]
