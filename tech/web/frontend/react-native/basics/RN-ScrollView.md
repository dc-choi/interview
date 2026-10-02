---
tags: [react-native, basics]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["React Native ScrollView"]
---

# React Native ScrollView

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 언제 사용하는가

`ScrollView`는 여러 컴포넌트를 담는 범용 스크롤 컨테이너다. 텍스트와 이미지처럼 구조가 다른 자식을 섞어 담을 수 있다. 기본 세로 스크롤에서 `horizontal`을 지정하면 가로로 스크롤한다.

가장 중요한 비용은 **화면 밖에 있는 자식까지 함께 렌더링한다는 점**이다. 항목 수와 크기가 제한된 소개 화면, 짧은 폼이나 이미지 묶음에 적합하다. 데이터가 길고 계속 증가한다면 `FlatList` 또는 `SectionList`의 가상화 경로를 검토한다.

```tsx
import {Image, ScrollView, Text} from 'react-native';

const Gallery = () => (
  <ScrollView horizontal pagingEnabled>
    <Text>첫 페이지</Text>
    <Image
      source={{uri: 'https://reactnative.dev/img/tiny_logo.png'}}
      style={{width: 64, height: 64}}
    />
  </ScrollView>
);
```

`pagingEnabled`는 스와이프 후 페이지 단위로 이동하는 동작을 설정한다. 실제 페이지 폭과 레이아웃을 맞춰야 원하는 화면 단위로 보인다. 위 코드는 props의 위치를 보여주는 예시이며 완성된 갤러리 레이아웃은 아니다.

## 페이징과 확대

- `horizontal`: 가로 방향 스크롤을 선택한다.
- `pagingEnabled`: 스와이프로 페이지를 넘기는 동작을 구성한다.
- iOS의 단일 콘텐츠 스크롤 뷰에서는 `minimumZoomScale`과 `maximumZoomScale`을 설정해 핀치 확대/축소를 사용할 수 있다.
- 확대 관련 설명을 Android까지 같은 계약으로 확대하지 않는다.

입문 페이지에는 Android의 `ViewPager` 언급이 남아 있다. 해당 언급만으로 현재 React Native에 내장된 ViewPager가 있다고 가정하지 말고, 별도 pager가 필요하면 현재 사용하는 패키지의 지원 플랫폼과 API를 확인한다.

## 비용과 선택 기준

| 콘텐츠 | 선택 |
|---|---|
| 짧고 이질적인 화면 구성 | `ScrollView` |
| 길고 유사한 데이터 항목 | `FlatList` |
| 그룹별 데이터와 섹션 헤더 | `SectionList` |

스크롤 성능을 볼 때 JavaScript 렌더 시간뿐 아니라 자식 뷰 수와 이미지 메모리를 함께 본다. 단순히 스크롤 가능하다는 이유로 큰 데이터 전체를 `ScrollView` 안에서 `map`으로 렌더링하면 가상화의 이점을 얻지 못한다.

## 크기, container와 inset

ScrollView는 높이가 제한된 container 안에서 동작해야 한다. 부모부터 flex/height가 연결되지 않으면 자식의 끝없는 높이를 담을 viewport가 정해지지 않는다. style은 바깥 scroll view, contentContainerStyle은 모든 자식을 담는 내부 view에 적용한다.

iOS contentInset/contentInsetAdjustmentBehavior, scrollIndicatorInsets와 자동 조정 옵션은 콘텐츠와 indicator를 따로 조정한다. automaticallyAdjustKeyboardInsets의 기본은 false다. safe area, header와 keyboard 보정이 여러 layer에서 중복되지 않게 한다.

## 키보드와 gesture

keyboardDismissMode는 none/on-drag, iOS interactive를 지원한다. keyboardShouldPersistTaps의 never는 키보드를 닫을 때 자식 tap이 전달되지 않을 수 있고, always는 자식에 전달하며 handled는 자식이 처리한 tap을 보존한다.

nestedScrollEnabled는 Android 중첩 scroll 옵션이다. disableScrollViewPanResponder는 특수 snap 시나리오에 한정해 검토하며 일반 scroll에서 끄면 touch가 예상과 달라질 수 있다. scrollEnabled=false는 gesture를 막지만 scrollTo 호출은 가능하다.

## snap, 위치 유지와 callback

snapToOffsets는 가변 크기 item의 위치 배열이며 snapToInterval과 pagingEnabled보다 우선한다. snapToInterval은 일정 간격, pagingEnabled는 viewport 배수에 맞춘다. snapToAlignment, decelerationRate와 disableIntervalMomentum을 함께 조절한다. normal/fast 감속 수치는 Android와 iOS가 다르다.

maintainVisibleContentPosition은 prepend되는 chat 등에서 기존 첫 visible child 위치를 유지한다. minIndexForVisible과 autoscrollToTopThreshold로 기준을 정한다. 재정렬은 jump를 일으킬 수 있고 occlusion/transform까지 visibility 계산에 반영하지 않는다.

onScroll에는 contentOffset/contentSize/layoutMeasurement/velocity 등의 값이 있다. scrollEventThrottle은 millisecond이며 16 이하 값은 throttle을 끈다. 매 frame 무거운 JS 작업을 피한다. content size, drag와 momentum callback은 서로 다른 시점이다.

stickyHeaderIndices는 자식 index이며 horizontal과 같이 쓰지 않는다. custom transform header는 StickyHeaderComponent를 검토한다. iOS bounce/zoom/scrollsToTop과 Android overscroll/fading edge/scrollsChildToFocus는 platform별 계약이다. scrollPerfTag만 지정해도 FPS를 측정해 주지는 않으며 native listener가 필요하다.

이동에는 `scrollTo({x, y, animated})`와 scrollToEnd를 사용한다. 이전 위치 인자 signature는 순서가 모호해 deprecated다.

## 출처

- [React Native, Using A Scrollview](https://reactnative.dev/docs/using-a-scrollview)

- [React Native, scrollview](https://reactnative.dev/docs/scrollview)

## 관련 문서

- [[RN-Lists]]
- [[RN-Core-Components]]
- [[RN-Refresh-Control]]
- [[RN-Keyboard-Layout]]
- [[RN-Native-Nodes]]
