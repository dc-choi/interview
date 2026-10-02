---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Host sizing, theme와 safe area"]
---

# Universal Host sizing, theme와 safe area

## Host의 역할

root `Host`는 Android/iOS native Host에 delegate하고 web에서는 RN View다. universal subtree의 root로 둔다. RN View/ScrollView 안에서 Expo UI를 재사용하려면 상위 Host 존재와 관계없이 그 위치에 새 Host가 필요하다.

| Prop | 타입/default | 동작 |
| --- | --- | --- |
| children | ReactNode optional | native UI subtree |
| matchContents | boolean 또는 {horizontal,vertical}, false | toolkit content 측정 크기를 RN tree에 반영, mount 시 결정 |
| onLayoutContent | ({nativeEvent:{width,height}})=>void | content layout 완료/변경 치수 |
| useViewportSizeMeasurement | boolean false | explicit size 없을 때 viewport를 proposed size로 사용 |
| layoutDirection | leftToRight/rightToLeft | 기본 locale I18nManager direction |
| ignoreSafeArea | all/keyboard | mount 시 결정, 전체 또는 keyboard inset 무시 |
| colorScheme | light/dark/omitted | native appearance override, omitted device 설정 |
| seedColor | ColorValue | platform-native theme seed |
| inherited | ViewProps | Host 외부 RN style/events |

matchContents true는 content에 맞춘다. native per-axis 값은 platform Host semantics를 따른다. web은 alignSelf:flex-start로 parent cross-axis stretch를 줄이므로 horizontal-only/vertical-only도 boolean처럼 동작하고 독립 axis sizing을 보장하지 않는다.

viewport 측정은 List 같은 fill content에 유용하다. web은 current window width/height를 주며 explicit style이 우선한다. onLayoutContent web은 underlying View onLayout에서 파생된다. event를 content text 크기와 혼동하지 않는다.

## Insets와 theme

기본 safe areas를 존중한다. all은 notch/home indicator를 포함한 inset을 무시하고 keyboard는 keyboard inset만 무시한다. web은 CSS env(safe-area-inset-*) padding을 사용하고 VirtualKeyboard API opt-in 페이지에서 keyboard-inset-*도 반영한다. native exact region 처리는 해당 Host API를 따른다.

colorScheme는 API 표에 web도 있지만 usage 계약은 web ignored라고 명시한다. web dark styling은 app/browser theme를 따로 구성한다. seedColor는 Android SchemeTonalSpot Material3 palette와 useMaterialColors, iOS SwiftUI tint environment, web CSS primary scale을 제공한다. 같은 seed가 pixel-identical palette를 생성한다고 가정하지 않는다.

```tsx
<Host matchContents={{vertical:true}} style={{width:'100%'}} layoutDirection="rightToLeft">
  <Row><Text>Leading</Text><Spacer flexible /><Text>Trailing</Text></Row>
</Host>
```

orientation/keyboard/safe area 변화, RTL ordering, explicit size와 content matching의 조합을 platform별로 확인한다. mount-only props를 runtime state toggle처럼 바꾸는 설계는 피한다.

## 출처

- [Expo Documentation, Host](https://docs.expo.dev/versions/latest/sdk/ui/universal/host)

## 관련 문서

- [[Expo-UI-Architecture]]
- [[Expo-UI-Layout]]
- [[Expo-UI-Lists]]
