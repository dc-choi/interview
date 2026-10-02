---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Animated 제스처와 native driver

React Native 0.87 기준. `Animated.event`는 이벤트의 중첩 값을 Animated 값에 매핑한다. native driver는 지원되는 관계를 실행 전에 네이티브로 전달해 UI 스레드에서 실행하도록 한다.

## ScrollView 직접 이벤트

```tsx
import {useRef} from 'react';
import {Animated, Text} from 'react-native';

export const ScrollingFade = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = scrollY.interpolate({
    inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp',
  });
  return (
    <Animated.ScrollView scrollEventThrottle={16}
      onScroll={Animated.event(
        [{nativeEvent: {contentOffset: {y: scrollY}}}],
        {useNativeDriver: true},
      )}>
      <Animated.Text style={{opacity}}>스크롤하면 사라짐</Animated.Text>
      <Text style={{height: 800}}>스크롤 공간</Text>
    </Animated.ScrollView>
  );
};
```

첫 배열은 이벤트 핸들러의 인자 배열에 대응하고 그 안의 객체는 `event.nativeEvent.contentOffset.y` 구조를 따른다. 직접 onScroll 매핑은 native driver에 적합하다. JS만으로 스크롤 값을 이어받는 경우 비동기 경계로 gesture보다 한 프레임 늦을 수 있다.

## PanResponder와 ValueXY

PanResponder의 핸들러는 event와 gestureState를 받는다. 첫 인자를 무시하려면 `null`을 두고 두 번째 인자의 dx, dy를 매핑한다.

```tsx
import {useRef} from 'react';
import {Animated, PanResponder} from 'react-native';

export const DragBox = () => {
  const pan = useRef(new Animated.ValueXY()).current;
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}],
      {useNativeDriver: false}),
    onPanResponderRelease: () => {
      Animated.spring(pan, {toValue: {x: 0, y: 0}, useNativeDriver: false}).start();
    },
    onPanResponderTerminate: () => pan.setValue({x: 0, y: 0}),
  })).current;
  return <Animated.View {...responder.panHandlers}
    style={{width: 100, height: 100, backgroundColor: 'skyblue',
      transform: [{translateX: pan.x}, {translateY: pan.y}]}} />;
};
```

PanResponder 이벤트는 native Animated.event가 지원하는 direct event가 아니므로 이 예제는 false를 유지한다. 공식 drag Snack에는 이동 false, 복귀 spring true가 함께 나오지만 가이드의 동일 값은 하나의 driver를 일관되게 사용하라는 제한과 구분해야 한다. 위 예제는 일관성을 위한 재구성이며 실행 검증된 교정 결과는 아니다.

## native driver의 계약

`useNativeDriver`는 명시한다. 생략하면 역사적 기본값 false와 경고, TypeScript의 타입 오류 조건이 있으므로 생략에 기대지 않는다. 한 값을 native driver로 시작했다면 그 값의 다른 animation도 같은 driver를 사용해야 한다.

| 동작 | 가이드의 지원 조건 |
|---|---|
| transform, opacity | native driver에서 지원하는 비레이아웃 속성 예 |
| Flexbox, position | native driver의 레이아웃 지원 범위 밖 |
| ScrollView onScroll | direct event 매핑 가능 |
| PanResponder Animated.event | bubbling 계열이므로 native event 매핑 불가 |

native driver로 시작한 애니메이션은 JS 스레드가 막혀도 UI 실행을 계속할 수 있다. 애니메이션 준비, 화면 렌더링과 다른 JS 작업 전체를 없애는 기능은 아니다.

## carousel 예제의 읽기 주의

공식 carousel Snack은 horizontal, pagingEnabled ScrollView, 현재 화면 너비, 스크롤 offset으로 indicator를 계산하는 패턴을 보여 준다. 각 index 앞뒤 페이지를 inputRange로 두고 `[8, 16, 8]`로 indicator width를 보간한다.

그러나 이 width는 레이아웃 속성이다. native driver 제한을 무시하고 width 변화가 정상 작동한다고 단정하지 않는다. native driver를 사용할 출력은 `scale` 같은 transform으로 표현하거나 필요한 출력에 맞는 driver를 선택하고 실제 기기 결과를 확인한다. 이 문서의 예제는 opacity를 출력으로 선택했다.

## 목록, 3D transform과 성능

긴 animation이나 loop는 VirtualizedList의 추가 행 렌더링을 막을 수 있다. 필요한 경우 animation config의 `isInteraction: false`로 해당 상호작용 대기 영향을 줄인다.

Android의 `rotateX`, `rotateY` 등 3D transform은 `perspective`를 함께 설정하지 않으면 렌더링되지 않는 사례가 있다.

```tsx
const transform = [{rotateY: '45deg'}, {perspective: 1000}];
```

requestAnimationFrame은 다음 repaint 전에 callback을 실행하는 기반 API다. 보통 Animated가 프레임 갱신을 맡으므로 직접 루프를 만들 필요가 없다. 프레임 저하는 FPS Monitor로 관찰하고 JS의 무거운 작업은 필요한 경우 requestIdleCallback으로 뒤로 미룬다. setNativeProps는 네이티브 backed 요소의 직접 변경 수단이지만 React 상태와의 일관성까지 자동으로 해결하지 않는다.

## 확인할 점

scroll 직접 이벤트와 PanResponder를 구분하고, 출력 속성이 layout인지 transform인지, 하나의 값에서 driver가 섞이는지 확인한다. 목록을 스크롤하며 loop, Android 3D transform, 중단 뒤 상태 정리를 함께 확인한다. 실행 환경에서 검증한 성능 수치는 없다.

## 이벤트 관찰과 낮은 수준 연결

`Animated.event(mapping, {useNativeDriver, listener})`의 listener는 선택적인 비동기 JS 관찰 경로다. 매핑 자체에 필요한 값은 Animated 값을 직접 연결한다. Reference 개요의 `useNativeEvent` 표기는 메서드 설정 계약의 `useNativeDriver`와 다르므로 위 예제는 후자를 사용한다.

`forkEvent(event, listener)`는 props로 받은 Animated event를 관찰하는 JS listener를 추가한다. 일반 JS 함수이면 두 listener를 합치고 event가 없으면 새 listener를 사용한다. `unforkEvent(event, listener)`로 추가한 관찰을 해제한다. 내부 연결을 직접 다루는 `attachNativeEvent`보다 가능한 경우 `Animated.event(..., {useNativeDriver: true})`를 우선한다.

## 출처

- [React Native 0.87, Animations](https://reactnative.dev/docs/animations)

- [React Native 0.87, animated](https://reactnative.dev/docs/animated)

## 관련 문서

- [[RN-Animated|값, interpolation과 구성]]
- [[RN-Gesture-Responder|제스처 협상]]
- [[RN-LayoutAnimation|레이아웃을 바꾸는 애니메이션]]
- [[RN-Animated-Values]]
- [[RN-Pan-Responder]]
