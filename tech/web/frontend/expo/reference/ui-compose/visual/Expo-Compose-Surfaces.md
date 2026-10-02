---
tags: [expo, react-native, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Card, Surface와 Shape geometry"]
---

# Card, Surface와 Shape geometry


## Card 변형

Card는 채운 표면, ElevatedCard는 그림자로 들어 올린 표면(기본 1dp), OutlinedCard는 윤곽선 표면이다. children/colors(containerColor/contentColor)/elevation/modifiers가 선택적이며 border는 Card와 OutlinedCard에만 있다. border width 기본은 1dp, color는 선택적이다. 같은 elevation이어도 ElevatedCard의 그림자와 Card의 색조 변화는 다르게 보일 수 있다.

```tsx
<OutlinedCard border={{ width: 2, color: '#6200EE' }}>
  <Text modifiers={[paddingAll(16)]}>상세 내용</Text>
</OutlinedCard>
```

원문 Card에 클릭 속성이 없으므로 행동은 지원되는 modifier 또는 클릭 가능한 Surface로 구성한다. 카드 모양만으로 행동 의미가 생기지는 않는다.

## Surface의 행동

Surface는 shape로 자르기, 색조 배경, 자식의 LocalContentColor를 제공한다. color 기본은 테마 surface, contentColor는 contentColorFor(color), tonalElevation/shadowElevation은 기본 0dp다. shape/border/children/modifiers와 enabled(기본 true)를 받으며 border 기본은 outline 색과 1dp다.

onClick만 주면 클릭, selected와 onClick이면 선택, checked와 onCheckedChange이면 토글 표면이다. 서로 다른 행동을 동시에 넣기 전에 설치된 계약을 확인한다. 선택값과 상태 갱신은 앱 책임이다. tonal elevation은 배경 색조, shadow elevation은 그림자 효과다.

## Shape의 도형과 단위

Shape.Circle은 radius/verticesCount, Rectangle은 cornerRounding/smoothing, Pill은 smoothing, Polygon은 verticesCount/cornerRounding/smoothing, RoundedCorner는 cornerRadii, Star/PillStar는 ShapeProps를 받는다. color/modifiers로 그릴 수 있고 Shape JSX를 Button/Surface의 shape에도 전달할 수 있다.

radius/innerRadius 기본 1과 cornerRounding 기본 0은 뷰의 짧은 변에 곱하는 비율이다. cornerRadii의 topStart/topEnd/bottomStart/bottomEnd는 dp라 단위가 다르다. smoothing은 0~1, verticesCount 기본은 6, Polygon은 3 이상이다. 별의 verticesCount는 각 반지름의 꼭짓점 수라 5면 총 10개 꼭짓점이다.

```tsx
<Shape.Star radius={1} innerRadius={0.4} verticesCount={5}
  color="gold" modifiers={[size(80, 80)]} />
```

Shape.parseJSXShape(shape)는 ShapeRecordProps를 반환하며 선택적 shape overload는 undefined도 반환한다. ShapeJSXElement는 NativeShapeProps의 ReactElement와 marker를 포함한다. 일반 코드는 공개 factory를 사용하고 내부 marker를 직접 만들지 않는다. 고정 경계, 비대칭 모서리와 RTL에서는 실제 렌더 결과를 확인한다.

## 출처

- [Expo Documentation, Card](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/card)
- [Expo Documentation, Surface](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/surface)
- [Expo Documentation, Shape](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/shape)

## 관련 문서

- [[Expo-Compose-Buttons]]
- [[Expo-Compose-Modifiers-Visual]]
