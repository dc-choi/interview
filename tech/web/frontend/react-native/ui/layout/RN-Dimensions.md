---
tags: [react-native, mobile, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 크기와 공간 배분

React Native 0.87 기준. `width`와 `height`는 화면에서 컴포넌트가 차지할 크기를 정한다. 고정값, flex, 백분율은 기준 공간과 사용 목적이 서로 다르다.

## 고정 크기

숫자 크기는 단위 없는 density-independent pixel 값이다. 화면의 물리 픽셀 개수를 직접 지정하는 의미가 아니다.

```tsx
import {View} from 'react-native';

export const FixedSize = () => (
  <View style={{padding: 16}}>
    <View style={{width: 50, height: 50, backgroundColor: 'powderblue'}} />
    <View style={{width: 100, height: 100, backgroundColor: 'skyblue'}} />
    <View style={{width: 150, height: 150, backgroundColor: 'steelblue'}} />
  </View>
);
```

아이콘, 일정 크기의 장식처럼 화면 크기에 비례할 필요가 없는 요소에 적합하다. 포인트와 실제 길이의 범용 변환은 없으므로 모든 기기에서 물리적으로 같은 크기라고 보장하지 않는다.

## flex의 부모 조건

`flex`는 부모 안에서 사용할 수 있는 공간에 따라 요소가 늘거나 줄어들도록 한다. `flex: 1`인 같은 부모의 형제들은 단순한 동일 조건에서 공간을 균등하게 나눈다. 값이 큰 요소는 더 큰 비율을 받는다.

```tsx
export const SharedSpace = () => (
  <View style={{flex: 1}}>
    <View style={{flex: 1, backgroundColor: 'powderblue'}} />
    <View style={{flex: 2, backgroundColor: 'skyblue'}} />
    <View style={{flex: 3, backgroundColor: 'steelblue'}} />
  </View>
);
```

형제의 flex 합은 6이므로 이 단순 예에서는 각각 1/6, 2/6, 3/6의 공간을 차지한다. padding, 고정 크기, 최소 크기 등 추가 조건이 들어가면 전체 화면 크기를 그대로 이 비율로 나눈다고 해석하지 않는다.

부모가 0보다 큰 크기를 확보해야 자식이 공간을 채울 수 있다. 공식 예제의 부모에서 `flex: 1`을 지우면 공간이 없어 자식이 보이지 않는 조건을 관찰할 수 있다. 부모를 `height: 300`으로 바꿔 flex가 화면 전체가 아닌 부모의 공간을 나누는지도 비교한다.

## 백분율 크기

백분율은 부모의 대응하는 크기를 기준으로 한다. 숫자 `50`과 문자열 `'50%'`를 구분한다. 부모 크기가 정의돼 있어야 비율로 계산할 수 있다.

```tsx
export const PercentageSize = () => (
  <View style={{height: 400, width: 300}}>
    <View style={{height: '15%', backgroundColor: 'powderblue'}} />
    <View style={{width: '66%', height: '35%', backgroundColor: 'skyblue'}} />
    <View style={{width: '33%', height: '50%', backgroundColor: 'steelblue'}} />
  </View>
);
```

이 예제의 높이는 60, 140, 200으로 계산된다. 루트부터 부모까지 크기가 연결되지 않은 상태에서 `height: '100%'`만 추가해 해결하려고 하지 않는다.

## auto와 최종 크기

`width`와 `height`의 기본값인 `auto`는 자식, 텍스트, 이미지 등 콘텐츠와 다른 배치 조건을 이용해 계산한다. 숫자 크기를 지정했더라도 flex나 정렬 등 다른 스타일이 최종 치수에 영향을 줄 수 있다.

| 요구 | 선택 | 확인할 조건 |
|---|---|---|
| 크기가 일정한 요소 | 숫자 width, height | 큰 글꼴과 작은 화면에서도 콘텐츠가 맞는지 |
| 남은 공간의 비율 배분 | flex | 부모 크기와 형제의 배치 조건 |
| 부모의 일정 비율 | 백분율 | 기준 부모 크기가 정의됐는지 |
| 콘텐츠 크기 반영 | auto | stretch, flex와 함께 적용되는 결과 |

## 확인할 점

부모 크기를 먼저 확인한 뒤 자식 크기를 조사한다. 공식 고정 크기, flex 비율, 백분율 Snack의 값과 부모 스타일을 하나씩 바꿔 원인을 구분한다. 이 문서의 예제는 실행 검증되지 않았다.

## 출처

- [React Native 0.87, Height and Width](https://reactnative.dev/docs/height-and-width)
- [React Native 0.87, Layout with Flexbox](https://reactnative.dev/docs/flexbox)

## 관련 문서

- [[RN-Style|스타일 객체와 적용 순서]]
- [[RN-Flexbox|주축과 교차축 배치]]
- [[RN-Positioning|absolute와 containing block]]
