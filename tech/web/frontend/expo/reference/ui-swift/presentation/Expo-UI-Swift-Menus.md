---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI ContextMenu와 Menu"]
---

# Expo SwiftUI ContextMenu와 Menu

## ContextMenu

iOS/tvOS/Expo Go에서 **long press**로 연다. ContextMenu.Trigger는 항상 보이는 view, Items는 native SwiftUI Button/Toggle/Picker/Section/Divider/nested ContextMenu, Preview는 optional menu 위의 custom preview다. RN preview는 RNHostView로 감싸 측정한다. 고유 state prop 없이 children과 CommonViewModifierProps를 받는다.

## Menu

iOS, **tvOS17+**, Expo Go에서 기본 **single tap**으로 연다. label은 필수 ReactNode(문자열/custom view), systemImage는 label이 문자열일 때만 사용한다. children은 Button/Toggle/Picker/Section/Divider/nested Menu다. onPrimaryAction이 있으면 **tap은 primary action, long press는 menu**로 바뀐다. RN custom label은 RNHostView matchContents로 감싼다.

```tsx
import { Host, Menu, Button, Divider } from '@expo/ui/swift-ui';
import { disabled, labelStyle } from '@expo/ui/swift-ui/modifiers';
export function MoreActions() {
  return <Host matchContents><Menu label="추가 작업" systemImage="ellipsis.circle"
    modifiers={[labelStyle('iconOnly')]}>
    <Button label="편집" onPress={edit} />
    <Button label="잠긴 항목" modifiers={[disabled(true)]} />
    <Divider /><Button label="삭제" role="destructive" onPress={confirmDelete} />
  </Menu></Host>;
}
```

## 선택, 구획과 appearance

Toggle을 Items/Menu 안에 놓으면 isOn=true일 때 native checkmark가 붙는다. Picker는 tag/selection과 pickerStyle('menu')로 크기/정렬 등 옵션을 선택한다. Section/Divider는 action 묶음을 분리하고 ControlGroup은 compact horizontal icon action row를 만든다. disabled(true) Button은 보이지만 회색이며 onPress가 발생하지 않는다.

Menu trigger 스타일은 buttonStyle로 바꾼다. iOS26/Xcode26의 glass/glassProminent도 이 modifier를 사용한다. **label에 glassEffect를 직접 적용하면 dismiss 시 직사각형 halo artifact가 생길 수 있어 공식 문서가 이를 피하라고 명시한다**. iconOnly에서도 접근성 label을 유지한다. nested menu를 통해 submenu를 만들되 root long-press와 primary-action 동작의 차이를 사용자에게 드러낸다.

## 출처

- [Expo Documentation, ContextMenu](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/contextmenu)
- [Expo Documentation, Menu](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/menu)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
