---
tags: [react-native, mobile, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 위치와 containing block

React Native 0.87 기준. `position`은 요소가 배치 흐름에 참여하는지, offset과 백분율의 기준이 무엇인지 결정한다. 화면 좌표를 직접 지정한다고 생각하기보다 기준 조상을 먼저 찾는다.

## relative, absolute, static

| position | 배치 흐름 | top, right, bottom, left |
|---|---|---|
| relative | 참여, 기본값 | 정상 배치 위치에서 offset |
| absolute | 형제의 정상 흐름에서 제외 | containing block 기준 |
| static | 참여 | offset 무시 |

`relative`의 offset은 요소가 보이는 위치만 바꾸며 형제와 부모의 정상 배치 위치는 이동시키지 않는다. 빈자리를 다른 형제가 자동으로 채운다고 기대하지 않는다.

`absolute`는 일반 흐름의 공간을 차지하지 않는다. 카드 위의 배지, 배경 이미지처럼 겹쳐 놓을 때 유용하지만 부모 크기를 자식 absolute 콘텐츠가 자동으로 정할 것이라고 기대하지 않는다.

`static`은 New Architecture에서만 제공된다. static 요소는 일반적으로 absolute 자손의 containing block을 만들지 않지만 transform 같은 우선 조건이 있으면 달라진다.

## containing block 찾기

containing block은 위치와 크기 계산의 기준이 되는 조상이다.

1. 해당 요소가 `relative`나 `static`이면 부모가 기준이다.
2. 해당 요소가 `absolute`이면 가장 가까운 조상 중 `position`이 static이 아니거나 transform이 있는 요소가 기준이다.
3. absolute 요소의 `top`, `right`, `bottom`, `left`와 백분율 길이는 이 기준 요소를 따라 계산된다.

예를 들어 containing block 너비가 100이면 absolute 자식의 `width: '50%'`는 50이다. 바로 위 부모가 static이라는 이유로 그 부모가 기준이라고 단정하지 않는다.

## 카드 안 배지 예제

```tsx
import {Text, View} from 'react-native';

export const BadgeCard = () => (
  <View style={{width: 240, height: 140, position: 'relative',
    padding: 16, backgroundColor: 'aliceblue'}}>
    <Text>상품 설명</Text>
    <View style={{position: 'absolute', top: 8, right: 8,
      backgroundColor: 'steelblue', padding: 4}}>
      <Text style={{color: 'white'}}>신규</Text>
    </View>
  </View>
);
```

카드에 크기가 있고 relative이므로 배지가 카드 안의 오른쪽 위를 기준으로 배치된다. 배지 높이를 늘려도 본문이 자동으로 아래로 밀리지는 않는다. 겹침이 제품 요구에 맞는지 확인한다.

## static 중간 부모 비교

```tsx
export const AncestorPosition = () => (
  <View style={{width: 240, height: 160, position: 'relative'}}>
    <View style={{width: 80, height: 80, position: 'static'}}>
      <View style={{position: 'absolute', top: 0, right: 0,
        width: 24, height: 24, backgroundColor: 'red'}} />
    </View>
  </View>
);
```

New Architecture에서 중간 부모가 containing block을 만들지 않는 조건을 보여 주는 예다. 중간 부모를 relative로 바꾸거나 transform을 추가하면 기준 조상이 바뀔 수 있다. 코드의 실행 결과를 검증한 것은 아니다.

## 트레이드오프와 확인할 점

- 흐름 기반 레이아웃은 콘텐츠 크기 변경에 자연스럽게 대응한다. absolute는 겹침과 특정 기준 위치를 표현하기 쉽지만 크기와 충돌을 직접 관리한다.
- negative offset으로 밖에 보이는 UI의 터치 영역은 별개다. 부모 경계를 넘는 터치를 기대하지 않는다.
- 순서, offset, 기준 조상 문제를 분리해서 확인한다. 공식 position Snack에서 세 모드를 바꾸며 형제의 자리와 보이는 위치를 비교한다.

## 출처

- [React Native 0.87, Layout with Flexbox](https://reactnative.dev/docs/flexbox)

## 관련 문서

- [[RN-Flexbox|흐름 기반 배치]]
- [[RN-Dimensions|부모 크기 확보]]
- [[RN-Image-Loading|이미지 위에 콘텐츠 배치]]
