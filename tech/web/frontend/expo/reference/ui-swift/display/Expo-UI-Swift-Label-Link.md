---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Label과 Link"]
---

# Expo SwiftUI Label과 Link

두 컴포넌트 모두 iOS/tvOS/Expo Go와 CommonViewModifierProps를 지원한다. `@expo/ui/swift-ui`에서 import하고 Host 안에서 사용한다.

## Label

title 문자열과 systemImage SF Symbol로 제목/icon을 표시한다. custom icon ReactNode는 systemImage보다 우선하고 children custom title은 title 문자열보다 우선한다. icon과 title에 VStack/HStack 등 SwiftUI view를 조합할 수 있다. color prop은 deprecated이므로 foregroundStyle modifier를 사용한다. `labelStyle('iconOnly')`여도 접근성을 위해 title을 제공한다.

## Link

destination URL 문자열이 필수다. 간단한 텍스트는 label, custom label은 ReactElement 또는 배열 children으로 구성한다. **plain string child는 지원하지 않으므로 Text로 감싼다**. SwiftUI Link는 URL을 여는 control이며 Expo Router의 route Link와 import/역할이 다르다.

```tsx
import { Host, Link, Label } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
export function DocsLink() {
  return <Host matchContents><Link destination="https://docs.expo.dev/">
    <Label title="공식 문서" systemImage="book"
      modifiers={[foregroundStyle('blue')]} />
  </Link></Host>;
}
```

앱 route로 이동하는 설정 행은 Expo Router Link asChild/Button 패턴을 별도로 사용한다. native URL opening을 route state/stack 관리와 같은 계약으로 보지 않는다.

## 출처

- [Expo Documentation, Label](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/label)
- [Expo Documentation, Link](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/link)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
