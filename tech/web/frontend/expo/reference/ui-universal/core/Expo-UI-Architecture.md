---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo UI native와 universal architecture"]
---

# Expo UI native와 universal architecture

## 세 가지 API 층

@expo/ui는 React에서 SwiftUI/Jetpack Compose native primitive를 사용하는 package다. component를 한 screen에 도입하거나 전체 UI에 사용하며 RN/DOM/Skia subtree와 혼합할 수 있다. iOS platform package는 SwiftUI, Android platform package는 Compose를 직접 expose하고 native component에 일대일로 대응한다. 기존 JS design-kit과 달리 OS toolkit을 호출한다.

universal package root API는 Android Compose/iOS SwiftUI에 delegate하고 web은 control별 react-dom 또는 react-native-web 구현을 선택한다. 한 tree를 Android/iOS/web에 공유하려면 universal을 먼저 사용하고, 공통 API에 없는 controls/modifiers/native behavior는 platform package로 내려간다. package의 platform support와 개별 component의 support는 다르다. 예를 들어 universal Icon은 web에서 보이지 않는다.

```sh
npx expo install @expo/ui
```

existing RN project는 expo modules 기반이 준비되어야 한다. SDK57 공식 reference source는 sdk-57 package branch다. native platform package를 지원하지 않는 OS에 import해 실제 render할 수 있다고 가정하지 않는다. Expo Go 포함 여부도 host가 가진 SDK/runtime에 맞춰 확인한다.

```tsx
import { Host, Column, Text, Button } from '@expo/ui';
<Host style={{flex: 1}}>
  <Column spacing={12} alignment="center">
    <Text>Hello</Text>
    <Button label="Continue" onPress={onContinue} />
  </Column>
</Host>
```

## Layout 경계

Host 자체는 RN view tree의 flexbox 스타일을 받는다. 내부 toolkit에는 Yoga가 없고 Row/Column 또는 native HStack/VStack/Compose layout로 구성한다. SwiftUI Host는 UIHostingController로 UIKit에 연결한다. RN view subtree로 나가면 native toolkit context를 벗어나므로 그 안에서 다시 Expo UI를 넣을 때 새 Host를 둔다.

SwiftUI가 representable UIKit view의 center/bounds/frame/transform을 제어하므로 wrapper 아래 UIKit layout 값을 직접 경쟁적으로 설정하면 동작이 불명확해질 수 있다. toolkit layouts는 가능한 self-contained하게 구성하고 RNHostView로 명시적인 경계를 둔다.

## Compat layer

`@expo/ui/community/...` drop-in API는 익숙한 community library의 지원되는 surface를 native toolkit에 매핑하는 migration 경로다. 전체 원 library의 모든 props/animation/custom renderer와 동일한 구현이라는 보장은 아니다. 새 code는 universal을 우선 검토하고 기존 migration은 해당 compat reference의 unsupported props/ref semantics를 확인한다.

compat targets는 gorhom bottom-sheet, community datetimepicker/slider, masked-view, menu, pager-view, picker, segmented-control이다. 플랫폼-specific catalog의 dialogs/cards/chips/search/navigation/progress/swipe/widgets/state 등은 universal에 없는 controls를 찾는 출발점이며, component별 상세 contract는 별도 platform reference를 따른다.

## 출처

- [Expo Documentation, Expo UI](https://docs.expo.dev/versions/latest/sdk/ui)
- [Expo Documentation, Universal](https://docs.expo.dev/versions/latest/sdk/ui/universal)
- [Expo Documentation, Drop-in replacements](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements)

## 관련 문서

- [[Expo-UI-Host]]
- [[Expo-UI-Interop]]
