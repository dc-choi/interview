---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI Namespace, matched effect 식별"]
---

# Expo SwiftUI Namespace, matched effect 식별

iOS/tvOS와 Expo Go에서 SwiftUI Namespace를 children에 제공한다. id는 필수 문자열이며 React useId()로 안정적인 식별자를 만든다. 서로 연관된 animation/matched geometry effect가 같은 namespace를 공유한다. Namespace가 layout container처럼 새로운 방향이나 크기를 설정하지는 않는다.

```tsx
import { useId } from 'react';
import { Host, Namespace, GlassEffectContainer, Image } from '@expo/ui/swift-ui';
import { glassEffect, glassEffectId } from '@expo/ui/swift-ui/modifiers';
export function GlassTool() {
  const namespace = useId();
  return <Host matchContents><Namespace id={namespace}><GlassEffectContainer>
    <Image systemName="paintbrush.fill" modifiers={[
      glassEffect({ glass: { variant: 'clear' } }),
      glassEffectId('paintbrush', namespace),
    ]} />
  </GlassEffectContainer></Namespace></Host>;
}
```

Liquid Glass 예제는 해당 effect의 iOS26/Xcode26 조건을 따른다. GlassEffectContainer의 spacing, 각 view의 고유 glassEffectId, 동일 namespace, animation(Animation.spring(...), 변경값)을 함께 사용하여 추가/제거되는 도구 사이의 변화를 연결한다. 서로 다른 view에 같은 effect ID를 임의로 중복 부여하지 않는다. Namespace만으로 animation trigger나 지속 시간은 정해지지 않는다. 세부 옵션은 [[Expo-UI-Swift-Modifiers-Animation]]에 있다.

## 출처

- [Expo Documentation, Namespace](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/namespace)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
