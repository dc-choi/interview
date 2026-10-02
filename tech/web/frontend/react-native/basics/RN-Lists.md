---
tags: [react-native, basics]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["React Native FlatList와 SectionList"]
---

# React Native FlatList와 SectionList

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 목록 모델 선택

React Native의 일반적인 데이터 목록은 `FlatList`와 `SectionList`를 사용한다. `FlatList`는 구조가 비슷한 항목이 길게 나열되고 수량이 변하는 목록에 맞는다. `SectionList`는 논리적 그룹과 섹션 헤더가 필요한 목록에 맞는다.

두 목록은 `ScrollView`처럼 전체 자식을 한 번에 만드는 대신 표시 영역을 중심으로 가상화한다. 입문 설명의 화면에 보이는 항목만 렌더링한다는 표현은 전체 항목을 즉시 생성하지 않는다는 비유다. 실제 렌더 window와 미리 준비하는 범위는 목록 설정에 의해 달라질 수 있다.

## FlatList의 필수 입력

- `data`: 렌더링할 항목의 데이터 배열이다.
- `renderItem`: 전달받은 항목으로 UI element를 반환하는 함수다.
- 항목 식별자는 목록의 `key` 또는 `keyExtractor`로 안정적으로 제공한다.

```tsx
import {FlatList, Text} from 'react-native';

const items = [
  {id: 'a', title: '첫 항목'},
  {id: 'b', title: '두 번째 항목'},
];

const List = () => (
  <FlatList
    data={items}
    keyExtractor={item => item.id}
    renderItem={({item}) => <Text>{item.title}</Text>}
  />
);
```

`renderItem`의 입력은 항목 자체가 아니라 item 등을 담은 객체이므로 구조 분해를 사용한다. 데이터 형식과 화면 표현을 분리하면 서버 응답의 내부 구조를 목록 전체에 퍼뜨리지 않고 항목 렌더링에서 처리할 수 있다.

## SectionList의 그룹 계약

`sections`에는 각 그룹의 `data` 배열과 헤더에 사용할 값을 둔다. `renderItem`은 그룹 내부의 항목을 렌더링하고 `renderSectionHeader`는 전달받은 section으로 헤더를 만든다.

```tsx
import {SectionList, Text} from 'react-native';

const sections = [
  {title: '진행 중', data: [{id: 'a', title: '작업 A'}]},
  {title: '완료', data: [{id: 'b', title: '작업 B'}]},
];

const GroupedList = () => (
  <SectionList
    sections={sections}
    keyExtractor={item => item.id}
    renderItem={({item}) => <Text>{item.title}</Text>}
    renderSectionHeader={({section}) => <Text>{section.title}</Text>}
  />
);
```

그룹 이름과 항목 제목이 같거나 변할 수 있다면 그 문자열을 식별자로 사용하지 않는다. 식별자는 UI의 위치가 아니라 항목의 정체성을 나타내야 한다.

## 서버 데이터와 검증

목록의 흔한 사용처는 서버에서 받아온 데이터다. 네트워크 요청, 로딩, 오류와 빈 결과의 상태는 목록 컴포넌트의 기본 렌더링과 별도로 관리한다. 데이터 변경 이후 항목 식별과 화면이 유지되는지, 긴 목록에서 메모리와 스크롤 성능이 적절한지는 실제 기기에서 확인한다.

## 가상화와 다시 렌더하는 조건

FlatList/SectionList는 VirtualizedList의 편의 wrapper이며 shallow props 비교를 한다. renderItem이 외부 선택 state에 의존하면 `extraData={selectedId}`처럼 변경을 props로 전달하고 data도 불변하게 교체한다. render window 밖 항목의 내부 state는 보존되지 않을 수 있으므로 장기 유지할 선택/입력은 item 데이터나 외부 state에 둔다.

헤더/푸터/빈 화면은 ListHeaderComponent, ListFooterComponent, ListEmptyComponent로 구성한다. ItemSeparatorComponent는 항목 사이, SectionSeparatorComponent는 섹션 위아래에 적용된다. renderItem의 separators로 highlight와 custom props를 전달할 수 있다. SectionList는 항목 key와 별도로 section key도 필요하며 section마다 renderer와 separator를 재정의할 수 있다.

`numColumns`는 horizontal=false에서 같은 높이 항목을 배치하며 masonry를 지원하지 않는다. stickySectionHeadersEnabled의 기본은 iOS true, Android false이므로 플랫폼 차이를 명시적으로 정한다.

## 이동과 viewability

`getItemLayout`은 고정된 항목의 length/offset/index를 제공해 측정을 생략한다. separator 길이도 offset에 포함한다. initialScrollIndex와 render window 밖 index 이동에는 정확한 layout이나 실패 재시도 처리가 필요하다.

| 이동 API | 입력과 조건 |
|---|---|
| scrollToIndex | index, viewPosition(0 상단, 0.5 중앙, 1 하단), viewOffset |
| scrollToItem | item을 선형 탐색하므로 index를 알면 index 이동 우선 |
| scrollToOffset | 콘텐츠의 x/y offset |
| scrollToEnd | 끝으로 이동, layout을 모르면 부드럽지 않을 수 있음 |
| SectionList.scrollToLocation | sectionIndex/itemIndex, sticky header를 viewOffset으로 보정 |

viewabilityConfig는 viewport 비율 또는 item 비율 기준을 하나 이상 지정하고, minimumViewTime과 waitForInteraction을 함께 정한다. 실행 중 config를 교체하지 않는다. recordInteraction은 scroll 전에도 상호작용을 알릴 수 있다.

onViewableItemsChanged는 changed/viewableItems의 ViewToken 배열을 전달한다. token에는 item/key/isViewable, 선택적인 index와 section이 있다. 화면 노출 추적은 이 기준으로 판단하고 모든 렌더 항목을 노출로 집계하지 않는다.

## 출처

- [React Native, Using A Listview](https://reactnative.dev/docs/using-a-listview)

- [React Native, FlatList](https://reactnative.dev/docs/flatlist)
- [React Native, SectionList](https://reactnative.dev/docs/sectionlist)
- [React Native, ViewToken](https://reactnative.dev/docs/viewtoken)

## 관련 문서

- [[RN-ScrollView]]
- [[React-Conditional-and-List-Rendering]]
- [[RN-List-Virtualization]]
- [[RN-Refresh-Control]]
