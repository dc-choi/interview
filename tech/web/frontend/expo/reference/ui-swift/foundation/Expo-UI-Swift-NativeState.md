---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI useNativeState, UI thread binding"]
---

# Expo SwiftUI useNativeState, UI thread binding

`useNativeState<T>(initialValue)`는 ObservableState<T>를 반환한다. 값은 첫 render에서 한 번만 캡처하며 unmount 때 자동 정리한다. native SwiftUI ObservableObject에 연결되어 React render cycle 없이 view가 변경을 관찰한다. hook 자체는 worklets 없이 동작하지만 UI thread의 동기 갱신 예제에는 `react-native-worklets` runtime이 필요하다.

## 값 읽기와 쓰기

ObservableState는 SharedObject다. value 또는 get()/set(value)로 읽고 쓴다. **React Compiler에서는 value 직접 접근 대신 get/set을 사용한다**. UI worklet의 write는 동기적이며 즉시 읽을 수 있다. JS thread write는 UI thread에 비동기로 예약되므로 바로 읽은 값이 아직 이전 값일 수 있다.

onChange는 단일 worklet listener 또는 null이다. 할당하면 이전 listener를 대체하고 초기 값은 callback을 발생시키지 않는다. effect에서 연결하고 cleanup에서 null로 해제한다. callback은 native UI runtime에서 실행되므로 JS thread용 임의 함수를 그대로 호출하지 않는다.

```tsx
import { useEffect } from 'react';
import { Host, TextField, useNativeState } from '@expo/ui/swift-ui';
export function UppercaseInput() {
  const text = useNativeState('');
  useEffect(() => {
    text.onChange = value => { 'worklet'; /* UI runtime 반응 */ };
    return () => { text.onChange = null; };
  }, [text]);
  return <Host style={{ width: 280, height: 60 }}><TextField text={text}
    onTextChange={value => {
      'worklet';
      const next = value.toUpperCase();
      if (next !== value) text.set(next);
    }} /></Host>;
}
```

TextField의 text와 selection `{ start, end }`에 native state를 함께 연결하면 입력 형식과 cursor를 UI thread에서 즉시 보정할 수 있다. 원문 phone mask 예제는 cursor를 끝으로 이동하는 데모다. 실제 mask는 중간 편집/삭제 위치도 보정해야 한다. 특정 scrollPosition binding은 JS write가 Main Thread Checker를 발생시킬 수 있다고 별도로 명시하므로 [[Expo-UI-Swift-ScrollView]]처럼 scheduleOnUI/worklet에서 갱신한다.

## 출처

- [Expo Documentation, useNativeState](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
