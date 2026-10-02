---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, scrolling과 list style"]
---

# Expo SwiftUI modifier, scrolling과 list style

## Position, target와 anchor

id(string)는 안정된 target 식별자다. content stack의 scrollTargetLayout()와 container의 scrollPosition(state,{anchor?,onChange?}?)를 함께 사용한다. state는 ObservableState<string|null>이고 읽으면 leading ID, 쓰면 matching view로 이동한다. scrollPosition은 iOS/tvOS17+이며 iOS17 미만은 no-op이다. **write는 UI worklet/scheduleOnUI에서 실행**한다. scrollPosition의 onChange는 JS callback이다. 상세 예제는 [[Expo-UI-Swift-ScrollView]]에 있다.

scrollTargetLayout은 iOS17+ target layout 설정, scrollTargetBehavior(paging/viewAligned)는 iOS17+의 container-aligned/view-aligned snapping이다. containerRelativeFrame으로 paging view 크기를 맞출 수 있다. defaultScrollAnchor(UnitPoint|null)은 iOS/tvOS17+의 초기 위치/content 크기 변화 기준이고 null은 reset이다. defaultScrollAnchorForRole(anchor|null,initialOffset/sizeChanges/alignment)는 iOS/tvOS18+에서 역할별 anchor를 설정하며 null은 해당 role만 제외한다.

UnitPoint는 zero/topLeading/top/topTrailing/leading/center/trailing/bottomLeading/bottom/bottomTrailing이다. 일부 generated heading에 macOS가 있지만 이 패키지의 SwiftUI 앱 지원 범위는 iOS/tvOS로 설명한다.

## Geometry hook과 phase

useScrollGeometryChange(callback?)는 iOS/tvOS18+의 **hook**이고 component top level에서 호출한 뒤 반환 ModifierConfig|null을 배열에 넣는다. 매 scroll update와 content/container 크기 변화에 호출한다. worklet callback은 UI thread에서 동기 실행하며 hook이 stable WorkletCallback SharedObject 수명을 관리한다. 일반 callback은 JS에 비동기로 전달한다. 원문의 일부 설명이 onScrollGeometryChange를 지목하지만 공개 API 이름은 useScrollGeometryChange다.

onScrollPhaseChange((phase,geometry)=>void)는 iOS/tvOS18+, phase 변화 시점의 geometry만 전달한다. idle/tracking/interacting/animating/decelerating을 구분하여 종료 시 offset을 읽는 데 적절하다. geometry는 contentOffsetX/Y, contentWidth/Height, containerWidth/Height, 모두 points다. iOS18 미만은 해당 modifier가 no-op이다.

```tsx
const modifier = useScrollGeometryChange(geometry => {
  'worklet';
  const width = geometry.containerWidth;
  progress.set(width > 0 ? geometry.contentOffsetX / width : 0);
});
// component return 안에서 <ScrollView modifiers={[modifier]} />에 연결한다.
```

## 일반 scroll 동작

scrollIndicators(automatic/visible/hidden/never,axes='both')는 iOS/tvOS16+다. visible/hidden은 선호 요청이며 시스템이 바꿀 수 있고 never는 표시하지 않는다. axes는 vertical/horizontal/both다. scrollDisabled(boolean=true)는 iOS/tvOS16+ 입력 scroll을 막고 scrollDismissesKeyboard(never/automatic/interactively/immediately)는 같은 OS 조건의 keyboard dismissal이다. scrollContentBackground(automatic/visible/hidden)는 scroll container의 기본 배경을 제어한다. refreshable(()=>Promise<void>)는 pull-to-refresh를 연결하고 Promise가 끝나야 refresh 작업이 끝난다.

## List 행과 section

| 함수 | 입력과 조건 |
| --- | --- |
| listStyle | automatic/plain/inset/insetGrouped/grouped/sidebar. component reference에서 inset/insetGrouped/sidebar tvOS 미지원 |
| listRowBackground | Color |
| listRowInsets | top/bottom/leading/trailing points |
| listRowSeparator | automatic/visible/hidden, optional edges top/bottom/all |
| listRowSeparatorTint | Color 생략 시 기본값, optional edges |
| listRowSpacing | iOS15+, 숫자 생략 시 기본값 |
| listSectionSpacing | iOS17+, 숫자/default/compact |
| listSectionMargins | iOS26+, edges와 length. 원문 설명의 ignore safe area 문구는 함수 이름/인자와 충돌하므로 section margin 계약으로 구분 |
| headerProminence | standard/increased |
| moveDisabled/deleteDisabled | boolean 기본 true, List.ForEach row의 이동/삭제 방지 |

alignmentGuide의 listRowSeparatorLeading/Trailing은 row separator 시작/끝을 정하며 tvOS는 no-op이다. **tag(string|number)**는 Picker/List 선택값이고 scroll target id와 역할이 다르다. environment editMode는 active/inactive/transient다.

## Tab와 badge

tabViewStyle({type:'page',indexDisplayMode?})의 dots는 automatic/always/never, automatic은 default tab bar다. sidebarAdaptable은 iOS18+이며 iPad/Mac sidebar와 iPhone bar로 적응한다. indexViewStyle({backgroundDisplayMode='automatic'}?)는 page index 전용이고 값은 automatic/always/never/interactive다. badge(string?)는 localized badge text를 제공하고 생략 시 숨긴다. badgeProminence는 standard/increased/decreased다. TabView의 tvOS 지원 표 불일치는 [[Expo-UI-Swift-TabView]]에 남겨 둔다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
