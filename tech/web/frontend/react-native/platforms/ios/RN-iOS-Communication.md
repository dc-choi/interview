---
tags: [react-native, ios, native, integration, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native iOS와 native 통신, layout"]
---

# React Native iOS와 native 통신, layout

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## props, events와 호출 방향

native와 RN 화면을 섞으면 초기 입력, 상태 갱신, 하위 동작과 layout 결과를 서로 전달해야 한다. props는 top-down 입력, event는 native 알림, module 함수는 JS에서 native 동작 호출로 구분한다.

0.87 Communication 가이드의 `RCTRootView`, `RCTBridge`, `RCTViewManager`와 `RCT_CUSTOM_VIEW_PROPERTY`는 기존 bridge 통합 예제다. 새 Fabric/TurboModule 구현은 생성 인터페이스와 현재 앱의 factory/surface 통합을 따른다.

## native에서 RN props

`RCTRootView`는 RN 앱을 담는 UIView다. initializer의 `initialProperties`에 NSDictionary를 넣으면 JSON으로 변환되어 top-level JS component의 props가 된다.

```objc
NSDictionary *props = @{ @"images": imageList };
RCTRootView *root = [[RCTRootView alloc]
    initWithBridge:bridge
    moduleName:@"ImageBrowserApp"
    initialProperties:props];
```

`appProperties`를 새 dictionary로 설정하면 값이 달라졌을 때 re-render한다. main thread에서 갱신하고 getter는 다른 thread에서 사용할 수 있다. 일부 key만 patch하는 API는 아니므로 전체 값 관리 wrapper를 둘 수 있다.

가이드는 bridge 시작 중 `appProperties` 갱신이 유실되는 기존 이슈를 안내한다. 이를 모든 0.87 통합에서 재현된 결함으로 단정하지 않고 사용하는 root/bridge 경로에서 확인한다.

## JS에서 native 상태와 동작

legacy view props는 `RCT_CUSTOM_VIEW_PROPERTY` 등으로 expose한다. callback을 root prop으로 넘기는 bottom-up 바인딩은 지원하지 않으므로 native 부모를 닫거나 바꾸는 JS action에는 event/module 같은 별도 경로가 필요하다.

native module의 callback은 native 호출 결과를 JS에 돌려주는 계약이지 root prop callback의 대체 구현이 아니다. Fabric 명령은 특정 native view ref를 대상으로 하는 동작이다.

## 이벤트와 instance 식별

native event의 JS handler 실행 시각을 보장하지 않는다. shared namespace 충돌, 보이지 않는 발행/구독 의존성과 여러 component instance의 구분을 관리한다.

legacy `RCTViewManager`가 view delegate가 되어 관련 이벤트를 모아 JS에 전달하는 형태를 사용할 수 있다. 여러 같은 RN root나 native view에서는 reactTag 또는 명시적 identifier를 payload와 매핑에 넣는다.

module instance를 통해 특정 native parent view를 갱신하려면 module에 전달한 parent identifier로 해당 view를 찾아야 한다. singleton module 자체가 현재 화면의 단일 View를 나타낸다고 가정하지 않는다.

## native View가 RN 안에 있을 때

노출한 UIView는 RN layout/style에 따라 배치된다. 내부 UIKit view의 frame과 RN이 소유한 바깥 frame을 나눠야 할 때 wrapper UIView를 사용한다. native manager가 직접 설정한 frame이 JS layout과 경쟁하지 않게 한다.

## RN root의 고정 크기

native가 크기를 알고 있다면 `RCTRootView.frame`을 지정한다. RN 내용은 root bounds 안에 맞춘다. flex layout을 사용하거나 명시적 width/height에 맞춰 배치한다.

절대 위치를 써서 bounds 밖에 표시하면 native view와 겹치고, 바깥 touch 영역에서 highlight가 동작하지 않는 등 문제가 생길 수 있다. frame을 바꾸면 RN이 내용을 다시 layout한다.

## RN 내용에 따라 크기가 변할 때

내용 크기를 처음에 모르면 다음 경로를 선택한다.

- 제한된 공간 안에서는 ScrollView로 내용을 표시한다.
- 내용의 intrinsic size를 native host가 받아 subview를 다시 배치한다.

`RCTRootView` size flexibility 모드는 다음과 같다.

| 모드 | 내용이 결정할 축 |
| --- | --- |
| `None` | 없음, 기본 고정 크기 |
| `Width` | 너비 |
| `Height` | 높이 |
| `WidthAndHeight` | 두 축 |

높이를 내용에 맡기면 `Height`로 설정하고, native에서 너비와 위치를 결정한다. 크기가 바뀔 때 delegate의 `rootViewDidChangeIntrinsicSize:`가 호출되며 `intrinsicContentSize`로 frame을 갱신할 수 있다.

**같은 축을 두 layout 시스템에서 동시에 flexible로 만들지 않는다.** 예를 들어 native에서 Width flexibility를 쓰면서 top-level RN도 flex로 너비를 주변 공간에 맞추게 하면 크기 결정을 순환시킬 수 있다.

모드를 바꾸면 layout 재계산과 delegate 통지가 예약된다. native UI 갱신과 RN layout 계산의 시점이 달라 일시적 불일치가 생길 수 있다.

## 숨긴 root의 측정

RN layout은 root가 다른 View의 subview가 되기 전에는 계산되지 않는다. 크기를 알 때까지 숨기고 싶으면 root를 먼저 subview로 추가하고 `hidden`으로 숨긴 다음 크기 delegate에서 표시한다. tree에 넣지 않은 root를 기다리는 형태로 구현하지 않는다.

## 출처

- [React Native, Communication between native and React Native](https://reactnative.dev/docs/communication-ios)

## 관련 문서

- [[RN-Android-Communication]]
- [[RN-Native-Component-Advanced]]
- [[RN-Fabric-Native-Components]]
- [[RN-Legacy-iOS-Components]]
