---
tags: [react-native, android, native, legacy, components]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 Android ViewManager와 Fragment"]
---

# React Native 레거시 Android ViewManager와 Fragment

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## ViewManager의 책임

legacy ViewManager는 native View를 생성하고 JS props를 setter로 반영하며 View event를 JS에 보낸다. Android SDK 이해를 전제로 한다. 새 UI 확장은 [[RN-Fabric-Native-Components]]를 우선한다.

`SimpleViewManager`는 배경색, opacity와 Flexbox 등 공통 View 속성을 적용하는 기반이다. manager는 bridge별로 재사용되지만 관리하는 View는 여러 instance다. 특정 View의 상태를 manager에 단일 값으로 저장하는 설계를 주의한다.

## View 노출 절차

1. `ViewManager` 또는 `SimpleViewManager<NativeView>`를 상속한다.
2. `getName()`에서 JS 조회 이름을 반환한다.
3. `createViewInstance(ThemedReactContext)`에서 기본 상태의 새 View를 생성한다.
4. setter를 `@ReactProp` 또는 `@ReactPropGroup`으로 노출한다.
5. package의 `createViewManagers`에서 manager를 반환한다.
6. 앱 package를 등록하고 native build를 수행한다.
7. JS에서 `requireNativeComponent('등록명')`으로 가져온다.

복잡한 event나 API 처리가 있으면 JS wrapper를 두어 raw native prop/event와 외부 API를 분리한다.

## prop setter 계약

setter는 public이고 반환값이 없으며 첫 인자가 갱신할 native View, 다음 인자가 prop 값이다. `@ReactProp(name=...)`의 이름이 JS prop 이름이 된다.

legacy prop type에는 boolean/int/float/double, String, boxed Boolean/Integer와 ReadableArray/ReadableMap이 있다. 이는 legacy setter 계약이며 새 Codegen 타입 지원표와 구분한다.

- primitive prop이 제거되면 `defaultBoolean`, `defaultInt`, `defaultFloat` 같은 설정값으로 reset한다.
- 복합 타입 prop이 제거되면 `null`이 전달될 수 있다.
- 값 변경뿐 아니라 prop 제거도 setter 호출이다.
- `@ReactPropGroup`은 여러 prop/index를 연결하는 별도 시그니처를 가진다.

ImageView 예제는 `src`, `borderRadius`, `resizeMode`를 setter로 노출한다. 삭제된 값을 이전 값 그대로 유지하지 말고 default 상태로 되돌린다.

## View events

native View는 `getId()`로 instance를 식별하고 `RCTEventEmitter.receiveEvent(viewId, eventName, payload)`로 이벤트를 보낸다.

manager의 `getExportedCustomBubblingEventTypeConstants()`에서 `topChange` 같은 native 이름을 JS의 `onChange` callback으로 매핑한다. wrapper가 `event.nativeEvent.message`를 읽어 더 단순한 callback을 제공할 수 있다.

event의 View ID, 이름과 payload가 일치해야 한다. manager의 단일 event 객체를 모든 View instance의 상태처럼 공유하지 않는다.

## Fragment가 필요한 조건

단순 View 반환보다 더 세밀한 native lifecycle이 필요하면 Fragment를 연결한다. 예를 들어 `onViewCreated`, `onPause`, `onResume`에서 native widget의 자원을 제어할 때 사용할 수 있다.

Fragment 예제의 구성은 CustomView, MyFragment, ViewGroupManager, ReactPackage와 JS wrapper다.

### native Fragment 구현

1. `CustomView`를 `FrameLayout` 기반으로 만든다.
2. Fragment의 `onCreateView`가 해당 View를 반환한다.
3. `onViewCreated`, `onPause`, `onResume`, `onDestroy`에서 native widget lifecycle을 연결한다.
4. `ViewGroupManager<FrameLayout>`는 Fragment를 담을 container를 생성한다.
5. `getCommandsMap()`은 `create`를 command ID에 연결한다.
6. `receiveCommand`는 View ID와 command를 읽어 `createFragment`를 호출한다.
7. 현재 Activity의 FragmentManager가 해당 container ID에 Fragment를 넣는다.

이 예제는 현재 Activity가 `FragmentActivity`라고 가정한다. 실제 앱에서 Activity가 없거나 다른 타입일 수 있는 조건을 처리한다.

### 수동 layout과 style

예제는 `@ReactPropGroup(names=["width", "height"], customType="Style")`로 크기를 받고 `Choreographer` frame callback에서 children을 measure/layout한 뒤 global layout을 통지한다.

반복 frame callback의 해제, 여러 View의 크기 분리와 Fragment 정리는 실제 제품 구현에서 필요하다. 가이드의 manager 필드 `propWidth/propHeight`와 반복 callback을 여러 instance에 안전한 완성 구현으로 간주하지 않는다.

### JavaScript 명령

JS wrapper는 native component ref에서 `findNodeHandle`로 View ID를 얻는다. `UIManager.dispatchViewManagerCommand(viewId, commandId, [viewId])`로 create command를 요청한다.

예제는 `PixelRatio.getPixelSizeForLayoutSize`로 크기를 변환한다. RN logical layout 단위와 Android native pixel을 같은 값으로 쓰지 않고 전달 경계를 확인한다. command dispatch와 `findNodeHandle`은 legacy 연결 경로이며 새 Fabric은 generated Native Commands를 사용한다.

## 출처

- [React Native, Android Native UI Components](https://reactnative.dev/docs/legacy/native-components-android)

## 관련 문서

- [[RN-Fabric-Native-Components]]
- [[RN-Legacy-Android-Modules]]
- [[RN-Native-Component-Advanced]]
