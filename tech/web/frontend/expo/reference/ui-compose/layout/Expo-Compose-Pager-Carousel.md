---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Pager와 Carousel"]
---

# Compose Pager와 Carousel

Android의 `HorizontalPager`는 페이지 단위로 스냅한다. Carousel은 큰 항목과 다음 항목의 일부를 함께 보여 주거나 고정 너비 항목을 자유롭게 탐색한다. 모두 `@expo/ui/jetpack-compose` 컴포넌트이며 수평 스크롤 축에 유한한 너비가 필요하다.

## Pager의 크기와 상태

`HorizontalPager`에는 자체 높이가 없다. `height` modifier나 유한한 높이의 부모를 제공한다. 자식 각각이 한 페이지다. `initialPage`는 기본 0이며 mount 시에만 적용된다. 이후 이동은 ref를 사용한다.

```tsx
const pager = useRef<HorizontalPagerHandle>(null);
<Host style={{ width: '100%' }} matchContents={{ vertical: true }}>
  <HorizontalPager ref={pager} initialPage={1}
    modifiers={[fillMaxWidth(), height(240)]}
    onSettledPageChange={setPage} pageSpacing={12}
    contentPadding={{ start: 24, end: 24 }}>
    <Page /><Page /><Page />
  </HorizontalPager>
</Host>
// 입력 범위를 페이지 개수에 맞춰 제한한 뒤 호출한다.
await pager.current?.animateScrollToPage(2);
```

| Pager API | 계약 |
| --- | --- |
| `onCurrentPageChange(page)` | 스냅 위치에 가장 가까운 페이지가 바뀔 때. 스와이프 중에도 발생 |
| `onSettledPageChange(page)` | 스와이프나 프로그램 이동이 완전히 정착한 뒤 |
| `onPageScroll(page, offsetFraction)` | 이동 중 연속 호출. offset은 -0.5~0.5, worklet이면 UI 스레드 동기 실행, 일반 callback이면 JS 비동기 이벤트 |
| `onScrollInProgressChange(boolean)` | 드래그 또는 애니메이션 진행 상태 |
| `onDragInteraction(kind)` | `start`, `stop`, `cancel`. 진행 상태 callback과 조합해 손가락 입력과 fling을 구분 |
| `scrollToPage(page)` | 애니메이션 없이 이동, Promise 반환 |
| `animateScrollToPage(page)` | 애니메이션 완료 시 Promise resolve |
| `beyondViewportPageCount` | 화면 밖에서 유지할 페이지 수, 기본 0 |
| `pageSpacing`, `contentPadding` | dp 간격 기본 0, 패딩은 숫자 또는 start/top/end/bottom 객체 |
| `reverseLayout`, `userScrollEnabled` | 기본 false, true |
| `modifiers` | Compose modifier 배열 |

## Carousel 세 종류

| 컴포넌트 | 크기 계약과 용도 |
| --- | --- |
| `HorizontalCenteredHeroCarousel` | 중앙 큰 항목 양쪽에 작은 항목. `maxItemWidth` 미지정이면 가능한 최대 너비 |
| `HorizontalMultiBrowseCarousel` | 큰 항목과 작은 다음 항목. `preferredItemWidth` 필수 |
| `HorizontalUncontainedCarousel` | 모든 항목 고정 너비, `itemWidth` 필수 |

Hero와 MultiBrowse는 `minSmallItemWidth`, `maxSmallItemWidth`로 작은 미리보기 너비를 조정한다. 기본값은 Compose CarouselDefaults다. 공통 props는 `children`, `contentPadding`(숫자 또는 방향별 dp), `itemSpacing`(기본 0), `userScrollEnabled`(기본 true), `modifiers`, `flingBehavior`다. fling은 `singleAdvance`로 다음 항목에 스냅하거나 `noSnap`으로 자유 스크롤한다.

```tsx
<Host style={{ width: '100%' }} matchContents={{ vertical: true }}>
  <HorizontalMultiBrowseCarousel preferredItemWidth={200}
    itemSpacing={8} flingBehavior="singleAdvance">
    {items.map(item => <Box key={item.id}
      modifiers={[size(200, 180), maskClip(Shapes.RoundedCorner(28))]}>
      <Text>{item.title}</Text>
    </Box>)}
  </HorizontalMultiBrowseCarousel>
</Host>
```

Carousel의 마스킹은 크기가 변하는 항목에 맞춰 `maskClip`을 쓰는 원문 패턴을 따른다. `Host matchContents`로 수평 스크롤 축까지 내용 크기에 맞추면 무한 제약이 될 수 있으므로 vertical만 맞추고 너비는 부모에서 받는다.

## 출처

- [Expo Documentation, Carousel](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/carousel)
- [Expo Documentation, HorizontalPager](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/horizontalpager)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Compose-Layout]]
