---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI DisclosureGroup, 펼침 상태"]
---

# Expo SwiftUI DisclosureGroup, 펼침 상태

iOS/Expo Go의 chevron disclosure control이다. label 문자열 또는 DisclosureGroup.Label의 custom SwiftUI content를 쓰고 children ReactNode가 펼침 content다. isExpanded와 onIsExpandedChange(boolean)를 연결하여 앱에서 상태를 유지한다. 초기 true이면 처음부터 펼친다.

```tsx
import { useState } from 'react';
import { Host, Form, DisclosureGroup, Text } from '@expo/ui/swift-ui';
export function AdvancedSettings() {
  const [expanded, setExpanded] = useState(false);
  return <Host style={{ flex: 1 }}><Form>
    <DisclosureGroup isExpanded={expanded} onIsExpandedChange={setExpanded}>
      <DisclosureGroup.Label><Text>추가 설정</Text></DisclosureGroup.Label>
      <Text>자동 갱신</Text><Text>네트워크 제한</Text>
    </DisclosureGroup>
  </Form></Host>;
}
```

Form 안에서 표준 iOS list style을 받는 패턴이 일반적이다. 단독 view도 폭을 채우므로 matchContents만 쓰면 collapse할 수 있다. CommonViewModifierProps를 상속한다. 펼침 상태로 content를 보이거나 숨기는 기능이며 별도 lazy loading/네트워크 요청을 자동 수행하지 않는다. sidebar Section의 collapsible 기능과 플랫폼 조건을 혼동하지 않는다.

## 출처

- [Expo Documentation, DisclosureGroup](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/disclosuregroup)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
