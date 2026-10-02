---
tags: [react-native, mobile, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native FlatList 가상화와 조정"]
---

# React Native FlatList 가상화와 조정

React Native 0.87 문서 기준이다.

FlatList는 VirtualizedList를 기반으로 화면 주변의 window를 렌더링한다. viewport는 실제 보이는 영역이고 window는 그보다 넓은 유지 범위다. 조정 목표는 빈 영역, 메모리와 입력 반응성의 균형이다.

## 주요 설정

| 설정 | 0.87 문서 기본값 | 늘리거나 활성화할 때의 효과와 비용 |
|---|---|---|
| `removeClippedSubviews` | Android `true`, 그 외 `false` | 화면 밖 native view 분리로 draw traversal 감소. 실제 메모리 해제와 다름 |
| `maxToRenderPerBatch` | `10` | batch당 항목 증가로 빈 영역 감소, 긴 JS 작업과 입력 지연 가능 |
| `updateCellsBatchingPeriod` | `50` ms | 간격 증가로 batch 빈도 감소, 빠른 스크롤에서 채움 지연 가능 |
| `initialNumToRender` | `10` | 첫 화면을 채울 항목 수. 부족하면 초기 빈 영역 발생 |
| `windowSize` | `21` viewport | 앞뒤 각 10개 viewport와 현재 화면. 크면 빈 영역 감소와 메모리 증가 |

`removeClippedSubviews`는 view를 분리할 뿐 객체를 모두 해제하지 않는다. 특히 iOS에서 transform과 absolute positioning을 함께 쓰면 내용이 사라지는 문제가 있을 수 있다. 메모리 절약 옵션이라고 단순 설명하지 않는다.

`maxToRenderPerBatch`와 `updateCellsBatchingPeriod`는 함께 조정한다. 많은 항목을 드물게 그리는 경우와 적은 항목을 자주 그리는 경우는 JS 점유 시간과 빈 영역 양상이 다르다.

## 행 비용 줄이기

행에 복잡한 계산, 깊은 view 중첩과 큰 원본 이미지를 넣으면 window 설정만으로 해결하기 어렵다. 목록에는 thumbnail과 필요한 정보만 표시하고 상세 화면으로 책임을 나눌 수 있다.

`memo`는 입력 props가 같은 행의 불필요한 render를 줄이는 후보지만 state/context 갱신까지 막는 계약은 아니다. 사용자 정의 비교 함수를 쓴다면 표시와 event handler에 영향을 주는 모든 props를 비교해야 한다. 무조건 `true`를 반환하면 변경을 누락한다.

안정적인 `keyExtractor`로 항목 identity를 유지한다. 순서가 바뀌는 목록에서 index를 key로 쓰면 행의 state가 다른 데이터에 대응할 수 있다. `renderItem`의 참조를 유지할 필요가 있으면 `useCallback`을 쓰되 closure가 읽는 의존성을 빠뜨리지 않는다.

## 높이가 정해진 행

행 높이와 separator 크기를 알고 있으면 `getItemLayout`으로 비동기 측정을 줄일 수 있다. 다음은 세로 행 56, separator 1이고 앞쪽 padding과 header가 없는 단순 계약이다.

```tsx
const ROW_HEIGHT = 56;
const SEPARATOR_HEIGHT = 1;

const getItemLayout = (_data: unknown, index: number) => ({
  length: ROW_HEIGHT,
  offset: (ROW_HEIGHT + SEPARATOR_HEIGHT) * index,
  index,
});
```

폰트 확대나 줄바꿈으로 행 높이가 달라지면 이 계약이 깨진다. 실제 높이를 모르는 목록에 임의 값을 넣으면 scroll 위치가 어긋날 수 있다. header, padding과 horizontal 설정이 있으면 전체 offset 계산을 함께 확인한다.

## 재현과 선택

저사양 기기에서 빠르게 왕복 스크롤하고, 첫 화면, 목록 삽입/삭제, 이미지 로딩, 큰 글씨 조건을 확인한다. blank area가 사라지는 대신 버튼 응답이 늦어졌다면 batch가 너무 커졌을 수 있다. 화면이 부드러워도 메모리 부족 crash가 늘었다면 window와 이미지 비용을 다시 본다.

대체 목록 library는 core 설정과 행 비용을 확인한 뒤 검토한다. 이름이 알려졌다는 이유만으로 교체하면 호환성, 측정과 유지 비용을 추가한다.

## 출처

- [React Native, Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)

## 관련 문서

- [[React-Native-Performance]]
- [[React-Native-Profiling]]
- [[React-Memo-and-Profiler]]
