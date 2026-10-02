---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Animated 값과 구성

React Native 0.87 기준. Animated는 입력 값과 출력 속성의 관계를 선언하고 시간에 따른 값 변화를 실행한다. 매 프레임 setState로 전체 컴포넌트를 다시 렌더하는 방식과 구분한다. 레이아웃 전체 변경은 [[RN-LayoutAnimation|LayoutAnimation]]의 별도 시스템이다.

## 값과 animatable 컴포넌트

`Animated.Value`는 애니메이션 값이고 View의 opacity나 transform 같은 출력에 연결한다. 리렌더마다 새 값을 만들지 않도록 useRef로 유지할 수 있다.

기본 wrapper는 `Animated.View`, `Text`, `Image`, `ScrollView`, `FlatList`, `SectionList`다. 별도 컴포넌트에는 `Animated.createAnimatedComponent()`를 검토한다.

```tsx
import {useEffect, useRef} from 'react';
import {Animated, Text} from 'react-native';

export const FadeIn = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1, duration: 1000, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return <Animated.View style={{opacity}}><Text>나타나는 콘텐츠</Text></Animated.View>;
};
```

초기 opacity는 0이고 마운트 후 1까지 변한다. 정리 함수는 이 문서의 예제 보완이다. 이 코드는 실행 검증 결과가 아니다.

## 시간과 물리적 움직임

| 실행 API | 표현 |
|---|---|
| Animated.timing | duration과 easing을 따른 변화 |
| Animated.spring | 목표값으로 스프링처럼 이동 |
| Animated.decay | 주어진 초기 속도에서 점차 감속 |

`timing`의 기본 easing은 easeInOut 형태다. `Easing.back()`, custom easing, duration, delay 등으로 동작을 바꿀 수 있다. 각 animation 종류가 받는 설정은 해당 API의 config 계약을 확인한다.

## 순서와 병렬 구성

```tsx
Animated.sequence([
  Animated.delay(200),
  Animated.timing(opacity, {toValue: 1, duration: 500, useNativeDriver: true}),
  Animated.parallel([
    Animated.spring(scale, {toValue: 1, useNativeDriver: true}),
    Animated.timing(rotation, {toValue: 360, useNativeDriver: true}),
  ]),
]).start();
```

위는 opacity, scale, rotation이 Animated.Value로 이미 정의된 상황의 구성 조각이다. sequence는 앞의 실행이 끝난 후 다음으로 이동하고 parallel은 함께 시작한다. 기본적으로 그룹의 애니메이션이 중단되면 다른 실행도 함께 중단되는 동작을 고려한다. `Animated.parallel(..., {stopTogether: false})`는 병렬 실행을 함께 멈추는 정책을 바꾸는 옵션이다.

공식 복합 예는 decay로 관성 이동 후 spring 복귀와 회전을 병렬로 묶는다. 연속 움직임이 끝났는지, 사용자가 다시 잡아 중단했는지를 구분해 구성한다.

## 값 연산과 interpolation

Animated 값은 add, multiply, divide, modulo 연산으로 결합할 수 있다. `Animated.divide(1, scale)`은 scale이 2일 때 역수 0.5를 얻는 관계다.

```tsx
const translateY = progress.interpolate({
  inputRange: [0, 1], outputRange: [150, 0], extrapolate: 'clamp',
});
const rotate = rotation.interpolate({
  inputRange: [0, 360], outputRange: ['0deg', '360deg'],
});
```

한 progress 값이 opacity와 translateY를 함께 구동할 수 있다. 문자열 outputRange는 degree처럼 단위가 있는 값과 색상 매핑을 표현할 수 있으나 모든 문자열 속성이 모든 driver에서 지원된다는 뜻은 아니다.

여러 구간을 지정하면 dead zone과 방향 반전을 만들 수 있다. 가이드의 `[-300, -100, 0, 100, 101] -> [300, 0, 1, 0, 0]`은 -100에서 0, 0에서 1, 100 이후에는 0인 구간을 만든다. 기본 extrapolation은 `extend`라 범위 밖에서도 관계를 연장한다. `extrapolate`, `extrapolateLeft`, `extrapolateRight`를 `clamp`로 설정하면 범위를 제한한다.

## 다른 값을 추적하기

toValue에 숫자 대신 다른 Animated 값을 넣으면 leader를 follower가 따라가게 할 수 있다. spring follower는 부드러운 추적, duration 0인 timing은 즉각적인 추적을 표현한다. 목표값에도 interpolation을 적용할 수 있다.

`Animated.ValueXY`는 x와 y의 Value를 묶고 도움 메서드를 제공한다. 2차원 drag를 scalar 값 하나에 억지로 넣지 않고 두 축의 관계를 유지하는 도구다.

## 현재 값 읽기의 제약

애니메이션이 네이티브에서 실행될 수 있으므로 동기적으로 최신 값을 읽는 모델을 기대하지 않는다.

- `value.stopAnimation(callback)`은 실행을 멈추고 최종값을 callback으로 전달한다. 제스처로 제어권을 넘길 때 유용하다.
- `value.addListener(callback)`은 실행 중 최근 값을 비동기로 전달한다. 몇 프레임 지연을 허용하는 큰 상태 전환에 사용할 수 있다.

listener로 매 프레임 JS 로직을 다시 무겁게 실행하면 직렬화된 애니메이션의 이점을 잃을 수 있다. 값의 관계는 선언적으로 만들고 관찰이 필요한 지점만 listener를 사용한다.

## 확인할 점

값의 수명, output 속성, 중단 정책, 범위 밖 extrapolation, driver의 지원 속성을 확인한다. 인터랙션과 native driver의 조건은 다음 문서로 이어진다.

## Reference의 실행 설정과 중단 계약

`timing`의 기본 duration은 500ms, delay는 0, easing은 `Easing.inOut(Easing.ease)`다. `decay`는 초기 velocity가 필수이며 기본 deceleration은 0.997이다. 각각 `useNativeDriver`를 명시하고 `isInteraction` 기본값 true의 목록 렌더링 영향을 고려한다.

`spring` 설정은 다음 세 계열 중 하나를 선택한다. 서로 다른 계열을 동시에 지정하지 않는다.

| 계열 | 기본값과 의미 |
|---|---|
| tension/friction | 40/7, 속도와 진동 특성 |
| speed/bounciness | 12/8, 속도와 튕김 정도 |
| stiffness/damping/mass | 100/10/1, 감쇠 조화 진동의 물리 계수 |

spring은 velocity(기본 0), overshootClamping(기본 false), restDisplacementThreshold와 restSpeedThreshold(각 0.001), delay를 받는다. 휴지 판정의 거리와 속도를 과도하게 낮추면 작은 움직임도 오래 지속될 수 있다.

animation 객체의 `start(({finished}) => ...)`는 정상 종료 때 true, stop이나 다른 구동에 의해 중단되면 false를 전달한다. 완료 callback을 항상 성공 처리로 연결하지 않는다. `stop()`은 멈추고 `reset()`은 멈춘 뒤 초기값으로 되돌린다.

`sequence`는 실행 중 항목이 중단되면 뒤 항목을 시작하지 않는다. `stagger(delay, animations)`는 일정 간격으로 시작해 서로 겹칠 수 있다. `loop(animation, {iterations})`는 매 회 초기값으로 재시작하며 기본 iterations는 -1(무한)이다. 긴 loop의 자식에 `isInteraction: false`를 넣는 조건은 [[RN-Animated-Interaction]]에 연결한다.

`subtract(a, b)`는 차이를, `modulo(value, modulus)`는 음수가 아닌 나머지를 만든다. `diffClamp(value, min, max)`는 원래 절대값을 clamp하는 대신 직전 입력과의 차이를 누적하고 경계를 제한한다. 스크롤 방향이 바뀌면 입력이 아직 큰 값이어도 상단바를 다시 나타내는 데 쓸 수 있다. scalar와 ValueXY의 구동 설정은 해당 종류에 맞는 숫자 또는 좌표를 사용한다.

## 출처

- [React Native 0.87, Animations](https://reactnative.dev/docs/animations)

- [React Native 0.87, animated](https://reactnative.dev/docs/animated)

## 관련 문서

- [[RN-Animated-Interaction|gesture 매핑과 native driver]]
- [[RN-LayoutAnimation|레이아웃 변경 애니메이션]]
- [[RN-Animated-Values]]
- [[RN-Easing]]
