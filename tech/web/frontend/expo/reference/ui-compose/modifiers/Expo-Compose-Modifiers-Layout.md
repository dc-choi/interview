---
tags: [expo, react-native, modifiers]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose modifier의 크기와 배치"]
---

# Compose modifier의 크기와 배치

modifier는 `@expo/ui/jetpack-compose/modifiers`에서 가져와 배열로 전달한다. 배열의 앞에서 뒤로 적용하므로 순서를 포함한 계약이다. RN style 객체를 단순 변환하는 방식으로 이해하면 배경/패딩/부모 scope의 차이를 놓칠 수 있다.

```tsx
<Box modifiers={[paddingAll(16), background('#FFFFFF')]} />
<Box modifiers={[background('#FFFFFF'), paddingAll(16)]} />
```

첫 경우 바깥 패딩은 배경에 포함되지 않고, 둘째는 배경 내부에 패딩이 생긴다. 각각의 modifier 함수는 native에 보낼 `ModifierConfig`를 반환한다.

## 크기 함수 전체

| 함수 | 계약 |
| --- | --- |
| `paddingAll(all)` | 네 방향 동일 dp |
| `padding(start,top,end,bottom)` | 방향별 dp. start/end는 RTL에서 좌우가 반전 |
| `size(width,height)` | 너비와 높이 dp |
| `width(value)`, `height(value)` | 해당 축 dp |
| `fillMaxSize(fraction?)` | 양 축 최대 공간의 비율 0~1, 기본 1 |
| `fillMaxWidth(fraction?)`, `fillMaxHeight(fraction?)` | 해당 축 최대 공간의 비율, 기본 1 |
| `wrapContentWidth(alignment?)` | 내용 너비, start/end/centerHorizontally |
| `wrapContentHeight(alignment?)` | 내용 높이, top/bottom/centerVertically |
| `defaultMinSize({minWidth,minHeight})` | 대응 incoming 최소 제약이 0일 때만 기본 최소 크기 적용 |
| `imePadding()` | 소프트 키보드 표시 시 위로 피하도록 패딩 추가 |

크기 지정도 Compose 부모의 제약을 받는다. 스크롤 축에서 `Host matchContents`로 무한 제약을 만들지 않고 유한한 뷰포트를 먼저 확보한다. defaultMinSize는 이미 주어진 모든 최소 제약을 덮어쓰는 함수가 아니다.

## 부모 scope와 위치

`weight(number)`는 Row/Column 내부에서 형제 간 공간을 비례 배분한다. 가중치 2와 1은 가용 공간을 2:1로 나눈다. `matchParentSize()`는 Box 안에서만 동작하고 부모 측정에 영향을 주지 않은 채 최종 Box 크기를 따른다. `fillMaxSize()`와 측정 효과가 다르다.

`align(alignment)`은 부모 scope의 정렬이다. Box 정렬은 topStart/topCenter/topEnd, centerStart/center/centerEnd, bottomStart/bottomCenter/bottomEnd다. 한 축 정렬은 top/centerVertically/bottom 또는 start/centerHorizontally/end를 쓴다.

`offset(x,y)`는 dp만큼 보이는 위치를 옮기지만 주변 형제의 배치를 밀어내지 않는다. `zIndex(index)`는 겹친 뷰의 그리기 순서다. 위치와 측정을 혼동하지 않는다.

```tsx
<Box modifiers={[fillMaxSize()]}>
  <Box modifiers={[matchParentSize(), background('#EEE')]} />
  <Text modifiers={[align('bottomEnd'), offset(-16, -16)]}>안내</Text>
</Box>
```

## 스크롤과 특정 컴포넌트 scope

`horizontalScroll()`은 Row 등에 non-lazy 수평 스크롤을 추가하고 `verticalScroll()`은 Column 등에 수직 스크롤을 추가한다. Compose rememberScrollState를 사용한다. 항목이 많은 컬렉션에는 LazyRow/LazyColumn을 검토한다.

`menuAnchor(type?, enabled?)`는 ExposedDropdownMenuBox 내부 앵커에만 쓴다. 현재 type은 `primaryNotEditable`만 지원하고 enabled 기본은 true다. `maskClip(shape)`는 Carousel의 직접 항목 scope에서 마스크 자체를 자른다. 일반 clip은 작은 peek로 변할 때 모서리 모양을 유지하지 못할 수 있다. maskClip은 뒤에 그려지는 내용을 자르므로 background 앞에 둔다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/modifiers)

## 관련 문서

- [[Expo-Compose-Modifiers-Visual]]
- [[Expo-Compose-Modifiers-Interaction]]
- [[Expo-Compose-Host]]
