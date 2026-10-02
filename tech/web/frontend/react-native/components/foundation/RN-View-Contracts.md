---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native View의 입력, 식별과 합성 비용

React Native 0.87 기준이다.

View는 container이면서 touch/responder와 접근성의 경계다. styling, native tree 존재 여부와 사용자에게 노출되는 의미를 별개로 정한다.

## 입력 대상

pointerEvents의 auto는 자신과 자식 모두 touch 대상이 될 수 있게 하고, none은 자신과 자식 모두를 touch 대상에서 제외한다. box-none은 자식만, box-only는 자신만 touch 대상이 되도록 한다. gesture responder는 start/move negotiation, capture, grant/reject, release/terminate와 termination request의 수명주기를 가진다. 단순 button은 Pressable로 구성하고 이 계층을 직접 구현할 필요가 있는 경우만 responder를 다룬다.

onLayout은 layout 계산 직후 호출되지만 animation 중에는 화면에 그 값이 아직 반영되지 않았을 수 있다. hitSlop은 부모 경계와 형제 z-order의 제약을 받는다.

## 식별, ref와 focus

id는 nativeID보다 우선한다. id/nativeID/testID는 layout-only 제거를 막을 수 있고 collapsable=false도 native view 존재를 보존한다. ref는 element node를 전달한다. testID를 데이터의 영구 식별자처럼 쓰지 않는다.

Android focusable/tabIndex(0/-1)는 hardware input의 focus 가능 여부다. nextFocus 계열은 방향별 이동을 지정한다. accessible과 role, state/value/actions는 보조기술 의미이며 role은 accessibilityRole보다 우선한다.

aria/accessibility 대응 속성을 동시에 주면 우선순위를 맞춘다. iOS modal/hidden과 Android importantForAccessibility는 자식 노출에도 영향을 준다. experimental_accessibilityOrder는 exhaustive/nestable이어서 빠진 대상이 접근 불가능해질 수 있으며 production용 안정 계약으로 취급하지 않는다.

## 합성 최적화의 비용

needsOffscreenAlphaCompositing은 겹친 자식의 정확한 alpha 합성을 위해 offscreen render를 수행해 비용이 크다. Android hardware texture, iOS rasterization은 static view 이동/opacity에서 캐시를 재사용할 수 있지만 GPU/bitmap 메모리를 소비한다. 크기나 자식이 변하는 화면에 무조건 켜지 않고 profile하며 동작이 끝나면 필요 없는 texture를 해제한다.

removeClippedSubviews는 경계 밖 자식을 native superview에서 분리하는 옵션이다. overflow 조건과 콘텐츠 누락 위험을 검토하며 기본 view tree를 최적화하기 위해 일괄 적용하지 않는다.

## 출처

- [React Native, view](https://reactnative.dev/docs/view)

## 관련 문서

- [[RN-Gesture-Responder]]
- [[RN-View-Flattening]]
- [[RN-Native-Nodes]]
- [[RN-Accessibility]]
