---
tags: [react-native, api]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Alert와 입력 prompt

React Native 0.87 기준이다.

Alert.alert는 native title/message/button dialog다. button onPress가 실행되면 dialog가 닫힌다. 호출 자체가 사용자의 선택을 동기 return하는 API는 아니므로 승인 결과에 의존하는 작업은 button callback에 연결한다.

## 플랫폼 버튼 계약

Android는 최대 3개이며 순서는 neutral/negative/positive다. 1개는 positive, 2개는 negative/positive다. iOS는 button별 default/cancel/destructive와 isPreferred를 표현하지만 Android에서는 이 style을 무시한다.

Android 바깥 탭 dismiss는 기본 비활성이고 cancelable=true일 때 허용한다. onDismiss와 cancel button을 구분한다. iOS userInterfaceStyle은 dialog theme를 고정할 수 있다.

## iOS prompt

Alert.prompt는 iOS의 plain/secure text나 login-password 입력을 표시한다. function callback 또는 button 배열을 받고 defaultValue/keyboardType을 정한다. Android의 공통 입력 dialog로 취급하지 않는다.

빠른 확인은 Alert, 여러 필드와 validation/오류/재시도가 있는 작업은 앱 화면이나 Modal에서 구성한다. 원격 요청 완료를 기다려야 하면 버튼 누름과 서버 완료를 구분한다.

## 출처

- [React Native, alert](https://reactnative.dev/docs/alert)

## 관련 문서

- [[RN-Modal]]
- [[RN-Basic-Controls]]
- [[RN-Text-Input]]
