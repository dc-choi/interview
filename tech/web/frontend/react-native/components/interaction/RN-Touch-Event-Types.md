---
tags: [react-native, touch]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native press와 focus event의 좌표

callback의 React Native event에서 `nativeEvent`를 꺼낸 뒤 event 종류에 맞는 구조를 읽는다. PressEvent와 TargetEvent는 같은 값 모음이 아니다. React Native 0.87 기준이다.

## PressEvent

| field | 기준 |
|---|---|
| locationX/Y | touchable element 내부의 시작 좌표 |
| pageX/Y | root view 기준 시작 좌표 |
| identifier | touch 식별 숫자 |
| timestamp | event 발생 시점, millisecond |
| target | event 대상 node id, null/undefined 가능 |
| touches | 현재 screen의 touch 목록 |
| changedTouches | 이전 event 이후 바뀐 touch 목록 |
| force | iOS의 지원되는 pressure 값, 선택적 field |

```tsx
import type {GestureResponderEvent} from 'react-native';

const onPress = ({nativeEvent}: GestureResponderEvent) => {
  const {locationX, locationY, pageX, pageY} = nativeEvent;
  // 상대 좌표와 root 좌표를 목적에 맞게 사용한다.
};
```

문서의 PressEvent는 native event payload를 설명하는 이름이다. TypeScript callback에는 공개 export인 `GestureResponderEvent`를 사용하고 `nativeEvent`의 `NativeTouchEvent`를 읽는다. event 좌표를 layout의 x/y와 같다고 가정하거나, target 숫자를 영구 객체 식별자로 저장하지 않는다.

## TargetEvent

focus/blur callback에 전달되는 TargetEvent는 target을 가진다. press 좌표와 touches가 있다는 전제로 읽지 않는다. target은 nullable 계약이므로 native node가 있어야 하는 후속 작업에서 확인한다.

## 출처

- [React Native, PressEvent](https://reactnative.dev/docs/pressevent)
- [React Native, TargetEvent](https://reactnative.dev/docs/targetevent)
- [React Native v0.87.0, Core event type declarations](https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/Libraries/Types/CoreEventTypes.d.ts)

## 관련 문서

- [[RN-Pressable]]
- [[RN-Text-Input]]
- [[RN-Gesture-Responder]]
