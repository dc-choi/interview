---
tags: [react-native, mobile, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Animated.Value와 ValueXY

React Native 0.87 기준. 하나의 `Animated.Value`가 여러 출력 속성을 동기화할 수 있지만 동시에 구동하는 방식은 하나다. 새 animation을 시작하거나 `setValue`를 호출하면 기존 구동을 중단한다. scalar 값은 `useAnimatedValue(initial)`로 유지할 수 있고 class에서는 `new Animated.Value(initial)`를 쓴다.

## base와 offset

출력은 base 값과 offset의 합이다. drag를 여러 번 이어서 수행할 때 이전 위치를 offset에 보존하고 이번 이동 거리를 base에 넣는 방식이다.

| 메서드 | 의미 |
|---|---|
| setValue(value) | base 변경, 진행 animation 중단, 연결 출력 갱신 |
| setOffset(offset) | base 위에 더할 offset 설정 |
| flattenOffset() | offset을 base에 합치고 offset을 0으로, 출력은 동일 |
| extractOffset() | base를 offset으로 옮기고 base를 0으로, 출력은 동일 |

`ValueXY`는 내부의 두 Value를 `x`, `y`로 노출하며 `setValue({x, y})`, `setOffset({x, y})`를 받는다. flatten/extract도 두 축에 적용된다. 좌표를 화면 위치와 gesture 누적 거리 중 어느 것으로 쓰는지 먼저 결정한다.

## 관찰과 중단

| 메서드 | 수명과 반환 |
|---|---|
| addListener(callback) | 비동기 관찰, 삭제에 사용할 문자열 ID 반환 |
| removeListener(id) | 해당 listener 정리 |
| removeAllListeners() | 해당 값의 모든 listener 정리 |
| stopAnimation(callback?) | 구동 중단 후 최종값 전달 |
| resetAnimation(callback?) | 중단 후 초기값으로 되돌리고 초기값 전달 |

scalar callback은 `{value}`를 받고 ValueXY 관찰 callback은 `{x, y}`를 받는다. stop/reset callback은 scalar 숫자 또는 좌표 객체를 받는다. native 구동 값의 최신 상태를 동기적으로 읽을 수 있다고 가정하지 않는다. 다른 소비자가 붙인 listener까지 지우지 않도록 자신이 등록한 ID를 정리한다.

## interpolation과 스타일 변환

`interpolate({inputRange, outputRange})`는 숫자 또는 문자열 출력으로 매핑한다. easing을 지정할 수 있으며 `extrapolate`, `extrapolateLeft`, `extrapolateRight`는 `extend`, `identity`, `clamp`를 받는다. identity는 범위 밖 입력을 그대로 출력하는 정책이고 clamp는 경계값으로 제한한다.

`ValueXY.getLayout()`은 `{left: x, top: y}`를 반환한다. `getTranslateTransform()`은 `[{translateX: x}, {translateY: y}]`를 반환한다. 전자는 layout 위치, 후자는 시각적 transform이므로 같은 driver 지원 범위를 기대하지 않는다. 공식 ValueXY 예제의 left/top과 native spring 조합을 그대로 복사하지 않고 [[RN-Animated-Interaction|driver 제약]]을 대조한다.

`Value.animate(animation, callback)`은 보통 내부 구동이나 custom Animation 구현에 사용하는 낮은 수준 API다. 일반 UI는 timing/spring/decay와 선언된 출력 관계를 먼저 사용한다.

## 출처

- [React Native 0.87, animatedvalue](https://reactnative.dev/docs/animatedvalue)
- [React Native 0.87, animatedvaluexy](https://reactnative.dev/docs/animatedvaluexy)

## 관련 문서

- [[RN-Animated]]
- [[RN-Animated-Interaction]]
- [[RN-Pan-Responder]]
