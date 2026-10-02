---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Text, nested style과 live timer"]
---

# Expo SwiftUI Text, nested style과 live timer

iOS/tvOS, Expo Go의 native Text다. children은 문자열 또는 nested Text이고 CommonViewModifierProps를 상속한다. 전체 view는 font/foregroundStyle/lineLimit 등 modifier로 꾸민다.

## 문장 일부와 font

nested Text는 SwiftUI Text concatenation으로 구현되어 **Text를 반환하는 modifier만 해당 segment에 적용된다**. bold/italic/font/foregroundColor와 color foregroundStyle이 가능하다. 임의 layout/frame/background modifier가 inline segment를 별도 view처럼 꾸민다고 가정하지 않는다. 공백은 JSX에서 명시해 segment 사이의 문장을 보존한다.

font는 size, weight(ultraLight/light/regular/medium/semibold/bold/heavy/black 등), design(default/rounded/serif/monospaced), family를 지정한다. custom font는 expo-font로 실제 font를 먼저 load한다. lineLimit은 보이는 줄 수를 제한한다. secondary hierarchical foreground style은 환경에 맞춰 덜 강조된 텍스트를 표시한다.

```tsx
import { Host, Text } from '@expo/ui/swift-ui';
import { bold, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
export function Message() {
  return <Host matchContents><Text>새 항목이{' '}
    <Text modifiers={[bold(), foregroundStyle('blue')]}>3개</Text> 있습니다.
  </Text></Host>;
}
```

## Markdown과 날짜

markdownEnabled는 SwiftUI LocalizedStringKey의 Markdown 처리를 켠다. bold/italic/strikethrough/monospace/link 같은 표시를 지원하는 예제가 있으며 전체 Markdown 문서 renderer의 범위를 보장하는 것은 아니다.

date(Date)와 dateStyle(default date, timer/relative/offset/date/time)은 시간이 지나며 자동 갱신되는 날짜 표현이다. widgets/Live Activities에 적절하다. timerInterval `{ lower: Date, upper: Date }`, countsDown(default true), pauseTime(Date)는 **iOS/tvOS 16+**다. 구버전에서는 timer interval이 렌더링되지 않는다. countsDown=false는 count-up, pauseTime은 지정 시점에서 멈춘 모습이다. timer 표시가 실제 background 작업이나 JS timer를 유지한다는 의미는 아니다.

## 출처

- [Expo Documentation, Text](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/text)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
