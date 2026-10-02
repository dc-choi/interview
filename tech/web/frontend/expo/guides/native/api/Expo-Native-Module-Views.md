---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Modules API native view 정의"]
---

# Modules API native view 정의

## View와 Prop

View(native class) block은 Prop, Events, GroupView와 AsyncFunction을 받는다. Android exported view는 ExpoView를 상속한다. iOS는 UIKit view를 등록할 수 있지만 ExpoView를 쓰면 appContext, styling과 accessibility integration을 얻는다. framework가 view를 생성하므로 constructor signature를 임의로 바꾸지 않는다.

View 안의 Name은 여러 view를 식별한다. Prop(name, optional defaultValue, setter)는 `(view,value)` setter를 등록한다. defaultValue는 null이 전달된 setter 호출에 사용된다. 전체 prop update가 끝나면 OnViewDidUpdateProps가 호출되므로 여러 prop의 결합 작업을 여기로 모을 수 있다.

```swift
View(MyView.self) {
  Prop("enabled", false) { (view: MyView, enabled: Bool) in
    view.isEnabled = enabled
  }
  OnViewDidUpdateProps { (view: MyView) in view.applyConfiguration() }
  AsyncFunction("focus") { (view: MyView) in view.becomeFirstResponder() }
}
```

Prop의 arbitrary function callback은 지원되지 않는다. event callback은 Events/EventDispatcher로 선언한다. UIKit 안에 SwiftUI를 감싸려면 UIHostingController의 content view를 이용하는 방식이 문서에 제시되며 미래 지원 계획을 현재 지원으로 서술하지 않는다.

## View ref 함수와 destruction

View block의 AsyncFunction은 React ref에 붙고 native view instance를 첫 parameter로 받는다. main UI queue에서 실행된다. JS에서 `ref.current?.focus()`처럼 호출한다. view가 아직 mount되지 않았거나 이미 제거된 경우를 처리한다.

Android OnViewDestroys는 RN이 view를 더 이상 사용하지 않은 뒤 호출된다. listener, player, bitmap 등 view 자원을 해제하는 지점이다. iOS에는 같은 DSL callback이 없으며 native view deinit/destructor를 사용한다.

## Android PropGroup

PropGroup은 동일한 setter pattern을 공유하는 여러 prop를 일괄 등록한다. pair-based overload는 `(propName, customValue)`를 묶고 setter에 view/customValue/propValue를 전달한다. string-based overload는 이름 배열의 positional index를 전달한다. CSS decorator 내부에서 쓰이지만 일반 모듈은 개별 Prop가 명확하다.

## Android child group

GroupView는 View block 내부에서 Android ViewGroup을 자식 container로 노출한다. 아래 callback의 index/child order가 RN tree와 일치해야 한다.

| Component | callback 역할 |
|---|---|
| AddChildView(parent,child,index) | 지정 위치에 child 추가 |
| GetChildCount(parent) | Int child count 반환 |
| GetChildViewAt(parent,index) | 해당 child 반환 |
| RemoveChildView(parent,child) | instance 제거 |
| RemoveChildViewAt(parent,index) | index 제거 |

원문 RemoveChildViewAt parameter 표에는 child로 잘못 적힌 부분이 있지만 실행 예제와 의미는 index다. 이 기능은 Android 전용이며 iOS child management로 그대로 옮기지 않는다.

## View-bound 이벤트

View definition의 Events 이름과 view property EventDispatcher 이름을 맞춘다. dispatch payload는 iOS dictionary/Android Map이며 JS callback에서 event.nativeEvent로 받는다. Android typed dispatcher가 primitive를 보내면 object로 변환되지 않는 값은 `{payload: value}` 형태로 감싸질 수 있다. module sendEvent는 view instance callback을 대신하지 않는다.

## 출처

- [Expo Documentation, Module API Reference](https://docs.expo.dev/modules/module-api/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
