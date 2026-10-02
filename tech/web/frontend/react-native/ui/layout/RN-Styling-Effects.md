---
tags: [react-native, style]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native border, gradient와 filter

React Native 0.87 기준이다.

View style은 border/background/opacity뿐 아니라 gradient, filter와 blend를 표현한다. 지원 플랫폼과 experimental 표시를 함께 확인한다.

## border와 gradient

border는 색/폭/solid-dotted-dashed와 corner radius를 나눈다. 물리 corner와 logical start/end corner를 함께 쓸 때 RTL 조건을 확인한다. View radius는 percentage도 받으며 둥근 clipping은 overflow=hidden이 필요할 수 있다. iOS borderCurve는 circular/continuous 곡률이다.

backgroundImage는 linear-gradient/radial-gradient 문자열 또는 gradient 객체 배열을 받는다. 객체 color stop에는 PlatformColor도 쓸 수 있다. gradient를 그리는 API와 원격 Image를 background로 만드는 구성을 구분한다. experimental background position/repeat/size는 아직 바뀔 수 있는 계약이며 production의 기본 기반으로 삼지 않는다.

## filter와 자식 clipping

filter는 view와 descendant에 함께 적용하고 overflow=hidden을 수반한다. brightness/opacity는 공통이고 iOS는 이 두 함수만 지원한다. Android는 contrast/grayscale/hueRotate/invert/sepia/saturate와 blur/dropShadow를 추가로 지원하지만 blur/dropShadow는 Android 12 이상이다.

```tsx
<View style={{filter: [{brightness: 0.8}, {opacity: 0.9}]}} />
```

설명 조각이며 기기에서 실행 검증하지 않았다. 문자열과 함수 객체의 값을 지원 단위에 맞춰 쓰고 filter 밖으로 나와야 하는 child가 잘리지 않는지 확인한다.

## blend, outline과 pointer

mixBlendMode는 stacking context 내 색 합성이다. multiply/screen, 색상 성분 기반 hue/saturation/color/luminosity 등의 모드는 결과가 다르다. New Architecture와 Android 10 이상 조건을 확인하고 isolation으로 합성 범위를 정한다.

outline width/offset은 border 밖을 그리지만 layout을 바꾸지 않는다. cursor pointer는 iOS 17 이상 hover 효과다. pointerEvents는 시각 opacity와 별개로 touch 대상을 제어한다. 화면이 투명하다고 touch가 자동으로 통과하지 않는다.

## 출처

- [React Native, view-style-props](https://reactnative.dev/docs/view-style-props)

## 관련 문서

- [[RN-View-Contracts]]
- [[RN-Shadows]]
- [[RN-Layout-Contracts]]
- [[RN-Image-Presentation]]
