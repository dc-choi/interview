---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community BottomSheet migration과 modal 제약"]
---

# Community BottomSheet migration과 modal 제약

## Import와 presentation 차이

`@gorhom/bottom-sheet`에서 `@expo/ui/community/bottom-sheet`로 import를 교체한다. default BottomSheet와 BottomSheetModal/View exports를 제공한다. Android Compose ModalBottomSheet, iOS SwiftUI sheet, web vaul drawer를 사용하므로 original inline parent-bottom sheet와 다르다. persistent inline peek는 세 platform 모두 지원하지 않는다.

GestureHandlerRootView는 이 구현 자체에 필요 없으나 다른 code가 사용하면 유지한다. gesture/animation은 native toolkit/web drawer가 처리한다. 낮은 수준의 styling/layout은 platform primitive를 사용한다.

```tsx
const ref = useRef<BottomSheet>(null);
<BottomSheet ref={ref} index={-1} snapPoints={['25%','50%','90%']} enablePanDownToClose>
  <BottomSheetView style={{padding:24}}><Text>Contents</Text></BottomSheetView>
</BottomSheet>
```

BottomSheet index0(default)는 mount에서 first snap point open, -1은 closed다. BottomSheetModal은 항상 closed에서 present()로 연다. index는 initial 값이며 migration에서 controlled position을 기대하기 전에 ref/prop semantics를 확인한다.

## Supported API

children ReactNode 필수, snapPoints (string|number)[]는 bottom-to-top, enableDynamicSizing true(default), enablePanDownToClose false(default), onChange(index), onClose(), onDismiss(onClose alias)다. no snapPoints는 content fit sizing이고 BottomSheetView content wrapper를 사용한다.

ref/useBottomSheet context methods는 close,collapse(min),dismiss,expand(max),forceClose,present(first),snapToIndex(index),snapToPosition(pixel/percentage)다. ModalProvider는 children을 직접 render하는 compat wrapper이며 별도의 modal stack manager라고 가정하지 않는다.

ScrollView/FlatList/SectionList/TextInput exports는 RN component re-export다. Backdrop/Handle/Footer/DraggableView/VirtualizedList/FlashList, modal hook, spring/timing hooks는 unsupported다. 관련 type export가 있어도 renderer가 있다는 뜻은 아니다. source BottomSheetView prop section에는 sheet props가 중복 출력되므로 wrapper sizing/style는 실제 exported type을 확인한다.

## Accepted no-op와 platform 차이

Android snap points는 partial/expanded two states로 매핑하고 iOS/web은 provided points를 지원한다. pan-down close는 Android back/scrim dismissal, iOS backdrop, web drawer dismissal도 함께 켠다.

handleComponent null은 drag indicator를 숨긴다. native custom handle은 render하지 않는다. backgroundStyle은 web 전체 적용, Android backgroundColor만 container에 적용, iOS는 system sheet background다.

animation/over-drag/content panning/handle panning/keyboard behavior/custom backdrop/background/footer/animated values/detached props는 compat로 accepted지만 behavior를 바꾸지 않는다. 키보드와 custom handle에 의존하는 기존 flow는 import 교체만으로 완료라고 판단하지 않는다.

## 출처

- [Expo Documentation, BottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet)

## 관련 문서

- [[Expo-UI-Sheet]]
- [[Expo-UI-Architecture]]
