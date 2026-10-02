---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 짧은 알림과 진동 feedback

React Native 0.87 기준이다.

## ToastAndroid

show(message, SHORT/LONG)는 Android의 일시적 text toast다. 사용자가 조작하거나 나중에 다시 확인해야 할 중요한 오류의 유일한 표시로 삼지 않는다.

showWithGravity와 showWithGravityAndOffset은 이전 OS에서 위치/offset을 정한다. **Android 11(API 30)부터 text toast의 gravity는 효과가 없다**. 현재 화면의 특정 위치가 요구사항이면 앱 내 snackbar 등 다른 표현을 선택한다. TOP/BOTTOM/CENTER 값만 바꿔 OS 정책을 우회하려고 하지 않는다.

## Vibration의 pattern 차이

Android는 Manifest에 VIBRATE를 선언한다. 숫자 duration은 Android에서 쓰고 iOS는 대략 고정 400ms의 system vibration을 사용한다. 기본 Android duration도 400ms다.

array pattern의 Android 짝수 index는 대기, 홀수는 진동 시간이다. iOS는 array 숫자가 진동 사이 대기를 나타내므로 같은 배열의 결과가 다르다. repeat=true는 cancel까지 반복하고 수명이 끝나면 Vibration.cancel로 정리한다.

진동은 플랫폼/기기 feedback이며 의미를 전달하는 유일한 통로로 삼지 않는다. 실제 진동이 없는 simulator와 hardware의 동작을 구분한다.

## 출처

- [React Native, toastandroid](https://reactnative.dev/docs/toastandroid)
- [React Native, vibration](https://reactnative.dev/docs/vibration)

## 관련 문서

- [[RN-Pressable]]
- [[RN-Accessibility]]
- [[RN-Platform-Identity]]
