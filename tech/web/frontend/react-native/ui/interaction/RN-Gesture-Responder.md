---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native Gesture Responder System

React Native 0.87 기준. responder 시스템은 탭, 스크롤, 슬라이드 중 어떤 동작으로 해석할지와 어느 View가 입력을 소유할지를 협상한다. 터치 도중 소유자가 바뀌거나 동시에 여러 터치가 존재할 수 있다.

## 왜 협상이 필요한가

부모 스크롤 안의 자식 조작부가 처음에는 탭처럼 보이다가 이동 후 drag로 바뀔 수 있다. 모든 컴포넌트가 부모와 자식의 구현을 직접 알아야 한다면 재사용이 어렵다. responder 계약을 통해 터치의 관심과 소유권 이양을 표현한다.

일반 버튼에는 Touchable의 선언적 탭 계약을 먼저 사용한다. 직접 responder를 구현할 때도 입력 피드백과 중간 취소를 보장해야 한다.

## 소유권 요청과 획득

| 콜백 | 의미 |
|---|---|
| onStartShouldSetResponder | 터치 시작 때 소유하고 싶은지, boolean 반환 |
| onMoveShouldSetResponder | 소유자가 아닐 때 이동마다 소유하고 싶은지 |
| onResponderGrant | 요청이 수락되어 responder가 됨 |
| onResponderReject | 다른 소유자가 내놓지 않아 요청 거절 |

`true`를 반환한다고 바로 입력을 소유한다고 단정하지 않는다. 실제 획득은 Grant, 실패는 Reject로 구분한다.

## 획득 뒤 생명주기

| 콜백 | 처리해야 할 상황 |
|---|---|
| onResponderMove | 터치 이동에 따라 UI 갱신 |
| onResponderRelease | 정상 touchUp, 동작 확정 여부 판단 |
| onResponderTerminationRequest | 다른 요소에 소유권을 넘길지, true면 허용 |
| onResponderTerminate | 소유권을 잃음, 진행 중 표시와 상태 정리 |

OS가 iOS Control Center나 Notification Center를 열 때는 TerminationRequest 없이 responder를 가져갈 수 있다. Release만 정리 지점으로 사용하면 중단 뒤 UI가 눌린 상태에 남을 수 있다.

## bubbling과 capture

ShouldSet 핸들러는 가장 깊은 자식부터 bubbling한다. 여러 View가 true를 반환하면 자식이 우선하는 기본 동작이 버튼과 내부 조작부를 사용할 수 있게 한다.

부모가 먼저 가져가야 하면 `onStartShouldSetResponderCapture` 또는 `onMoveShouldSetResponderCapture`를 사용한다. capture는 bubbling보다 앞서 실행된다. 부모의 capture가 늘 true이면 자식의 버튼을 차단할 수 있으므로 필요한 조건으로 제한한다.

## 터치 이벤트 데이터

`evt.nativeEvent`에서 다음 정보를 읽는다.

| 필드 | 의미 |
|---|---|
| changedTouches | 마지막 이벤트 이후 바뀐 터치 배열 |
| touches | 현재 화면의 모든 터치 배열 |
| identifier | 터치 ID |
| locationX, locationY | 이벤트 요소 기준 위치 |
| pageX, pageY | 루트 요소 기준 위치 |
| target | 터치 수신 요소의 node ID |
| timestamp | 터치 시각, 속도 계산에 사용 가능 |

좌표 기준을 섞지 않고 다중 터치에서는 identifier로 구분한다. changedTouches가 현재 전체 터치를 뜻하지 않는다.

## 소유권 상태 표시 예제

```tsx
import {useState} from 'react';
import {Text, View} from 'react-native';

export const ResponderArea = () => {
  const [active, setActive] = useState(false);
  return (
    <View onStartShouldSetResponder={() => true}
      onResponderGrant={() => setActive(true)}
      onResponderTerminationRequest={() => true}
      onResponderRelease={() => setActive(false)}
      onResponderTerminate={() => setActive(false)}
      style={{width: 200, height: 100,
        backgroundColor: active ? 'skyblue' : 'powderblue'}}>
      <Text>{active ? '입력 처리 중' : '터치 영역'}</Text>
    </View>
  );
};
```

이 예제는 생명주기 표시를 보여 주며 완전한 버튼의 취소 판정이나 screen reader 동작을 구현하지 않는다. 일반 버튼에 복사해 사용하기보다 Release와 Terminate 모두 정리하는 흐름을 이해하는 용도다.

## PanResponder와 확인할 점

PanResponder는 이 시스템 위에서 더 높은 수준의 pan 해석을 제공한다. [[RN-Animated-Interaction|Animated와 gesture 연결]]에서 dx, dy를 ValueXY에 매핑하는 예를 볼 수 있다.

부모 스크롤과 자식 drag의 경쟁, capture의 자식 차단, 다른 요소의 소유권 요청, OS 강제 중단, 여러 손가락을 확인한다. 이 문서의 코드는 기기 실행 검증되지 않았다.

## 출처

- [React Native 0.87, Gesture Responder System](https://reactnative.dev/docs/gesture-responder-system)

## 관련 문서

- [[RN-Touches|일반 버튼과 Touchable]]
- [[RN-Animated-Interaction|pan과 scroll 애니메이션]]
