---
tags: [react-native, mobile, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 접근성 설정과 명령 API

React Native 0.87 `AccessibilityInfo`는 보조 기술과 사용자 설정을 조회하고 변경을 구독한다. 조회는 `Promise<boolean>`이며 현재 값 한 번과 이후 변화는 별도 경로다. screen reader 상태만으로 앱의 접근성 구현을 켜고 끄지 않고 이름, 역할과 조작 경로를 항상 제공한다.

## 조회와 변경 이벤트

| 조회 | 변경 이벤트와 플랫폼 |
|---|---|
| isScreenReaderEnabled | screenReaderChanged, TalkBack/VoiceOver 활성 상태 |
| isAccessibilityServiceEnabled | accessibilityServiceChanged, Android의 모든 보조 서비스 |
| isReduceMotionEnabled | reduceMotionChanged, 두 플랫폼 |
| isBoldTextEnabled | boldTextChanged, iOS |
| isGrayscaleEnabled | grayscaleChanged, iOS |
| isInvertColorsEnabled | invertColorsChanged, iOS |
| isReduceTransparencyEnabled | reduceTransparencyChanged, iOS |
| isHighTextContrastEnabled | Android, 높은 텍스트 대비 조회 |
| isDarkerSystemColorsEnabled | iOS, 더 어두운 시스템 색상 조회 |
| prefersCrossFadeTransitions | iOS, 모션 줄이기와 cross-fade 선호 조회 |

Android의 reduce motion은 개발자 옵션 Transition Animation Scale이 Animation off인 조건도 포함한다. `isAccessibilityServiceEnabled`는 TalkBack뿐 아니라 타사 서비스도 포함하므로 screen reader만 필요하면 `isScreenReaderEnabled`를 쓴다.

`addEventListener(name, handler)`가 반환하는 subscription은 정리 함수에서 `remove()`한다. 초기 Promise가 늦게 완료되는 경우도 고려해 마운트 수명과 설정 변화의 순서를 처리한다. 모션 줄이기는 불필요한 움직임을 줄이는 판단에 연결하며 콘텐츠나 조작 기능을 없애는 조건으로 쓰지 않는다.

## 발화와 표시 시간

`announceForAccessibility(text)`는 screen reader 발화를 요청한다. `announceForAccessibilityWithOptions(text, {queue: true})`는 iOS에서 현재 발화를 끊지 않고 뒤에 쌓는 옵션이다. 기본은 현재 발화를 중단한다. 반복적인 상태 변화는 [[RN-Accessibility-Platforms|live region]]과 발화 빈도를 함께 정한다.

iOS `announcementFinished`는 `{announcement, success}`를 전달한다. 호출 직후 읽기가 끝났다고 가정하지 않는다.

Android `getRecommendedTimeoutMillis(originalTimeout)`는 사용자 접근성 설정의 행동 시간 제한을 반영한 밀리초를 돌려준다. 자동 사라지는 안내의 표시 시간에 적용하며, 원래 시간도 밀리초로 전달한다.

## ref로 접근성 이벤트 보내기

`sendAccessibilityEvent(hostRef, 'focus')`는 접근성 focus 이동을 요청한다. 대상 View는 `accessible={true}`여야 하고 마운트된 host ref를 전달한다. `'click'`, `'viewHoverEnter'`, `'windowStateChange'`는 Android 전용 이벤트다. 일반 키보드 focus나 사업 동작 실행을 대체하지 않는다.

숫자 tag를 받는 `setAccessibilityFocus(reactTag)`는 deprecated다. 현재 코드는 `sendAccessibilityEvent`를 우선한다. 요청의 실제 읽기 순서와 focus 이동은 TalkBack/VoiceOver 기기에서 확인한다.

## 출처

- [React Native 0.87, accessibilityinfo](https://reactnative.dev/docs/accessibilityinfo)

## 관련 문서

- [[RN-Accessibility]]
- [[RN-Accessibility-Focus]]
- [[RN-Animated]]
