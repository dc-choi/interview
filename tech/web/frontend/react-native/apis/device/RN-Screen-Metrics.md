---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native window 크기, pixel density와 font scale

React Native 0.87 기준이다.

useWindowDimensions는 width/height/scale/fontScale을 제공하고 window나 글꼴 배율이 바뀌면 갱신된다. React component의 responsive UI에서는 이 hook을 우선한다. rotation, foldable과 window resize를 고려해 한 번 읽은 값을 영구 StyleSheet 상수로 고정하지 않는다.

## window와 screen

Dimensions.get(window)는 앱 window, get(screen)은 기기 screen이다. change subscription은 양쪽 metric과 Android physical-pixel 정보를 전달한다. native application 실행 전에 초기값이 있지만 이후 바뀔 수 있다. Android system bar가 window 값을 줄이는 조건과 edge-to-edge 구성을 함께 확인한다.

width/height의 layout 값과 실제 물리 pixel을 구분한다. scale은 density이며 fontScale은 사용자의 글꼴 배율이다. 글꼴 배율을 이미지 density로 쓰지 않는다.

## PixelRatio의 변환

get은 기기 density, getFontScale은 글꼴 배율이다. getPixelSizeForLayoutSize는 dp 크기를 정수 px로 변환해 원격 이미지의 적정 해상도를 요청할 때 쓴다. layout width를 그 px로 다시 지정하면 UI 자체가 커질 수 있다.

roundToNearestPixel은 물리 pixel 격자에 대응하는 가장 가까운 layout 크기를 반환한다. Yoga/JS 계산은 소수 정밀도를 유지하고 native view 반영 시 root 기준으로 rounding하므로 모든 중간 부모 좌표를 따로 반올림해 누적 오차를 만들지 않는다.

큰 글꼴, 회전, 분할 window와 고밀도 이미지로 실제 결과를 확인한다. 서로 다른 metric을 모두 device size라는 한 값에 합치지 않는다.

## 출처

- [React Native, dimensions](https://reactnative.dev/docs/dimensions)
- [React Native, usewindowdimensions](https://reactnative.dev/docs/usewindowdimensions)
- [React Native, pixelratio](https://reactnative.dev/docs/pixelratio)

## 관련 문서

- [[RN-Dimensions]]
- [[RN-Image-Assets]]
- [[RN-Typography]]
