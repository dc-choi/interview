---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifiers, 설정과 event 연결"]
---

# Expo SwiftUI modifiers, 설정과 event 연결

`@expo/ui/swift-ui/modifiers`의 helper는 대부분 `ModifierConfig`를 반환하며 component의 modifiers 배열에 순서대로 넣는다. iOS/tvOS와 Expo Go를 지원하되 API별 OS 조건과 component 자체 지원 범위를 함께 따른다. 조건부 배열 spread로 appearance/interaction을 바꿀 수 있다.

## 공통 config와 custom event

ModifierConfig는 `$type: string`과 optional eventListener, 추가 options를 포함한다. `createModifier(type, params={})`는 등록된 native modifier 이름의 config를 만들 뿐 native 구현을 생성하지 않는다. `createModifierWithEventListener(type, callback, params?)`는 event handler를 함께 연결한다. `createViewModifierEventListener(modifiers[])`는 GlobalEvent props의 onGlobalEvent를 반환하여 nativeEvent의 eventName별 payload를 배분한다.

built-in components는 event modifier 연결을 제공한다. custom view wrapper는 modifiers와 event utility 반환값을 모두 native view에 spread해야 한다. native 등록/해제 수명은 [[Expo-UI-Swift-Extending]]을 따른다. 일반 onTap/onAppear callback과 worklet 전용 또는 자동 worklet 처리 hook을 같은 thread 계약으로 간주하지 않는다.

## 기능별 reference

- [[Expo-UI-Swift-Modifiers-Layout|크기, 위치, shape와 grid]]
- [[Expo-UI-Swift-Modifiers-Appearance|색상, image, stroke와 시각 효과]]
- [[Expo-UI-Swift-Modifiers-Text|font, 줄 수, 입력과 control style]]
- [[Expo-UI-Swift-Modifiers-Interaction|gesture, 접근성과 hit testing]]
- [[Expo-UI-Swift-Modifiers-Animation|animation, matched geometry와 symbol effect]]
- [[Expo-UI-Swift-Modifiers-Scrolling|scroll binding, geometry, list와 tab style]]
- [[Expo-UI-Swift-Modifiers-Presentation|sheet, redaction, widget와 Live Activity]]

원문의 generated option 표는 모든 필드가 필수처럼 보일 수 있지만 실제 usage가 subset을 사용하는 항목도 있다. 사용 예제의 부분 옵션을 따르되 생략 기본값은 명시된 경우만 단정한다. runtime/build 검증을 수행한 reference는 아니다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
