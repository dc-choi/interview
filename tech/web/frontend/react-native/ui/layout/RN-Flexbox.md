---
tags: [react-native, mobile, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native Flexbox 배치

React Native 0.87 기준. 부모가 자식의 배치를 정의하며 주축은 `flexDirection`, 교차축은 주축에 수직인 축이다. 배치는 주축의 공간 배분과 정렬, 교차축 정렬을 나누어 읽는다.

## 웹과 다른 기본값

| 속성 | React Native 기본값 | 웹에서 흔히 기대하는 기본값 |
|---|---|---|
| flexDirection | column | row |
| alignContent | flex-start | stretch |
| flexShrink | 0 | 1 |
| flex | 숫자 하나 | 여러 값의 shorthand 가능 |

`column`에서 주축은 세로이므로 `justifyContent: 'center'`는 세로 중앙이다. 가로 중앙은 `alignItems: 'center'`로 정한다.

## 축과 읽기 방향

| flexDirection | 주축 진행 | 줄바꿈을 허용한 다음 줄 |
|---|---|---|
| column | 위에서 아래 | 옆쪽 열 |
| row | 가로 방향 | 아래쪽 행 |
| column-reverse | 아래에서 위 | 옆쪽 열 |
| row-reverse | 역방향 가로 | 아래쪽 행 |

가로 시작과 끝은 layout `direction`도 함께 고려한다. 기본 `ltr`에서 `start`는 왼쪽, `end`는 오른쪽이다. `rtl`에서는 뒤바뀌므로 `marginStart`, `paddingStart`처럼 논리적인 시작 방향을 지정하면 읽기 방향에 맞춰 적용된다. `direction`과 `flexDirection`은 서로 다른 설정이다.

## 주축 정렬

`justifyContent`는 자식을 배치하고 남는 주축 공간을 분배한다.

| 값 | 공간 분배 |
|---|---|
| flex-start | 주축 시작에 모음, 기본값 |
| flex-end | 주축 끝에 모음 |
| center | 주축 가운데에 모음 |
| space-between | 항목 사이에만 균등 분배 |
| space-around | 각 항목 주변에 분배, 바깥쪽은 항목 사이보다 작음 |
| space-evenly | 양 끝과 항목 사이를 같은 간격으로 분배 |

## 교차축 정렬과 단일 자식

`alignItems`는 같은 부모의 자식 전체에 적용한다. `stretch`가 기본값이며 `flex-start`, `flex-end`, `center`, `baseline`을 선택할 수 있다. `baseline`은 공통 기준선을 맞출 때 사용한다.

`stretch`는 자식의 교차축 크기가 고정되지 않았을 때 효과가 있다. `column` 부모에서 자식에 `width: 50`이 있으면 stretch만 바꿔도 너비는 늘어나지 않는다. 너비를 제거하거나 `auto`로 바꿔 결과를 비교한다.

`alignSelf`는 한 자식에 적용하고 부모의 `alignItems`보다 우선한다.

```tsx
import {Text, View} from 'react-native';

export const AlignedRows = () => (
  <View style={{height: 240, padding: 16, alignItems: 'stretch', gap: 8}}>
    <Text style={{backgroundColor: 'powderblue'}}>부모 너비를 채움</Text>
    <Text style={{alignSelf: 'center', backgroundColor: 'skyblue'}}>개별 중앙</Text>
    <Text style={{width: 100, backgroundColor: 'steelblue'}}>고정 너비</Text>
  </View>
);
```

## 여러 줄, alignContent와 gap

`flexWrap`의 기본 동작은 한 줄 배치다. `wrap`을 켜면 주축 공간을 넘는 항목이 여러 행이나 열로 나뉠 수 있다. `alignContent`는 **여러 줄 전체**를 교차축에서 정렬하며 한 줄에서는 효과가 없다.

선택값은 `flex-start`, `flex-end`, `stretch`, `center`, `space-between`, `space-around`, `space-evenly`다. `alignItems`가 각 줄 안의 자식 정렬이라면 `alignContent`는 줄들의 분포다.

`rowGap`은 행 사이, `columnGap`은 열 사이 간격이다. `gap`은 두 값을 함께 지정한다. margin처럼 항목마다 외부 간격을 반복 지정하지 않고 줄바꿈된 항목 사이 공간을 일정하게 둘 수 있다.

```tsx
export const WrappedItems = () => (
  <View style={{width: 240, height: 200, flexDirection: 'row',
    flexWrap: 'wrap', alignContent: 'flex-start', rowGap: 12, columnGap: 8}}>
    {[1, 2, 3, 4, 5].map(value => (
      <View key={value} style={{width: 70, height: 50, backgroundColor: 'skyblue'}} />
    ))}
  </View>
);
```

## flexBasis, flexGrow, flexShrink

- `flexBasis`는 늘리거나 줄이기 전의 주축 기준 크기다. row에서는 width, column에서는 height에 대응하는 관점으로 읽는다.
- `flexGrow`는 배치 후 남는 공간의 배분 가중치다. 0 이상의 수이며 기본값은 0이다.
- `flexShrink`는 자식의 합이 부모 주축 공간을 넘을 때 줄이는 가중치다. 0 이상의 수이며 기본값은 0이다.

양의 여유 공간을 나눌지, 음의 여유 공간을 줄일지 구분한다. 고정 width만 지정한 row가 넘치는 경우 React Native 기본 `flexShrink: 0`을 먼저 확인한다.

```tsx
export const GrowAndShrink = () => (
  <View style={{width: 300, flexDirection: 'row'}}>
    <View style={{flexBasis: 100, flexGrow: 1, flexShrink: 1, height: 50,
      backgroundColor: 'powderblue'}} />
    <View style={{flexBasis: 100, flexGrow: 2, flexShrink: 1, height: 50,
      backgroundColor: 'steelblue'}} />
  </View>
);
```

이 단순 예에서는 남은 100을 1:2로 나눈다. 부모 너비를 150으로 줄이면 grow가 아닌 shrink 조건을 살펴볼 수 있다.

## 확인할 점

공식 Snack은 선택 버튼으로 축, direction, justifyContent, alignItems, alignSelf, alignContent, wrap을 바꾼다. basis/grow/shrink와 gap 예제는 TextInput으로 값도 바꾼다. 한 번에 한 설정을 바꾸고 고정 크기와 부모 크기를 함께 확인한다. 예제 UI의 숫자 입력 처리는 API의 허용값 전체를 검증하는 validator가 아니다. 이 문서의 코드도 실행한 결과는 아니다.

## 출처

- [React Native 0.87, Layout with Flexbox](https://reactnative.dev/docs/flexbox)

## 관련 문서

- [[RN-Dimensions|크기의 기준과 부모 조건]]
- [[RN-Positioning|배치 흐름과 containing block]]
