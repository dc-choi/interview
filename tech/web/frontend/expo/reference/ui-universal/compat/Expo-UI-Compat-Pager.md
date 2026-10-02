---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community PagerView callbacks와 ref navigation"]
---

# Community PagerView callbacks와 ref navigation

## Horizontal-only paging

`@expo/ui/community/pager-view` default import다. Android Compose HorizontalPager/iOS paged SwiftUI ScrollView를 사용하고 each child는 stable key를 가진 fill page다. web render는 runtime throw다. iOS17+에서 snap paging, iOS16은 horizontal scroll만 하며 snap하지 않는다. built-in iOS dots가 필요하면 SwiftUI TabView page style이 대안이다.

initialPage number0은 mount once이고 이후 변경은 ignored다. scrollEnabled true는 swipe 허용이다. ViewProps를 상속하고 borderRadius는 양 platform에서 적용되지만 Android clipping은 numeric 값만 지원한다.

## Events와 platform-specific props

| API | Payload/조건 |
| --- | --- |
| onPageSelected | nativeEvent.position, full selected page |
| onPageScroll | nativeEvent.position/offset[0,1), Android/iOS18+ |
| onPageScrollStateChanged | nativeEvent.pageScrollState idle/dragging/settling, Android/iOS18+ |
| layoutDirection | ltr(default)/rtl, Android only |
| offscreenPageLimit | number, Android only |
| pageMargin | pixel number, Android only |

onPageScroll worklet은 per-frame UI-thread 호출을 유지하고 optional react-native-worklets가 필요하다. worklets 없으면 JS callback은 실행된다. iOS17에서는 scroll callbacks가 실행되지 않고 mount dev warning을 낸다.

```tsx
const ref = useRef<PagerViewRef>(null);
<PagerView ref={ref} initialPage={0} style={{flex:1}}>
  <View key="first"><Text>First</Text></View>
  <View key="second"><Text>Second</Text></View>
</PagerView>
```

setPage(index)는 animated navigation(범위 밖 ignored), setPageWithoutAnimation(index)는 jump다. Android animation은 native, iOS animation은 worklets가 없으면 nonanimated jump로 fallback한다. setScrollEnabled(bool)는 rerender를 통해 native prop을 변경하고 later explicit scrollEnabled prop change가 imperative value보다 우선한다. imperative-only면 prop을 생략한다.

vertical orientation,keyboardDismissMode,overdrag,overScrollMode,usePagerView hook은 unsupported다. initialPage를 controlled currentPage처럼 변경하는 대신 ref를 사용한다. carousel gesture와 OS callback availability를 별개로 확인한다.

## 출처

- [Expo Documentation, PagerView](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/pagerview)

## 관련 문서

- [[Expo-UI-Scroll]]
