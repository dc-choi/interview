---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Gauge와 ProgressView"]
---

# Expo SwiftUI Gauge와 ProgressView

## Gauge

iOS/Expo Go의 범위 값 표시 control이다. value(number)는 필수, min 기본0/max 기본1이다. children은 목적 label, currentValueLabel/minimumValueLabel/maximumValueLabel은 ReactNode다. gaugeStyle은 automatic/circular/circularCapacity/linear/linearCapacity이며 tint로 색을 지정한다. linear gauge는 가용 폭을 채우므로 Host width/flex가 필요하다.

## ProgressView

iOS/tvOS/Expo Go에서 value 0..1을 표시하며 **undefined이면 불확정 spinner**다. 타입은 number|null도 허용하지만 원문이 null의 의미는 명시하지 않으므로 불확정 상태에는 prop을 생략한다. children은 목적 label, progressViewStyle은 automatic/linear/circular다. determinate의 기본 linear 스타일은 고유 폭이 없어 Host matchContents만 쓰지 않는다. circular/spinner는 고유 크기를 가지므로 matchContents가 가능하다.

```tsx
import { Host, Gauge, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { gaugeStyle } from '@expo/ui/swift-ui/modifiers';
export function Status({ progress }: { progress?: number }) {
  return <Host style={{ width: 300, height: 140 }}><VStack spacing={12}>
    <Gauge value={70} min={0} max={100} currentValueLabel={<Text>70%</Text>}
      modifiers={[gaugeStyle('circularCapacity')]}><Text>사용량</Text></Gauge>
    <ProgressView value={progress}><Text>전송 중</Text></ProgressView>
  </VStack></Host>;
}
```

## Timer progress

iOS/tvOS 16+ ProgressView의 timerInterval은 lower/upper Date 범위를 시간에 맞춰 자동 표시한다. countsDown 기본 true는 시간이 흐르며 비워지고 false는 채워진다. tint를 적용할 수 있다. 실측 전송 진도와 시간 기반 시각화는 다르므로 timer를 실제 네트워크 완료율로 해석하지 않는다. 두 control 모두 CommonViewModifierProps를 상속한다.

## 출처

- [Expo Documentation, Gauge](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/gauge)
- [Expo Documentation, ProgressView](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/progressview)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
