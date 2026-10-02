---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Button과 Collapsible state"]
---

# Universal Button과 Collapsible state

## Button

Button은 variant filled(default)/outlined/text로 emphasis를 고른다. label string 또는 children custom ReactNode를 받으며 children이 있으면 label은 ignored다. onPress는 `()=>void`, disabled는 input을 막는다. Row/Icon/Text를 children으로 넣어 custom button을 만들 수 있지만 Icon web fallback은 별도로 마련한다.

```tsx
<Button variant="outlined" label="Save" onPress={save} disabled={saving} />
```

Button은 common presentation을 제공한다. variant의 native defaults와 explicit style이 서로 어떻게 결합되는지 theme에서 확인한다. callback type만으로 async operation pending/error state가 자동 처리되지는 않는다.

## Collapsible

labelled header tap으로 content visibility를 토글한다. isOpen boolean과 onOpenChange(boolean)는 필수 controlled pair다. children은 open일 때 render할 content, label optional string, labelStyle은 text typography subset이다.

기본적으로 여러 Collapsible는 independent다. 한 번에 하나만 열리는 accordion은 parent openSection state를 공유해 `isOpen={openSection===id}`와 `onOpenChange={open=>setOpenSection(open?id:null)}`로 구성한다. 자체 exclusivity 기능이라고 설명하지 않는다.

labelStyle은 color/fontFamily/fontSize/fontWeight/letterSpacing/lineHeight/textAlign(left/right/center)로 header를 꾸민다. Button과 달리 Collapsible reference는 common style/disabled/hidden 목록을 제공하지 않으므로 해당 props를 임의로 확장해 쓰지 않는다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, Button](https://docs.expo.dev/versions/latest/sdk/ui/universal/button)
- [Expo Documentation, Collapsible](https://docs.expo.dev/versions/latest/sdk/ui/universal/collapsible)

## 관련 문서

- [[Expo-UI-Architecture]]
- [[Expo-UI-Text-Icons]]
