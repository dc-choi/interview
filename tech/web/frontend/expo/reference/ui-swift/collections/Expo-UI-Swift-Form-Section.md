---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Form과 Section"]
---

# Expo SwiftUI Form과 Section

## Form

iOS/tvOS, Expo Go의 입력 control container다. children ReactNode와 CommonViewModifierProps를 받으며 settings/inspection 화면을 구성한다. Host flex:1/명시적 viewport를 제공하고 scroll axis에 matchContents를 지정하지 않는다. scrollContentBackground('hidden') 뒤 background(color)를 적용하여 기본 배경을 바꾸고, iOS/tvOS 16+ scrollDisabled()로 scroll을 막을 수 있다. refreshable(async handler)는 Promise 종료까지 pull-to-refresh를 유지한다.

## Section

List/Form/Picker 안에서 관련 content를 묶는다. title은 간단한 header 문자열이고 **title이 있으면 custom header/footer props를 사용하지 않는다**. custom header와 footer는 ReactNode로 제공한다. CommonViewModifierProps를 상속한다.

isExpanded와 onIsExpandedChange를 지정하면 collapsible section이고 iOS/tvOS 17+ 및 sidebar list style이 필요하며 footer는 지원하지 않는다. 다만 List reference가 sidebar를 tvOS 미지원으로 명시하므로 tvOS collapsible Section을 실제 지원 경로로 단정하지 않는다. 해당 OS에서 선택한 style의 지원을 먼저 확인한다.

```tsx
import { useState } from 'react';
import { Host, Form, Section, Toggle, Text } from '@expo/ui/swift-ui';
export function Preferences() {
  const [enabled, setEnabled] = useState(false);
  return <Host style={{ flex: 1 }}><Form><Section
    header={<Text>알림 설정</Text>} footer={<Text>기기에 설정을 저장합니다</Text>}>
    <Toggle label="알림" isOn={enabled} onIsOnChange={setEnabled} />
  </Section></Form></Host>;
}
```

화면을 묶어 준다고 form validation/persistence가 자동 제공되지는 않는다. 선택과 입력 state, 저장 결과는 각 control callback과 앱 작업으로 관리한다.

## 출처

- [Expo Documentation, Form](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/form)
- [Expo Documentation, Section](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/section)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
