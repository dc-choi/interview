---
tags: [react-native, style]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 글꼴과 text style의 플랫폼 차이

React Native 0.87 기준이다.

fontFamily/fontSize/fontStyle/fontWeight는 글꼴의 선택과 크기를 정한다. 요청한 숫자 weight의 실제 font variant가 없으면 가장 가까운 것을 사용하므로 모든 100~900 값이 별도 font를 보장하지 않는다. iOS는 system-ui/ui-serif/ui-monospace 등의 generic family도 제공한다.

## 읽기와 숫자 배치

fontVariant는 small-caps, oldstyle/lining/tabular/proportional numbers를 array 또는 문자열로 지정한다. 숫자 폭이 중요한 표에서는 tabular-nums의 font 지원을 확인한다. letterSpacing은 문자 간격, lineHeight는 연속 baseline 간 거리다.

textTransform은 화면의 uppercase/lowercase/capitalize 표현이며 원본 state를 바꾸는 API가 아니다. textDecorationLine은 underline/line-through, decoration color/style은 iOS 계약이다. text shadow는 color/offset/radius이며 box shadow와 구분한다.

## 플랫폼 정렬

Android includeFontPadding=false는 ascender/descender를 위한 추가 공간을 줄이며 textAlignVertical과 조합해 확인한다. verticalAlign은 textAlignVertical보다 우선하고 값의 middle/center 차이도 있다. Android justify는 API 26 이상 조건이 있다. iOS writingDirection은 text 방향, container direction과 같은 범위가 아니다.

userSelect는 selectable보다 우선해 native 선택/copy 정책을 정한다. 글꼴 지원, 한글 줄바꿈과 접근성 큰 글꼴로 실제 결과를 확인한다.

## 출처

- [React Native, text-style-props](https://reactnative.dev/docs/text-style-props)

## 관련 문서

- [[RN-Text-Rendering]]
- [[RN-Text-Input]]
- [[RN-Accessibility]]
