---
tags: [react-native, mobile, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native PanResponder의 gesture 상태

React Native 0.87 `PanResponder.create(config)`는 responder 이벤트에 여러 손가락을 종합한 gestureState를 더하고 `panHandlers`를 반환한다. 결과를 View에 spread한다. 기본 interaction handle은 긴 JS 작업이 진행 중 gesture를 방해하는 것을 줄이는 목적이며 모든 JS 작업을 자동으로 background 실행하지 않는다.

## gestureState의 좌표와 수명

| 필드 | 의미 |
|---|---|
| stateID | 화면에 하나 이상의 터치가 남는 동안 유지되는 gesture ID |
| x0, y0 | responder를 획득한 화면 좌표 |
| moveX, moveY | 최근 이동한 터치의 화면 좌표 |
| dx, dy | 터치 시작 이후 누적 이동 거리, grant 때 0 |
| vx, vy | 현재 gesture 속도 |
| numberActiveTouches | 현재 활성 터치 수 |

handler는 `(event, gestureState)`를 받고 event의 nativeEvent는 [[RN-Touch-Event-Types|PressEvent]] 형태다. page 좌표와 local 좌표, 시작점과 누적 거리를 섞지 않는다. responder를 얻기 전에는 해당 노드에 전달된 start/end만 반영되므로 numberActiveTouches가 완전히 정확하다고 가정하지 않는다.

## 요청, 진행과 종료

Start/MoveShouldSetPanResponder와 각각의 Capture 콜백은 소유권을 요청한다. Grant/Reject는 획득과 실패, Start/End는 터치 수 변화, Move는 이동, Release는 정상 종료, Terminate는 소유권 상실을 처리한다. TerminationRequest는 이양 허용 여부를 반환한다. capture에서 gestureState를 갱신한 뒤 bubble에서도 그 상태를 사용할 수 있다.

`onShouldBlockNativeResponder`는 native 요소가 responder가 되는 것을 막을지 정하며 Android에서만 지원한다. 기본 true이고 부모 스크롤과 경쟁하는 drag는 항상 true를 반환하는 요청 콜백보다 실제 이동 조건으로 소유권을 좁히는 것이 적합하다.

## Animated 연결과 연속 drag

`Animated.event([null, {dx: pan.x, dy: pan.y}], {useNativeDriver: false})`는 두 번째 handler 인자의 이동 거리를 ValueXY에 연결한다. PanResponder 매핑은 native driver용 직접 이벤트가 아니다.

Release에 `pan.extractOffset()`를 호출하면 현재 base를 offset으로 옮기고 base를 0으로 만든다. 다음 gesture의 0부터 시작하는 dx/dy를 이전 위치에 더할 수 있다. 원점 복귀 animation과 위치 보존은 서로 다른 제품 동작이다. Terminate에서도 취소 상태와 출력 정리를 설계한다. JS driver와 native driver를 같은 값에서 섞지 않는 조건은 [[RN-Animated-Interaction]]에서 확인한다.

화면에 다른 손가락을 추가하거나 부모가 스크롤을 가져가는 경우, OS가 gesture를 중단하는 경우까지 기기에서 확인한다. 이 문서는 공식 코드의 연결 의미를 설명하며 실제 gesture를 실행한 결과가 아니다.

## 출처

- [React Native 0.87, panresponder](https://reactnative.dev/docs/panresponder)

## 관련 문서

- [[RN-Gesture-Responder]]
- [[RN-Animated-Values]]
- [[RN-Animated-Interaction]]
