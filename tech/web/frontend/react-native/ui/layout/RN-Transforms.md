---
tags: [react-native, style]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native transform과 origin

React Native 0.87 기준이다.

transform은 화면 표현을 이동/회전/축소하지만 주변 layout의 공간을 다시 계산하지 않는다. 커진 요소가 형제를 덮으면 transform과 별도로 margin/padding 등의 배치를 조정한다.

## 구성과 단위

```tsx
<View style={{
  transform: [{translateX: 12}, {rotate: '15deg'}, {scale: 1.1}],
  transformOrigin: [0, '50%', 0],
}} />
```

배열의 object마다 key 하나만 두고 적용 순서를 유지한다. rotate는 deg/rad, skew는 deg 문자열, scale/translate/perspective는 각각 지원하는 숫자 값을 쓴다. 공백으로 구분한 transform 문자열도 지원한다. 이전 rotation/scaleX/translateX 등의 단독 deprecated props 대신 transform을 쓴다.

4x4 matrix는 column-major의 16개 숫자다. 사전에 계산된 행렬을 전달할 때 쓸 수 있지만 단순 동작은 개별 transform이 읽기 쉽다. 순서를 바꾸면 회전 축과 이동 결과가 달라질 수 있다.

## origin

기본 origin은 center다. 1/2/3값 문자열에서 x/y는 px, percentage나 방향 keyword, z는 px를 사용한다. 배열은 숫자/percentage를 섞어 Animated와 연결할 수 있으며 문자열 파싱을 줄인다. 원점과 container 위치를 같은 값으로 취급하지 않는다.

예제는 props 계약을 설명하며 기기 실행 검증 결과는 아니다. native driver와 Animated가 각 output 속성을 지원하는지도 별도로 확인한다.

## 출처

- [React Native, transforms](https://reactnative.dev/docs/transforms)

## 관련 문서

- [[RN-Animated]]
- [[RN-Positioning]]
- [[RN-Styling-Effects]]
