---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, gesture와 접근성"]
---

# Expo SwiftUI modifier, gesture와 접근성

## Gesture와 lifecycle

onTapGesture(()=>void), onLongPressGesture(()=>void,minimumDuration=0.5 seconds)는 native gesture를 연결한다. onAppear/onDisappear는 view 등장/사라짐 callback이다. React mount/unmount와 항상 일대일이라고 추정하지 않는다. onGeometryChange는 `{x,y,width,height}` points를 전달하며 x/y는 **window 기준 global coordinates**다.

disabled(boolean=true)는 control을 비활성화한다. contentShape(shapes.rectangle())는 Spacer/빈 영역을 포함해 hit-test 범위를 정한다. contentShape 없이는 보이는 Text/Image만 tap될 수 있다. custom view wrapper에는 modifier event listener utility 연결이 필요하다.

```tsx
import { Host, HStack, Text, Spacer } from '@expo/ui/swift-ui';
import { contentShape, shapes, onTapGesture, accessibilityElement,
  accessibilityLabel, accessibilityAddTraits } from '@expo/ui/swift-ui/modifiers';
export function TappableRow() {
  return <Host style={{ width: 300, height: 60 }}><HStack modifiers={[
    contentShape(shapes.rectangle()), onTapGesture(openDetails),
    accessibilityElement('ignore'), accessibilityLabel('상세 보기'),
    accessibilityAddTraits(['isButton']),
  ]}><Text>제목</Text><Spacer /><Text>보기</Text></HStack></Host>;
}
```

## Accessibility tree

accessibilityElement(children='ignore')는 새 accessible element를 만들고 subtree를 다룬다. ignore는 child를 숨기고 새 element에 기존 속성이 없으므로 label을 같이 지정한다. combine은 child 속성을 합치고 contain은 child를 개별 accessible element로 유지한 container다. accessibilityHidden(boolean=true)는 장식 leaf를 traversal에서 제외한다.

accessibilityLabel(string)은 읽을 이름, accessibilityHint(string)은 작동 설명, accessibilityValue(string)은 현재 값이다. accessibilityIdentifier(string)은 **UI testing용 안정적 ID**이며 사용자에게 읽히는 label과 다르다. accessibilityInputLabels(string[])는 Voice Control이 선택할 수 있는 대체 spoken phrase를 설정한다.

accessibilityAddTraits/accessibilityRemoveTraits는 trait 배열을 받는다. isButton/isHeader/isImage/isSelected/isLink/isModal/isSummaryElement/updatesFrequently/startsMediaSession/allowsDirectInteraction/causesPageTurn/playsSound/isStaticText/isSearchField/isKeyboardKey와 isToggle/isTabBar가 있다. **isToggle/isTabBar는 iOS17+이고 구버전은 무시**한다. appearance가 버튼처럼 보인다는 이유로 accessibility role이 자동 보장된다고 추정하지 않는다. combine/ignore가 실제 화면 구조에 맞는지 assistive technology에서 검토한다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
