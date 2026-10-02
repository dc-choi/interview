---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI List, selection과 편집"]
---

# Expo SwiftUI List, selection과 편집

iOS/tvOS, Expo Go의 native List다. children ReactNode, selection `(string | number)[]`, onSelectionChange(선택 tag 배열)를 받는다. 각 row에 tag를 적용하여 선택과 데이터 ID를 연결한다. React가 모든 row를 upfront 생성하므로 큰 목록의 lazy JS rendering을 보장하지 않는다. 공식 문서는 큰 목록에 FlashList/Legend List를 권한다.

## Style과 viewport

listStyle은 automatic/plain/inset/insetGrouped/grouped/sidebar다. **inset/insetGrouped/sidebar는 tvOS 미지원**이다. Section과 Label로 heading/icon을 구성한다. Host에 유한한 크기를 제공하고 scroll axis matchContents를 피한다.

## List.ForEach 편집 계약

List의 child로 `List.ForEach`를 넣으면 삭제/reorder callback을 연결할 수 있다. onDelete(number[] indices), onMove(sourceIndices:number[], destination:number)는 앱 데이터 배열을 직접 변경하지 않는다. 앱이 callback으로 새 배열을 저장한다. environment('editMode', active/inactive/transient), tag, moveDisabled/deleteDisabled를 조합한다. 원문 move 예제는 첫 source index 하나만 처리하므로 다중 이동에 그대로 적용하지 않는다.

```tsx
import { useState } from 'react';
import { Host, List, Label } from '@expo/ui/swift-ui';
import { environment, tag } from '@expo/ui/swift-ui/modifiers';
export function EditableItems() {
  const [items, setItems] = useState([{ id: 'a', title: '첫 항목' },
    { id: 'b', title: '둘째 항목' }]);
  const [selection, setSelection] = useState<(string | number)[]>([]);
  return <Host style={{ flex: 1 }}><List selection={selection}
    onSelectionChange={setSelection} modifiers={[environment('editMode', 'active')]}>
    <List.ForEach onDelete={indices => setItems(prev =>
      prev.filter((_, index) => !indices.includes(index)))}>
      {items.map(item => <Label key={item.id} title={item.title}
        modifiers={[tag(item.id)]} />)}
    </List.ForEach>
  </List></Host>;
}
```

## Row와 scrolling

listRowBackground, listRowSeparator(hidden/visible, edges), listRowSeparatorTint, listRowInsets는 개별 row appearance를 바꾼다. alignmentGuide('listRowSeparatorLeading', points)는 separator 시작 위치를 정한다. headerProminence('increased')는 header를 강조한다. scrollDismissesKeyboard('interactively')로 scroll 중 keyboard dismissal을 조정하고 refreshable(async handler)로 갱신한다. List와 List.ForEach 모두 CommonViewModifierProps를 상속한다. style/row/scroll modifier의 세부 OS 조건은 [[Expo-UI-Swift-Modifiers-Scrolling]]에 연결한다.

## 출처

- [Expo Documentation, List](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/list)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
