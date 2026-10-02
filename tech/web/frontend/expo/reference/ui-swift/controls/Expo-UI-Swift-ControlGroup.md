---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI ControlGroup, 메뉴 내 compact actions"]
---

# Expo SwiftUI ControlGroup, 메뉴 내 compact actions

Button/Toggle/Picker 등 interactive children을 묶는 native control group이다. iOS와 Expo Go, **tvOS 17+**를 지원한다. Menu 안에서는 child가 compact horizontal row로 렌더링된다. children ReactNode와 CommonViewModifierProps를 받는다.

label ReactNode(문자열 또는 custom Label)와 systemImage는 iOS 16+/tvOS 17+다. systemImage는 label이 문자열일 때만 사용한다. label을 생략하면 무제목 group이다.

```tsx
import { Host, Menu, ControlGroup, Button } from '@expo/ui/swift-ui';
export function ActionMenu() {
  return <Host matchContents><Menu label="작업" systemImage="ellipsis.circle">
    <ControlGroup>
      <Button label="추가" systemImage="plus" onPress={add} />
      <Button label="즐겨찾기" systemImage="star" onPress={favorite} />
      <Button label="공유" systemImage="square.and.arrow.up" onPress={share} />
    </ControlGroup>
    <Button label="이름 변경" onPress={rename} />
  </Menu></Host>;
}
```

일반 Group은 layout 없는 view 묶음이고 ControlGroup은 native interactive grouping appearance를 제공한다. 메뉴 배치에 따른 compact 스타일을 앱의 고정 HStack과 같은 크기 계약으로 보지 않는다.

## 출처

- [Expo Documentation, ControlGroup](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/controlgroup)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
