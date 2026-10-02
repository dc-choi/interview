---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native RTL layout과 지속 설정

React Native 0.87 기준이다.

I18nManager는 RTL layout 지원과 현재 direction을 다룬다. isRTL은 forceRTL, allowRTL과 사용자 language, native 앱의 RTL/localization 설정에 영향을 받는다. Android는 supportsRTL, iOS는 사용자 language와 앱 knownRegions 등의 조건을 함께 확인한다.

## 설정의 수명

allowRTL과 forceRTL은 다음 앱 시작에 완전히 적용되고 restart 후에도 유지된다. component state를 바꾼 즉시 layout 전체가 바뀐다는 전제로 UI를 만들지 않는다. forceRTL은 개발/테스트용이며 production에서 사용자에게 강제 재시작을 요구하는 흐름을 피한다.

swapLeftAndRightInRTL은 left/right style의 교환을 정하며 isRTL 값 자체를 바꾸지 않는다. isRTL, layout direction과 swap 여부는 같은 설정이 아니다.

## 실제 화면 검증

logical start/end style을 먼저 사용하고 absolute positioning이나 slide animation 방향은 RTL 조건을 맞춘다. 뒤로 가기 icon, text alignment와 순서, touch target이 화면 의미를 유지하는지 확인한다. 물리 left/right를 기준으로 한 code에 자동 swap을 더하면 수동 반전과 중복될 수 있다.

## 출처

- [React Native, i18nmanager](https://reactnative.dev/docs/i18nmanager)

## 관련 문서

- [[RN-Layout-Contracts]]
- [[RN-Platform-Code]]
- [[RN-Transforms]]
