---
tags: [react-native, architecture]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native view flattening

View flattening은 화면을 직접 그리지 않고 배치만 제공하는 layout-only view를 native view 계층에서 줄이는 최적화다. JSX의 component 합성은 유지하면서 host view의 깊이와 수를 낮춘다.

## 어떻게 줄이는가

margin/padding만 주는 여러 `View`로 이미지와 제목을 감싸면 React/shadow tree는 중첩될 수 있다. renderer의 diff 단계는 스타일과 props를 검토해 불필요한 host view를 합치고, 자식의 배치 결과를 보존한다. 최적화 후 native tree가 JSX보다 얕을 수 있다.

backgroundColor, opacity, 접근성이나 식별 props처럼 view 자체의 존재가 필요한 조건도 판단에 영향을 준다. 모든 wrapper를 제거하거나 margin 값을 기계적으로 합친다는 규칙은 아니다.

## ref와 native view를 확인할 때

`View`의 `collapsable={false}`는 layout-only view 제거를 막는 용도다. `collapsableChildren={false}`는 직접 자식들이 제거되지 않게 하고, `nativeID`/`id`도 layout-only 최적화에 영향을 준다. 측정하거나 native 코드에서 찾을 대상의 실제 view 존재 여부를 확인한다.

화면이 같다고 React tree, shadow tree와 host tree가 같다는 뜻은 아니다. native inspector에서 view 수를 비교할 때 이 차이를 고려한다. flattening을 끄면 native view가 더 많이 남으므로 필요한 대상에만 적용한다.

## 출처

- [React Native, View Flattening](https://reactnative.dev/architecture/view-flattening)
- [React Native, View](https://reactnative.dev/docs/view)

## 관련 문서

- [[RN-Render-Pipeline]]
- [[RN-Core-Components]]
