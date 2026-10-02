---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["RNHostView로 React Native subtree 연결"]
---

# RNHostView로 React Native subtree 연결

## Single child와 측정

RNHostView는 Compose/SwiftUI layout 안에 RN subtree를 넣는다. web에는 toolkit tree가 없어 RN View wrapper로 fallback한다. child는 단일 ReactElement이며 첫 child만 measure/layout하므로 여러 sibling은 하나의 RN View로 묶는다.

```tsx
<Host matchContents>
  <Column spacing={12}>
    <Text>Native UI label</Text>
    <RNHostView matchContents>
      <View style={{width:50,height:50,backgroundColor:'purple'}} />
    </RNHostView>
  </Column>
</Host>
```

default matchContents false는 native parent size를 채운다. true는 RN child size에 맞춘다. parent100x100과 child50x50처럼 명시적 bounds로 차이를 검증한다. native matchContents는 mount 시 결정되며 변경하면 remount한다. API 지원 표는 Android/iOS이며 web wrapper에서 동일 sizing 계약을 기대하지 않는다.

children 필수 ReactElement 외에는 common presentation props를 제공한다. RN child의 style은 Yoga/RN이고 RNHostView 자체의 style은 지원 subset을 toolkit에 번역하는 경계다. RN child 안에 다시 universal control을 넣으면 새 Host를 사용한다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/universal/rnhostview)

## 관련 문서

- [[Expo-UI-Host]]
- [[Expo-UI-Layout]]
