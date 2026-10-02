---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native VirtualizedList의 window와 데이터 접근

VirtualizedList는 긴 목록의 유한한 render window를 유지하고 나머지를 빈 공간으로 대체한다. React Native 0.87 기준이다. 일반 배열 목록은 FlatList/SectionList를 먼저 쓰고 다른 데이터 구조의 접근자가 필요할 때 직접 사용한다.

## 데이터 계약

`data`는 opaque 값이며 getItem(data, index)와 getItemCount(data)가 항목 접근을 정의한다. renderItem이 화면을 만든다. 접근 결과의 key는 안정적으로 유지한다. 공식 입문 예제의 매 호출 Math.random id를 실제 데이터의 식별 전략으로 삼지 않는다.

CellRendererComponent를 바꾸면 cell 변화와 layout을 목록에 알려 주는 handler 계약을 전달해야 한다. renderScrollComponent나 custom refreshControl도 상속받은 scroll/refresh 동작과 함께 확인한다. custom refreshControl을 주면 기본 onRefresh/refreshing은 무시되며 vertical 목록에서만 적용된다.

## window와 batch의 교환 비용

| 설정 | 늘릴 때의 이점과 비용 |
|---|---|
| initialNumToRender | 첫 화면 준비, 초기 비용 증가 |
| maxToRenderPerBatch | fill rate 증가, 입력 responsiveness 감소 가능 |
| windowSize | 빠른 scroll의 빈 구간 감소, 메모리 증가 |
| updateCellsBatchingPeriod | batch 간 시간 조절, fill rate와 responsiveness 교환 |

windowSize는 항목 개수가 아니라 viewport 길이의 배수다. 먼 항목은 낮은 우선순위로 준비하므로 빠른 scroll에서 잠시 빈 화면이 보일 수 있다. debug overlay는 진단용이며 성능 비용이 있다. deprecated disableVirtualization을 성능 개선 옵션으로 쓰지 않는다.

onEndReached/onStartReached의 threshold는 viewport 길이를 기준으로 한다. 페이지 요청 중복과 끝 상태는 앱에서 관리한다. onScrollToIndexFailed는 측정된 마지막 index와 평균 길이를 전달하므로 offset을 추정해 이동하고 렌더 후 다시 시도할 수 있다.

removeClippedSubviews는 native backing view를 분리하는 옵션이며 가상화와 같은 개념은 아니다. 일부 조합에서는 콘텐츠가 사라지는 문제가 있을 수 있어 기기에서 확인한다. getScrollRef/getScrollableNode/getScrollResponder는 서로 다른 handle을 제공하며 반환값과 제공 메서드를 확인한다.

## 출처

- [React Native, virtualizedlist](https://reactnative.dev/docs/virtualizedlist)

## 관련 문서

- [[RN-Lists]]
- [[React-Native-FlatList-Performance]]
- [[RN-ScrollView]]
