---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI SwipeActions, leading과 trailing"]
---

# Expo SwiftUI SwipeActions, leading과 trailing

iOS/Expo Go의 row content에 native swipe action을 적용한다. non-slot child가 실제 row, `SwipeActions.Actions` slot이 드러나는 Button 그룹이다. Actions의 edge는 leading/trailing이며 양쪽을 함께 선언할 수 있다. allowsFullSwipe={false}는 긴 swipe만으로 action이 실행되는 것을 막는 예제로 제공된다. generated 페이지는 기본값을 명시하지 않는다.

```tsx
import { Host, List, SwipeActions, Button, Text } from '@expo/ui/swift-ui';
export function SwipeRow() {
  return <Host style={{ flex: 1 }}><List><SwipeActions>
    <Text>저장된 항목</Text>
    <SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
      <Button label="고정" systemImage="pin" onPress={pin} />
    </SwipeActions.Actions>
    <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
      <Button label="삭제" role="destructive" systemImage="trash" onPress={confirmDelete} />
    </SwipeActions.Actions>
  </SwipeActions></List></Host>;
}
```

부모는 children과 CommonViewModifierProps를 상속한다. action callback에서 앱 데이터를 실제 갱신해야 하며 swipe UI 자체가 데이터 삭제를 자동 수행하지 않는다. 재확인이 필요한 destructive operation은 full swipe를 제한하고 확인 dialog를 연결할 수 있다. leading/trailing은 locale 방향을 고려한 edge다.

## 출처

- [Expo Documentation, SwipeActions](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/swipeactions)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
