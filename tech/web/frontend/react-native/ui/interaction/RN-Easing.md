---
tags: [react-native, mobile, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Easing 곡선

React Native 0.87 `Easing`은 정규화된 시간 t에 따른 진행 정도를 계산하는 함수다. `Animated.timing`의 duration은 전체 시간이고 easing은 그 안에서 속도가 바뀌는 모양이다. 탄성 곡선이 있다고 실제 spring의 velocity 추적과 물리 모델이 생기는 것은 아니다.

## 함수 선택

| 함수 | 진행의 모양 |
|---|---|
| linear(t) | t와 출력이 같음 |
| quad(t), cubic(t) | t², t³ |
| poly(n) | tⁿ 곡선을 반환 |
| sin, circle, exp | 사인, 원, 지수 기반 곡선 |
| ease | 가속을 표현하는 기본 곡선 |
| bounce | 튕기는 모양 |
| elastic(bounciness) | 진동과 overshoot, 기본 1 |
| back(s) | 앞으로 이동하기 전에 반대로 약간 움직이는 모양 |
| bezier(x1, y1, x2, y2) | cubic Bézier 제어점으로 곡선 지정 |
| step0(n) | 양수이면 1인 계단 |
| step1(n) | 1 이상이면 1인 계단 |

elastic의 0은 overshoot가 없고 1보다 큰 값은 여러 차례 진동을 만든다. 투명도나 크기에 overshoot 곡선을 연결할 때 출력의 유효 범위를 함께 확인한다. `bezier`는 CSS transition 곡선과 같은 제어점 표현이지만 애니메이션 대상의 지원 속성은 React Native 계약을 따른다.

## 방향과 대칭

`Easing.in(curve)`는 정방향, `out(curve)`는 반대 방향, `inOut(curve)`는 앞 절반과 뒤 절반을 대칭으로 구성한다. 예를 들어 `Easing.inOut(Easing.quad)`는 처음 가속하고 끝에서 감속한다.

```tsx
Animated.timing(progress, {
  toValue: 1,
  duration: 300,
  easing: Easing.inOut(Easing.quad),
  useNativeDriver: true,
}).start();
```

위 조각은 `Animated`, `Easing`을 react-native에서 가져오고 progress를 Animated.Value로 정의한 상황이다. 공식 미리보기는 width/height도 바꾸므로 JS driver를 사용한다. 시각적 곡선을 비교하는 예를 그대로 native driver 지원 증거로 사용하지 않는다. 기기 실행 결과는 포함하지 않는다.

## 출처

- [React Native 0.87, easing](https://reactnative.dev/docs/easing)

## 관련 문서

- [[RN-Animated]]
- [[RN-Animated-Interaction]]
- [[RN-Accessibility-Info]]
