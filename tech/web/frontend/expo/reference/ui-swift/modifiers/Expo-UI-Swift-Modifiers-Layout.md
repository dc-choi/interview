---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, layout과 shape"]
---

# Expo SwiftUI modifier, layout과 shape

모든 함수는 별도 표시가 없으면 iOS/tvOS의 ModifierConfig다. Host style은 React Native 경계의 크기를, 아래 modifier는 SwiftUI view의 크기와 배치를 정한다.

## 크기와 spacing

| 함수 | 입력과 동작 |
| --- | --- |
| frame(params) | width/height, min/max/ideal width/height, alignment. 가용 공간을 채우는 maxWidth/maxHeight Infinity 예제도 있다 |
| padding(params?) | all/horizontal/vertical 또는 top/bottom/leading/trailing 값 |
| fixedSize({horizontal,vertical}?) | 지정 축의 ideal size 사용. scroll 축에 적용하면 viewport 대신 전체 content 크기가 되어 scroll이 사라질 수 있다 |
| aspectRatio({ratio,contentMode}) | width/height 비율과 fit/fill |
| layoutPriority(number) | view의 공간 배분 priority |
| containerRelativeFrame(params) | iOS/tvOS17+, 가까운 container 기준 axes(vertical/horizontal/both), count/span/spacing/alignment |
| ignoreSafeArea(params?) | regions container/all/keyboard와 edges top/bottom/vertical/horizontal/leading/trailing/all |

alignment는 center/top/bottom/leading/trailing/topLeading/topTrailing/bottomLeading/bottomTrailing이다. leading/trailing은 locale 방향과 맞춰 사용한다. content 크기가 없는 flexible control은 Host matchContents 대신 frame 또는 유한한 Host 폭을 제공한다.

## Transform과 순서

`offset({x,y})`는 위치 이동, `scaleEffect(number | {x,y})`는 균일 또는 축별 확대, `rotationEffect(degrees)`는 회전이다. `rotation3DEffect({angle,axis:{x,y,z},perspective})`는 3D 회전과 원근을 지정한다. zIndex(number)는 표시 순서를 설정한다. 표시 transform과 원래 layout 공간을 같은 크기 측정으로 추정하지 않는다.

## Shape와 clip

shapes builders는 roundedRectangle({cornerRadius}), capsule(), rectangle(), ellipse(), circle(), containerRelativeShape()다. containerShape(Shape)는 enclosing shape를, contentShape(Shape)는 hit-test 영역을 설정한다. clipped(boolean=true)는 bounds에 자르고 clipShape(shape, cornerRadius?)는 지정 모양으로 자른다. shape 이름은 circle/ellipse/roundedRectangle/capsule/rectangle/containerRelativeShape이며 roundedRectangle 기본 radius8이다. mask(shape,cornerRadius?)도 같은 shape 집합과 기본 radius8을 사용한다.

```tsx
import { Host, Text } from '@expo/ui/swift-ui';
import { padding, frame, background, shapes, clipShape } from '@expo/ui/swift-ui/modifiers';
export function CardTitle() {
  return <Host matchContents><Text modifiers={[
    padding({ all: 16 }), frame({ width: 240 }),
    background('#E5E5EA', shapes.roundedRectangle({ cornerRadius: 12 })),
    clipShape('roundedRectangle', 12),
  ]}>카드 제목</Text></Host>;
}
```

padding 이전/이후의 background는 서로 다른 면적을 덮는다. modifier 배열 순서를 화면의 원하는 크기와 모양에 맞춘다.

## Grid와 alignment guide

gridCellAnchor는 iOS16+에서 `{type:'preset',anchor}` 또는 `{type:'custom',points:{x,y}}`로 cell 내 기준점을 지정한다. preset은 위 alignment와 zero다. gridColumnAlignment(center/leading/trailing)는 iOS16+이며 같은 column의 모든 cell alignment를 변경한다. gridCellColumns(count?)는 column span, gridCellUnsizedAxes(vertical/horizontal?)는 flexible Spacer/Divider 등이 grid 크기를 결정하지 않도록 해당 축의 extra size 요청을 막는다.

alignmentGuide(guide,value)는 leading edge에서 points 위치를 지정한다. center/leading/trailing과 listRowSeparatorLeading/Trailing이 가능하며 separator guide는 **tvOS에서 no-op**이다. row에 Image가 있을 때와 다른 leading content가 있을 때 separator offset을 맞추는 데 쓴다. geometryGroup()은 iOS/tvOS17+에서 부모와 view geometry를 분리하여 조건부 sibling 변화의 위치/크기 animation을 다룬다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
