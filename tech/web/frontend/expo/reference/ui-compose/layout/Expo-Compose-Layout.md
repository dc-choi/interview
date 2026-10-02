---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Box, Row, Column과 FlowRow"]
---

# Compose Box, Row, Column과 FlowRow



## 기본 컨테이너

Box는 자식을 겹쳐 쌓고 `contentAlignment`로 위치를 정한다. 선택적 children과 `floatingToolbarExitAlwaysScrollBehavior`, 기본 컴포넌트 속성을 받는다. 200×200 크기 안의 가운데 정렬처럼 경계를 먼저 정하고 그 안에 배치한다.

Row는 수평, Column은 수직으로 자식을 배열한다. 두 컴포넌트는 선택적 children과 정렬, 간격 속성을 제공한다. 주로 Row의 `horizontalArrangement`/`verticalAlignment`, Column의 `verticalArrangement`/`horizontalAlignment`를 사용한다. arrangement는 주축의 분배와 간격, alignment는 교차축 위치다.

```tsx
<Row horizontalArrangement={{ spacedBy: 12 }} verticalAlignment="center"
  modifiers={[fillMaxWidth()]}>
  <Text>앞</Text><Spacer modifiers={[weight(1)]} /><Text>뒤</Text>
</Row>
```

spaceEvenly/spaceBetween 같은 간격 방식 또는 `{spacedBy:number}` dp 간격을 지정한다. 원문에 타입 이름만 표시된 정렬 리터럴은 설치된 타입을 확인한다. RN flexbox style 대신 fillMaxWidth/height/padding/weight modifier로 내부 레이아웃을 정한다.

FlowRow는 가용 너비가 모자라면 다음 줄로 넘긴다. children, horizontalArrangement/verticalArrangement와 기본 속성을 받는다. 태그나 Chip을 나열할 때 가로/세로 간격을 별도로 정하고 안정적인 key를 사용한다. Row에는 자동 줄바꿈이 없다.

## 여백과 구분선

Spacer의 고유 속성은 선택적 modifiers다. width/height로 고정 간격을 만들거나 Row/Column 안에서 weight(1)로 남은 공간을 비례 배분한다. weight가 배분할 유한한 공간이 필요하다. Universal Spacer의 size/flexible props와 구분한다.

HorizontalDivider/VerticalDivider는 modifiers, 선택적 color(ColorValue), thickness(number dp)를 받는다. 얇은 선은 StyleSheet.hairlineWidth, 두꺼운 선은 thickness로 정한다. 세로선은 높이가 정해진 Row 등 유한한 높이를 확보한다. 구분선은 영역을 나누는 표현이며 선택 상태를 만들지는 않는다.

## 출처

- [Expo Documentation, Box](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/box)
- [Expo Documentation, Row](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/row)
- [Expo Documentation, Column](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/column)
- [Expo Documentation, FlowRow](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/flowrow)
- [Expo Documentation, Spacer](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/spacer)
- [Expo Documentation, Divider](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/divider)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Compose-Modifiers-Layout]]
- [[Expo-Compose-Chips]]
