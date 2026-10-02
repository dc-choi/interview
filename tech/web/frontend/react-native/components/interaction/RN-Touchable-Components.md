---
tags: [react-native, touch]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Touchable 계열의 feedback과 자식 계약

새 touch control을 구성할 때는 Pressable의 상태와 style 계약을 먼저 검토한다. 기존 Touchable은 feedback을 제공하는 방법과 wrapper 구조가 서로 다르다. React Native 0.87 기준이다.

| component | 시각 feedback | 주의할 경계 |
|---|---|---|
| TouchableHighlight | 자식 opacity를 낮춰 underlayColor 표시 | 자식 하나, 추가 View와 opaque 배경이 layout/표시에 영향 |
| TouchableOpacity | opacity 감소 | Animated.View wrapper가 view 계층과 layout에 영향 |
| TouchableWithoutFeedback | 자체 feedback 없음 | 자식 하나를 clone하고 responder props 전달 |
| TouchableNativeFeedback | Android native drawable/ripple | Android 전용, 단일 View 자식 |

## 자식과 props 전달

여러 자식을 하나의 View로 묶는다. TouchableWithoutFeedback과 중간 사용자 component를 조합하면 그 component가 responder props를 실제 native View에 전달해야 한다. 누를 수 있는 요소는 시각 feedback을 제공하고, feedback이 없는 wrapper는 배경 탭으로 keyboard를 닫는 등 이유가 분명할 때 제한해서 쓴다.

공통 props에는 onPress/In/Out/LongPress, delay, disabled, hitSlop과 pressRetentionOffset이 있다. press는 scroll이 responder를 가져가는 등의 취소 상황에서 실행되지 않을 수 있다. Touchable의 long press 대기 설명과 Pressable의 기본값을 혼용하지 않고 필요하면 delayLongPress를 명시한다.

## 접근성과 식별

accessible, label, hint, role, state, value와 action callback을 화면 의미에 맞춘다. aria 계열 속성이 대응 accessibility 속성보다 우선하는 계약도 있으므로 중복 값이 충돌하지 않게 한다. `id`는 nativeID보다 우선하며 testID는 E2E 탐색에 쓰는 별도 목적이다. TV focus는 플랫폼 전용 props를 확인한다.

## native feedback의 세부 설정

TouchableHighlight의 activeOpacity와 underlayColor, onShow/HideUnderlay를 구분한다. TouchableOpacity는 activeOpacity로 누를 때 밝기를 정한다.

TouchableNativeFeedback은 SelectableBackground, SelectableBackgroundBorderless와 Ripple로 drawable 설정을 만든다. useForeground는 canUseNativeForeground로 지원을 확인한다. borderless는 view 밖 ripple을 허용하고 rippleRadius는 반경을 정한다. foreground 여부와 touch 영역 확장은 같은 설정이 아니다.

## 출처

- [React Native, TouchableHighlight](https://reactnative.dev/docs/touchablehighlight)
- [React Native, TouchableOpacity](https://reactnative.dev/docs/touchableopacity)
- [React Native, TouchableWithoutFeedback](https://reactnative.dev/docs/touchablewithoutfeedback)
- [React Native, TouchableNativeFeedback](https://reactnative.dev/docs/touchablenativefeedback)

## 관련 문서

- [[RN-Pressable]]
- [[RN-Touch-Event-Types]]
- [[RN-Accessibility]]
